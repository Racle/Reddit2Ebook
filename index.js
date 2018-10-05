const axiosClass = require('axios');
const makepub = require("nodepub");
const decode = require('unescape');
const Jimp = require("jimp");
const fs = require('fs');
const readline = require('readline');
const ora = require('ora');
const path = fs.existsSync('./config.txt') ? 'config.txt' : '.env';

//requiring dotenv with .env file OR config.txt file
const dotenv = require('dotenv').config({path: path});

if (dotenv.error) {
    console.log("Missing .env OR config.txt file");
    process.exit()
}

let epub;
let maxPages = process.env.max_pages - 1;
let currentPage = 0;
const subreddit = process.env.subreddit;

const metadata = {
    id: Date.now(),
    title: subreddit,
    series: subreddit,
    sequence: 1,
    author: 'Anonymous',
    fileAs: 'Anonymous',
    tags: 'reddit',
    genre: 'Epic',
    copyright: 'Anonymous, ' + (new Date()).getFullYear(),
    publisher: 'Racle - Reddit2Ebook',
    published: (new Date()).toISOString().split('T')[0],
    language: 'en',
    description: 'Subreddit turned into ebook.',
    contents: 'Posts',
    source: 'https://lonke.ro/Reddit2Ebook',
    images: []
};

//one request per second
const axios = axiosClass.create();
scheduleRequests(axios, 1000);
// ##START

// checking if configuration is valid and setting default values
if(process.env.subreddit === undefined) {
    console.log("Missing subreddit from config file");
    process.exit(1)
}
//setting default values
process.env.max_pages = process.env.max_pages || 10;

// boolean true/false is incorrect in process.env
const comments_include = process.env.comments_include === "true";
process.env.comments_min_points = process.env.comments_min_points || 2;
process.env.comments_min_length = process.env.comments_min_length || 50;
process.env.comments_max = process.env.comments_max || 3;
process.env.comments_max_replies = process.env.comments_max_replies || 3;
process.env.comments_max_replies_indentation = process.env.comments_max_replies_indentation || 2;

// just to get this as async function
generateEbook();




async function generateEbook() {

    console.log("Creating ebook from: " +  subreddit +(comments_include ? " (comments enabled)" : ''));

    //creating custom cover with subreddit as text
    await createCover();
    epub = makepub.document(metadata, "./cover/cover.jpg");
    epub.addCSS("h1>a{color:inherit;text-decoration:none}.comment-parent{margin-left:0!important}.comment{margin-left:5px;padding-left:5px;border-left:1px solid gray;}");

    await getContent("https://old.reddit.com/" + subreddit + '/new.json?limit=10&sort=new');

    await epub.writeEPUB(function (e) {
        console.log("Error:", e);
    }, './output', subreddit.split("/").pop(), async function () {
        ora("EPUB created to output/" + subreddit.split("/").pop() + ".epub\n").start().succeed();


      // add "Press enter to continue..." after writing epub
      // this is for executables, so you can see what app created
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      await rl.question('Press enter to continue...', () => {
        rl.close();
      });

    });



}




async function getContent(url) {
    await axios.get(url)
        .then(async r => {

            const spinner = ora("Current page: " +  (currentPage+1) + "/" + (maxPages+1)).start();
            spinner.start();
            await asyncForEach(r.data.data.children, async c => {
                // we only want selfposts and non-sticky posts
                if(!c.data.is_self || c.data.stickied) return;
                let comments = "";

                // load comments if they are enabled
                if(comments_include) {
                    comments = await getComments(c.data.url.slice(0, -1) + '.json?sort=confidence');
                    if(comments !== "") comments = "<br /><h3>Comments<hr /></h3>" + comments;
                }

                //add section to epub. Title as h1 with link. small text for author and date.
                epub.addSection(c.data.title,
                    "<h1><a href='" + c.data.url + "'>" + c.data.title + "</a></h1>" +
                    "<small><i>By</i> " + c.data.author + " <i>on</i> " + (new Date(c.data.created * 1000)).toISOString().split('T')[0] + "</small>" +
                    decode(c.data.selftext_html).replace("<!-- SC_ON -->", "") +
                    comments);

            });
            spinner.succeed();
            process.stdout.write('\r');

            // if there is more pages (data.after) and we are not over maxPages limit, get more pages
            if(r.data.data.after && ++currentPage <= maxPages) {
                await getContent(url + "&after=" + r.data.data.after);
            }
        })
        .catch(function (error) {
            console.log(error);
        });
}

async function getComments(url) {

    // get comments from url
    const child = await axios(url)
        .then(r => {
            return r.data[1].data.children;
        })
        .catch(function (error) {
            console.log(error);
        });

    let userComments = "";
    let currentComments = 0;
    await asyncForEach(child, c => {
        /* Continue if
            - score is over set minimum
            - we are below maxium number of comments
            - we are over comment minimum length
         */
        if(c.data.score < process.env.comments_min_points) return;
        if(++currentComments > process.env.comments_max) return;
        if(c.data.body.length <= process.env.comments_min_length) return;
        //Parse comments for ebook
        userComments += parseUserComments(c.data, 1)
    });
    return userComments;
}

 function parseUserComments(data, currentLevel) {

    // generate comment parent body
    //                              if parent comment, remove margin-left
    let comment = "<div class='" + (currentLevel === 1 ? "comment-parent" : "") + " comment'><small>" + data.author + "</small><br />" + decode(data.body_html);
    /* continue if
        - currentLevel is under max replies
        - there is replies
        - score is over minimum
        - length is over minimum
     */
    if(currentLevel <= process.env.comments_max_replies &&
        data.replies && data.replies.data && data.replies.data.children !== undefined &&
        data.score >= process.env.comments_min_points &&
        data.body.length >= process.env.comments_min_length ) {

        // get replies and replies replies etc..
        let currentComments = 0;
        data.replies.data.children.forEach((c) => {
            // check if we go over identation level
            // -1 because we don't calculate first level of comments here.
            if(++currentComments > process.env.comments_max_replies_indentation - 1) return;
            comment += parseUserComments(c.data, currentLevel+1);
        })
    }
    // return parent comment + possible replies
    return comment + "</div>";

}

async function createCover() {

    // load font and our base cover image
    // we put subreddit into this image
    const font = await Jimp.loadFont(Jimp.FONT_SANS_64_BLACK);
    const image = await Jimp.read("./cover/Reddit2Ebook.jpg");

    await image.print(
        font,
        0, // x
        600, // y
        {
            text: subreddit,
            alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
            alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE
        },
        782, // maxWidth (use same width as base cover image to center correctly)
        200  // maxHeight
    )
      .quality(80) // set JPEG quality. We don't need very high quality output.
      .write("./cover/cover.jpg");

}


//Helpful functions
async function asyncForEach(array, callback) {
    for (let index = 0; index < array.length; index++) {
        await callback(array[index], index, array)
    }
}

function scheduleRequests(axiosInstance, intervalMs) {
  let lastInvocationTime = undefined;

  const scheduler = (config) => {
    //console.log("loading " + config.url);
    const now = Date.now();
    if (lastInvocationTime) {
      lastInvocationTime += intervalMs;
      const waitPeriodForThisRequest = lastInvocationTime - now;
      if (waitPeriodForThisRequest > 0) {
        return new Promise((resolve) => {
          setTimeout(
            () => resolve(config),
            waitPeriodForThisRequest);
        });
      }
    }
    lastInvocationTime = now;
    return config;
  }

  axiosInstance.interceptors.request.use(scheduler);
}
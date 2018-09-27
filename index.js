const dotenv = require('dotenv').config();
const axios = require('axios');
const makepub = require("nodepub");
const decode = require('unescape');
const Jimp = require("jimp");

if (dotenv.error) {
    return console.log("Missing .env file");
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

// ##START

// just to get this as async function
generateEbook();



async function generateEbook() {
    //creating custom cover with subreddit as text
    await createCover();
    epub = makepub.document(metadata, "./cover/cover.jpg");
    epub.addCSS("h1>a{color:inherit}");
    await getContent("https://old.reddit.com/" + subreddit + '/new.json?limit=10&sort=new');

    epub.writeEPUB(function (e) {
        console.log("Error:", e);
    }, './output', subreddit.split("/").pop(), function () {
        console.log("EPUB created.")
    });

}


async function getContent(url) {
    await axios.get(url)
        .then(async r => {
            await r.data.data.children.forEach(async c => {
                // we only want selfposts and non-sticky posts
                if(!c.data.is_self || c.data.stickied) return;

                //add section to epub. Title as h1 with link. small text for author and date.
                epub.addSection(c.data.title,
                    "<h1><a href='" + c.data.url + "'>" + c.data.title + "</a></h1>" +
                    "<small><i>By</i> " + c.data.author + " <i>on</i> " + (new Date(c.data.created * 1000)).toISOString().split('T')[0] + "</small>" +
                    decode(c.data.selftext_html).replace("<!-- SC_ON -->", ""));
            })

            console.log("Current page: " +  (currentPage+1));

            // if there is more pages (data.after) and we are not over maxPages limit, get more pages
            if(r.data.data.after && ++currentPage <= maxPages) {
                await getContent(url + "&after=" + r.data.data.after);
            }
        })
        .catch(function (error) {
            console.log(error);
        });
}

async function createCover() {

    // load font and our base cover image
    // we put subreddit into this image
    const font = await Jimp.loadFont(Jimp.FONT_SANS_64_BLACK);
    const image = await Jimp.read("./cover/reddit2ebook.jpg");

    await image.print(
        font,
        0, // x
        850, // y
        {
            text: subreddit,
            alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
            alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE
        },
        783, // maxWidth (use same width as base cover image to center correctly)
        200  // maxHeight
    ).write("./cover/cover.jpg");

}
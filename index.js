const axiosClass = require('axios')
const makepub = require('nodepub')
const decode = require('unescape')
const Jimp = require('jimp')
const fs = require('fs')
const readlineSync = require('readline-sync')
const ora = require('ora')
const path = fs.existsSync('./config.txt') ? 'config.txt' : '.env'

//requiring dotenv with .env file OR config.txt file
const dotenv = require('dotenv').config({ path: path })

let epub
let maxPages = process.env.max_pages - 1
let currentPage = 0
let subreddit = process.env.subreddit
const page = process.env.page || 'new'
const from = process.env.from || 'all'
let url = ''
let urlExtra = ''
let metadata = {}
let comments_include = false
let wikiLinks = []

//one request per second
const axios = axiosClass.create()
scheduleRequests(axios, 1000)

async function main() {
  //error checking

  if (dotenv.error) {
    console.log('Missing .env OR config.txt file')
    pause()
    process.exit()
  }

  if (process.env.wikipage !== undefined) {
    await axios
      .get(process.env.wikipage + '.json')
      .then(async r => {
        if (r.data.kind !== 'wikipage') {
          console.log('Invalid wikipage link')
          await pause()
          process.exit()
        }
        let regexp = /\((https.*\/comments\/.*)\)/g
        let matches = r.data.data.content_md.matchAll(regexp)
        for (const match of matches) {
          wikiLinks.push(match[1])
        }
      })
      .catch(async _ => {
        console.log('Invalid wikipage link')
        await pause()
        process.exit()
      })
    if (wikiLinks.length === 0) {
      console.log('No links found in wikipage')
      await pause()
      process.exit()
    } else {
      // set defaultvalues if wikiLinks is not empty
      maxPages = wikiLinks.length - 1
      subreddit = process.env.wikipage_title
    }
  }

  // checking if configuration is valid and setting default values
  if (process.env.subreddit === undefined && process.env.wikipage === undefined) {
    console.log('Missing subreddit or wikipage from config file')
    await pause()
    process.exit()
  }

  if (!['new', 'top', 'hot', 'rising', 'controversial'].includes(page)) {
    console.log('Page parameter is invalid')
    console.log('Given value: ' + page)
    console.log('Allowed values: new|top|hot|rising|controversial')
    await pause()
    process.exit()
  }

  if (!['all', 'hour', 'day', 'month', 'year'].includes(from)) {
    console.log('From parameter is invalid')
    console.log('Given value: ' + from)
    console.log('Allowed values: all|hour|day|month|year')
    await pause()
    process.exit()
  }

  if (page !== '' && page !== void 0 && page !== 'new') {
    if (from !== '' && from !== void 0) {
      urlExtra = '&t=' + from
    }
  }

  url = '/' + page + '.json?limit=10&sort=' + page + urlExtra

  let filename = wikiLinks.length > 0 ? subreddit.replace(/[^a-z0-9]/gi, '_').toLowerCase() : subreddit.split('/').pop()
  metadata = {
    id: Date.now(),
    title: subreddit.replace(/[^a-z0-9]/gi, ' '),
    series: subreddit.replace(/[^a-z0-9]/gi, ' '),
    sequence: 1,
    author: 'Anonymous',
    fileAs: 'Anonymous',
    tags: 'reddit',
    genre: 'Epic',
    copyright: 'Anonymous, ' + new Date().getFullYear(),
    publisher: 'Racle - Reddit2Ebook',
    published: new Date().toISOString().split('T')[0],
    language: 'en',
    description: 'Subreddit turned into ebook.',
    contents: 'Posts',
    source: 'https://lonke.ro/Reddit2Ebook',
    images: [],
  }

  // ##START

  //setting default values
  process.env.max_pages = process.env.max_pages || 10

  // boolean true/false is incorrect in process.env
  comments_include = process.env.comments_include === 'true'
  process.env.comments_min_points = process.env.comments_min_points || 2
  process.env.comments_min_length = process.env.comments_min_length || 50
  process.env.comments_max = process.env.comments_max || 3
  process.env.comments_max_replies = process.env.comments_max_replies || 3
  process.env.comments_max_replies_indentation = process.env.comments_max_replies_indentation || 2

  // just to get this as async function
  generateEbook(wikiLinks.length > 0)
}

async function pause() {
  readlineSync.question('Press enter to continue...')
}

async function generateEbook(wikipage = false) {
  if (wikipage) {
    console.log('Generating wikipage ebook: ' + process.env.wikipage_title + (comments_include ? ' (comments enabled)' : ''))
  } else {
    console.log('Creating ebook from: ' + subreddit + ' (' + page + ', links from ' + (['all', 'new'].includes(from) ? '' : 'past ') + from + ')' + (comments_include ? ' (comments enabled)' : ''))
  }

  //creating custom cover with subreddit as text
  await createCover()
  epub = makepub.document(metadata, './cover/cover.jpg')
  epub.addCSS('h1>a{color:inherit;text-decoration:none}.comment-parent{margin-left:0!important}.comment{margin-left:5px;padding-left:5px;border-left:1px solid gray;}')

  if (wikipage) {
    await getWikipageContent()
  } else {
    await getContent('https://old.reddit.com/' + subreddit + url, wikipage)
  }

  let filename = wikiLinks.length > 0 ? subreddit.replace(/[^a-z0-9]/gi, '_').toLowerCase() : subreddit.split('/').pop()

  await epub.writeEPUB(
    function (e) {
      console.log('Error:', e)
    },
    './output',
    filename,
    async function () {
      ora('EPUB created to output/' + filename + '.epub\n')
        .start()
        .succeed()

      // add "Press enter to continue..." after writing epub
      // this is for executables, so you can see what app created
      await pause()
    }
  )
}

async function getContent(url) {
  await axios
    .get(url)
    .then(async r => {
      const spinner = ora('Current page: ' + (currentPage + 1) + '/' + (maxPages + 1)).start()
      spinner.start()
      await asyncForEach(r.data.data.children, async c => {
        await addPost(c)
      })
      spinner.succeed()
      process.stdout.write('\r')

      // if there is more pages (data.after) and we are not over maxPages limit, get more pages
      if (r.data.data.after && ++currentPage <= maxPages) {
        await getContent(url + '&after=' + r.data.data.after)
      }
    })
    .catch(function (error) {
      console.log(error)
    })
}

async function getWikipageContent() {
  await asyncForEach(wikiLinks, async link => {
    await axios
      .get(link + '.json')
      .then(async r => {
        const spinner = ora('Current page: ' + (currentPage + 1) + '/' + (maxPages + 1)).start()
        spinner.start()
        await addPost(r.data[0].data.children[0])
        spinner.succeed()
        process.stdout.write('\r')

        currentPage++
      })
      .catch(function (error) {
        console.log(error)
      })
  })
}

async function addPost(c) {
  // we only want selfposts and non-sticky posts
  if (!c.data.is_self || c.data.stickied) return
  let comments = ''

  // load comments if they are enabled
  if (comments_include) {
    comments = await getComments(c.data.url.slice(0, -1) + '.json?sort=confidence')
    if (comments !== '') comments = '<br /><h3>Comments<hr /></h3>' + comments
  }

  //add section to epub. Title as h1 with link. small text for author and date.
  epub.addSection(
    c.data.title,
    "<h1><a href='" +
      c.data.url +
      "'>" +
      c.data.title +
      '</a></h1>' +
      '<small><i>By</i> ' +
      c.data.author +
      ' <i>on</i> ' +
      new Date(c.data.created * 1000).toISOString().split('T')[0] +
      '</small>' +
      decode(c.data.selftext_html).replace('<!-- SC_ON -->', '') +
      comments
  )
}

async function getComments(url) {
  // get comments from url
  const child = await axios(url)
    .then(r => {
      return r.data[1].data.children
    })
    .catch(function (error) {
      console.log(error)
    })

  let userComments = ''
  let currentComments = 0
  await asyncForEach(child, c => {
    /* Continue if
            - score is over set minimum
            - we are below maxium number of comments
            - we are over comment minimum length
         */
    if (c.data.score < process.env.comments_min_points) return
    if (++currentComments > process.env.comments_max) return
    if (c.data.body.length <= process.env.comments_min_length) return
    //Parse comments for ebook
    userComments += parseUserComments(c.data, 1)
  })
  return userComments
}

function parseUserComments(data, currentLevel) {
  // generate comment parent body
  //                              if parent comment, remove margin-left
  let comment = "<div class='" + (currentLevel === 1 ? 'comment-parent' : '') + " comment'><small>" + data.author + '</small><br />' + decode(data.body_html)
  /* continue if
        - currentLevel is under max replies
        - there is replies
        - score is over minimum
        - length is over minimum
     */
  if (
    currentLevel <= process.env.comments_max_replies &&
    data.replies &&
    data.replies.data &&
    data.replies.data.children !== undefined &&
    data.score >= process.env.comments_min_points &&
    data.body.length >= process.env.comments_min_length
  ) {
    // get replies and replies replies etc..
    let currentComments = 0
    data.replies.data.children.forEach(c => {
      // check if we go over identation level
      // -1 because we don't calculate first level of comments here.
      if (++currentComments > process.env.comments_max_replies_indentation - 1) return
      comment += parseUserComments(c.data, currentLevel + 1)
    })
  }
  // return parent comment + possible replies
  return comment + '</div>'
}

async function createCover() {
  // load font and our base cover image
  // we put subreddit into this image
  const font = await Jimp.loadFont(Jimp.FONT_SANS_64_BLACK)
  const image = await Jimp.read('./cover/Reddit2Ebook.jpg')

  await image
    .print(
      font,
      0, // x
      600, // y
      {
        text: subreddit,
        alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
        alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE,
      },
      782, // maxWidth (use same width as base cover image to center correctly)
      200 // maxHeight
    )
    .quality(80) // set JPEG quality. We don't need very high quality output.
    .write('./cover/cover.jpg')
}

//Helpful functions
async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array)
  }
}

function scheduleRequests(axiosInstance, intervalMs) {
  let lastInvocationTime = undefined

  const scheduler = config => {
    //console.log("loading " + config.url);
    const now = Date.now()
    if (lastInvocationTime) {
      lastInvocationTime += intervalMs
      const waitPeriodForThisRequest = lastInvocationTime - now
      if (waitPeriodForThisRequest > 0) {
        return new Promise(resolve => {
          setTimeout(() => resolve(config), waitPeriodForThisRequest)
        })
      }
    }
    lastInvocationTime = now
    return config
  }

  axiosInstance.interceptors.request.use(scheduler)
}

// start program
main()

const fs = require('fs');
const pjson = require('./package.json');
const archiver = require('archiver');

// create releases folder if not exist
if (!fs.existsSync('releases')) {
  fs.mkdirSync('releases');
}


//async to generate 3 zip files at same time
async function  generateRelease(release) {
// create a file to stream archive data to.
  const output = fs.createWriteStream(__dirname + '/releases/reddit2ebook-' + pjson.version + "-" + release + '.zip');
  const archive = archiver('zip', {
    zlib: { level: 9 } // Sets the compression level.
  });

  output.on('close', function() {
    console.log("Release: " + release + ". Total size: " + formatBytes(archive.pointer()));
  });

  archive.on('error', function(err) {
    throw err;
  });


  archive.pipe(output);

  //add executable
  const executable = release === 'win' ? 'win.exe' : release;
  archive.append(fs.createReadStream('reddit2ebook-' + executable), { name: 'reddit2ebook-' + executable });

  //add default config file
  archive.append(fs.createReadStream('config.default.txt'), { name: 'config.txt' });

  //add default cover file
  archive.append(fs.createReadStream('./cover/Reddit2Ebook.jpg'), { name: 'cover/Reddit2Ebook.jpg' });


  // finalize the archive (ie we are done appending files but streams have to finish yet)
  archive.finalize();
}

// Quick formatting function from https://stackoverflow.com/a/18650828
function formatBytes(a,b){if(0==a)return"0 Bytes";var c=1024,d=b||2,e=["Bytes","KB","MB","GB","TB","PB","EB","ZB","YB"],f=Math.floor(Math.log(a)/Math.log(c));return parseFloat((a/Math.pow(c,f)).toFixed(d))+" "+e[f]}


generateRelease('win');
generateRelease('linux');
generateRelease('macos');
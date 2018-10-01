# Reddit2Ebook
Turn any subreddit (selftext only) to an ebook.

App currently loads post starting from newest post available.

It also ignores sticky messages and non-selfpost messages.
## Run via executable
### Usage
- Get lastest release from [releases](https://github.com/Racle/Reddit2Ebook/releases).
- unzip .zip folder
- modify config.txt
- run executable 
    - Linux / Mac
        - use terminal
        - run `chmod +x reddit2ebook-linux`
        - run `./reddit2ebook-linux`
    - Windows
        - double-click `reddit2ebook-win.exe` 
    - Mac
        - use terminal
        - run `chmod +x reddit2ebook-macos`
        - run `./reddit2ebook-macos`
- created ebook is found at `./output/<subredditname>.epub`


## Run and build
### Requirements
- nodejs
    - Tested with `node v10.11.0`

### Running locally

- Install required packages `npm i --production` (you don't need archiver to be installed)
- copy `.env.default` to `.env` **OR** `config.default.txt` to `config.txt` in root folder
- modify `.env` file to your liking
- run with `npm run start` **OR** `node index.js`
- created ebook is found at `./output/<subredditname>.epub`

NOTE: Windows users might need to run `npm i --production` in cmd with administrator privaledges for node-gyp install to success

### Building executable

- Install required packages `npm i`
- If not installed, install pkg globally `npm i -g pkg`
- run `npm run build-[linux|win|macos]` to build Linux, Windows or macOS (x64) executables.
    - compiles executable to root folder

#### Required files

- cover/Reddit2Ebook.jpg
- .env **OR** config.txt
- index.js **OR** executable file

## .env / config.txt
```
subreddit=r/talesfromtechsupport    # Subreddit with r/
max_pages=10                        # Maxium pages to loop trough
kindle_to_email=user@kindle.com     # Your personal kindle email (NOT YET AVAILABLE)
kindle_from_email=user@mail.com     # Your whitelisted email (NOT YET AVAILABLE)
```

NOTE: config.txt is prioritized over .env

## TODO

- Send to kindle support (https://www.amazon.com/gp/sendtokindle/email)
- Add support for comments

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

NOTE: Windows users might need to run `npm i --production` in cmd with administrator privileges for node-gyp install to success

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
# Base configuration. Subreddit is required.
subreddit=r/talesfromtechsupport    # Subreddit with r/
max_pages=10                        # Maxium pages to loop trough

# Comments (optional). Also extremely slow. disabled by default.
comments_include=false              # Enable comments support
comments_min_points=2               # comments minimum points
comments_min_length=50              # comment minimum length
comments_max_parent=3               # Maxium ammount comments on top level 
comments_max_replies=2              # Maxium amount of replies
comments_max_replies_indentation=3  # How deep we go. How many levels of replies we output.

kindle_to_email=user@kindle.com     # Your personal kindle email (NOT YET AVAILABLE)
kindle_from_email=user@mail.com     # Your whitelisted email (NOT YET AVAILABLE)
```
NOTE: config.txt is prioritized over .env


After adding comments support, configuration gets little complicated.

Here is little explanation.

As default `comments_max_parent` set as 3, we take 3 top level comments.

After that we check if we have `comments_max_replies` set. In default configuration it's 2. 
That means we take 2 replies for every top level comment. 

After that we check how deep we go with `comments_max_replies_indentation`. Default is 3. 
That means we go two levels below first reply. 

So in default configuration, if message thread have 4 indented replies, we only go to "level" 3.



## TODO

- Send to kindle support (https://www.amazon.com/gp/sendtokindle/email)
- Add local database to remember build ebooks (and renaming ebooks with part x)
- ~~Add support for comments~~
    - if comments go over certain limit, there is change that all is not fetched.



# Changelog

### Release 1.1.0

```
2018-10-01 - Second release

- added comments support
```

### Release 1.0.0

```
2018-10-01 - First release

- Turn any subreddit to an ebook
    - Supports only selftext post, no images
- Custom ebook cover with subreddit name
- Fully opensource
- Easy to configure and use
```
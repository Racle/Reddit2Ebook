# Reddit2Ebook
Turns any subreddit (selftext) to ebook format.

App currently loads post starting from newest available.

It also ignores sticky messages and non-selfpost messages.


## requirements
- nodejs
    - Tested with `node v10.11.0`

## Usage

- Install required packages `npm i`
- copy `.env.default` to `.env` in root folder
- modify `.env` file to your liking
- run with `npm run start` OR `node index.js`
- created ebook is found at `./output/<subredditname>.epub`


## .env
```
subreddit=r/talesfromtechsupport    # Subreddit with r/
max_pages=10                        # Maxium pages to loop trough
kindle_to_email=user@kindle.com     # Your personal kindle email
kindle_from_email=user@mail.com     # Your whitelisted email
```

## TODO

- Send to kindle support (https://www.amazon.com/gp/sendtokindle/email)
const FeedParser = require('feedparser');
const entities = require('html-entities').AllHtmlEntities;
const fetch = require('node-fetch');
const striptags = require('striptags');
const localization = require('./localization');

module.exports = {
    getFeed : function (url) {
        return new Promise((resolve, reject) => {
            let req = fetch(url);
            let feedparser = new FeedParser(null);
            let items = [];

            req.then(function (res) {
                console.log('Is Get Feed Status OK = ' + res.ok);
                console.log('Get Feed Status = ' + res.status);
                console.log('Get Feed Body = ' + res.body);
                if (res.status === 200) {
                    res.body.pipe(feedparser); // res.body is a stream
                } else {
                    reject(Error('Bad status code'));
                }
            }, function (err) {
                reject(err);
            });

            // Received stream. Read them, process them, and save them in a list
            feedparser.on('readable', async function() {
                let stream = this;
                let meta = this.meta;

                // Get localization function for the feed's language
                let locale = meta['language'];
                let t = await localization.init(locale);

                // Get ampersand replacement for that language (i.e: 'and' in English)
                const ampersandReplacement = t('AMPERSAND');

                let item;
                while (item = stream.read()) {
                    let feedItem = {};
                    // Process each item from the feed and push it to the items list if it exists
                    if (item['title'] && item['date']) {
                        feedItem['title'] = item['title'];
                        feedItem['title'] = entities.decode(striptags(feedItem['title']));
                        feedItem['title'] = feedItem['title'].trim();
                        feedItem['title'] = feedItem['title'].replace(/[&]/g,ampersandReplacement).replace(/[<>]/g,'');

                        feedItem['date'] = new Date(item['date']).toUTCString();

                        if (item['description']) {
                            feedItem['description'] = item['description'];
                            feedItem['description'] = entities.decode(striptags(feedItem['description']));
                            feedItem['description'] = feedItem['description'].trim();
                            feedItem['description'] = feedItem['description'].replace(/[&]/g,ampersandReplacement).replace(/[<>]/g,'');
                        }

                        if (item['link']) {
                            feedItem['link'] = item['link'];
                        }

                        if (item['image'] && item['image'].url) {
                            feedItem['imageUrl'] = item['image'].url;
                        }
                        items.push(feedItem);
                    }
                }
            });

            // All items parsed. Return them
            feedparser.on('end', function () {
                let count = 0;
                items.sort(function (a, b) {
                    return new Date(b.date) - new Date(a.date);
                });
                items.forEach(function (feedItem) {
                    feedItem['count'] = count++;
                });

                resolve(items);
            });

            feedparser.on('error', function(err) {
                reject(err);
            });
        });
    },
};
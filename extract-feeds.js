/* ------------------------------------------------------
    id: 1
    url: https://www.reddit.com/r/technology/new/?sort=new
    entries: .entry
    exclude: .sponsored-tagline, .stickied-tagline
    label: .linkflairlabel
    title: a.title
    link: a.title
    discussion: a.comments
    name: Technology Subreddit
    updated: 2016-02-20T19:43:07.541725
    update_interval: 02:00:00
   ------------------------------------------------------ */
"use strict";

// Tell Node's memory leak checks to stand down
require('events').defaultMaxListeners = 100;

let requestPage = require('gs-html-request'),
    extract = require('gs-html-extract'),
    stdin = require('gs-stdin'),
    co = require('co'),
    err = process.stderr,
    out = process.stdout;

loadFeeds();  // Note: this call is async

function loadFeeds() {
  return co(function* () {
    let feeds = yield stdin.asJson();
    if (!feeds || feeds.length === 0) {
      err.write("All feeds are current\n");
      process.exit(1);
    }
    feeds = feeds.map(feed => requestPage(feed, extract.links));
    let results = yield Promise.all(feeds);
    results = results.reduce((prev, curr) => prev.concat(curr));
    results = results.filter(result => result.url.match(/^(?:https?:|ftps?:)?\/\//));
    results = results.map(result => requestPage(result, extract.meta));
    err.write(`Loading ${results.length} entries from ${feeds.length} feed(s)\n`);
    // Extract info and write out as CSV
    let rows = yield Promise.all(results);
    rows.filter(row => !!row).forEach(row => out.write(row.map(csvQuote).join(',') + '\n'));
  });
}

function csvQuote(value, index) {
  if (index === 0) {  // First entry is a feed id (integer)
    return value;
  }
  return value ? '"' + value.replace(/\"/g, '""') + '"' : "";
}

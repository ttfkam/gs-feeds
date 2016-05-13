"use strict"

let err = process.stderr,
    nodeRequest = require('request').defaults({
      gzip: true,
      jar: true,
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.8',
        'Cache-Control': 'max-age=0',
        'Connection': 'close',
        'Language': 'en-us',
        // Make the requests look like Safari 9.1
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_4) AppleWebKit/601.5.17' +
                      ' (KHTML, like Gecko) Version/9.1 Safari/601.5.17'
      }
    });

function request(url) {
  return new Promise((resolve, reject) => {
    nodeRequest({ url: url }, (error, response, body) => {
      if (error || response.statusCode !== 200) {
        reject(error || "Error: Status was " + response.statusCode);
      } else if (response.headers['content-type'].indexOf('text/') === -1) {
        resolve("<html></html>");
      } else {
        resolve(body);
      }
    });
  });
}

module.exports = function (info, extractor) {
  return new Promise((resolve, reject) => {
    request(info.url).then(
        html => {
          if (html) {
            resolve(extractor(info, html));
          } else {
            err.write(`Error: ${info.url} failed to load\n\t${html}`);
            resolve(null);
          }
        },
        error => {
          err.write((error.msg || error) + "\n\t" + info.url + "\n");
          resolve(null);
        });
  });
};

"use strict"

function stdin (transformer) {
  return new Promise((resolve, reject) => {
    let stdin = process.stdin,
        text = "";
    stdin.setEncoding('utf8');
    stdin.on('readable', () => {
      text += (stdin.read() || "");
    });
    stdin.on('end', () => {
      if (text) {
        try {
          resolve(transformer(text));
        } catch (err) {
          err.write(err.msg + '\n\t' + text);
        }
      } else {
        reject(new Error("No information provided on stdin"));
      }
    });
  });
}

function stdinAsText () {
  return stdin(text => text);
}

function stdinAsJson () {
  return stdin(JSON.parse);
}

module.exports = {
  asText: stdinAsText,
  asJson: stdinAsJson
};

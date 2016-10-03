"use strict"

const FIELDS = ("site_name|canonical|url|title|description|type|locale" +
                "|content|image|audio|shortlink|cre|domain|shortcut icon").split('|'),
      DOMAIN_RE = /^https?:\/\/[^\/:]+(?::\d+)?/;

let err = process.stderr,
    cheerio = require('cheerio');

function extractLinks(feed, html) {
  err.write(`${feed.url} loaded...`)
  let $ = cheerio.load(html),
      links = [],
      selector = `${feed.entries}:not(${feed.exclude_selector})`;
  $(selector).each((index, el) => {
    let $el = $(el);
    links.push({
      feedId: feed.id,
      title: $el.find(feed.title_selector).text(),
      url: $el.find(feed.link_selector).attr('href'),
      label: $el.find(feed.label_selector).text(),
      discussion: $el.find(feed.discussion_selector).attr('href'),
      remote_id: $el.attr("id").substring("thing_".length)
    });
  });
  return links;
}

function getContent($) {
  let content = "";
  $("p:not([class])").each((index, el) => content += $(el).text());
  return content;
}

function normalizeUrl(url, domain) {
  if (url == null) {
    return null;
  }
  if (url.startsWith("//")) {
    return "https:" + url;
  }
  if (url.charAt(0) === '/') {
    return domain + url;
  }
  return url;
}

function extractMetadata(entry, html) {
  let $ = cheerio.load(html),
      info = extract($, $("meta[property]"),$("meta[name]"),$("link[rel]"));
  FIELDS.forEach(field => {
    info[field] = info[`og:${field}`] || info[field] || info[`twitter:${field}` || ""];
  });
  info.content = getContent($);
  let domain = entry.url.match(DOMAIN_RE)[0],
      url = normalizeUrl(info.canonical || entry.url, domain);
  return [
    entry.feedId,
    info.site_name || info.cre
                   || entry.url.match(/^https?:\/\/(?:www\.|mail\.|hosted\.)?([^\/:]+)/)[1],
    url,
    {
      title: info.title || entry.title,
      description: (info.description || "").replace(/[\n\r]+/g, " "),
      type: info.type || "article",
      locale: info.locale || "en"
    },
    entry.discussion,
    escapeLabels(entry.label, info.news_keywords),
    (info.content || "").replace(/[\n\r]+/g, " "),
    normalizeUrl(info.image) || "",
    normalizeUrl(info["shortcut icon"], domain) || "",
    entry.remote_id
  ];
}

function extract($, $prop, $name, $rel) {
  function insert(data, name, value) {
    return function(index, el) {
      let $el = $(el);
      data[$el.attr(name)] = $el.attr(value);
    };
  }

  let metadata = {};
  $rel.each(insert(metadata, "rel", "href"));
  $name.each(insert(metadata, "name", "content"));
  $prop.each(insert(metadata, "property", "content"));
  return metadata;
}

function normalizeLabel(label) {
  return (label || "").trim()
                      .replace(/\W*\b(.)/g, (m0, m1) => m1.toUpperCase())
                      .replace(/[^a-z0-9,]+/ig, "");
}

function escapeLabels(sourceLabel, keywords) {
  var labels = [];
  sourceLabel = (sourceLabel || "").trim();
  keywords = (keywords || "").trim();
  if (sourceLabel) {
    labels.push(sourceLabel);
  }
  if (keywords) {
    labels.push.apply(labels, keywords.split(','));
  }
  if (labels.length === 0) {
    return "";
  }
  labels = labels.map(normalizeLabel);
  labels = labels.filter(label => !!label && label.length < 50);
  return '{' + labels.join(",") + '}';
}

module.exports = {
  links: extractLinks,
  meta: extractMetadata
};

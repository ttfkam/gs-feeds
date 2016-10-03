-- Import articles from feed data
BEGIN;

-- Make the temp table look very much like the headlines table
CREATE TEMPORARY TABLE _import (LIKE aggregator.headlines INCLUDING DEFAULTS INCLUDING STORAGE) ON COMMIT DROP;
ALTER TABLE _import DROP COLUMN id;
ALTER TABLE _import ADD COLUMN remote_id character varying(32);

-- Import the data into the temp table from client's stdin
\copy _import (newsfeed, source, url, metadata, discussion, labels, content, teaser_image, favicon, remote_id) FROM PSTDIN WITH CSV;

-- Copy the new data into the main headlines table
INSERT INTO aggregator.headlines (newsfeed, source, url, metadata, https, discussion, labels, fts, teaser_image, favicon, content) (SELECT newsfeed, source, regexp_replace(url, 'https?:', '', 'i'), metadata, url ~ '^https:', discussion, labels, setweight(to_tsvector(coalesce((metadata->'title')::text,'')), 'A') || setweight(to_tsvector(coalesce((metadata->'description')::text, '')), 'B') || setweight(to_tsvector(coalesce(content, '')), 'D'), teaser_image, favicon, content FROM _import) ON CONFLICT DO NOTHING;

-- Clear the remote id in case we've hit a stall
UPDATE aggregator.newsfeeds SET last_id = '' WHERE updated < now() - update_interval;

-- Update the remote id with the latest
UPDATE aggregator.newsfeeds SET updated = now(), last_id = sub.rid FROM (SELECT newsfeed, max(remote_id) as rid FROM _import GROUP BY newsfeed) AS sub;

COMMIT;

-- Import articles from feed data
BEGIN;

CREATE TEMPORARY TABLE _import (LIKE aggregator.headlines INCLUDING DEFAULTS INCLUDING STORAGE) ON COMMIT DROP;
ALTER TABLE _import DROP COLUMN id;
ALTER TABLE _import ADD COLUMN remote_id character varying(32);
ALTER TABLE _import ADD COLUMN content text;

\copy _import (newsfeed, source, url, metadata, discussion, labels, content, thumbnail, remote_id) FROM PSTDIN WITH CSV;

INSERT INTO aggregator.headlines (newsfeed, source, url, metadata, https, discussion, labels, fts, thumbnail) (SELECT newsfeed, source, url, metadata, url ~ '^https:', discussion, labels, setweight(to_tsvector(coalesce((metadata->'title')::text,'')), 'A') || setweight(to_tsvector(coalesce((metadata->'description')::text, '')), 'B') || setweight(to_tsvector(coalesce(content, '')), 'D'), thumbnail FROM _import) ON CONFLICT DO NOTHING;

UPDATE aggregator.feeds SET updated = now(), last_id = sub.remote_id FROM (SELECT remote_id FROM _import ORDER BY remote_id DESC LIMIT 1) AS sub WHERE updated + update_interval < now();

COMMIT;


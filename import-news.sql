-- Import articles from feed data
BEGIN;

CREATE TEMPORARY TABLE _import (LIKE aggregator.headlines INCLUDING DEFAULTS INCLUDING STORAGE) ON COMMIT DROP;
ALTER TABLE _import DROP COLUMN id;
ALTER TABLE _import ADD COLUMN remote_id character varying(32);

\copy _import (newsfeed, source, url, title, description, content_type, locale, discussion, labels, content, image_url, remote_id) FROM PSTDIN WITH CSV;

INSERT INTO aggregator.headlines (newsfeed, source, url, title, description, content_type, locale, discussion, labels, content, fts, image_url) (SELECT newsfeed, source, url, title, description, content_type, locale, discussion, labels, content, setweight(to_tsvector(coalesce(title,'')), 'A') || setweight(to_tsvector(coalesce(description, '')), 'B') || setweight(to_tsvector(coalesce(content, '')), 'D'), image_url FROM _import) ON CONFLICT DO NOTHING;

UPDATE aggregator.feeds SET updated = now(), last_id = sub.remote_id FROM (SELECT remote_id FROM _import ORDER BY remote_id DESC LIMIT 1) AS sub WHERE updated + update_interval < now();

COMMIT;


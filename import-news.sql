-- Import articles from feed data
BEGIN;

CREATE TEMPORARY TABLE _import (LIKE aggregator.tidbits INCLUDING DEFAULTS INCLUDING STORAGE) ON COMMIT DROP;
--ALTER TABLE _import ALTER COLUMN id DROP NOT NULL;
--ALTER TABLE _import ALTER COLUMN id DROP DEFAULT;
ALTER TABLE _import DROP COLUMN id;

\copy _import (feed, source, url, title, description, content_type, locale, discussion, labels, content, image_url) FROM PSTDIN WITH CSV;

INSERT INTO aggregator.tidbits (feed, source, url, title, description, content_type, locale, discussion, labels, content, fts, image_url) (SELECT feed, source, url, title, description, content_type, locale, discussion, labels, content, setweight(to_tsvector(coalesce(title,'')), 'A') || setweight(to_tsvector(coalesce(description, '')), 'B') || setweight(to_tsvector(coalesce(content, '')), 'D'), image_url FROM _import) ON CONFLICT DO NOTHING;

UPDATE aggregator.feeds SET updated = CURRENT_TIMESTAMP WHERE updated + update_interval < CURRENT_TIMESTAMP;

COMMIT;


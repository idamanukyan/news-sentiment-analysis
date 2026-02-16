-- Seed initial Armenian news sources
INSERT INTO sources (name, url, type, language, config, active) VALUES
-- Armenian RSS Sources
('News.am', 'https://news.am/arm/news/rss/', 'RSS', 'ARMENIAN', '{"category": "general"}', true),
('Armenpress', 'https://armenpress.am/arm/rss/', 'RSS', 'ARMENIAN', '{"category": "state"}', true),
('1lurer.am', 'https://www.1lurer.am/hy/rss', 'RSS', 'ARMENIAN', '{"category": "general"}', true),
('Factor.am', 'https://factor.am/feed/', 'RSS', 'ARMENIAN', '{"category": "general"}', true),

-- Armenian Web Scrape Sources (RSS not available)
('CivilNet', 'https://www.civilnet.am/hy/', 'WEB_SCRAPE', 'ARMENIAN', '{"selector": "article.news-item"}', true),
('Hetq', 'https://hetq.am/hy/', 'WEB_SCRAPE', 'ARMENIAN', '{"selector": "article"}', true),
('Azatutyun', 'https://www.azatutyun.am/z/146', 'WEB_SCRAPE', 'ARMENIAN', '{"selector": ".media-block"}', true),

-- Russian Sources (Armenian media in Russian)
('News.am (Russian)', 'https://news.am/rus/news/rss/', 'RSS', 'RUSSIAN', '{"category": "general"}', true),
('Armenpress (Russian)', 'https://armenpress.am/rus/rss/', 'RSS', 'RUSSIAN', '{"category": "state"}', true),
('Sputnik Armenia', 'https://ru.armeniasputnik.am/export/rss2/archive/index.xml', 'RSS', 'RUSSIAN', '{"category": "general"}', true),

-- English Sources
('News.am (English)', 'https://news.am/eng/news/rss/', 'RSS', 'ENGLISH', '{"category": "general"}', true),
('Armenpress (English)', 'https://armenpress.am/eng/rss/', 'RSS', 'ENGLISH', '{"category": "state"}', true),
('CivilNet (English)', 'https://www.civilnet.am/en/', 'WEB_SCRAPE', 'ENGLISH', '{"selector": "article.news-item"}', true);

-- V33: Add Armenian web news sources
-- These sources will be scraped via web scraping

INSERT INTO sources (name, url, type, language, config, active, organization_id) VALUES
-- Yerevan Today
('Yerevan Today', 'https://yerevan.today/', 'WEB_SCRAPE', 'ARMENIAN', '{"category": "news"}', true, 1),

-- News.am Armenian (if not already exists as RSS)
('News.am Web', 'https://news.am/arm/', 'WEB_SCRAPE', 'ARMENIAN', '{"category": "news"}', true, 1),

-- Armlur.am
('Armlur.am', 'https://armlur.am/', 'WEB_SCRAPE', 'ARMENIAN', '{"category": "news"}', true, 1),

-- Yerkir Media
('Yerkir Media', 'https://yerkir.am/hy', 'WEB_SCRAPE', 'ARMENIAN', '{"category": "news"}', true, 1),

-- Hraparak.am
('Hraparak.am', 'https://hraparak.am/am', 'WEB_SCRAPE', 'ARMENIAN', '{"category": "news"}', true, 1),

-- Asekose.am
('Asekose.am', 'http://asekose.am/am/', 'WEB_SCRAPE', 'ARMENIAN', '{"category": "news"}', true, 1),

-- Euromedia24
('Euromedia24', 'https://euromedia24.com/hy', 'WEB_SCRAPE', 'ARMENIAN', '{"category": "news"}', true, 1),

-- Lurer.com
('Lurer.com', 'https://lurer.com/', 'WEB_SCRAPE', 'ARMENIAN', '{"category": "news"}', true, 1),

-- Radar Armenia
('Radar Armenia', 'https://radar.am/', 'WEB_SCRAPE', 'ARMENIAN', '{"category": "news"}', true, 1),

-- Civic.am
('Civic.am', 'https://civic.am/', 'WEB_SCRAPE', 'ARMENIAN', '{"category": "civil_society"}', true, 1),

-- Media News
('MediaNews', 'https://medianews.site/', 'WEB_SCRAPE', 'ARMENIAN', '{"category": "news"}', true, 1),

-- Politik.am
('Politik.am', 'https://politik.am/am', 'WEB_SCRAPE', 'ARMENIAN', '{"category": "politics"}', true, 1),

-- Pastinfo.am
('Pastinfo.am', 'https://www.pastinfo.am/hy/', 'WEB_SCRAPE', 'ARMENIAN', '{"category": "news"}', true, 1),

-- Ishkhanutyun.am (Government news)
('Ishkhanutyun.am', 'https://ishkhanutyun.am/hy', 'WEB_SCRAPE', 'ARMENIAN', '{"category": "government"}', true, 1),

-- Panorama.am
('Panorama.am', 'https://www.panorama.am/am', 'WEB_SCRAPE', 'ARMENIAN', '{"category": "news"}', true, 1)

ON CONFLICT (url) DO NOTHING;

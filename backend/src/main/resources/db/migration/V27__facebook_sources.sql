-- Add FACEBOOK to source type constraint and seed Facebook sources
-- Uses mbasic.facebook.com scraping with RSS Bridge fallback

-- Update the check constraint to allow FACEBOOK type
ALTER TABLE sources DROP CONSTRAINT IF EXISTS chk_source_type;
ALTER TABLE sources ADD CONSTRAINT chk_source_type
    CHECK (type IN ('RSS', 'WEB_SCRAPE', 'TELEGRAM', 'FACEBOOK'));

-- Seed initial Facebook public page sources for Armenian media monitoring
-- Using organization_id = 1 (default org)
INSERT INTO sources (name, url, type, language, config, active, organization_id) VALUES
-- Armenian Facebook Pages
('News.am (Facebook)', 'https://www.facebook.com/newsam', 'FACEBOOK', 'ARMENIAN',
 '{"page_id": "newsam", "scrape_method": "mbasic"}', true, 1),

('Armenpress (Facebook)', 'https://www.facebook.com/armenpress.am', 'FACEBOOK', 'ARMENIAN',
 '{"page_id": "armenpress.am", "scrape_method": "mbasic"}', true, 1),

('CivilNet (Facebook)', 'https://www.facebook.com/CivilNetTV', 'FACEBOOK', 'ARMENIAN',
 '{"page_id": "CivilNetTV", "scrape_method": "mbasic"}', true, 1),

('Azatutyun (Facebook)', 'https://www.facebook.com/azaboryan', 'FACEBOOK', 'ARMENIAN',
 '{"page_id": "azaboryan", "scrape_method": "mbasic"}', true, 1),

('Hetq (Facebook)', 'https://www.facebook.com/hetaboryan', 'FACEBOOK', 'ARMENIAN',
 '{"page_id": "hetaboryan", "scrape_method": "mbasic"}', true, 1),

('Factor.am (Facebook)', 'https://www.facebook.com/factor.am', 'FACEBOOK', 'ARMENIAN',
 '{"page_id": "factor.am", "scrape_method": "mbasic"}', true, 1),

('1lurer (Facebook)', 'https://www.facebook.com/1lurer', 'FACEBOOK', 'ARMENIAN',
 '{"page_id": "1lurer", "scrape_method": "mbasic"}', true, 1),

-- Russian Facebook Pages
('Sputnik Armenia (Facebook)', 'https://www.facebook.com/SputnikArmenia', 'FACEBOOK', 'RUSSIAN',
 '{"page_id": "SputnikArmenia", "scrape_method": "mbasic"}', true, 1),

-- English Facebook Pages
('CivilNet English (Facebook)', 'https://www.facebook.com/CivilNetEN', 'FACEBOOK', 'ENGLISH',
 '{"page_id": "CivilNetEN", "scrape_method": "mbasic"}', true, 1)

ON CONFLICT (url) DO NOTHING;

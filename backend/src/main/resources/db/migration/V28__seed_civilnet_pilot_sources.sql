-- V28: Seed CivilNet Pilot Sources
-- Telegram and Facebook sources for comprehensive Armenian media monitoring
-- Uses ON CONFLICT DO NOTHING to avoid duplicates

-- ============================================================================
-- TELEGRAM SOURCES (RUSSIAN)
-- ============================================================================

INSERT INTO sources (name, url, type, language, political_leaning, config, active, organization_id) VALUES
-- Pro-Russian / Military channels
('Parallel Z', 'https://t.me/parallel95', 'TELEGRAM', 'RUSSIAN', 'INDEPENDENT',
 '{"channel": "parallel95"}', true, 1),

('Odessa Za Pobedu', 'https://t.me/OdessaRussi', 'TELEGRAM', 'RUSSIAN', 'INDEPENDENT',
 '{"channel": "OdessaRussi"}', true, 1),

('Bagramyan 26', 'https://t.me/bagramyan26', 'TELEGRAM', 'RUSSIAN', 'INDEPENDENT',
 '{"channel": "bagramyan26"}', true, 1),

('Infoteka24', 'https://t.me/infoteka24', 'TELEGRAM', 'RUSSIAN', 'INDEPENDENT',
 '{"channel": "infoteka24"}', true, 1),

('Caliber Azerbaijan', 'https://t.me/caliber_az_official', 'TELEGRAM', 'RUSSIAN', 'INDEPENDENT',
 '{"channel": "caliber_az_official", "note": "Azerbaijani perspective"}', true, 1),

('ArmLine News', 'https://t.me/armline_news', 'TELEGRAM', 'RUSSIAN', 'INDEPENDENT',
 '{"channel": "armline_news"}', true, 1),

('Shaman Rahu', 'https://t.me/SchamanRahu', 'TELEGRAM', 'RUSSIAN', 'INDEPENDENT',
 '{"channel": "SchamanRahu"}', true, 1),

('Mina Z (Khachatryan)', 'https://t.me/MinaKhachatryanOfficial', 'TELEGRAM', 'RUSSIAN', 'INDEPENDENT',
 '{"channel": "MinaKhachatryanOfficial"}', true, 1),

('Shkvarka 2.0', 'https://t.me/shkvarka2', 'TELEGRAM', 'RUSSIAN', 'INDEPENDENT',
 '{"channel": "shkvarka2"}', true, 1),

('Arm Military', 'https://t.me/armmilitary', 'TELEGRAM', 'RUSSIAN', 'INDEPENDENT',
 '{"channel": "armmilitary"}', true, 1),

('Mash', 'https://t.me/mash', 'TELEGRAM', 'RUSSIAN', 'INDEPENDENT',
 '{"channel": "mash", "note": "Major Russian news aggregator"}', true, 1),

('ANNA NEWS', 'https://t.me/anna_news', 'TELEGRAM', 'RUSSIAN', 'INDEPENDENT',
 '{"channel": "anna_news"}', true, 1),

('Postvoyna / Hetpaterazm', 'https://t.me/Arm_Aeternum7', 'TELEGRAM', 'RUSSIAN', 'INDEPENDENT',
 '{"channel": "Arm_Aeternum7"}', true, 1),

('Zanghezur Autonomous Republic', 'https://t.me/zangezuravtonomia', 'TELEGRAM', 'RUSSIAN', 'INDEPENDENT',
 '{"channel": "zangezuravtonomia", "note": "Pro-Azerbaijan perspective"}', true, 1),

('Armenian Vendetta', 'https://t.me/ArmenianVendetta', 'TELEGRAM', 'RUSSIAN', 'INDEPENDENT',
 '{"channel": "ArmenianVendetta"}', true, 1),

('SisMasis', 'https://t.me/sisumasis', 'TELEGRAM', 'RUSSIAN', 'INDEPENDENT',
 '{"channel": "sisumasis"}', true, 1)

ON CONFLICT (url) DO NOTHING;

-- English Telegram (Military/Defense)
INSERT INTO sources (name, url, type, language, political_leaning, config, active, organization_id) VALUES
('Armenian Military Portal', 'https://t.me/armmilEng', 'TELEGRAM', 'ENGLISH', 'INDEPENDENT',
 '{"channel": "armmilEng"}', true, 1)
ON CONFLICT (url) DO NOTHING;

-- ============================================================================
-- TELEGRAM SOURCES (ARMENIAN)
-- ============================================================================

INSERT INTO sources (name, url, type, language, political_leaning, config, active, organization_id) VALUES
('MSmedia.am', 'https://t.me/msmedianews', 'TELEGRAM', 'ARMENIAN', 'INDEPENDENT',
 '{"channel": "msmedianews"}', true, 1),

('The Geopolitics', 'https://t.me/armgeopolitic', 'TELEGRAM', 'ARMENIAN', 'INDEPENDENT',
 '{"channel": "armgeopolitic"}', true, 1),

('New Armenia Blog', 'https://t.me/newarmeniablogarm', 'TELEGRAM', 'ARMENIAN', 'INDEPENDENT',
 '{"channel": "newarmeniablogarm"}', true, 1)

ON CONFLICT (url) DO NOTHING;

-- Note: Khosnak (t.me/+Ej9V37S8U185NGVi) is a private channel invite link
-- Private channels require bot membership, skipping for now

-- ============================================================================
-- FACEBOOK SOURCES (ARMENIAN)
-- ============================================================================

INSERT INTO sources (name, url, type, language, political_leaning, config, active, organization_id) VALUES
-- 168 Hours - Known opposition outlet
('168 Hours', 'https://www.facebook.com/168Armenia', 'FACEBOOK', 'ARMENIAN', 'OPPOSITION',
 '{"page_id": "168Armenia", "scrape_method": "authenticated"}', true, 1),

-- Major Armenian news portals
('Hraparak.am', 'https://www.facebook.com/haboryan', 'FACEBOOK', 'ARMENIAN', 'OPPOSITION',
 '{"page_id": "haboryan", "scrape_method": "authenticated"}', true, 1),

('Yerkir Media', 'https://www.facebook.com/yerkirmedia', 'FACEBOOK', 'ARMENIAN', 'INDEPENDENT',
 '{"page_id": "yerkirmedia", "scrape_method": "authenticated"}', true, 1),

('Armlur.am', 'https://www.facebook.com/armlur', 'FACEBOOK', 'ARMENIAN', 'INDEPENDENT',
 '{"page_id": "armlur", "scrape_method": "authenticated"}', true, 1),

('Asekose.am', 'https://www.facebook.com/asekose.am', 'FACEBOOK', 'ARMENIAN', 'INDEPENDENT',
 '{"page_id": "asekose.am", "scrape_method": "authenticated"}', true, 1),

('Lurer.com', 'https://www.facebook.com/lurer.com.am', 'FACEBOOK', 'ARMENIAN', 'INDEPENDENT',
 '{"page_id": "lurer.com.am", "scrape_method": "authenticated"}', true, 1),

('Euromedia24', 'https://www.facebook.com/euromedia24', 'FACEBOOK', 'ARMENIAN', 'INDEPENDENT',
 '{"page_id": "euromedia24", "scrape_method": "authenticated"}', true, 1),

('Panorama.am', 'https://www.facebook.com/panoraboryan', 'FACEBOOK', 'ARMENIAN', 'GOVERNMENT',
 '{"page_id": "panoraboryan", "scrape_method": "authenticated"}', true, 1),

('Pastinfo.am', 'https://www.facebook.com/pastinfo', 'FACEBOOK', 'ARMENIAN', 'INDEPENDENT',
 '{"page_id": "pastinfo", "scrape_method": "authenticated"}', true, 1),

('Politik.am', 'https://www.facebook.com/politik.am', 'FACEBOOK', 'ARMENIAN', 'INDEPENDENT',
 '{"page_id": "politik.am", "scrape_method": "authenticated"}', true, 1),

('Radar Armenia', 'https://www.facebook.com/radar.armenia', 'FACEBOOK', 'ARMENIAN', 'INDEPENDENT',
 '{"page_id": "radar.armenia", "scrape_method": "authenticated"}', true, 1),

('Civic.am', 'https://www.facebook.com/civic.am', 'FACEBOOK', 'ARMENIAN', 'INDEPENDENT',
 '{"page_id": "civic.am", "scrape_method": "authenticated"}', true, 1),

('Medianews.am', 'https://www.facebook.com/medianews.am', 'FACEBOOK', 'ARMENIAN', 'INDEPENDENT',
 '{"page_id": "medianews.am", "scrape_method": "authenticated"}', true, 1),

('Araratnews.am', 'https://www.facebook.com/araratnews.am', 'FACEBOOK', 'ARMENIAN', 'INDEPENDENT',
 '{"page_id": "araratnews.am", "scrape_method": "authenticated"}', true, 1),

('Freenews.am', 'https://www.facebook.com/freenews.am', 'FACEBOOK', 'ARMENIAN', 'INDEPENDENT',
 '{"page_id": "freenews.am", "scrape_method": "authenticated"}', true, 1),

('Ishkhanutyun.am', 'https://www.facebook.com/ishkhanutyun.am', 'FACEBOOK', 'ARMENIAN', 'GOVERNMENT',
 '{"page_id": "ishkhanutyun.am", "scrape_method": "authenticated", "note": "Government/ruling party"}', true, 1),

('Aysor.am', 'https://www.facebook.com/aysor.am', 'FACEBOOK', 'ARMENIAN', 'INDEPENDENT',
 '{"page_id": "aysor.am", "scrape_method": "authenticated"}', true, 1),

('Para TV', 'https://www.facebook.com/paaboryan', 'FACEBOOK', 'ARMENIAN', 'INDEPENDENT',
 '{"page_id": "paaboryan", "scrape_method": "authenticated"}', true, 1),

('Yerevan Today', 'https://www.facebook.com/yerevantoday', 'FACEBOOK', 'ARMENIAN', 'INDEPENDENT',
 '{"page_id": "yerevantoday", "scrape_method": "authenticated"}', true, 1),

('Armenia News', 'https://www.facebook.com/armenianews.am', 'FACEBOOK', 'ARMENIAN', 'INDEPENDENT',
 '{"page_id": "armenianews.am", "scrape_method": "authenticated"}', true, 1)

ON CONFLICT (url) DO NOTHING;

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- Total sources added:
-- - Telegram Russian: 16
-- - Telegram English: 1
-- - Telegram Armenian: 3
-- - Facebook Armenian: 21
-- Total: 41 new sources
--
-- Note: Khosnak private channel skipped (requires bot membership)
-- Note: Some Facebook page IDs may need verification against actual page URLs

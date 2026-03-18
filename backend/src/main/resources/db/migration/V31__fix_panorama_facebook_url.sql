-- V31: Fix Panorama.am Facebook URL
-- The correct Facebook page is PanoramaAM, not panoraboryan

UPDATE sources
SET url = 'https://www.facebook.com/PanoramaAM',
    config = '{"page_id": "PanoramaAM", "scrape_method": "authenticated"}'
WHERE name = 'Panorama.am'
  AND type = 'FACEBOOK';

-- Also ensure there's no duplicate entry
DELETE FROM sources
WHERE url = 'https://www.facebook.com/panoraboryan'
  AND type = 'FACEBOOK'
  AND name != 'Panorama.am';

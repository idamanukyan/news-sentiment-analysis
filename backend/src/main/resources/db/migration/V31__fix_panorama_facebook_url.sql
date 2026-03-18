-- V31: Fix Panorama.am Facebook URL
-- The correct Facebook page is PanoramaAM, not panoraboryan
-- Handle case where PanoramaAM already exists

-- First, delete the old wrong entry (panoraboryan)
DELETE FROM sources
WHERE url = 'https://www.facebook.com/panoraboryan'
  AND type = 'FACEBOOK';

-- Ensure the correct entry exists with proper config
UPDATE sources
SET config = '{"page_id": "PanoramaAM", "scrape_method": "authenticated"}',
    name = 'Panorama.am',
    active = true
WHERE url = 'https://www.facebook.com/PanoramaAM'
  AND type = 'FACEBOOK';

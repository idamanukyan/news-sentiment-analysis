-- V32: Add website fallback URLs to Facebook sources
-- When Facebook scraping fails, the scraper will try these website URLs instead

-- Panorama.am
UPDATE sources SET config = jsonb_set(
    COALESCE(config::jsonb, '{}'::jsonb),
    '{website_url}',
    '"https://www.panorama.am/am/"'
)
WHERE type = 'FACEBOOK' AND name = 'Panorama.am';

-- 168 Hours
UPDATE sources SET config = jsonb_set(
    COALESCE(config::jsonb, '{}'::jsonb),
    '{website_url}',
    '"https://168.am/am/"'
)
WHERE type = 'FACEBOOK' AND name = '168 Hours';

-- Hraparak.am
UPDATE sources SET config = jsonb_set(
    COALESCE(config::jsonb, '{}'::jsonb),
    '{website_url}',
    '"https://hraparak.am/"'
)
WHERE type = 'FACEBOOK' AND name = 'Hraparak.am';

-- Yerkir Media
UPDATE sources SET config = jsonb_set(
    COALESCE(config::jsonb, '{}'::jsonb),
    '{website_url}',
    '"https://www.yerkirmedia.am/"'
)
WHERE type = 'FACEBOOK' AND name = 'Yerkir Media';

-- Armlur.am
UPDATE sources SET config = jsonb_set(
    COALESCE(config::jsonb, '{}'::jsonb),
    '{website_url}',
    '"https://armlur.am/"'
)
WHERE type = 'FACEBOOK' AND name = 'Armlur.am';

-- Lurer.com
UPDATE sources SET config = jsonb_set(
    COALESCE(config::jsonb, '{}'::jsonb),
    '{website_url}',
    '"https://lurer.com/"'
)
WHERE type = 'FACEBOOK' AND name = 'Lurer.com';

-- Pastinfo.am
UPDATE sources SET config = jsonb_set(
    COALESCE(config::jsonb, '{}'::jsonb),
    '{website_url}',
    '"https://pastinfo.am/"'
)
WHERE type = 'FACEBOOK' AND name = 'Pastinfo.am';

-- Politik.am
UPDATE sources SET config = jsonb_set(
    COALESCE(config::jsonb, '{}'::jsonb),
    '{website_url}',
    '"https://politik.am/"'
)
WHERE type = 'FACEBOOK' AND name = 'Politik.am';

-- Radar Armenia
UPDATE sources SET config = jsonb_set(
    COALESCE(config::jsonb, '{}'::jsonb),
    '{website_url}',
    '"https://radar.am/"'
)
WHERE type = 'FACEBOOK' AND name = 'Radar Armenia';

-- Aysor.am
UPDATE sources SET config = jsonb_set(
    COALESCE(config::jsonb, '{}'::jsonb),
    '{website_url}',
    '"https://www.aysor.am/am/"'
)
WHERE type = 'FACEBOOK' AND name = 'Aysor.am';

-- Yerevan Today
UPDATE sources SET config = jsonb_set(
    COALESCE(config::jsonb, '{}'::jsonb),
    '{website_url}',
    '"https://yerevan.today/"'
)
WHERE type = 'FACEBOOK' AND name = 'Yerevan Today';

-- CivilNet (Armenian)
UPDATE sources SET config = jsonb_set(
    COALESCE(config::jsonb, '{}'::jsonb),
    '{website_url}',
    '"https://www.civilnet.am/hy/"'
)
WHERE type = 'FACEBOOK' AND url LIKE '%CivilNetTV%';

-- CivilNet (English)
UPDATE sources SET config = jsonb_set(
    COALESCE(config::jsonb, '{}'::jsonb),
    '{website_url}',
    '"https://www.civilnet.am/en/"'
)
WHERE type = 'FACEBOOK' AND url LIKE '%CivilNetEN%';

-- Asekose.am
UPDATE sources SET config = jsonb_set(
    COALESCE(config::jsonb, '{}'::jsonb),
    '{website_url}',
    '"https://asekose.am/"'
)
WHERE type = 'FACEBOOK' AND name = 'Asekose.am';

-- Euromedia24
UPDATE sources SET config = jsonb_set(
    COALESCE(config::jsonb, '{}'::jsonb),
    '{website_url}',
    '"https://euromedia24.am/"'
)
WHERE type = 'FACEBOOK' AND name = 'Euromedia24';

-- Factor.am
UPDATE sources SET config = jsonb_set(
    COALESCE(config::jsonb, '{}'::jsonb),
    '{website_url}',
    '"https://factor.am/"'
)
WHERE type = 'FACEBOOK' AND url LIKE '%factor.am%';

-- Ishkhanutyun.am (Government)
UPDATE sources SET config = jsonb_set(
    COALESCE(config::jsonb, '{}'::jsonb),
    '{website_url}',
    '"https://ishkhanutyun.am/"'
)
WHERE type = 'FACEBOOK' AND name = 'Ishkhanutyun.am';

-- Sputnik Armenia
UPDATE sources SET config = jsonb_set(
    COALESCE(config::jsonb, '{}'::jsonb),
    '{website_url}',
    '"https://armeniasputnik.am/"'
)
WHERE type = 'FACEBOOK' AND url LIKE '%SputnikArmenia%';

-- 1lurer (First Channel)
UPDATE sources SET config = jsonb_set(
    COALESCE(config::jsonb, '{}'::jsonb),
    '{website_url}',
    '"https://www.1lurer.am/"'
)
WHERE type = 'FACEBOOK' AND url LIKE '%1lurer%';

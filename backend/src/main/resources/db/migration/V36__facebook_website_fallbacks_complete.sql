-- V36: Complete website fallbacks for all Facebook sources
-- Updates existing fallbacks with correct URLs and adds missing ones

-- Yerevan Today
UPDATE sources SET config = jsonb_set(
    COALESCE(config::jsonb, '{}'::jsonb),
    '{website_url}',
    '"https://yerevan.today/"'
)
WHERE type = 'FACEBOOK' AND (name ILIKE '%yerevan today%' OR url ILIKE '%yerevantoday%');

-- News.am
UPDATE sources SET config = jsonb_set(
    COALESCE(config::jsonb, '{}'::jsonb),
    '{website_url}',
    '"https://news.am/arm/"'
)
WHERE type = 'FACEBOOK' AND (name ILIKE '%news.am%' OR url ILIKE '%facebook.com/newsam%');

-- Armlur.am
UPDATE sources SET config = jsonb_set(
    COALESCE(config::jsonb, '{}'::jsonb),
    '{website_url}',
    '"https://armlur.am/"'
)
WHERE type = 'FACEBOOK' AND (name ILIKE '%armlur%' OR url ILIKE '%/armlur%');

-- Yerkir Media
UPDATE sources SET config = jsonb_set(
    COALESCE(config::jsonb, '{}'::jsonb),
    '{website_url}',
    '"https://yerkir.am/hy"'
)
WHERE type = 'FACEBOOK' AND (name ILIKE '%yerkir%' OR url ILIKE '%yerkirmedia%');

-- Hraparak.am
UPDATE sources SET config = jsonb_set(
    COALESCE(config::jsonb, '{}'::jsonb),
    '{website_url}',
    '"https://hraparak.am/am"'
)
WHERE type = 'FACEBOOK' AND (name ILIKE '%hraparak%' OR url ILIKE '%haboryan%');

-- Lurer.com
UPDATE sources SET config = jsonb_set(
    COALESCE(config::jsonb, '{}'::jsonb),
    '{website_url}',
    '"https://lurer.com/"'
)
WHERE type = 'FACEBOOK' AND (name ILIKE '%lurer%' OR url ILIKE '%lurer.com%');

-- Asekose.am
UPDATE sources SET config = jsonb_set(
    COALESCE(config::jsonb, '{}'::jsonb),
    '{website_url}',
    '"http://asekose.am/am/"'
)
WHERE type = 'FACEBOOK' AND (name ILIKE '%asekose%' OR url ILIKE '%asekose%');

-- Euromedia24
UPDATE sources SET config = jsonb_set(
    COALESCE(config::jsonb, '{}'::jsonb),
    '{website_url}',
    '"https://euromedia24.com/hy"'
)
WHERE type = 'FACEBOOK' AND (name ILIKE '%euromedia%' OR url ILIKE '%euromedia%');

-- Radar Armenia
UPDATE sources SET config = jsonb_set(
    COALESCE(config::jsonb, '{}'::jsonb),
    '{website_url}',
    '"https://radar.am/"'
)
WHERE type = 'FACEBOOK' AND (name ILIKE '%radar%' OR url ILIKE '%radar%');

-- Civic.am
UPDATE sources SET config = jsonb_set(
    COALESCE(config::jsonb, '{}'::jsonb),
    '{website_url}',
    '"https://civic.am/"'
)
WHERE type = 'FACEBOOK' AND (name ILIKE '%civic%' OR url ILIKE '%civic%');

-- Medianews.am
UPDATE sources SET config = jsonb_set(
    COALESCE(config::jsonb, '{}'::jsonb),
    '{website_url}',
    '"https://medianews.site/"'
)
WHERE type = 'FACEBOOK' AND (name ILIKE '%medianews%' OR url ILIKE '%medianews%');

-- Politik.am
UPDATE sources SET config = jsonb_set(
    COALESCE(config::jsonb, '{}'::jsonb),
    '{website_url}',
    '"https://politik.am/am"'
)
WHERE type = 'FACEBOOK' AND (name ILIKE '%politik%' OR url ILIKE '%politik%');

-- Pastinfo.am
UPDATE sources SET config = jsonb_set(
    COALESCE(config::jsonb, '{}'::jsonb),
    '{website_url}',
    '"https://www.pastinfo.am/hy/"'
)
WHERE type = 'FACEBOOK' AND (name ILIKE '%pastinfo%' OR url ILIKE '%pastinfo%');

-- Ishkhanutyun.am
UPDATE sources SET config = jsonb_set(
    COALESCE(config::jsonb, '{}'::jsonb),
    '{website_url}',
    '"https://ishkhanutyun.am/hy"'
)
WHERE type = 'FACEBOOK' AND (name ILIKE '%ishkhanutyun%' OR url ILIKE '%ishkhanutyun%');

-- Panorama.am
UPDATE sources SET config = jsonb_set(
    COALESCE(config::jsonb, '{}'::jsonb),
    '{website_url}',
    '"https://www.panorama.am/am"'
)
WHERE type = 'FACEBOOK' AND (name ILIKE '%panorama%' OR url ILIKE '%panoraboryan%');

-- Armenpress
UPDATE sources SET config = jsonb_set(
    COALESCE(config::jsonb, '{}'::jsonb),
    '{website_url}',
    '"https://armenpress.am/arm/"'
)
WHERE type = 'FACEBOOK' AND (name ILIKE '%armenpress%' OR url ILIKE '%armenpress%');

-- Azatutyun (RFE/RL Armenian)
UPDATE sources SET config = jsonb_set(
    COALESCE(config::jsonb, '{}'::jsonb),
    '{website_url}',
    '"https://www.azatutyun.am/"'
)
WHERE type = 'FACEBOOK' AND (name ILIKE '%azatutyun%' OR url ILIKE '%azaboryan%');

-- Hetq
UPDATE sources SET config = jsonb_set(
    COALESCE(config::jsonb, '{}'::jsonb),
    '{website_url}',
    '"https://hetq.am/hy"'
)
WHERE type = 'FACEBOOK' AND (name ILIKE '%hetq%' OR url ILIKE '%hetaboryan%');

-- 168 Hours
UPDATE sources SET config = jsonb_set(
    COALESCE(config::jsonb, '{}'::jsonb),
    '{website_url}',
    '"https://168.am/am/"'
)
WHERE type = 'FACEBOOK' AND (name ILIKE '%168%' OR url ILIKE '%168Armenia%');

-- Factor.am
UPDATE sources SET config = jsonb_set(
    COALESCE(config::jsonb, '{}'::jsonb),
    '{website_url}',
    '"https://factor.am/"'
)
WHERE type = 'FACEBOOK' AND (name ILIKE '%factor%' OR url ILIKE '%factor%');

-- 1lurer (First Channel)
UPDATE sources SET config = jsonb_set(
    COALESCE(config::jsonb, '{}'::jsonb),
    '{website_url}',
    '"https://www.1lurer.am/"'
)
WHERE type = 'FACEBOOK' AND (name ILIKE '%1lurer%' OR url ILIKE '%1lurer%');

-- Sputnik Armenia
UPDATE sources SET config = jsonb_set(
    COALESCE(config::jsonb, '{}'::jsonb),
    '{website_url}',
    '"https://armeniasputnik.am/"'
)
WHERE type = 'FACEBOOK' AND (name ILIKE '%sputnik%' OR url ILIKE '%SputnikArmenia%');

-- CivilNet Armenian
UPDATE sources SET config = jsonb_set(
    COALESCE(config::jsonb, '{}'::jsonb),
    '{website_url}',
    '"https://www.civilnet.am/hy/"'
)
WHERE type = 'FACEBOOK' AND url ILIKE '%CivilNetTV%';

-- CivilNet English
UPDATE sources SET config = jsonb_set(
    COALESCE(config::jsonb, '{}'::jsonb),
    '{website_url}',
    '"https://www.civilnet.am/en/"'
)
WHERE type = 'FACEBOOK' AND url ILIKE '%CivilNetEN%';

-- Aysor.am
UPDATE sources SET config = jsonb_set(
    COALESCE(config::jsonb, '{}'::jsonb),
    '{website_url}',
    '"https://www.aysor.am/am/"'
)
WHERE type = 'FACEBOOK' AND (name ILIKE '%aysor%' OR url ILIKE '%aysor%');

-- Araratnews.am
UPDATE sources SET config = jsonb_set(
    COALESCE(config::jsonb, '{}'::jsonb),
    '{website_url}',
    '"https://araratnews.am/"'
)
WHERE type = 'FACEBOOK' AND (name ILIKE '%araratnews%' OR url ILIKE '%araratnews%');

-- Freenews.am
UPDATE sources SET config = jsonb_set(
    COALESCE(config::jsonb, '{}'::jsonb),
    '{website_url}',
    '"https://freenews.am/"'
)
WHERE type = 'FACEBOOK' AND (name ILIKE '%freenews%' OR url ILIKE '%freenews%');

-- Armenia News
UPDATE sources SET config = jsonb_set(
    COALESCE(config::jsonb, '{}'::jsonb),
    '{website_url}',
    '"https://armenianews.am/"'
)
WHERE type = 'FACEBOOK' AND (name ILIKE '%armenia news%' OR url ILIKE '%armenianews%');

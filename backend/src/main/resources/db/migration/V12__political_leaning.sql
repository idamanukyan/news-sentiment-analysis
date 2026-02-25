-- V12: Add political leaning to sources for non-partisan credibility
-- This demonstrates AIIM monitors the full political spectrum equally

ALTER TABLE sources ADD COLUMN IF NOT EXISTS political_leaning VARCHAR(30);

-- Update existing sources with political leanings
-- Government-aligned sources
UPDATE sources SET political_leaning = 'GOVERNMENT' WHERE name ILIKE '%armenpress%' OR name ILIKE '%1tv%' OR name ILIKE '%public%';

-- Opposition-aligned sources
UPDATE sources SET political_leaning = 'OPPOSITION' WHERE name ILIKE '%168%' OR name ILIKE '%civilnet%' OR name ILIKE '%azatutyun%' OR name ILIKE '%factor%';

-- Independent sources
UPDATE sources SET political_leaning = 'INDEPENDENT' WHERE name ILIKE '%hetq%' OR name ILIKE '%evn%' OR name ILIKE '%media%';

-- Diaspora sources
UPDATE sources SET political_leaning = 'DIASPORA' WHERE name ILIKE '%diaspora%' OR name ILIKE '%asbarez%' OR name ILIKE '%massis%';

-- Default to INDEPENDENT for unassigned
UPDATE sources SET political_leaning = 'INDEPENDENT' WHERE political_leaning IS NULL;

-- Index for filtering
CREATE INDEX IF NOT EXISTS idx_sources_political_leaning ON sources(political_leaning);

COMMENT ON COLUMN sources.political_leaning IS 'Political alignment: GOVERNMENT, OPPOSITION, INDEPENDENT, DIASPORA';

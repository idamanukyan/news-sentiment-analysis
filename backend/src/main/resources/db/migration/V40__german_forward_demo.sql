-- Make the demo German-forward.
--
-- Two problems this fixes for the German reference demo:
--  1. The paged /narratives list (findAccessibleByUser) only shows narratives
--     the current user owns or has shared with them. The seeded narratives have
--     no owner, so the list looked empty. -> assign the German demo narratives
--     to the demo user (demo@aiim.am).
--  2. The dashboard "top narratives" widget and the active views mixed in the
--     older Armenian V10 demo narratives. -> archive the Armenian demo set so
--     the German narratives are the visible reference data.
--
-- Referenced by email/name (not hardcoded ids) so it is deterministic across
-- fresh migrates. Idempotent (plain UPDATEs).

-- 1. Own the German demo narratives so they appear in the analyst's list
UPDATE narratives
SET created_by = (SELECT id FROM users WHERE email = 'demo@aiim.am')
WHERE organization_id = 1
  AND name IN (
    'EU-Sanktionen ruinieren die deutsche Wirtschaft',
    'Ukraine-Hilfe befeuert Korruption',
    'Migration wird von Bruessel gesteuert',
    'Wahlbetrug-Behauptungen',
    'NATO treibt die Eskalation',
    'Energiewende als feindliche Uebernahme',
    'Mainstream-Medien verschweigen die Wahrheit'
  );

-- 2. Archive the Armenian V10 demo narratives so German is the visible set
UPDATE narratives
SET status = 'ARCHIVED'
WHERE organization_id = 1
  AND name IN (
    'Election Fraud Claims',
    'Foreign Interference - West',
    'Foreign Interference - Russia',
    'Voter Suppression',
    'Candidate Disinformation',
    'Security Threat Narratives',
    'Economic Collapse Claims',
    'Media Censorship Claims'
  );

-- 3. Give the German ACTIVE narratives stable article_count values so the
--    dashboard orders them sensibly (CRITICAL EU-Sanktionen on top).
UPDATE narratives AS n
SET article_count = v.cnt
FROM (VALUES
    ('EU-Sanktionen ruinieren die deutsche Wirtschaft', 58),
    ('Ukraine-Hilfe befeuert Korruption', 41),
    ('Migration wird von Bruessel gesteuert', 37),
    ('Wahlbetrug-Behauptungen', 33),
    ('Mainstream-Medien verschweigen die Wahrheit', 19)
) AS v(name, cnt)
WHERE n.organization_id = 1 AND n.name = v.name;

-- 4. Dismiss the Armenian demo threat alerts (active + acknowledged) so the
--    alerts feed is German-only
UPDATE threat_alerts
SET status = 'DISMISSED'
WHERE organization_id = 1
  AND status IN ('ACTIVE', 'ACKNOWLEDGED')
  AND narrative_id IN (
    SELECT id FROM narratives WHERE organization_id = 1 AND status = 'ARCHIVED'
  );

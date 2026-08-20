-- AIIM German Demo Data Seed
-- Illustrative German-language FIMI dataset for demonstrating AIIM to a
-- German / EU audience. Mirrors the pattern of V10__demo_data.sql but scoped
-- to the current multi-tenant schema (organization_id = 1, the demo org that
-- demo@aiim.am belongs to). Narratives are ranked with high article_count so
-- they surface at the top of the election / narrative dashboard.
--
-- NOTE: like V10 and V28, this ships demo content as a versioned migration and
-- therefore runs in every environment. Content is clearly illustrative.

-- ============================================
-- LANGUAGE SUPPORT: allow GERMAN sources
-- ============================================
ALTER TABLE sources DROP CONSTRAINT IF EXISTS chk_source_language;
ALTER TABLE sources ADD CONSTRAINT chk_source_language
    CHECK (language IN ('ARMENIAN', 'RUSSIAN', 'ENGLISH', 'GERMAN'));

-- ============================================
-- SOURCES: German news & Telegram channels
-- ============================================
INSERT INTO sources (name, url, type, language, active, config, organization_id) VALUES
('Tagesschau (ARD)',   'https://www.tagesschau.de/xml/rss2',        'RSS',      'GERMAN', true, '{"category": "public_broadcaster"}',                    1),
('Deutsche Welle',     'https://rss.dw.com/rdf/rss-de-all',         'RSS',      'GERMAN', true, '{"category": "international"}',                          1),
('ZDF heute',          'https://www.zdf.de/rss/zdf/nachrichten',    'RSS',      'GERMAN', true, '{"category": "public_broadcaster"}',                    1),
('Der Spiegel',        'https://www.spiegel.de/schlagzeilen/index.rss','RSS',   'GERMAN', true, '{"category": "news_magazine"}',                         1),
('RT DE',              'https://demo.aiim.am/feeds/rt-de',          'RSS',      'GERMAN', true, '{"category": "state_media", "bias": "pro_kremlin"}',    1),
('@de_freiepresse',    'https://t.me/de_freiepresse',               'TELEGRAM', 'GERMAN', true, '{"subscribers": 38000, "category": "fringe", "bias": "pro_kremlin"}', 1),
('@ukraine_klartext',  'https://t.me/ukraine_klartext',             'TELEGRAM', 'GERMAN', true, '{"subscribers": 61000, "category": "war_commentary", "bias": "pro_kremlin"}', 1)
ON CONFLICT (url) DO NOTHING;

UPDATE sources SET last_fetched = NOW() - (random() * interval '2 hours'),
                   last_success = NOW() - (random() * interval '2 hours')
WHERE language = 'GERMAN' AND last_fetched IS NULL;

-- ============================================
-- NARRATIVES: German-language disinformation
-- ============================================
INSERT INTO narratives (name, description, keywords, status, threat_level, article_count, alert_count, first_seen, last_seen, organization_id) VALUES
(
    'EU-Sanktionen ruinieren die deutsche Wirtschaft',
    'Koordinierte Erzählung, wonach die EU-Sanktionen gegen Russland Deutschland wirtschaftlich zerstören und die Regierung dies verschweige. Ziel: Untergrabung der Unterstützung für die Sanktionspolitik.',
    ARRAY['Sanktionen', 'Wirtschaftskrieg', 'Deindustrialisierung', 'Energiepreise', 'Wohlstand', 'Ampel-Versagen'],
    'ACTIVE', 'CRITICAL', 58, 0, NOW() - interval '18 days', NOW() - interval '20 minutes', 1
),
(
    'Ukraine-Hilfe befeuert Korruption',
    'Behauptungen, dass deutsche Militär- und Finanzhilfe für die Ukraine in korrupten Kanälen versickert und deutsche Steuerzahler betrogen werden.',
    ARRAY['Ukraine-Hilfe', 'Korruption', 'Steuergeld', 'Selenskyj', 'Waffenlieferungen', 'Veruntreuung'],
    'ACTIVE', 'HIGH', 41, 0, NOW() - interval '12 days', NOW() - interval '2 hours', 1
),
(
    'Migration wird von Bruessel gesteuert',
    'Narrative, wonach eine Migrationswelle absichtlich von der EU orchestriert werde, um nationale Identitaeten aufzuloesen ("Great Reset" / "Umvolkung").',
    ARRAY['Migration', 'Bruessel', 'Umvolkung', 'Great Reset', 'Grenzen', 'Asyl'],
    'ACTIVE', 'HIGH', 37, 0, NOW() - interval '15 days', NOW() - interval '1 hour', 1
),
(
    'Wahlbetrug-Behauptungen',
    'Koordinierte Behauptungen, dass anstehende Wahlen manipuliert oder gefaelscht wuerden, um Misstrauen in den demokratischen Prozess zu saeen.',
    ARRAY['Wahlbetrug', 'Manipulation', 'Briefwahl', 'gefaelscht', 'Wahlfaelschung'],
    'ACTIVE', 'HIGH', 33, 0, NOW() - interval '9 days', NOW() - interval '35 minutes', 1
),
(
    'NATO treibt die Eskalation',
    'Erzaehlung, wonach nicht Russland, sondern die NATO und Deutschland fuer die Eskalation des Krieges verantwortlich seien.',
    ARRAY['NATO', 'Eskalation', 'Kriegstreiber', 'Provokation', 'Friedensverhandlungen'],
    'MONITORING', 'MEDIUM', 26, 0, NOW() - interval '20 days', NOW() - interval '5 hours', 1
),
(
    'Energiewende als feindliche Uebernahme',
    'Behauptungen, die Energiewende sei ein von auslaendischen Interessen gesteuerter Angriff auf die deutsche Souveraenitaet und den Wohlstand.',
    ARRAY['Energiewende', 'Heizungsgesetz', 'Souveraenitaet', 'Enteignung', 'Deindustrialisierung'],
    'MONITORING', 'MEDIUM', 22, 0, NOW() - interval '16 days', NOW() - interval '8 hours', 1
),
(
    'Mainstream-Medien verschweigen die Wahrheit',
    'Metanarrative, das etablierte Medien pauschal als "Luegenpresse" delegitimiert, um alternative pro-Kreml-Quellen glaubwuerdiger erscheinen zu lassen.',
    ARRAY['Luegenpresse', 'Systemmedien', 'Zensur', 'gleichgeschaltet', 'alternative Medien'],
    'ACTIVE', 'LOW', 19, 0, NOW() - interval '22 days', NOW() - interval '3 hours', 1
)
ON CONFLICT (organization_id, name) DO UPDATE SET
    description = EXCLUDED.description,
    keywords = EXCLUDED.keywords,
    status = EXCLUDED.status,
    threat_level = EXCLUDED.threat_level,
    article_count = EXCLUDED.article_count,
    alert_count = EXCLUDED.alert_count,
    first_seen = EXCLUDED.first_seen,
    last_seen = EXCLUDED.last_seen;

-- ============================================
-- ARTICLES: German-language sample content
-- ============================================
INSERT INTO articles (source_id, external_id, title, content, title_en, detected_language, url, published_at, created_at)
SELECT (SELECT id FROM sources WHERE name = 'RT DE' LIMIT 1),
    'de-demo-001',
    'Studie: Sanktionen kosten deutsche Haushalte Tausende Euro',
    'Eine kursierende Auswertung behauptet, die Russland-Sanktionen haetten jeden deutschen Haushalt bereits mehrere Tausend Euro gekostet - die Regierung verschweige das wahre Ausmass. Unabhaengige Oekonomen widersprechen der Darstellung.',
    'Study: Sanctions cost German households thousands of euros',
    'de', 'https://demo.aiim.am/a/de-001', NOW() - interval '20 hours', NOW() - interval '20 hours'
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE external_id = 'de-demo-001');

INSERT INTO articles (source_id, external_id, title, content, title_en, detected_language, url, published_at, created_at)
SELECT (SELECT id FROM sources WHERE name = '@ukraine_klartext' LIMIT 1),
    'de-demo-002',
    'EILMELDUNG: Milliarden aus Deutschland in Kiew verschwunden',
    'Unbestaetigte Berichte behaupten, deutsche Hilfsgelder seien in undurchsichtigen Kanaelen verschwunden. Belege werden nicht genannt; das Narrativ verbreitet sich synchron ueber mehrere Kanaele.',
    'BREAKING: Billions from Germany vanished in Kyiv',
    'de', 'https://t.me/ukraine_klartext/1201', NOW() - interval '3 hours', NOW() - interval '3 hours'
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE external_id = 'de-demo-002');

INSERT INTO articles (source_id, external_id, title, content, title_en, detected_language, url, published_at, created_at)
SELECT (SELECT id FROM sources WHERE name = '@de_freiepresse' LIMIT 1),
    'de-demo-003',
    'Bruessel plant angeblich naechste Migrationswelle',
    'In mehreren Telegram-Kanaelen wird zeitgleich behauptet, die EU steuere gezielt eine neue Migrationswelle. Die Behauptung stuetzt sich auf ein aus dem Kontext gerissenes Zitat.',
    'Brussels allegedly planning next migration wave',
    'de', 'https://t.me/de_freiepresse/884', NOW() - interval '5 hours', NOW() - interval '5 hours'
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE external_id = 'de-demo-003');

INSERT INTO articles (source_id, external_id, title, content, title_en, detected_language, url, published_at, created_at)
SELECT (SELECT id FROM sources WHERE name = 'RT DE' LIMIT 1),
    'de-demo-004',
    'Zweifel an der Sicherheit der Briefwahl',
    'Ein Beitrag saet Zweifel an der Integritaet der Briefwahl und legt nahe, Ergebnisse koennten manipuliert werden - ohne konkrete Nachweise.',
    'Doubts raised over postal-vote security',
    'de', 'https://demo.aiim.am/a/de-004', NOW() - interval '10 hours', NOW() - interval '10 hours'
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE external_id = 'de-demo-004');

INSERT INTO articles (source_id, external_id, title, content, title_en, detected_language, url, published_at, created_at)
SELECT (SELECT id FROM sources WHERE name = '@ukraine_klartext' LIMIT 1),
    'de-demo-005',
    'Nicht Russland, sondern die NATO eskaliert',
    'Der Beitrag kehrt die Verantwortung fuer die Kriegseskalation um und stellt die NATO als eigentlichen Aggressor dar.',
    'Not Russia but NATO is escalating',
    'de', 'https://t.me/ukraine_klartext/1240', NOW() - interval '6 hours', NOW() - interval '6 hours'
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE external_id = 'de-demo-005');

INSERT INTO articles (source_id, external_id, title, content, title_en, detected_language, url, published_at, created_at)
SELECT (SELECT id FROM sources WHERE name = 'RT DE' LIMIT 1),
    'de-demo-006',
    'Heizungsgesetz: Enteignung durch die Hintertuer?',
    'Der Artikel rahmt die Energiewende als von auslaendischen Interessen gesteuerten Angriff auf deutsches Eigentum.',
    'Heating law: expropriation through the back door?',
    'de', 'https://demo.aiim.am/a/de-006', NOW() - interval '2 days', NOW() - interval '2 days'
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE external_id = 'de-demo-006');

INSERT INTO articles (source_id, external_id, title, content, title_en, detected_language, url, published_at, created_at)
SELECT (SELECT id FROM sources WHERE name = '@de_freiepresse' LIMIT 1),
    'de-demo-007',
    'Was die Systemmedien Ihnen verschweigen',
    'Ein Meta-Beitrag delegitimiert etablierte Medien pauschal und verweist auf "alternative" Quellen mit pro-russischer Ausrichtung.',
    'What the system media are hiding from you',
    'de', 'https://t.me/de_freiepresse/905', NOW() - interval '3 hours', NOW() - interval '3 hours'
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE external_id = 'de-demo-007');

INSERT INTO articles (source_id, external_id, title, content, title_en, detected_language, url, published_at, created_at)
SELECT (SELECT id FROM sources WHERE name = 'Tagesschau (ARD)' LIMIT 1),
    'de-demo-008',
    'Faktencheck: Behauptung zu Sanktionskosten irrefuehrend',
    'Eine Ueberpruefung zeigt, dass die kursierende Zahl zu den angeblichen Sanktionskosten pro Haushalt aus dem Zusammenhang gerissen und stark uebertrieben ist.',
    'Fact-check: claim about sanction costs is misleading',
    'de', 'https://demo.aiim.am/a/de-008', NOW() - interval '8 hours', NOW() - interval '8 hours'
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE external_id = 'de-demo-008');

INSERT INTO articles (source_id, external_id, title, content, title_en, detected_language, url, published_at, created_at)
SELECT (SELECT id FROM sources WHERE name = 'Deutsche Welle' LIMIT 1),
    'de-demo-009',
    'Bundestag beschliesst weiteres Ukraine-Hilfspaket',
    'Der Bundestag hat ein weiteres Unterstuetzungspaket fuer die Ukraine beschlossen. Die Mittelverwendung unterliegt parlamentarischer Kontrolle.',
    'Bundestag approves further Ukraine aid package',
    'de', 'https://demo.aiim.am/a/de-009', NOW() - interval '1 day', NOW() - interval '1 day'
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE external_id = 'de-demo-009');

INSERT INTO articles (source_id, external_id, title, content, title_en, detected_language, url, published_at, created_at)
SELECT (SELECT id FROM sources WHERE name = 'ZDF heute' LIMIT 1),
    'de-demo-010',
    'Landeswahlleiter: Briefwahl ist sicher und geprueft',
    'Der Landeswahlleiter weist Behauptungen ueber angebliche Manipulationen zurueck und erlaeutert die Kontrollmechanismen der Briefwahl.',
    'State returning officer: postal voting is secure and audited',
    'de', 'https://demo.aiim.am/a/de-010', NOW() - interval '12 hours', NOW() - interval '12 hours'
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE external_id = 'de-demo-010');

INSERT INTO articles (source_id, external_id, title, content, title_en, detected_language, url, published_at, created_at)
SELECT (SELECT id FROM sources WHERE name = 'Der Spiegel' LIMIT 1),
    'de-demo-011',
    'Analyse: Wie pro-russische Kanaele Narrative synchronisieren',
    'Eine Analyse dokumentiert, wie mehrere Kanaele nahezu zeitgleich identische Formulierungen zu Sanktionen und Ukraine-Hilfe verbreiten.',
    'Analysis: how pro-Russian channels synchronise narratives',
    'de', 'https://demo.aiim.am/a/de-011', NOW() - interval '4 hours', NOW() - interval '4 hours'
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE external_id = 'de-demo-011');

INSERT INTO articles (source_id, external_id, title, content, title_en, detected_language, url, published_at, created_at)
SELECT (SELECT id FROM sources WHERE name = 'RT DE' LIMIT 1),
    'de-demo-012',
    'Umfrage: Vertrauen in Ampel-Regierung sinkt',
    'Der Beitrag verknuepft sinkende Umfragewerte direkt mit Sanktions- und Energiepolitik und verstaerkt die Wirtschaftskriegs-Erzaehlung.',
    'Poll: trust in coalition government declines',
    'de', 'https://demo.aiim.am/a/de-012', NOW() - interval '16 hours', NOW() - interval '16 hours'
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE external_id = 'de-demo-012');

-- ============================================
-- SENTIMENT RESULTS
-- ============================================
INSERT INTO sentiment_results (article_id, sentiment, confidence, model_version, reasoning)
SELECT a.id,
    CASE
        WHEN a.title ILIKE '%Faktencheck%' OR a.title ILIKE '%sicher%' OR a.title ILIKE '%beschliesst%' THEN 'NEUTRAL'
        WHEN a.external_id IN ('de-demo-001','de-demo-002','de-demo-003','de-demo-004','de-demo-005','de-demo-006','de-demo-007','de-demo-012') THEN 'NEGATIVE'
        ELSE 'NEUTRAL'
    END,
    0.75 + (random() * 0.2),
    'claude-3-haiku',
    'Automated sentiment analysis based on content indicators'
FROM articles a
WHERE a.external_id LIKE 'de-demo-%'
AND NOT EXISTS (SELECT 1 FROM sentiment_results sr WHERE sr.article_id = a.id)
ON CONFLICT (article_id, model_version) DO NOTHING;

-- ============================================
-- ARTICLE-NARRATIVE ASSOCIATIONS
-- ============================================
INSERT INTO article_narratives (article_id, narrative_id, confidence, detected_at)
SELECT a.id, n.id, c.conf, a.created_at
FROM (VALUES
    ('de-demo-001', 'EU-Sanktionen ruinieren die deutsche Wirtschaft', 0.93),
    ('de-demo-012', 'EU-Sanktionen ruinieren die deutsche Wirtschaft', 0.86),
    ('de-demo-008', 'EU-Sanktionen ruinieren die deutsche Wirtschaft', 0.80),
    ('de-demo-002', 'Ukraine-Hilfe befeuert Korruption', 0.91),
    ('de-demo-009', 'Ukraine-Hilfe befeuert Korruption', 0.72),
    ('de-demo-003', 'Migration wird von Bruessel gesteuert', 0.88),
    ('de-demo-004', 'Wahlbetrug-Behauptungen', 0.90),
    ('de-demo-010', 'Wahlbetrug-Behauptungen', 0.75),
    ('de-demo-005', 'NATO treibt die Eskalation', 0.87),
    ('de-demo-006', 'Energiewende als feindliche Uebernahme', 0.84),
    ('de-demo-007', 'Mainstream-Medien verschweigen die Wahrheit', 0.82),
    ('de-demo-011', 'EU-Sanktionen ruinieren die deutsche Wirtschaft', 0.78)
) AS c(ext_id, narr_name, conf)
JOIN articles a ON a.external_id = c.ext_id
JOIN narratives n ON n.name = c.narr_name AND n.organization_id = 1
WHERE NOT EXISTS (
    SELECT 1 FROM article_narratives an WHERE an.article_id = a.id AND an.narrative_id = n.id
);

-- ============================================
-- COORDINATION EVENTS (drive the board's coordination flags)
-- ============================================
INSERT INTO coordination_events (organization_id, narrative_id, detected_at, time_window_hours, source_count, article_count, similarity_score, coordination_type, description, sources_involved, status)
SELECT 1, n.id, NOW() - interval '90 minutes', 6, 14, 22, 0.91, 'TIMING_AND_CONTENT',
    'Synchronisierte Verbreitung nahezu identischer Formulierungen zu angeblichen Sanktionskosten ueber 14 Quellen innerhalb von 6 Stunden.',
    '["RT DE", "@de_freiepresse", "@ukraine_klartext"]'::jsonb, 'ACTIVE'
FROM narratives n WHERE n.name = 'EU-Sanktionen ruinieren die deutsche Wirtschaft' AND n.organization_id = 1
AND NOT EXISTS (SELECT 1 FROM coordination_events ce WHERE ce.narrative_id = n.id AND ce.detected_at > NOW() - interval '3 hours');

INSERT INTO coordination_events (organization_id, narrative_id, detected_at, time_window_hours, source_count, article_count, similarity_score, coordination_type, description, sources_involved, status)
SELECT 1, n.id, NOW() - interval '11 hours', 12, 8, 13, 0.79, 'CONTENT',
    'Wiederkehrende, inhaltlich abgestimmte Behauptungen zu veruntreuter Ukraine-Hilfe ueber mehrere Kanaele.',
    '["@ukraine_klartext", "@de_freiepresse"]'::jsonb, 'ACTIVE'
FROM narratives n WHERE n.name = 'Ukraine-Hilfe befeuert Korruption' AND n.organization_id = 1
AND NOT EXISTS (SELECT 1 FROM coordination_events ce WHERE ce.narrative_id = n.id AND ce.detected_at > NOW() - interval '13 hours');

INSERT INTO coordination_events (organization_id, narrative_id, detected_at, time_window_hours, source_count, article_count, similarity_score, coordination_type, description, sources_involved, status)
SELECT 1, n.id, NOW() - interval '4 hours', 8, 9, 11, 0.83, 'TIMING_AND_CONTENT',
    'Zeitgleiche Zweifel an der Briefwahl-Integritaet ohne Belege, verbreitet ueber koordinierte Kanaele.',
    '["RT DE", "@de_freiepresse"]'::jsonb, 'ACTIVE'
FROM narratives n WHERE n.name = 'Wahlbetrug-Behauptungen' AND n.organization_id = 1
AND NOT EXISTS (SELECT 1 FROM coordination_events ce WHERE ce.narrative_id = n.id AND ce.detected_at > NOW() - interval '6 hours');

-- ============================================
-- THREAT ALERTS
-- ============================================
INSERT INTO threat_alerts (narrative_id, alert_type, severity, title, description, status, triggered_at, metadata, organization_id)
SELECT n.id, 'VOLUME_SPIKE', 'CRITICAL',
    'Anstieg der Sanktions-Wirtschaftskriegs-Erzaehlung',
    '3.4x Anstieg des Content-Volumens in 2 Stunden. 18 neue Beitraege ueber 14 Quellen identifiziert.',
    'ACTIVE', NOW() - interval '90 minutes',
    '{"volume_increase": 3.4, "sources_affected": 14, "content_count": 18, "primary_language": "german"}'::jsonb, 1
FROM narratives n WHERE n.name = 'EU-Sanktionen ruinieren die deutsche Wirtschaft' AND n.organization_id = 1
AND NOT EXISTS (SELECT 1 FROM threat_alerts ta WHERE ta.narrative_id = n.id AND ta.title = 'Anstieg der Sanktions-Wirtschaftskriegs-Erzaehlung');

INSERT INTO threat_alerts (narrative_id, alert_type, severity, title, description, status, triggered_at, metadata, organization_id)
SELECT n.id, 'CROSS_PLATFORM', 'HIGH',
    'Koordinierte Ukraine-Korruptions-Kampagne',
    'Synchronisierte Beitraege ueber Telegram-Kanaele und Webseiten. Muster deutet auf koordinierte Kampagne hin.',
    'ACTIVE', NOW() - interval '2 hours',
    '{"platforms": ["telegram", "web"], "coordination_score": 0.79, "accounts_involved": 8}'::jsonb, 1
FROM narratives n WHERE n.name = 'Ukraine-Hilfe befeuert Korruption' AND n.organization_id = 1
AND NOT EXISTS (SELECT 1 FROM threat_alerts ta WHERE ta.narrative_id = n.id AND ta.title = 'Koordinierte Ukraine-Korruptions-Kampagne');

INSERT INTO threat_alerts (narrative_id, alert_type, severity, title, description, status, triggered_at, metadata, organization_id)
SELECT n.id, 'COORDINATED', 'HIGH',
    'Zweifel an Briefwahl koordiniert gestreut',
    'Zeitgleiche, belegfreie Zweifel an der Briefwahl ueber koordinierte Kanaele festgestellt.',
    'ACTIVE', NOW() - interval '4 hours',
    '{"coordination_score": 0.83, "sources": ["RT DE", "@de_freiepresse"], "window_hours": 8}'::jsonb, 1
FROM narratives n WHERE n.name = 'Wahlbetrug-Behauptungen' AND n.organization_id = 1
AND NOT EXISTS (SELECT 1 FROM threat_alerts ta WHERE ta.narrative_id = n.id AND ta.title = 'Zweifel an Briefwahl koordiniert gestreut');

INSERT INTO threat_alerts (narrative_id, alert_type, severity, title, description, status, triggered_at, metadata, organization_id)
SELECT n.id, 'NEW_NARRATIVE', 'MEDIUM',
    'Neue Umvolkungs-Erzaehlung erkannt',
    'Neues Messaging-Muster zu angeblich gesteuerter Migration; verbreitet primaer ueber Telegram.',
    'ACKNOWLEDGED', NOW() - interval '5 hours',
    '{"first_detected": "telegram", "spread_rate": "moderate", "reach_estimate": 40000}'::jsonb, 1
FROM narratives n WHERE n.name = 'Migration wird von Bruessel gesteuert' AND n.organization_id = 1
AND NOT EXISTS (SELECT 1 FROM threat_alerts ta WHERE ta.narrative_id = n.id AND ta.title = 'Neue Umvolkungs-Erzaehlung erkannt');

-- ============================================
-- UPDATE STATISTICS
-- ============================================
UPDATE narratives SET alert_count = (
    SELECT COUNT(*) FROM threat_alerts ta WHERE ta.narrative_id = narratives.id
)
WHERE organization_id = 1;

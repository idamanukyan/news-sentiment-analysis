-- V38: Backfill article_narratives for narratives with empty junctions.
--
-- Context: The scraper's LLM clustering populates article_narratives only for
-- narratives it creates itself. Narratives created manually via the API by
-- analysts have no junction entries and therefore showed 0 articles after
-- NarrativeController.getNarrativeArticles() stopped falling back to a raw
-- keyword search.
--
-- This migration walks every narrative that has at least one keyword and zero
-- entries in article_narratives, then inserts pairs for matching articles
-- published in the last 90 days. relevance_score is left NULL so
-- NarrativeRelevanceService can refine via Claude on its next run.
--
-- Idempotent: ON CONFLICT DO NOTHING. Safe to re-run; second run inserts zero rows.

DO $$
DECLARE
    n_record RECORD;
    inserted_count INTEGER;
BEGIN
    FOR n_record IN
        SELECT id, name, keywords
        FROM narratives
        WHERE keywords IS NOT NULL
          AND array_length(keywords, 1) > 0
          AND NOT EXISTS (
              SELECT 1 FROM article_narratives WHERE narrative_id = narratives.id
          )
    LOOP
        INSERT INTO article_narratives (article_id, narrative_id, confidence, detected_at, relevance_score)
        SELECT DISTINCT a.id, n_record.id, 0.7, NOW(), NULL
        FROM articles a
        WHERE a.published_at >= NOW() - INTERVAL '90 days'
          AND EXISTS (
              SELECT 1 FROM unnest(n_record.keywords) k
              WHERE LOWER(a.title) LIKE '%' || LOWER(k) || '%'
                 OR LOWER(a.content) LIKE '%' || LOWER(k) || '%'
                 OR LOWER(COALESCE(a.title_en, '')) LIKE '%' || LOWER(k) || '%'
                 OR LOWER(COALESCE(a.content_en, '')) LIKE '%' || LOWER(k) || '%'
          )
        ON CONFLICT (article_id, narrative_id) DO NOTHING;

        GET DIAGNOSTICS inserted_count = ROW_COUNT;
        RAISE NOTICE 'V38 backfill: narrative % (%) linked % articles',
            n_record.id, n_record.name, inserted_count;
    END LOOP;
END $$;

-- V37: Backfill NULL relevance_score values in article_narratives
--
-- Context: NarrativeController.getNarrativeArticles() previously had a keyword-based
-- fallback that returned articles even when the junction table was empty. That fallback
-- was removed because it returned articles that did not actually belong to the narrative.
--
-- The junction-table query filters with `relevance_score >= :threshold`. Historically
-- the query also accepted `relevance_score IS NULL`, so unscored pairs (created by the
-- scraper's LLM clustering) were treated as relevant. To preserve that behavior without
-- relying on the NULL-passes-filter clause, this migration backfills any pre-existing
-- NULL scores with the current default threshold (0.65). NarrativeRelevanceService will
-- still re-evaluate these pairs on its next run and overwrite the score with the real
-- AI-evaluated value.
--
-- This migration is idempotent: it only touches rows whose relevance_score IS NULL.

UPDATE article_narratives
SET relevance_score = 0.65
WHERE relevance_score IS NULL;

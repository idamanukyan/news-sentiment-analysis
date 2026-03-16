-- Add PENDING_REVIEW status for narrative approval workflow
-- The status column is VARCHAR(20), so no schema change needed
-- This migration documents the new valid status value

-- Valid narrative statuses are now:
-- ACTIVE, MONITORING, RESOLVED, ARCHIVED, PENDING_REVIEW

-- Auto-generated narratives (auto_generated=true) will now be created with
-- status='PENDING_REVIEW' instead of 'ACTIVE', requiring analyst approval

COMMENT ON COLUMN narratives.status IS 'Narrative status: ACTIVE, MONITORING, RESOLVED, ARCHIVED, PENDING_REVIEW. Auto-generated narratives start as PENDING_REVIEW.';

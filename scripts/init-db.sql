-- AIIM Database Initialization Script
-- Run this when setting up a new production database

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create application user with limited privileges (optional)
-- DO $$
-- BEGIN
--     IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'aiim_app') THEN
--         CREATE ROLE aiim_app WITH LOGIN PASSWORD 'change_me';
--     END IF;
-- END $$;

-- Grant privileges
-- GRANT CONNECT ON DATABASE aiim_production TO aiim_app;
-- GRANT USAGE ON SCHEMA public TO aiim_app;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO aiim_app;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO aiim_app;
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO aiim_app;
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO aiim_app;

-- Optimize PostgreSQL for application workload
-- These settings should be tuned based on available resources
-- ALTER SYSTEM SET shared_buffers = '256MB';
-- ALTER SYSTEM SET effective_cache_size = '768MB';
-- ALTER SYSTEM SET maintenance_work_mem = '64MB';
-- ALTER SYSTEM SET checkpoint_completion_target = 0.9;
-- ALTER SYSTEM SET wal_buffers = '16MB';
-- ALTER SYSTEM SET default_statistics_target = 100;
-- ALTER SYSTEM SET random_page_cost = 1.1;
-- ALTER SYSTEM SET effective_io_concurrency = 200;
-- ALTER SYSTEM SET work_mem = '4MB';
-- ALTER SYSTEM SET min_wal_size = '1GB';
-- ALTER SYSTEM SET max_wal_size = '4GB';

-- Note: Flyway will handle all table creation and migrations
-- This script is for initial database setup only

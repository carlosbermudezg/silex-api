-- Migration: Remove caja_id from scheduled_cron_events
-- Ejecutar en la base master (PGDATABASE_MASTER)

ALTER TABLE IF EXISTS scheduled_cron_events DROP COLUMN IF EXISTS caja_id;
ALTER TABLE IF EXISTS scheduled_cron_events ALTER COLUMN tenant_schema SET NOT NULL;
ALTER TABLE IF EXISTS scheduled_cron_events ALTER COLUMN tenant_database SET NOT NULL;

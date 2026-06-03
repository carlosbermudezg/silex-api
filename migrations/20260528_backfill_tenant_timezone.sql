-- Backfill existing tenants timezone (set default where null)
-- Ejecutar en la base master (PGDATABASE_MASTER)

UPDATE tenant
SET timezone = 'America/Guayaquil'
WHERE timezone IS NULL;

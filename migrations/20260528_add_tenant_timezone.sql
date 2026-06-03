-- Migration: Add timezone column to tenant
-- Ejecutar en la base master (PGDATABASE_MASTER)

ALTER TABLE tenant
  ADD COLUMN IF NOT EXISTS timezone VARCHAR(64) DEFAULT 'America/Guayaquil';

-- Migration: Create table for scheduled cron events (master DB)
-- Ejecutar en la base master (PGDATABASE_MASTER)

CREATE TABLE IF NOT EXISTS scheduled_cron_events (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  tenant_schema TEXT NOT NULL,
  tenant_database TEXT NOT NULL,
  caja_id INTEGER NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('open', 'close')),
  schedule_time TIME NOT NULL,
  days_of_week TEXT[] DEFAULT NULL, -- e.g. {'lunes','martes'} en español lowercase
  excluded_dates DATE[] DEFAULT NULL,
  active BOOLEAN DEFAULT true,
  last_run TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sce_schedule_time ON scheduled_cron_events (schedule_time);
CREATE INDEX IF NOT EXISTS idx_sce_tenant_id ON scheduled_cron_events (tenant_id);

-- Nota: los días en days_of_week deben almacenarse en español lowercase (p.ej. 'lunes')

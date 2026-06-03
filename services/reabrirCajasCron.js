const cron = require('node-cron');
const poolMaster = require('../config/dbMaster');
const { Client } = require('pg');

// Concurrency batch size (ajustable vía env)
const TENANT_BATCH_SIZE = parseInt(process.env.CRON_TENANT_CONCURRENCY, 10) || 5;
const TZ = process.env.GENERIC_TIMEZONE || 'America/Guayaquil';

// Pequeña función para validar nombres de esquema
const isValidSchema = (s) => /^[a-z0-9_]+$/.test((s || '').toLowerCase());

const runCajasOnce = async () => {
  // obtener hora y día en la zona configurada
  const now = new Date();
  const horas = new Intl.DateTimeFormat('es-EC', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(now);
  const fechaHoy = new Intl.DateTimeFormat('es-EC', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  const diaSemana = new Intl.DateTimeFormat('es-EC', { timeZone: TZ, weekday: 'long' }).format(now).toLowerCase();

  // 1) Obtener todos los eventos activos en master junto con la timezone del tenant
  let eventsRes;
  try {
    eventsRes = await poolMaster.query(`
      SELECT sce.id, sce.tenant_id, sce.tenant_schema, sce.tenant_database, sce.action,
             to_char(sce.schedule_time, 'HH24:MI') AS schedule_hhmm,
             sce.days_of_week, sce.excluded_dates,
             t.timezone AS tenant_timezone
      FROM scheduled_cron_events sce
      JOIN tenant t ON sce.tenant_id = t.id
      WHERE sce.active = true
    `);
  } catch (err) {
    console.error('[CRON] Error consultando scheduled events en master:', err.message);
    return;
  }

  const events = eventsRes.rows || [];
  if (events.length === 0) {
    console.log('[CRON] No hay eventos programados activos.');
    return;
  }

  // Agrupar por tenant (tenant_id + schema + database + timezone)
  const eventsByTenant = events.reduce((acc, ev) => {
    const tz = ev.tenant_timezone || TZ;
    const key = `${ev.tenant_id}|${ev.tenant_schema}|${ev.tenant_database}|${tz}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(ev);
    return acc;
  }, {});

  // Procesar cada grupo con concurrencia limitada
  const tenantKeys = Object.keys(eventsByTenant);
  for (let i = 0; i < tenantKeys.length; i += TENANT_BATCH_SIZE) {
    const batchKeys = tenantKeys.slice(i, i + TENANT_BATCH_SIZE);
    await Promise.all(batchKeys.map(async (key) => {
      const [tenantId, tenantSchema, tenantDatabase] = key.split('|');

      if (!isValidSchema(tenantSchema)) {
        console.warn(`[CRON] Schema inválido para tenant ${tenantId}: ${tenantSchema}`);
        return;
      }

      const client = new Client({
        user: process.env.PGUSER,
        host: process.env.PGHOST,
        database: tenantDatabase,
        password: process.env.PGPASSWORD,
        port: process.env.PGPORT
      });

      try {
        await client.connect();
        await client.query(`SET timezone = '${TZ}'`);
        await client.query(`SET search_path TO ${tenantSchema}, public`);

        const Caja = require('../models/caja')(client);
        const evList = eventsByTenant[key];
        const processedIds = [];

        // calcular hora local del tenant y filtrar eventos que correspondan a esta hora
        const tenantTZ = (evList[0] && evList[0].tenant_timezone) ? evList[0].tenant_timezone : TZ;
        const nowLocal = new Date();
        const horasLocal = new Intl.DateTimeFormat('es-EC', { timeZone: tenantTZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(nowLocal);
        const diaSemanaLocal = new Intl.DateTimeFormat('es-EC', { timeZone: tenantTZ, weekday: 'long' }).format(nowLocal).toLowerCase();
        const fechaHoyLocal = new Intl.DateTimeFormat('en-CA', { timeZone: tenantTZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(nowLocal); // YYYY-MM-DD

        const evToRun = evList.filter(ev => {
          const matchesTime = (ev.schedule_hhmm === horasLocal);
          const matchesDay = (!ev.days_of_week || ev.days_of_week.length === 0) || ev.days_of_week.includes(diaSemanaLocal);
          const excluded = ev.excluded_dates && ev.excluded_dates.length > 0 && ev.excluded_dates.includes(fechaHoyLocal);
          return matchesTime && matchesDay && !excluded;
        });

        if (evToRun.length === 0) {
          // nada para este tenant en esta hora local
          return;
        }

        // Obtener todas las cajas del tenant y aplicar la acción por evento
        const cajasRes = await client.query(`SELECT id, estado FROM cajas`);
        const cajas = cajasRes.rows || [];

        for (const ev of evToRun) {
          try {
            if (ev.action === 'open') {
              let opened = 0;
              for (const { id: cajaId, estado } of cajas) {
                try {
                  const res = await Caja.abrirCaja(cajaId, 1, true);
                  if (res && res.success) opened++;
                } catch (e) {
                  console.error(`[CRON][tenant:${tenantId}] Error abriendo caja ${cajaId}:`, e.message);
                }
              }
              console.log(`[CRON][tenant:${tenantId}][${horasLocal}] Evento ${ev.id} (open) aplicado a ${cajas.length} cajas, abiertas: ${opened}`);
            } else if (ev.action === 'close') {
              let closed = 0;
              for (const { id: cajaId, estado } of cajas) {
                try {
                  const res = await Caja.cerrarCaja(cajaId, 1);
                  if (res && res.message) closed++;
                } catch (e) {
                  console.error(`[CRON][tenant:${tenantId}] Error cerrando caja ${cajaId}:`, e.message);
                }
              }
              console.log(`[CRON][tenant:${tenantId}][${horasLocal}] Evento ${ev.id} (close) aplicado a ${cajas.length} cajas, cerradas: ${closed}`);
            } else {
              console.warn(`[CRON][tenant:${tenantId}] Acción desconocida para evento ${ev.id}: ${ev.action}`);
            }
            processedIds.push(ev.id);
          } catch (err) {
            console.error(`[CRON][tenant:${tenantId}] Error ejecutando evento ${ev.id}:`, err.message);
          }
        }

        // actualizar last_run para los eventos procesados
        if (processedIds.length > 0) {
          try {
            await poolMaster.query('UPDATE scheduled_cron_events SET last_run = NOW(), updated_at = NOW() WHERE id = ANY($1::int[])', [processedIds]);
          } catch (err) {
            console.warn('[CRON] No se pudo actualizar last_run en master:', err.message);
          }
        }

      } catch (err) {
        console.error(`[CRON] Error conectando al tenant ${tenantId} (${tenantSchema}@${tenantDatabase}):`, err.message);
      } finally {
        try { await client.end(); } catch (e) { /* ignore */ }
      }
    }));
  }

};

const programarCajasDinamico = () => {
  cron.schedule('* * * * *', async () => {
    await runCajasOnce();
  });

  console.log('[CRON] Programación dinámica de cajas activa (verifica cada minuto)');
};

module.exports = programarCajasDinamico;
module.exports.runCajasOnce = runCajasOnce;
const poolMaster = require('../config/dbMaster');
const poolSaas = require('../config/db');
const { runCajasOnce } = require('../services/reabrirCajasCron');

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function createTenantAndSchema({company, schema, timezone, database='client_db_1'}){
  // create tenant in master
  const now = new Date();
  const subscriptionEndsAt = new Date(Date.now() + 14*24*60*60*1000);
  const tenantRes = await poolMaster.query(`INSERT INTO tenant (company_name, subdomain, schema_name, database_name, timezone, status, subscription_start_at, subscription_ends_at, stripe_customer_id, routes_limit, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,'trial',NOW(),$6,NULL,1,NOW(),NOW()) RETURNING id`, [company, schema, schema, database, timezone, subscriptionEndsAt]);
  const tenantId = tenantRes.rows[0].id;

  // create schema and minimal tables in saas DB
  await poolSaas.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
  await poolSaas.query(`CREATE TABLE IF NOT EXISTS "${schema}".cajas (id SERIAL PRIMARY KEY, estado VARCHAR(32), "saldoActual" NUMERIC DEFAULT 0, "createdAt" TIMESTAMPTZ DEFAULT NOW(), "updatedAt" TIMESTAMPTZ DEFAULT NOW())`);
  await poolSaas.query(`CREATE TABLE IF NOT EXISTS "${schema}".turnos (
    id SERIAL PRIMARY KEY,
    "caja_id" INTEGER,
    "usuario_open" INTEGER,
    fecha_apertura TIMESTAMPTZ,
    monto_inicial NUMERIC,
    observaciones_apertura TEXT,
    fecha_cierre TIMESTAMPTZ,
    monto_final NUMERIC,
    observaciones_cierre TEXT,
    usuario_close INTEGER,
    sistema BOOLEAN,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
  )`);
  await poolSaas.query(`CREATE TABLE IF NOT EXISTS "${schema}".config_caja (id SERIAL PRIMARY KEY, hora_apertura_caja TIME, hora_cierre_caja TIME)`);

  // insert sample cajas
  await poolSaas.query(`INSERT INTO "${schema}".cajas (id, estado, "saldoActual") VALUES (1, 'cerrada', 0) ON CONFLICT (id) DO NOTHING`);
  await poolSaas.query(`INSERT INTO "${schema}".cajas (id, estado, "saldoActual") VALUES (2, 'abierta', 100) ON CONFLICT (id) DO NOTHING`);

  // Insertar turnos abiertos para ambas cajas (necesarios para operaciones de cierre)
  await poolSaas.query(`INSERT INTO "${schema}".turnos ("caja_id", "usuario_open", fecha_apertura, monto_inicial, observaciones_apertura, sistema) VALUES (1, 1, NOW(), 0, 'Apertura inicial de prueba', true)`);
  await poolSaas.query(`INSERT INTO "${schema}".turnos ("caja_id", "usuario_open", fecha_apertura, monto_inicial, observaciones_apertura, sistema) VALUES (2, 1, NOW(), 100, 'Apertura inicial de prueba', true)`);

  // insert default config times
  await poolSaas.query(`INSERT INTO "${schema}".config_caja (id, hora_apertura_caja, hora_cierre_caja) VALUES (1, '08:00:00', '20:00:00') ON CONFLICT (id) DO NOTHING`);

  return tenantId;
}

function localHHMMForTZ(timezone){
  const now = new Date();
  const hhmm = new Intl.DateTimeFormat('es-EC', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hour12: false }).format(now);
  return hhmm + ':00';
}

async function insertEventForTenant({tenantId, schema, database='client_db_1', action='open', scheduleTime}){
  // schedule_time as 'HH:MM:SS'
  const res = await poolMaster.query(`INSERT INTO scheduled_cron_events (tenant_id, tenant_schema, tenant_database, action, schedule_time, active, created_at, updated_at) VALUES ($1,$2,$3,$4,$5::time, true, NOW(), NOW()) RETURNING id`, [tenantId, schema, database, action, scheduleTime]);
  return res.rows[0].id;
}

async function test(){
  try{
    console.log('Creating tenants...');
    const suffix = Date.now();
    const t1 = {company:`T1-${suffix}`, schema:`test_tenant_a_${suffix}`, timezone:'America/Guayaquil'};
    const t2 = {company:`T2-${suffix}`, schema:`test_tenant_b_${suffix}`, timezone:'Pacific/Galapagos'};
    const id1 = await createTenantAndSchema(t1);
    const id2 = await createTenantAndSchema(t2);
    console.log('Tenants created:', id1, id2);

    const st1 = localHHMMForTZ(t1.timezone);
    const st2 = localHHMMForTZ(t2.timezone);
    console.log('Scheduled times (local):', st1, st2);

    const evId1 = await insertEventForTenant({tenantId:id1, schema:t1.schema, action:'open', scheduleTime:st1});
    const evId2 = await insertEventForTenant({tenantId:id2, schema:t2.schema, action:'close', scheduleTime:st2});

    console.log('Events inserted. Running cron once...');
    await runCajasOnce();

    // wait a bit for operations to finalise
    await sleep(1000);

    // check estados
    const res1 = await poolSaas.query(`SELECT id, estado FROM "${t1.schema}".cajas ORDER BY id`);
    const res2 = await poolSaas.query(`SELECT id, estado FROM "${t2.schema}".cajas ORDER BY id`);

    console.log('Cajas t1:', res1.rows);
    console.log('Cajas t2:', res2.rows);

      // Mostrar estado de los eventos en master (last_run)
      const eventsRes = await poolMaster.query('SELECT id, tenant_id, tenant_schema, action, last_run FROM scheduled_cron_events WHERE id = ANY($1::int[])', [[evId1, evId2]]);
      console.log('Scheduled events state:', eventsRes.rows);

      // Cleanup opcional: borrar tenants/events y dropear schemas si CLEANUP_TEST_FIXTURES=true
      if (process.env.CLEANUP_TEST_FIXTURES === 'true'){
        console.log('Cleaning up test fixtures...');
        await poolMaster.query('DELETE FROM scheduled_cron_events WHERE id = ANY($1::int[])', [[evId1, evId2]]);
        await poolMaster.query('DELETE FROM tenant WHERE id = ANY($1::int[])', [[id1, id2]]);
        await poolSaas.query(`DROP SCHEMA IF EXISTS "${t1.schema}" CASCADE`);
        await poolSaas.query(`DROP SCHEMA IF EXISTS "${t2.schema}" CASCADE`);
        console.log('Cleanup done.');
      }

    console.log('Test finished. Clean up not performed (manual).');
  }catch(err){
    console.error('Test error:', err);
  } finally {
    process.exit(0);
  }
}

if (require.main === module) {
  test();
}

module.exports = { test };

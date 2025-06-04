// models/Traslado.js
const pool = require('../config/db');

const Traslado = {
  createClienteTrasladoMasivo: async (data) => {
    const {
      oficina_origen_id,
      ruta_origen_id,
      cliente_ids,
      oficina_destino_id,
      ruta_destino_id,
      motivo_traslado,
      user_create
    } = data;
  
    const client = await pool.connect();
  
    try {
      await client.query('BEGIN');
  
      const insertQuery = `
        INSERT INTO traslado_clientes (
          oficina_origen_id,
          ruta_origen_id,
          cliente_id,
          oficina_destino_id,
          ruta_destino_id,
          motivo_traslado,
          user_create,
          created_at,
          updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, NOW(), NOW()
        )
        RETURNING *;
      `;
  
      const insertResults = [];
  
      for (const cliente_id of cliente_ids) {
        const result = await client.query(insertQuery, [
          oficina_origen_id,
          ruta_origen_id,
          cliente_id,
          oficina_destino_id,
          ruta_destino_id,
          motivo_traslado,
          user_create
        ]);
        insertResults.push(result.rows[0]);
      }
  
      // Actualizar todos los clientes trasladados
      const updateQuery = `
        UPDATE clientes
        SET "rutaId" = $1
        WHERE id = ANY($2::int[])
      `;
  
      await client.query(updateQuery, [ruta_destino_id, cliente_ids]);
  
      await client.query('COMMIT');
  
      return insertResults;
  
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error en traslado masivo de clientes', error);
      throw error;
    } finally {
      client.release();
    }
  },
  getAllTraslados: async () => {
    const query = `
      SELECT 
        t.id,
        t.cliente_id,
        c.nombres AS cliente_nombre,
        t.oficina_origen_id,
        o1.nombre AS oficina_origen,
        t.ruta_origen_id,
        r1.nombre AS ruta_origen,
        t.oficina_destino_id,
        o2.nombre AS oficina_destino,
        t.ruta_destino_id,
        r2.nombre AS ruta_destino,
        t.motivo_traslado,
        t.user_create,
        u.nombre AS creado_por,
        t.created_at
      FROM traslado_clientes t
      LEFT JOIN clientes c ON c.id = t.cliente_id
      LEFT JOIN oficinas o1 ON o1.id = t.oficina_origen_id
      LEFT JOIN oficinas o2 ON o2.id = t.oficina_destino_id
      LEFT JOIN ruta r1 ON r1.id = t.ruta_origen_id
      LEFT JOIN ruta r2 ON r2.id = t.ruta_destino_id
      LEFT JOIN usuarios u ON u.id = t.user_create
      ORDER BY t.created_at DESC
    `;
  
    const result = await pool.query(query);
    return result.rows;
  },
  createRutaTraslado: async (data) => {
    const {
      ruta_id,
      oficina_origen_id,
      oficina_destino_id,
      motivo_traslado,
      user_create
    } = data;
  
    const client = await pool.connect();
  
    try {
      await client.query('BEGIN');
  
      // Insertar el registro de traslado
      const insertQuery = `
        INSERT INTO traslado_rutas (
          ruta_id,
          oficina_origen_id,
          oficina_destino_id,
          motivo_traslado,
          user_create,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        RETURNING *;
      `;
  
      const result = await client.query(insertQuery, [
        ruta_id,
        oficina_origen_id,
        oficina_destino_id,
        motivo_traslado,
        user_create
      ]);
  
      // Actualizar la ruta con la nueva oficina
      const updateQuery = `
        UPDATE ruta
        SET "oficinaId" = $1
        WHERE id = $2
      `;
  
      await client.query(updateQuery, [oficina_destino_id, ruta_id]);
  
      await client.query('COMMIT');
  
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error en traslado de ruta', error);
      throw error;
    } finally {
      client.release();
    }
  },
  createTrasladoEfectivo: async (data) => {
    const {
      ruta_origen_id,
      ruta_destino_id,
      monto,
      motivo_traslado,
      user_create
    } = data;
  
    const client = await pool.connect();
  
    try {
      await client.query('BEGIN');
  
      // Insertar registro traslado_efectivo
      const insertTrasladoQuery = `
        INSERT INTO traslado_efectivo (
          ruta_origen_id,
          ruta_destino_id,
          monto,
          motivo_traslado,
          user_create,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        RETURNING *;
      `;
      const trasladoResult = await client.query(insertTrasladoQuery, [
        ruta_origen_id,
        ruta_destino_id,
        monto,
        motivo_traslado,
        user_create
      ]);
      const traslado = trasladoResult.rows[0];
  
      // Obtener nombres de las rutas
      const rutaNombresQuery = `
        SELECT id, nombre
        FROM ruta
        WHERE id = ANY($1)
      `;
      const rutasRes = await client.query(rutaNombresQuery, [[ruta_origen_id, ruta_destino_id]]);
      const rutasMap = {};
      rutasRes.rows.forEach(r => {
        rutasMap[r.id] = r.nombre;
      });
  
      const nombreRutaOrigen = rutasMap[ruta_origen_id] || `Ruta ${ruta_origen_id}`;
      const nombreRutaDestino = rutasMap[ruta_destino_id] || `Ruta ${ruta_destino_id}`;
  
      // Validar que las cajas estén abiertas y obtener sus datos (saldoActual, id)
      const cajaOrigenQuery = `
        SELECT c.id, c."saldoActual", t.id AS "turnoId"
        FROM cajas c
        LEFT JOIN turnos t ON t.caja_id = c.id AND t.fecha_cierre IS NULL
        WHERE c."rutaId" = $1 AND c.estado = 'abierta'
      `;
      const cajaDestinoQuery = `
        SELECT c.id, c."saldoActual", t.id AS "turnoId"
        FROM cajas c
        LEFT JOIN turnos t ON t.caja_id = c.id AND t.fecha_cierre IS NULL
        WHERE c."rutaId" = $1 AND c.estado = 'abierta'
      `;
  
      const cajaOrigenRes = await client.query(cajaOrigenQuery, [ruta_origen_id]);
      const cajaDestinoRes = await client.query(cajaDestinoQuery, [ruta_destino_id]);
  
      if (cajaOrigenRes.rowCount === 0) {
        return { error: 'Caja origen no tiene turno abierto o está cerrada' };
      }
      if (cajaDestinoRes.rowCount === 0) {
        return { error: 'Caja destino no tiene turno abierto o está cerrada' };
      }
  
      const cajaOrigen = cajaOrigenRes.rows[0];
      const cajaDestino = cajaDestinoRes.rows[0];
  
      // Validar saldo suficiente en caja origen
      if (cajaOrigen.saldoActual < monto) {
        return { error: 'Saldo insuficiente en la caja origen' };
      }
  
      // Actualizar saldo en caja origen (restar monto)
      const nuevoSaldoOrigen = parseFloat(cajaOrigen.saldoActual) - parseFloat(monto);
      const updateCajaOrigenQuery = `
        UPDATE cajas SET "saldoActual" = $1, "updatedAt" = NOW()
        WHERE id = $2
      `;
      await client.query(updateCajaOrigenQuery, [nuevoSaldoOrigen, cajaOrigen.id]);
  
      // Registrar movimiento en caja origen con nombre de ruta
      const insertMovimientoOrigenQuery = `
        INSERT INTO movimientos_caja (
          "cajaId",
          descripcion,
          saldo,
          saldo_anterior,
          monto,
          tipo,
          "usuarioId",
          "turnoId",
          category,
          "createdAt",
          "updatedAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      `;
      await client.query(insertMovimientoOrigenQuery, [
        cajaOrigen.id,
        `Traslado de efectivo a ruta ${nombreRutaDestino} (ID: ${ruta_destino_id})`,
        nuevoSaldoOrigen,
        cajaOrigen.saldoActual,
        monto,
        'transferencia',
        user_create,
        cajaOrigen.turnoId,
        'egreso'
      ]);
  
      // Actualizar saldo en caja destino (sumar monto)
      const nuevoSaldoDestino = parseFloat(cajaDestino.saldoActual) + parseFloat(monto);
      const updateCajaDestinoQuery = `
        UPDATE cajas SET "saldoActual" = $1, "updatedAt" = NOW()
        WHERE id = $2
      `;
      await client.query(updateCajaDestinoQuery, [nuevoSaldoDestino, cajaDestino.id]);
  
      // Registrar movimiento en caja destino con nombre de ruta
      const insertMovimientoDestinoQuery = `
        INSERT INTO movimientos_caja (
          "cajaId",
          descripcion,
          saldo,
          saldo_anterior,
          monto,
          tipo,
          "usuarioId",
          "turnoId",
          category,
          "createdAt",
          "updatedAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      `;
      await client.query(insertMovimientoDestinoQuery, [
        cajaDestino.id,
        `Recepción de traslado de efectivo desde ruta ${nombreRutaOrigen} (ID: ${ruta_origen_id})`,
        nuevoSaldoDestino,
        cajaDestino.saldoActual,
        monto,
        'transferencia',
        user_create,
        cajaDestino.turnoId,
        'ingreso'
      ]);
  
      await client.query('COMMIT');
      return traslado;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error en traslado de efectivo:', error.message);
      throw error;
    } finally {
      client.release();
    }
  },  
};

module.exports = Traslado;
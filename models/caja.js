// models/caja.js
const Ruta = require('./ruta');
const Cliente = require('./cliente');

module.exports = (db) => (Caja = {

  // Obtener todas las cajas con sus respectivas rutas y usuario responsable
  // con paginación y busqueda por nombre de ruta, nombre de usuario o estado de la caja
  // Pueden ser todas las cajas o las cajas por oficina
  getAll: async (limit, offset, search, oficinaId) => {
    try {
      const searchFilter = `%${search || ''}%`;

      let conditions = [];
      let values = [];
      let index = 1;

      // Filtro por oficina (opcional)
      if (oficinaId) {
        conditions.push(`ruta."oficinaId" = $${index++}`);
        values.push(oficinaId);
      }

      // Filtro de búsqueda por nombre de ruta, nombre de usuario o estado de la caja
      if (search) {
        conditions.push(`(
          ruta.nombre ILIKE $${index} OR 
          usuarios.nombre ILIKE $${index} OR 
          cajas.estado ILIKE $${index}
        )`);
        values.push(searchFilter);
        index++;
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Copiamos el índice actual para el LIMIT y OFFSET de la query de datos
      let dataIndex = index;

      const queryData = `
        SELECT 
          cajas.*,
          ruta.public_id AS ruta_public_id,
          ruta.nombre AS ruta_nombre,
          usuarios.public_id AS usuario_public_id,
          CASE 
            WHEN turnos.sistema = true THEN 'Sistema'
            ELSE usuarios.nombre
          END AS usuario_nombre
        FROM cajas
        JOIN ruta ON cajas."rutaId" = ruta.id
        LEFT JOIN usuarios ON ruta."userId" = usuarios.id
        LEFT JOIN turnos ON turnos.caja_id = cajas.id AND turnos.fecha_cierre IS NULL
        ${whereClause}
        ORDER BY cajas.id DESC
        LIMIT $${dataIndex++} OFFSET $${dataIndex++}
      `;

      const queryTotal = `
        SELECT COUNT(DISTINCT cajas.id)
        FROM cajas
        JOIN ruta ON cajas."rutaId" = ruta.id
        LEFT JOIN usuarios ON ruta."userId" = usuarios.id
        LEFT JOIN turnos ON turnos.caja_id = cajas.id AND turnos.fecha_cierre IS NULL
        ${whereClause}
      `;

      // Ejecución en paralelo pasando los parámetros exactos que cada query espera
      const [dataRes, totalRes] = await Promise.all([
        db.query(queryData, [...values, limit, offset]),
        db.query(queryTotal, values)
      ]);

      const totalItems = parseInt(totalRes.rows[0].count, 10);
      const totalPages = Math.ceil(totalItems / limit) || 1;
      const currentPage = Math.floor(offset / limit) + 1;

      const cajas = dataRes.rows.map((caja) => {
        return {
          id: caja.public_id,
          nombre: caja.nombre,
          estado: caja.estado,
          ruta: {
            id: caja.ruta_public_id,
            nombre: caja.ruta_nombre
          },
          usuario: {
            id: caja.usuario_public_id,
            nombre: caja.usuario_nombre
          }
        };
      });

      return {
        cajas,
        totalPages,
        page: currentPage,
        total: totalItems
      };
    } catch (error) {
      throw error;
    }
  }, //Verificado

  // Obtener una caja por su rutaId con sus movimientos paginados
  getById: async (rutaId, limit = 10, offset = 0) => {
    try {
      const resCaja = await db.query('SELECT * FROM cajas WHERE "rutaId" = $1', [rutaId]);
      const caja = resCaja.rows[0];

      if (!caja) return null;

      const queryMovimientos = `
        SELECT * FROM movimientos_caja
        WHERE "cajaId" = $1
        ORDER BY "createdAt" DESC
        LIMIT $2 OFFSET $3
      `;
      const resMovimientos = await db.query(queryMovimientos, [caja.id, limit, offset]);

      const queryTotal = `SELECT COUNT(*) FROM movimientos_caja WHERE "cajaId" = $1`;
      const resTotal = await db.query(queryTotal, [caja.id]);
      const totalItems = parseInt(resTotal.rows[0].count, 10);
      const totalPages = Math.ceil(totalItems / limit) || 1;
      const currentPage = Math.floor(offset / limit) + 1;

      return {
        id: caja.public_id,
        estado: caja.estado,
        saldoActual: caja.saldoActual,
        movimientos: {
          data: resMovimientos.rows.map((m) => {
            return {
              id: m.public_id,
              descripcion: m.descripcion,
              saldoActual: m.saldo,
              saldoAnterior: m.saldo_anterior,
              monto: m.monto,
              tipo: m.tipo,
              category: m.category,
              date: m.createdAt
            }
          }),
          total: totalItems,
          totalPages,
          page: currentPage
        }
      };
    } catch (error) {
      throw error;
    }
  }, //Verificado

  // Obtener todos los turnos abiertos
  getOpenTurnos: async (limit, offset, search) => {
    try {
      const searchFilter = `%${search || ''}%`;

      const queryTurnos = `
        SELECT 
          turnos.*,
          cajas.id AS caja_id,
          cajas."saldoActual" AS saldo,
          cajas.estado,
          cajas."rutaId" AS ruta_id,
          ruta.nombre AS ruta_nombre,
          CASE 
            WHEN turnos.sistema = true THEN 'Sistema'
            ELSE usuarios.nombre
          END AS usuario_nombre
        FROM turnos
        JOIN cajas ON turnos.caja_id = cajas.id
        JOIN ruta ON cajas."rutaId" = ruta.id
        LEFT JOIN usuarios ON usuarios.id = turnos.usuario_open
        WHERE turnos.fecha_cierre IS NULL
          AND ruta.nombre ILIKE $3
        ORDER BY turnos.id DESC
        LIMIT $1 OFFSET $2
      `;

      const queryTotal = `
        SELECT COUNT(*) FROM turnos
        JOIN cajas ON turnos.caja_id = cajas.id
        JOIN ruta ON cajas."rutaId" = ruta.id
        WHERE turnos.fecha_cierre IS NULL
          AND ruta.nombre ILIKE $1
      `;

      const [turnosRes, totalRes] = await Promise.all([
        db.query(queryTurnos, [limit, offset, searchFilter]),
        db.query(queryTotal, [searchFilter])
      ]);

      const totalItems = parseInt(totalRes.rows[0].count, 10);
      const totalPages = Math.ceil(totalItems / limit);
      const currentPage = Math.floor(offset / limit) + 1;

      return {
        turnos: turnosRes.rows,
        totalPages,
        page: currentPage,
        total: totalItems
      };

    } catch (error) {
      console.error("Error al obtener turnos abiertos:", error);
      throw error;
    }
  },

  //Se utiliza para crear ingresos en la caja desde los administradores
  createIngreso: async ({ descripcion, monto, ingresoCategoryId, userId, rutaId, idempotencyKey }) => {
    try {
      await db.query('BEGIN');

      if (idempotencyKey) {
        try {
          await db.query('INSERT INTO idempotency_keys (key) VALUES ($1)', [idempotencyKey]);
        } catch (error) {
          if (error.code === '23505') {
            await db.query('ROLLBACK');
            throw new Error('Esta transacción ya fue procesada anteriormente.');
          }
          throw error;
        }
      }

      // 🟡 Obtener la caja y su turno abierto
      const cajaResult = await db.query(`
        SELECT c.id, c."saldoActual", c.estado, t.id AS turno_id
        FROM cajas c
        LEFT JOIN turnos t ON c.id = t.caja_id AND t.fecha_cierre IS NULL
        WHERE c."rutaId" = $1
        LIMIT 1
      `, [rutaId]);

      if (cajaResult.rowCount === 0) {
        throw new Error('La caja no existe');
      }

      if (cajaResult.rows[0].estado === 'cerrada') {
        throw new Error('La caja está cerrada.');
      }

      const caja = cajaResult.rows[0];
      const cajaId = caja.id;
      const saldoActual = parseFloat(caja.saldoActual);
      const turnoId = caja.turno_id;

      if (!turnoId) {
        throw new Error('La caja no tiene un turno abierto.');
      }

      // 🟢 Insertar ingreso
      const insertIngresoQuery = `
        INSERT INTO ingresos (
          monto, descripcion, estado, "cajaId", "ingresoCategoryId",
          "user_created_id", "user_aproved_id", turno_id, "createdAt", "updatedAt", "public_id"
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW(), $9)
        RETURNING *;
      `;
      const ingresoValues = [monto, descripcion, 'aprobado', cajaId, ingresoCategoryId, userId, userId, turnoId, crypto.randomUUID()];
      const ingresoResult = await db.query(insertIngresoQuery, ingresoValues);
      const ingreso = ingresoResult.rows[0];

      // ✅ Registrar movimiento
      const saldoAnterior = saldoActual;
      const nuevoSaldo = (saldoAnterior + Number(monto));

      const insertMovimientoCajaQuery = `
        INSERT INTO movimientos_caja (
          "cajaId", descripcion, saldo, saldo_anterior, "createdAt", "updatedAt",
          monto, tipo, "usuarioId", category, "ingresoId", "turnoId", "public_id"
        )
        VALUES ($1, $2, $3, $4, NOW(), NOW(), $5, $6, $7, $8, $9, $10, $11);
      `;

      const movimientoValues = [
        cajaId,
        descripcion,
        nuevoSaldo,
        saldoAnterior,
        monto,
        'ingreso',
        userId,
        'ingreso',
        ingreso.id,
        turnoId,
        crypto.randomUUID()
      ];

      await db.query(insertMovimientoCajaQuery, movimientoValues);

      // 📉 Actualizar saldo
      const updateSaldoQuery = `
        UPDATE cajas
        SET "saldoActual" = $1,
            "updatedAt" = NOW()
        WHERE id = $2;
      `;
      await db.query(updateSaldoQuery, [nuevoSaldo, cajaId]);

      await db.query('COMMIT');
      return ingreso;

    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  }, // Verificado

  createEgreso: async ({ monto, descripcion, userId, gastoCategoryId, foto, rutaId, userRole, idempotencyKey }) => {
    const estado = (userRole === 'administrador' || userRole === 'administrador_oficina') ? 'aprobado' : 'pendiente';
    const aprovedId = (userRole === 'administrador' || userRole === 'administrador_oficina') ? userId : 0;

    try {
      await db.query('BEGIN');

      if (idempotencyKey) {
        try {
          await db.query('INSERT INTO idempotency_keys (key) VALUES ($1)', [idempotencyKey]);
        } catch (error) {
          if (error.code === '23505') {
            await db.query('ROLLBACK');
            throw new Error('Esta transacción ya fue procesada anteriormente.');
          }
          throw error;
        }
      }

      // 🔍 Validar hora máxima si es cobrador
      if (userRole === 'cobrador') {
        const configResult = await db.query(
          'SELECT hora_gastos FROM config_caja WHERE id=1 LIMIT 1'
        );

        if (configResult.rowCount === 0) {
          throw new Error('No se encontró la configuración de gastos');
        }

        const horaMaxima = configResult.rows[0].hora_gastos;
        const horaActual = new Intl.DateTimeFormat('es-EC', {
          timeZone: 'America/Guayaquil',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        }).format(new Date());

        if (horaActual > horaMaxima) {
          throw new Error(`No se pueden registrar gastos después de las ${horaMaxima}`);
        }
      }

      // 🟡 Obtener la caja del usuario
      const cajaResult = await db.query(
        'SELECT id, "saldoActual", estado FROM cajas WHERE "rutaId"=$1 LIMIT 1',
        [rutaId]
      );

      if (cajaResult.rowCount === 0) {
        throw new Error('No se encontró una caja asociada');
      }

      if (cajaResult.rows[0].estado === 'cerrada') {
        throw new Error('La caja está cerrada.');
      }

      const turno = await Caja.getTurnoById(cajaResult.rows[0].id)

      if (turno.rowCount === 0) {
        throw new Error('No no tienes un turno activo');
      }

      const cajaId = cajaResult.rows[0].id;
      const saldoActual = parseFloat(cajaResult.rows[0].saldoActual);

      // 🧮 Verificar saldo si es aprobado
      if (estado === 'aprobado' && monto > saldoActual) {
        throw new Error('Saldo insuficiente en caja para realizar el egreso');
      }

      // 🟢 Insertar egreso
      const insertEgresoQuery = `
        INSERT INTO egresos (
          monto, descripcion, estado, "cajaId", "gastoCategoryId",
          "user_created_id", "user_aproved_id", foto, turno_id, "createdAt", "updatedAt"
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
        RETURNING *;
      `;
      const egresoValues = [monto, descripcion, estado, cajaId, gastoCategoryId, userId, aprovedId, foto, turno.id];
      const egresoResult = await db.query(insertEgresoQuery, egresoValues);
      const egreso = egresoResult.rows[0];

      // ✅ Registrar movimiento si aprobado
      if (estado === 'aprobado') {
        const saldoAnterior = saldoActual;
        const nuevoSaldo = saldoAnterior - monto;

        const insertMovimientoCajaQuery = `
          INSERT INTO movimientos_caja (
            "cajaId", descripcion, saldo, saldo_anterior, "createdAt", "updatedAt",
            monto, tipo, "usuarioId", category, "turnoId"
          )
          VALUES ($1, $2, $3, $4, NOW(), NOW(), $5, $6, $7, $8, $9);
        `;

        const movimientoValues = [
          cajaId,
          descripcion,
          nuevoSaldo,
          saldoAnterior,
          monto,
          'gasto',
          userId,
          'egreso',
          turno.id
        ];

        await db.query(insertMovimientoCajaQuery, movimientoValues);

        // 📉 Actualizar saldo
        const updateSaldoQuery = `
          UPDATE cajas
          SET "saldoActual" = $1,
              "updatedAt" = NOW()
          WHERE id = $2;
        `;
        await db.query(updateSaldoQuery, [nuevoSaldo, cajaId]);
      }

      await db.query('COMMIT');
      return egreso;

    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  },

  aprobarEgreso: async (egresoId, userId, idempotencyKey) => {
    try {
      await db.query('BEGIN');

      if (idempotencyKey) {
        try {
          await db.query('INSERT INTO idempotency_keys (key) VALUES ($1)', [idempotencyKey]);
        } catch (error) {
          if (error.code === '23505') {
            await db.query('ROLLBACK');
            throw new Error('Esta transacción ya fue procesada anteriormente.');
          }
          throw error;
        }
      }

      // Verificamos que el egreso exista y no haya sido procesado ya
      const { rows } = await db.query(`SELECT * FROM egresos WHERE id = $1 FOR UPDATE`, [egresoId]);
      if (rows.length === 0) throw new Error('Egreso no encontrado');
      
      const egreso = rows[0];

      if (egreso.estado === 'aprobado') {
        throw new Error('El egreso ya fue aprobado anteriormente');
      }

      if (egreso.estado === 'rechazado') {
        throw new Error('No se puede aprobar un egreso que ya fue rechazado');
      }

      // Actualizar estado del egreso y registrar el usuario que aprobó
      const updateQuery = `
        UPDATE egresos
        SET estado = 'aprobado', "user_aproved_id" = $1, "updatedAt" = NOW()
        WHERE id = $2
      `;
      await db.query(updateQuery, [userId, egresoId]);

      // 🟡 Obtener la caja
      const cajaResult = await db.query(
        'SELECT id, "saldoActual", estado FROM cajas WHERE id = $1 LIMIT 1',
        [egreso.cajaId]
      );

      if (cajaResult.rowCount === 0) {
        throw new Error('La caja no existe');
      }

      if (cajaResult.rows[0].estado === 'cerrada') {
        throw new Error('La caja está cerrada.');
      }

      const saldoActual = parseFloat(cajaResult.rows[0].saldoActual);

      // 🧮 Verificar saldo si es aprobado
      if (egreso.monto > saldoActual) {
        throw new Error('Saldo insuficiente en caja para realizar el egreso');
      }

      // Registrar movimiento en caja
      const saldoAnterior = saldoActual;
      const nuevoSaldo = saldoAnterior - egreso.monto;

      const insertMovimientoCajaQuery = `
        INSERT INTO movimientos_caja (
          "cajaId", descripcion, saldo, saldo_anterior, "createdAt", "updatedAt",
          monto, tipo, "usuarioId", category, "egresoId", "turnoId"
        )
        VALUES ($1, $2, $3, $4, NOW(), NOW(), $5, $6, $7, $8, $9, $10);
      `;

      const movimientoValues = [
        egreso.cajaId,
        egreso.descripcion,
        nuevoSaldo,
        saldoAnterior,
        egreso.monto,
        'gasto',
        userId,
        'egreso',
        egreso.id,
        egreso.turno_id
      ];

      await db.query(insertMovimientoCajaQuery, movimientoValues);

      // 📉 Actualizar saldo
      const updateSaldoQuery = `
        UPDATE cajas
        SET "saldoActual" = $1,
            "updatedAt" = NOW()
        WHERE id = $2;
      `;
      await db.query(updateSaldoQuery, [nuevoSaldo, egreso.cajaId]);

      await db.query('COMMIT');
      return egreso;
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  },

  rechazarEgreso: async (egresoId, adminId, idempotencyKey) => {

    try {
      await db.query('BEGIN');

      if (idempotencyKey) {
        try {
          await db.query('INSERT INTO idempotency_keys (key) VALUES ($1)', [idempotencyKey]);
        } catch (error) {
          if (error.code === '23505') {
            await db.query('ROLLBACK');
            throw new Error('Esta transacción ya fue procesada anteriormente.');
          }
          throw error;
        }
      }

      // Verificamos que el egreso exista y lo bloqueamos temporalmente para esta transacción
      const { rows } = await db.query(`SELECT * FROM egresos WHERE id = $1 FOR UPDATE`, [egresoId]);
      if (rows.length === 0) throw new Error('Egreso no encontrado');
      const egreso = rows[0];

      if (egreso.estado === 'aprobado') {
        throw new Error('No se puede rechazar un egreso ya aprobado');
      }

      if (egreso.estado === 'rechazado') {
        throw new Error('Este egreso ya fue rechazado');
      }

      // Actualizamos el estado a rechazado
      await db.query(`
        UPDATE egresos SET estado = 'rechazado', "user_rejected_id" = $2, "updatedAt" = NOW() WHERE id = $1
      `, [egresoId, adminId]);

      await db.query('COMMIT');
      return { egresoId, estado: 'rechazado' };

    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  },

  createPago: async ({ creditoId, valor, metodoPago, userId, location }) => {
    const client = await db.connect();

    try {
      await client.query('BEGIN');

      // Obtener configuración
      const config = await Config.getConfigDefault();
      if (!config.id) return { error: 'No existe configuración para realizar el abono' };

      // Obtener crédito
      const creditoRes = await client.query(`
        SELECT id, interes, "usuarioId", "clienteId", monto, monto_interes_generado, saldo
        FROM creditos
        WHERE id = $1
        FOR UPDATE
      `, [creditoId]);

      if (creditoRes.rowCount === 0) return { error: 'El crédito no existe' };

      const {
        interes,
        usuarioId: creadorCreditoId,
        clienteId,
        monto,
        monto_interes_generado,
        saldo
      } = creditoRes.rows[0];

      // Valor deuda total inicio = capital + interés generado
      const totalDeudaInicial = parseFloat(monto + monto_interes_generado);

      // Abono máximo permitido
      const abonoMaximo = parseFloat((totalDeudaInicial * config.porcentaje_abono_maximo / 100).toFixed(2));

      // Deuda actual del crédito
      const deudaActual = parseFloat(saldo);
      const monto_abonado = parseFloat(valor.toFixed(2));

      if (monto_abonado > abonoMaximo) {
        return {
          error: `El abono no puede superar el ${config.porcentaje_abono_maximo}% del valor inicial de la deuda`
        };
      }

      if (monto_abonado > deudaActual) {
        return {
          error: `El abono no puede superar el valor adeudado: $ ${deudaActual.toFixed(2)}`
        };
      }

      // Validar caja
      const cajaRes = await client.query(`
        SELECT c.id, c."saldoActual", c.estado
        FROM cajas c
        JOIN ruta r ON r.id = c."rutaId"
        WHERE r."userId" = $1
        LIMIT 1
        FOR UPDATE
      `, [creadorCreditoId]);

      if (cajaRes.rowCount === 0) return { error: 'Caja no encontrada' };
      if (cajaRes.rows[0].estado === 'cerrada') return { error: 'La caja está cerrada.' };

      const turno = await Caja.getTurnoById(cajaRes.rows[0].id);
      if (!turno.id) return { error: 'No tienes un turno activo' };

      // Tipo pago
      const tipoPago = monto_abonado <= 0 ? 'visita' : 'abono';
      const saldoPagos = saldo - monto_abonado

      // Registrar pago
      const pagoRes = await client.query(`
        INSERT INTO pagos (
          monto, "user_created_id", "metodoPago", "createdAt", "updatedAt", cordenadas,
          estado, turno_id, cliente_id, tipo, saldo
        ) VALUES ($1, $2, $3, NOW(), NOW(), $4, 'aprobado', $5, $6, $7, $8)
        RETURNING id
      `, [monto_abonado, userId, metodoPago, location, turno.id, clienteId, tipoPago, saldoPagos]);

      const pagoId = pagoRes.rows[0].id;

      // Obtener cuotas impagas
      const cuotasRes = await client.query(`
        SELECT id, monto, monto_pagado, estado
        FROM cuotas
        WHERE "creditoId" = $1
        ORDER BY "fechaPago" ASC
        FOR UPDATE
      `, [creditoId]);

      const cuotasImpagas = cuotasRes.rows.filter(c => c.estado === 'impago');
      const numCuotas = cuotasRes.rows.length;

      // Calcular capital/interés por cuota
      const capitalCuota = monto / numCuotas;
      const interesCuota = monto_interes_generado / numCuotas;

      let montoRestante = monto_abonado;

      for (const cuota of cuotasImpagas) {
        if (montoRestante <= 0) break;

        const saldoCuota = cuota.monto - cuota.monto_pagado;

        const pagoAplicado = parseFloat(Math.min(saldoCuota, montoRestante).toFixed(2));
        const porcentajePago = pagoAplicado / cuota.monto;

        const capitalPago = parseFloat((capitalCuota * porcentajePago).toFixed(2));
        const interesPago = parseFloat((interesCuota * porcentajePago).toFixed(2));

        await client.query(`
          INSERT INTO pagos_cuotas ("pagoId", "cuotaId", monto_abonado, capital_pagado, interes_pagado)
          VALUES ($1, $2, $3, $4, $5)
        `, [pagoId, cuota.id, pagoAplicado, capitalPago, interesPago]);

        await client.query(`
          UPDATE cuotas
          SET monto_pagado = monto_pagado + $1,
              estado = CASE WHEN monto_pagado + $1 >= monto THEN 'pagado' ELSE estado END,
              "updatedAt" = NOW()
          WHERE id = $2
        `, [pagoAplicado, cuota.id]);

        montoRestante -= pagoAplicado;
      }

      // Nuevo saldo del crédito
      const saldoNuevo = saldo - monto_abonado;
      const estadoCredito = saldoNuevo <= 0 ? 'pagado' : 'impago';

      // Actualizar crédito (solo saldo + estado)
      await client.query(`
        UPDATE creditos
        SET saldo = $1,
            estado = $2,
            "updatedAt" = NOW()
        WHERE id = $3
      `, [saldoNuevo, estadoCredito, creditoId]);

      // Actualizar caja
      const cajaId = cajaRes.rows[0].id;
      const saldoAnterior = parseFloat(cajaRes.rows[0].saldoActual);
      const nuevoSaldoCaja = saldoAnterior + monto_abonado;

      await client.query(`
        UPDATE cajas
        SET "saldoActual" = $1
        WHERE id = $2
      `, [nuevoSaldoCaja, cajaId]);

      const cliente = await Cliente.getNameById(clienteId);
      const descripcion = monto_abonado <= 0 ? 'Registro de visita' : 'Registro de pago de crédito';
      const tipo = monto_abonado <= 0 ? 'visita' : 'abono';

      await client.query(`
        INSERT INTO movimientos_caja (
          "cajaId", descripcion, saldo, saldo_anterior, "createdAt", "updatedAt",
          monto, tipo, "usuarioId", category, "clienteId", "creditoId", "turnoId"
        ) VALUES (
          $1, '${descripcion} - (CR${creditoId}: ${cliente.nombres})', $2, $3, NOW(), NOW(),
          $4, '${tipo}', $5, 'ingreso', $6, $7, $8
        )
      `, [
        cajaId, nuevoSaldoCaja, saldoAnterior, monto_abonado,
        userId, clienteId, creditoId, turno.id
      ]);

      await client.query('COMMIT');
      return { success: true, message: "Pago registrado correctamente", pagoId };

    } catch (err) {
      await client.query('ROLLBACK');
      console.error(err);
      return { error: 'Error al registrar el pago' };
    } finally {
      client.release();
    }
  },

  anularPago: async (pagoId, userId, motivo, idempotencyKey) => {

    try {
      await db.query('BEGIN');

      if (idempotencyKey) {
        try {
          await db.query('INSERT INTO idempotency_keys (key) VALUES ($1)', [idempotencyKey]);
        } catch (error) {
          if (error.code === '23505') {
            await db.query('ROLLBACK');
            throw new Error('Esta transacción ya fue procesada anteriormente.');
          }
          throw error;
        }
      }

      // 1. Obtener desglose del pago
      const pagoRes = await db.query(`
        SELECT p.monto, p.turno_id, p."user_created_id", p."cliente_id", c."creditoId",
              pc."cuotaId", pc.monto_abonado
        FROM pagos p
        JOIN pagos_cuotas pc ON pc."pagoId" = p.id
        JOIN cuotas c ON c.id = pc."cuotaId"
        WHERE p.id = $1 FOR UPDATE
      `, [pagoId]);

      if (pagoRes.rowCount === 0) {
        await db.query('ROLLBACK');
        return { error: 'Pago no encontrado o no asociado a cuotas' };
      }

      const cuotasMap = new Map();
      let clienteId = null;
      let creditoId = null;
      let turnoId = null;
      let montoPago = 0;

      for (const row of pagoRes.rows) {
        const cuotaId = row.cuotaId;
        const montoAbonado = parseFloat(row.monto_abonado || 0);

        cuotasMap.set(cuotaId, (cuotasMap.get(cuotaId) || 0) + montoAbonado);

        clienteId = row.cliente_id;
        creditoId = row.creditoId;
        turnoId = row.turno_id;
        montoPago = parseFloat(row.monto || 0);
      }

      // 2. Revertir montos en cuotas
      for (const [cuotaId, montoAbonado] of cuotasMap.entries()) {
        await db.query(`
          UPDATE cuotas
          SET 
            monto_pagado = monto_pagado - $1,
            estado = CASE WHEN monto_pagado - $1 < monto THEN 'impago' ELSE estado END,
            "updatedAt" = NOW()
          WHERE id = $2
        `, [montoAbonado, cuotaId]);
      }

      // 3. Actualizar crédito (solo saldo)
      const creditoRes = await db.query(`
        SELECT saldo
        FROM creditos
        WHERE id = $1
      `, [creditoId]);

      if (creditoRes.rowCount === 0) {
        await db.query('ROLLBACK');
        return { error: 'Crédito no encontrado' };
      }

      const saldoActual = parseFloat(creditoRes.rows[0].saldo);
      const nuevoSaldoCredito = saldoActual + montoPago;

      const estadoCredito = nuevoSaldoCredito > 0 ? 'impago' : 'pagado';

      await db.query(`
        UPDATE creditos
        SET saldo = $1,
            estado = $2,
            "updatedAt" = NOW()
        WHERE id = $3
      `, [
        nuevoSaldoCredito,
        estadoCredito,
        creditoId
      ]);

      // 4. Actualizar saldo en caja
      const cajaRes = await db.query(`
        SELECT c.id, c."saldoActual"
        FROM cajas c
        JOIN ruta r ON r.id = c."rutaId"
        WHERE r."userId" = $1
        LIMIT 1
      `, [pagoRes.rows[0].user_created_id]);

      if (cajaRes.rowCount === 0) {
        await db.query('ROLLBACK');
        return { error: 'Caja no encontrada' };
      }

      const cajaId = cajaRes.rows[0].id;
      const saldoAnterior = parseFloat(cajaRes.rows[0].saldoActual);
      const nuevoSaldoCaja = saldoAnterior - montoPago;

      await db.query(`
        UPDATE cajas
        SET "saldoActual" = $1,
            "updatedAt" = NOW()
        WHERE id = $2
      `, [nuevoSaldoCaja, cajaId]);

      // 5. Eliminar pagos_cuotas
      await db.query(`
        DELETE FROM pagos_cuotas
        WHERE "pagoId" = $1
      `, [pagoId]);

      // 6. Registrar movimiento de anulación
      const cliente = await Cliente.getNameById(clienteId);
      await db.query(`
        INSERT INTO movimientos_caja (
          "cajaId", descripcion, saldo, saldo_anterior, "createdAt", "updatedAt",
          monto, tipo, "usuarioId", category, "clienteId", "creditoId", "turnoId"
        ) VALUES (
          $1, $2, $3, $4, NOW(), NOW(),
          $5, 'anulacion', $6, 'egreso', $7, $8, $9
        )
      `, [
        cajaId,
        `Anulación de pago ID ${pagoId} (CR${creditoId}: ${cliente.nombres}) - Motivo: ${motivo || 'No especificado'}`,
        nuevoSaldoCaja,
        saldoAnterior,
        montoPago,
        userId,
        clienteId,
        creditoId,
        turnoId
      ]);

      // 7. Marcar pago como anulado
      await db.query(`
        UPDATE pagos
        SET estado = 'anulado',
            user_null_id = $2,
            observacion = $3,
            "updatedAt" = NOW()
        WHERE id = $1
      `, [pagoId, userId, motivo]);

      await db.query('COMMIT');
      return { success: true, message: 'Pago anulado correctamente' };

    } catch (err) {
      await db.query('ROLLBACK');
      console.error(err);
      return { error: 'Error al anular el pago' };
    }
  },

  getComprobanteById: async (id) => {
    const pagoData = await db.query(
      `SELECT 
        p.*, 
        c.nombres AS nombre
       FROM pagos p
       LEFT JOIN clientes c ON p.cliente_id = c.id
       WHERE p.id = $1 LIMIT 1`,
      [id]
    );

    if (pagoData.rowCount === 0) {
      return null;
    }

    return pagoData.rows[0]; // solo devuelves los datos
  },

  // Apertura una caja con su respectivo turno
  abrirCaja: async (rutaId, userId, sistema = false, idempotencyKey) => {
    try {
      await db.query('BEGIN');

      if (idempotencyKey) {
        try {
          await db.query('INSERT INTO idempotency_keys (key) VALUES ($1)', [idempotencyKey]);
        } catch (error) {
          if (error.code === '23505') {
            await db.query('ROLLBACK');
            throw new Error('Esta transacción ya fue procesada anteriormente.');
          }
          throw error;
        }
      }

      // Obtener la caja correspondiente a la ruta
      const cajaResult = await db.query(`
        SELECT id, "saldoActual", estado FROM cajas WHERE "rutaId" = $1 LIMIT 1 FOR UPDATE
      `, [rutaId]);

      if (cajaResult.rowCount === 0) {
        await db.query('ROLLBACK');
        return {
          success: false,
          message: 'No se encontró una caja para esta ruta.'
        };
      }

      const cajaId = cajaResult.rows[0].id;
      const montoInicial = parseFloat(cajaResult.rows[0].saldoActual);

      // Validar que NO haya un turno abierto
      const turnoAbierto = await db.query(`
        SELECT id FROM turnos
        WHERE "caja_id" = $1 AND fecha_cierre IS NULL
        LIMIT 1
      `, [cajaId]);

      if (turnoAbierto.rowCount > 0) {
        await db.query('ROLLBACK');
        return {
          success: false,
          message: 'La caja ya tiene un turno abierto.'
        };
      }

      // Cambiar estado de la caja a 'abierta'
      await db.query(`
        UPDATE cajas SET estado = 'abierta', "updatedAt" = NOW()
        WHERE id = $1
      `, [cajaId]);

      // Insertar nuevo turno
      await db.query(`
        INSERT INTO turnos (
          "caja_id", "usuario_open", "fecha_apertura", "monto_inicial", "observaciones_apertura", "sistema"
        )
        VALUES ($1, $2, NOW(), $3, $4, $5)
      `, [
        cajaId,
        userId,
        montoInicial,
        sistema ? 'Apertura automática por el sistema' : 'Apertura manual',
        sistema
      ]);

      await db.query('COMMIT');
      return {
        message: 'Caja abierta correctamente'
      };

    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  }, //Verificado

  // Cierra la caja y su respectivo turno
  cerrarCaja: async (rutaId, userId, observaciones = 'Sin observaciones.', idempotencyKey) => {
    try {
      await db.query('BEGIN');

      if (idempotencyKey) {
        try {
          await db.query('INSERT INTO idempotency_keys (key) VALUES ($1)', [idempotencyKey]);
        } catch (error) {
          if (error.code === '23505') {
            await db.query('ROLLBACK');
            throw new Error('Esta transacción ya fue procesada anteriormente.');
          }
          throw error;
        }
      }

      const caja = await db.query(
        `SELECT *
          FROM cajas
          WHERE "rutaId" = $1
          LIMIT 1 FOR UPDATE;
        `,
        [rutaId]
      );

      if (!caja || caja.rowCount === 0) {
        await db.query('ROLLBACK');
        throw new Error('Caja no encontrada para la ruta especificada');
      }

      const cajaId = caja.rows[0].id;
      let montoFinal = parseFloat(caja.rows[0].saldoActual || 0);

      const turnoActual = await db.query(
        `SELECT *
          FROM turnos
          WHERE "caja_id" = $1 AND fecha_cierre IS NULL
          ORDER BY fecha_cierre DESC
          LIMIT 1;
        `,
        [cajaId]
      );

      if (!turnoActual || turnoActual.rowCount === 0) {
        await db.query('ROLLBACK');
        throw new Error('No se encontró un turno activo para cerrar esta caja.');
      }

      // 1️⃣ Cerrar caja de la ruta
      await db.query(
        `UPDATE cajas SET estado = 'cerrada', "updatedAt" = NOW() WHERE id = $1`,
        [cajaId]
      );

      // Cerrar el turno
      await db.query(
        `UPDATE turnos SET fecha_cierre = NOW(), monto_final = $1, observaciones_cierre = $2, usuario_close = $3 WHERE id = $4`,
        [montoFinal, observaciones, userId, turnoActual.rows[0].id]
      );

      await db.query('COMMIT');

      return {
        message: 'Caja cerrada correctamente'
      };
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  }, //Verificado

  // Bloquea una caja (Toggle de estado abierta/cerrada)
  bloquearCaja: async (rutaId) => {
    try {
      await db.query('BEGIN');

      // Obtener la caja asociada a la ruta
      const cajaResult = await db.query(
        `SELECT id, estado FROM cajas WHERE "rutaId" = $1 LIMIT 1`,
        [rutaId]
      );

      if (cajaResult.rowCount === 0) {
        throw new Error('Caja no encontrada para la ruta especificada');
      }

      const caja = cajaResult.rows[0];
      const nuevoEstado = caja.estado === 'abierta' ? 'cerrada' : 'abierta';

      // 1️⃣ Actualizar estado de la caja de la ruta
      await db.query(
        `UPDATE cajas SET estado = $2, "updatedAt" = NOW() WHERE id = $1`,
        [caja.id, nuevoEstado]
      );

      await db.query('COMMIT');

      return {
        message: `Caja ${nuevoEstado} correctamente`,
        estado: nuevoEstado
      };
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  }, //Verificado

});
const db = require('../config/db');
const Caja = require('./caja');
const Cliente = require('./cliente');
const Config = require('./config');

const Credito = {
  // Crear un crédito
  create: async (creditoData) => {
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      const {
        monto, plazo_dias, frecuencia_pago,
        usuarioId, clienteId, productoId, rutaId
      } = creditoData;

      // 1️⃣ Configuración por ruta
      const configResult = await client.query(
        `SELECT * FROM config_credits WHERE "rutaId" = $1;`,
        [rutaId]
      );

      if (configResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return { error: "No hay configuración de crédito para la ruta seleccionada." };
      }

      const config = configResult.rows[0];

      // 2️⃣ Validaciones
      if (monto < config.monto_minimo || monto > config.monto_maximo) {
        await client.query('ROLLBACK');
        return { error: `El monto debe estar entre ${config.monto_minimo} y ${config.monto_maximo}` };
      }

      if (plazo_dias < config.plazo_minimo || plazo_dias > config.plazo_maximo) {
        await client.query('ROLLBACK');
        return { error: `El plazo debe estar entre ${config.plazo_minimo} y ${config.plazo_maximo} días.` };
      }

      if (!config.frecuencia_pago.includes(frecuencia_pago)) {
        await client.query('ROLLBACK');
        return { error: `La frecuencia de pago '${frecuencia_pago}' no está permitida para esta ruta.` };
      }

      // 3️⃣ Caja
      const cajaResult = await client.query(
        `SELECT id, "saldoActual", estado FROM cajas WHERE "rutaId" = $1;`,
        [rutaId]
      );

      if (cajaResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return { error: "La ruta no tiene una caja asignada." };
      }

      if (cajaResult.rows[0].estado === 'cerrada') {
        await client.query('ROLLBACK');
        return { error: "La caja está cerrada." };
      }

      const cajaId = cajaResult.rows[0].id;
      const saldoDisponible = parseFloat(cajaResult.rows[0].saldoActual);

      if (saldoDisponible < monto) {
        await client.query('ROLLBACK');
        return { error: "Saldo insuficiente en la caja para otorgar este crédito." };
      }

      // 4️⃣ Cliente válido
      const cliente = await Cliente.getById(clienteId);
      if (!cliente?.id || cliente.updated === false) {
        await client.query('ROLLBACK');
        return { error: "El cliente no es válido o debe ser actualizado." };
      }

      // 5️⃣ Turno
      const turno = await Caja.getTurnoById(cajaId);
      if (!turno?.id) {
        await client.query('ROLLBACK');
        return { error: "No tienes un turno activo." };
      }

      // 6️⃣ Créditos activos del cliente
      const activosResult = await client.query(`
        SELECT COUNT(*) AS total 
        FROM creditos 
        WHERE "clienteId" = $1 AND estado = 'impago';
      `, [clienteId]);

      if (parseInt(activosResult.rows[0].total) >= config.max_credits) {
        await client.query('ROLLBACK');
        return { error: "El cliente ya alcanzó el límite de créditos permitidos." };
      }

      // 7️⃣ Cálculo de intereses y saldo final
      const interes = config.interes;
      const montoInteresGenerado = (monto * interes) / 100;
      const saldo = monto + montoInteresGenerado;

      const fechaVencimiento = new Date();
      fechaVencimiento.setDate(fechaVencimiento.getDate() + plazo_dias);

      // 8️⃣ Insertar crédito SIN CAMPOS ELIMINADOS
      const insertCredito = await client.query(`
        INSERT INTO creditos (
          monto, plazo, frecuencia_pago, interes, monto_interes_generado,
          estado, "usuarioId", "clienteId", "productoId",
          "fechaVencimiento", turno_id, "createdAt", "updatedAt", saldo
        ) VALUES (
          $1, $2, $3, $4, $5,
          'impago', $6, $7, $8,
          $9, $10, NOW(), NOW(), $11
        ) RETURNING *;
      `, [
        monto, plazo_dias, frecuencia_pago, interes, montoInteresGenerado,
        usuarioId, clienteId, productoId,
        fechaVencimiento, turno.id, saldo
      ]);

      const credito = insertCredito.rows[0];

      // 9️⃣ Actualizar saldo de caja
      await client.query(`
        UPDATE cajas SET "saldoActual" = $1 WHERE id = $2;
      `, [saldoDisponible - monto, cajaId]);

      // 🔟 Registrar movimiento
      await client.query(`
        INSERT INTO movimientos_caja (
          "cajaId", tipo, monto, descripcion,
          saldo, saldo_anterior, category,
          "usuarioId", "clienteId", "creditoId", "turnoId",
          "createdAt", "updatedAt"
        ) VALUES (
          $1, 'credito', $2, $3,
          $4, $5, 'egreso',
          $6, $7, $8, $9,
          NOW(), NOW()
        );
      `, [
        cajaId, monto, `Desembolso de crédito - (CL${cliente.id}: ${cliente.nombres})`,
        saldoDisponible - monto, saldoDisponible,
        usuarioId, clienteId, credito.id, turno.id
      ]);

      // 1️⃣1️⃣ Generar cuotas
      const cuotaMonto = await Credito.generarCuotas(
        credito.id, monto, interes, plazo_dias, frecuencia_pago
      );

      await client.query('COMMIT');

      return {
        credito,
        cuotaMonto,
        location: cliente.coordenadasCobro
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error al crear crédito:', error);
      return { error: "Hubo un error al registrar el crédito." };
    } finally {
      client.release();
    }
  },

  // modelo/Credito.js
  getAll: async (limit, offset, searchTerm = '', userId, oficinaId, rutaId) => {
    const search = `%${searchTerm}%`;
  
    // Comienza el WHERE para los filtros básicos de búsqueda
    let whereClause = `
      (c.estado ILIKE '${search}' OR
       c.frecuencia_pago ILIKE '${search}' OR
       r.nombre ILIKE '${search}')
    `;
    
    let joins = `
      LEFT JOIN clientes cl ON c."clienteId" = cl.id
      LEFT JOIN ruta r ON cl."rutaId" = r.id
    `;
  
    // Si se selecciona una ruta, filtra por esa ruta
    if (rutaId) {
      whereClause += ` AND cl."rutaId" = ${rutaId}`;
    } 
    // Si se selecciona una oficina, filtra por las rutas de esa oficina
    else if (oficinaId) {
      joins += ` LEFT JOIN oficinas o ON r."oficinaId" = o.id `;
      whereClause += ` AND o.id = ${oficinaId}`;
    } 
    // Si no se selecciona ni oficina ni ruta, filtra por las rutas de las oficinas del usuario
    else if (userId) {
      // Obtener las oficinas a las que el usuario está asignado
      const userOfficesQuery = `
        SELECT o.id AS oficina_id
        FROM usuariooficinas uo
        LEFT JOIN oficinas o ON uo."oficinaId" = o.id
        WHERE uo."usuarioId" = ${userId}
      `;
      
      const userOfficesRes = await db.query(userOfficesQuery);
      
      if (userOfficesRes.rows.length > 0) {
        // Si el usuario tiene oficinas asignadas, obtenemos las rutas asociadas a esas oficinas
        const officeIds = userOfficesRes.rows.map(row => row.oficina_id);
        
        joins += ` LEFT JOIN oficinas o ON r."oficinaId" = o.id `;
        whereClause += ` AND o.id IN (${officeIds.join(', ')})`;
      } else {
        // Si el usuario no tiene oficinas asignadas, no se muestran registros
        whereClause += ` AND 1=0`;  // Esto asegura que no se devuelvan resultados si el usuario no tiene oficinas.
      }
    }
  
    // Consulta para obtener los créditos
    const queryText = `
      SELECT 
        c.*,
        cl.id AS cliente_id,
        cl.nombres AS cliente_nombre,
        r.id AS ruta_id,
        r.nombre AS ruta_nombre
      FROM creditos c
      ${joins}
      WHERE ${whereClause}
      ORDER BY c."createdAt" DESC
      LIMIT ${limit} OFFSET ${offset};
    `;
  
    // Consulta para obtener el conteo total de créditos
    const countQuery = `
      SELECT COUNT(*) 
      FROM creditos c
      ${joins}
      WHERE ${whereClause};
    `;
  
    // Ejecutamos ambas consultas
    const [creditosRes, countRes] = await Promise.all([
      db.query(queryText),
      db.query(countQuery),
    ]);
  
    const totalCreditos = parseInt(countRes.rows[0].count, 10);
  
    // Mapeamos los resultados
    const creditos = creditosRes.rows.map(row => ({
      id: row.id,
      monto: row.monto,
      fechaVencimiento: row.fechaVencimiento,
      estado: row.estado,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      clienteId: row.clienteId,
      usuarioId: row.usuarioId,
      plazo: row.plazo,
      frecuencia_pago: row.frecuencia_pago,
      interes: row.interes,
      monto_interes_generado: row.monto_interes_generado,
      saldo: row.saldo,
      productoId: row.productoId,
      cliente: {
        id: row.cliente_id,
        nombres: row.cliente_nombre,
      },
      ruta: {
        id: row.ruta_id,
        nombre: row.ruta_nombre,
      }
    }));
  
    return { creditos, totalCreditos };
  },

  getDataDash: async (rutaId) => {
    // Si no se envía rutaId, devolvemos un arreglo vacío.
    if (!rutaId) return [];

    try {

      const query = `
        WITH 
        ---------------------------------------------------------
        -- 1) CONFIGURACIÓN DE DÍAS DE RIESGO
        ---------------------------------------------------------
        config AS (
          SELECT days_to_yellow, days_to_red
          FROM config_default
          LIMIT 1
        ),

        ---------------------------------------------------------
        -- 2) CRÉDITOS ACTIVOS DE LA RUTA
        ---------------------------------------------------------
        creditos_activos AS (
          SELECT c.id, c.saldo
          FROM creditos c
          INNER JOIN clientes cl ON cl.id = c."clienteId"
          WHERE c.estado = 'impago'
          AND cl."rutaId" = $1
        ),

        ---------------------------------------------------------
        -- 3) MÁXIMO ATRASO DE CADA CRÉDITO
        ---------------------------------------------------------
        max_atraso AS (
          SELECT 
            q."creditoId",
            MAX(GREATEST(0, DATE_PART('day', CURRENT_DATE - q."fechaPago"))) AS dias_atraso
          FROM cuotas q
          INNER JOIN creditos_activos c ON c.id = q."creditoId"
          WHERE q.estado = 'impago'
          GROUP BY q."creditoId"
        ),

        ---------------------------------------------------------
        -- 4) CLASIFICACIÓN DEL CRÉDITO SEGÚN ATRASO
        ---------------------------------------------------------
        clasificacion AS (
          SELECT
            c.id AS credito_id,
            c.saldo,
            COALESCE(m.dias_atraso, 0) AS dias_atraso,
            CASE
              WHEN COALESCE(m.dias_atraso, 0) >= cfg.days_to_red THEN 'vencido'
              WHEN COALESCE(m.dias_atraso, 0) >= cfg.days_to_yellow THEN 'alto_riesgo'
              WHEN COALESCE(m.dias_atraso, 0) >= 1 THEN 'atrasado'
              ELSE 'al_dia'
            END AS estado_credito
          FROM creditos_activos c
          LEFT JOIN max_atraso m ON m."creditoId" = c.id
          CROSS JOIN config cfg
        ),

        ---------------------------------------------------------
        -- 5) CAJA DE LA RUTA
        ---------------------------------------------------------
        caja AS (
          SELECT "saldoActual", estado
          FROM cajas
          WHERE "rutaId" = $1
          LIMIT 1
        ),

        ---------------------------------------------------------
        -- 6) RECAUDACIÓN DIARIA
        ---------------------------------------------------------
        recaudacion_diaria AS (
          SELECT COALESCE(SUM(monto), 0) AS total
          FROM pagos
          WHERE estado = 'aprobado'
          AND DATE("createdAt") = CURRENT_DATE
        ),

        ---------------------------------------------------------
        -- 7) GASTOS DIARIOS
        ---------------------------------------------------------
        gastos_diarios AS (
          SELECT COALESCE(SUM(monto), 0) AS total
          FROM egresos
          WHERE estado = 'aprobado'
          AND DATE("createdAt") = CURRENT_DATE
        ),

        ---------------------------------------------------------
        -- 8) COBROS PENDIENTES (cuotas impagas hasta hoy)
        ---------------------------------------------------------
        cobros_pendientes AS (
          SELECT 
            COALESCE(SUM(q.monto - q."monto_pagado"), 0) AS total
          FROM cuotas q
          INNER JOIN creditos_activos c ON c.id = q."creditoId"
          WHERE q.estado = 'impago'
          AND DATE(q."fechaPago") <= CURRENT_DATE
        )

        ---------------------------------------------------------
        -- 9) RESULTADOS FINALES DEL DASHBOARD
        ---------------------------------------------------------
        SELECT
          (SELECT COUNT(*) FROM creditos_activos) AS creditos_activos,

          -- Clasificación
          COUNT(*) FILTER (WHERE estado_credito = 'al_dia') AS creditos_al_dia,
          COUNT(*) FILTER (WHERE estado_credito = 'atrasado') AS creditos_atrasados,
          COUNT(*) FILTER (WHERE estado_credito = 'alto_riesgo') AS creditos_alto_riesgo,
          COUNT(*) FILTER (WHERE estado_credito = 'vencido') AS creditos_vencidos,

          -- Saldos
          SUM(saldo) AS cartera_total,

          -- Caja
          (SELECT "saldoActual" FROM caja) AS saldo_caja,
          (SELECT estado FROM caja) AS estado_caja,

          -- Totales del día
          (SELECT total FROM recaudacion_diaria) AS recaudacion_hoy,
          (SELECT total FROM gastos_diarios) AS gastos_hoy,

          -- Pendientes
          (SELECT total FROM cobros_pendientes) AS cobros_pendientes

        FROM clasificacion;
      `;

      // Ejecutar la consulta con rutaId como parámetro
      const result = await db.query(query, [rutaId]);

      // Devolver la primera fila que contiene todas las métricas
      return result.rows[0];

    } catch (error) {
      console.error("Error en getDataDash:", error);
      throw error;
    }
  }, 

  getDataDashBars: async (frecuencia, rutaId) => {
    if(rutaId === null){
      return []
    }
    try {
      const queryText = `
        WITH fechas AS (
          SELECT 
            CURRENT_DATE AS hoy,
            CASE 
              WHEN $1 = 'semanal' THEN CURRENT_DATE - INTERVAL '6 days'
              ELSE CURRENT_DATE
            END AS desde
        ),
        creditos_ruta AS (
          SELECT 
            DATE(c."createdAt") AS fecha,
            SUM(c.monto) AS total_creditos,
            SUM(c.monto_interes_generado) AS total_interes
          FROM creditos c
          JOIN clientes cl ON cl.id = c."clienteId"
          JOIN fechas f ON DATE(c."createdAt") BETWEEN f.desde AND f.hoy
          WHERE cl."rutaId" = $2
          GROUP BY DATE(c."createdAt")
        ),
        caja_ruta AS (
          SELECT id AS caja_id
          FROM cajas
          WHERE "rutaId" = $2
          LIMIT 1
        ),
        movimientos_filtrados AS (
          SELECT 
            DATE(mc."createdAt") AS fecha,
            mc.tipo,
            SUM(mc.monto) AS total
          FROM movimientos_caja mc
          JOIN caja_ruta cr ON cr.caja_id = mc."cajaId"
          JOIN fechas f ON DATE(mc."createdAt") BETWEEN f.desde AND f.hoy
          GROUP BY DATE(mc."createdAt"), mc.tipo
        ),
        dias AS (
          SELECT generate_series(f.desde, f.hoy, interval '1 day')::date AS fecha
          FROM fechas f
        ),
        resultados AS (
          SELECT 
            d.fecha,
            COALESCE(c.total_creditos, 0) AS total_creditos,
            COALESCE(c.total_interes, 0) AS total_interes,
            COALESCE(SUM(CASE WHEN m.tipo = 'abono' THEN m.total END), 0) AS recaudo,
            COALESCE(SUM(CASE WHEN m.tipo = 'ingreso' THEN m.total END), 0) AS ingresos,
            COALESCE(SUM(CASE WHEN m.tipo = 'gasto' THEN m.total END), 0) AS egresos
          FROM dias d
          LEFT JOIN creditos_ruta c ON c.fecha = d.fecha
          LEFT JOIN movimientos_filtrados m ON m.fecha = d.fecha
          GROUP BY d.fecha, c.total_creditos, c.total_interes
          ORDER BY d.fecha
        )
        SELECT * FROM resultados;
      `;
  
      const data = await db.query(queryText, [frecuencia, rutaId]);
  
      if (frecuencia === 'diario') {
        const hoyLocal = new Date();
        const hoyString = hoyLocal.toISOString().split('T')[0]; // "YYYY-MM-DD"
  
        const rowDiario = data.rows.find(row => {
          const rowDate = new Date(row.fecha).toISOString().split('T')[0];
          return rowDate === hoyString;
        });
  
        return [rowDiario || {
          fecha: new Date().toISOString(), // mantiene formato ISO completo
          total_creditos: 0,
          total_interes: 0,
          recaudo: 0,
          ingresos: 0,
          egresos: 0,
        }];
      }
  
      return data.rows;
  
    } catch (error) {
      console.error("Error al obtener los datos del dashboard:", error);
      throw error;
    }
  },   

  // Contar el total de créditos para la paginación
  countAll: async () => {
    const queryText = 'SELECT COUNT(*) FROM creditos;';
    const { rows } = await db.query(queryText);
    return parseInt(rows[0].count, 10);
  },

  // Obtener un crédito por ID con los pagos asociados
  getById: async (id) => {
    const queryText = `
      SELECT 
        c.*,

        -- Información del cliente
        json_build_object(
          'id', cl.id,
          'nombres', cl.nombres,
          'telefono', cl.telefono,
          'direccion', cl.direccion,
          'coordenadasCasa', cl."coordenadasCasa",
          'coordenadasCobro', cl."coordenadasCobro",
          'identificacion', cl.identificacion,
          'rutaId', cl."rutaId",
          'fotos', (
            SELECT COALESCE(json_agg(foto.foto), '[]'::json)
            FROM fotoclientes foto
            WHERE foto."clienteId" = cl.id
          )
        ) AS cliente,

        -- Información del producto
        json_build_object(
          'id', p.id,
          'nombre', p.nombre,
          'precio', p.precio
        ) AS producto,

        -- Cuotas del crédito
        (
          SELECT COALESCE(json_agg(
            json_build_object(
              'id', q.id,
              'monto', q.monto,
              'fecha_pago', q."fechaPago",
              'estado', q.estado,
              'creditoId', q."creditoId",
              'createdAt', q."createdAt",
              'updatedAt', q."updatedAt",
              'monto_pagado', q."monto_pagado"
            )
          ), '[]'::json)
          FROM cuotas q
          WHERE q."creditoId" = c.id
        ) AS cuotas,

        -- Pagos relacionados a las cuotas del crédito
        (
          SELECT COALESCE(json_agg(
            json_build_object(
              'id', pa.id,
              'monto', pa.monto,
              'fechaPago', pa."createdAt",
              'metodoPago', pa."metodoPago",
              'createdAt', pa."createdAt",
              'updatedAt', pa."updatedAt",
              'cuotas', (
                SELECT json_agg(
                  json_build_object(
                    'cuotaId', pc."cuotaId",
                    'monto_abonado', pc."monto_abonado",
                    'capital_pagado', pc."capital_pagado",
                    'interes_pagado', pc."interes_pagado",
                    'created_at', pc."created_at"
                  )
                )
                FROM pagos_cuotas pc
                WHERE pc."pagoId" = pa.id
              )
            )
          ), '[]'::json)
          FROM pagos pa
          WHERE pa.id IN (
            SELECT DISTINCT pc."pagoId"
            FROM cuotas q
            JOIN pagos_cuotas pc ON q.id = pc."cuotaId"
            WHERE q."creditoId" = c.id
          )
        ) AS pagos

      FROM creditos c
      JOIN clientes cl ON c."clienteId" = cl.id
      JOIN productos p ON c."productoId" = p.id

      WHERE c.id = $1;
    `;

    const { rows } = await db.query(queryText, [id]);
    return rows.length ? rows[0] : null;
  },

  getImpagosByUsuarioPaginado: async (usuarioId, limit, offset, search = '') => {
    const searchFilter = search === '' ? null : `%${search}%`;

    let query = `
      SELECT 
        c.*,
        json_build_object(
          'id', cl.id,
          'nombres', cl.nombres,
          'telefono', cl.telefono,
          'direccion', cl.direccion,
          'coordenadasCasa', cl."coordenadasCasa",
          'coordenadasCobro', cl."coordenadasCobro",
          'identificacion', cl.identificacion,
          'rutaId', cl."rutaId",
          'fotos', (
            SELECT COALESCE(json_agg(foto.foto), '[]'::json)
            FROM fotoclientes foto
            WHERE foto."clienteId" = cl.id
          )
        ) AS cliente,
        json_build_object(
          'id', p.id,
          'nombre', p.nombre,
          'precio', p.precio
        ) AS producto,
        (
          SELECT COALESCE(json_agg(
            json_build_object(
              'id', q.id,
              'monto', q.monto,
              'fecha_pago', q."fechaPago",
              'estado', q.estado,
              'creditoId', q."creditoId",
              'createdAt', q."createdAt",
              'updatedAt', q."updatedAt",
              'monto_pagado', q."monto_pagado"
            )
          ), '[]'::json)
          FROM cuotas q
          WHERE q."creditoId" = c.id
        ) AS cuotas,
        (
          SELECT COALESCE(json_agg(
            json_build_object(
              'id', pa.id,
              'monto', pa.monto,
              'fechaPago', pa."createdAt",
              'metodoPago', pa."metodoPago",
              'createdAt', pa."createdAt",
              'updatedAt', pa."updatedAt",
              'cuotas', (
                SELECT json_agg(
                  json_build_object(
                    'cuotaId', pc."cuotaId",
                    'monto_abonado', pc."monto_abonado",
                    'capital_pagado', pc."capital_pagado",
                    'interes_pagado', pc."interes_pagado",
                    'created_at', pc."created_at"
                  )
                )
                FROM pagos_cuotas pc
                WHERE pc."pagoId" = pa.id
              )
            )
          ), '[]'::json)
          FROM pagos pa
          WHERE pa.id IN (
            SELECT DISTINCT pc."pagoId"
            FROM cuotas q
            JOIN pagos_cuotas pc ON q.id = pc."cuotaId"
            WHERE q."creditoId" = c.id
          )
        ) AS pagos
      FROM creditos c
      JOIN clientes cl ON c."clienteId" = cl.id
      JOIN productos p ON c."productoId" = p.id
      WHERE c."usuarioId" = $1 AND c.estado = 'impago'`;

    let queryParams = [usuarioId, limit, offset];

    if (search) {
      query += ` AND cl.nombres ILIKE $4`;
      queryParams.push(searchFilter);
    }

    query += ` ORDER BY c."createdAt" DESC
      LIMIT $2 OFFSET $3`
  
    const result = await db.query(query, queryParams);
    return result.rows;
  },

  //Contar los impagos por usuario
  countImpagosByUsuario : async (usuarioId, search) => {
    const searchFilter = search === '' ? null : `%${search}%`;

    let query = `
      SELECT COUNT(*) AS total
      FROM creditos c
      JOIN clientes cl ON cl.id = c."clienteId"
      WHERE c."usuarioId" = $1 AND c.estado = 'impago'`;

    let queryParams = [usuarioId];

    if (search) {
      query += ` AND cl.nombres ILIKE $2;`;
      queryParams.push(searchFilter);
    }
  
    const result = await db.query(query, queryParams);
    return parseInt(result.rows[0].total);
  },

  // Actualizar un crédito
  // update: async (id, updateData) => {
  //   const queryText = `
  //     UPDATE creditos 
  //     SET monto = $1, "fechaInicio" = $2, "fechaVencimiento" = $3, estado = $4, saldo = $5, "updatedAt" = NOW()
  //     WHERE id = $6 RETURNING *;
  //   `;
  //   const values = [
  //     updateData.monto,
  //     updateData.fechaInicio,
  //     updateData.fechaVencimiento,
  //     updateData.estado,
  //     updateData.saldo,
  //     id
  //   ];
  //   const { rows } = await db.query(queryText, values);
  //   return rows[0];
  // },

  // Eliminar un crédito
  // delete: async (id) => {
  //   const queryText = `DELETE FROM creditos WHERE id = $1 RETURNING *;`;
  //   const { rows } = await db.query(queryText, [id]);
  //   return rows.length ? rows[0] : null;
  // },

  // Crear un pago
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

      // Registrar pago
      const pagoRes = await client.query(`
        INSERT INTO pagos (
          monto, "user_created_id", "metodoPago", "createdAt", "updatedAt", cordenadas,
          estado, turno_id, cliente_id, tipo
        ) VALUES ($1, $2, $3, NOW(), NOW(), $4, 'aprobado', $5, $6, $7)
        RETURNING id
      `, [monto_abonado, userId, metodoPago, location, turno.id, clienteId, tipoPago]);

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
  
  generarCuotas: async (creditoId, monto, interes, plazo_dias, frecuencia_pago) => {
    const cuotas = [];
    const totalConInteres = monto + (monto * interes) / 100;
  
    let cantidadCuotas = 0;
    let diasEntreCuotas = 1;
  
    switch (frecuencia_pago) {
      case 'diario':
        diasEntreCuotas = 1;
        cantidadCuotas = plazo_dias;
        break;
      case 'semanal':
        diasEntreCuotas = 7;
        cantidadCuotas = Math.ceil(plazo_dias / 7);
        break;
      case 'quincenal':
        diasEntreCuotas = 15;
        cantidadCuotas = Math.ceil(plazo_dias / 15);
        break;
      case 'mensual':
        diasEntreCuotas = 30;
        cantidadCuotas = Math.ceil(plazo_dias / 30);
        break;
      default:
        throw new Error('Frecuencia de pago no válida');
    }
  
    const cuotaMonto = parseFloat((totalConInteres / cantidadCuotas).toFixed(2));
    let fecha = new Date();
  
    // Obtener días no laborables específicos
    const diasNoLaborablesQuery = `SELECT fecha FROM dias_no_laborables;`;
    const diasNoLaborablesResult = await db.query(diasNoLaborablesQuery);
    const diasNoLaborables = diasNoLaborablesResult.rows.map(row => row.fecha.toISOString().split('T')[0]);
  
    // Obtener configuración desde el modelo Config
    const config = await Config.getConfigDiasNoLaborables() || { excluir_sabados: false, excluir_domingos: false };
  
    for (let i = 0; i < cantidadCuotas; i++) {
      fecha.setDate(fecha.getDate() + diasEntreCuotas);
  
      while (
        diasNoLaborables.includes(fecha.toISOString().split('T')[0]) ||
        (config.excluir_sabados && fecha.getDay() === 6) || // sábado = 6
        (config.excluir_domingos && fecha.getDay() === 0)   // domingo = 0
      ) {
        fecha.setDate(fecha.getDate() + 1);
      }
  
      cuotas.push({
        creditoId,
        monto: cuotaMonto,
        fechaPago: new Date(fecha),
        metodoPago: null,
        estado: 'impago',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  
    // Guardar en la tabla cuotas
    const insertPromises = cuotas.map(cuota => {
      const query = `
        INSERT INTO cuotas 
        ("creditoId", monto, "fechaPago", estado, "createdAt", "updatedAt", "monto_pagado")
        VALUES ($1, $2, $3, $4, $5, $6, 0);
      `;
      const values = [
        cuota.creditoId,
        cuota.monto,
        cuota.fechaPago,
        cuota.estado,
        cuota.createdAt,
        cuota.updatedAt,
      ];
      return db.query(query, values);
    });
  
    await Promise.all(insertPromises);
    return cuotaMonto;
  }
};

module.exports = Credito;

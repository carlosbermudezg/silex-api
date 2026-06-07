module.exports = (db) => ({
  // Crear una nueva ruta y asignarla al usuario en usuariorutas + crear config_credits
  create: async (rutaData) => {
    try {
      await db.query('BEGIN');

      // 0️⃣ Validar límite de rutas
      const countResult = await db.query('SELECT COUNT(*) FROM ruta');
      const currentRoutes = parseInt(countResult.rows[0].count);

      const configResultLimit = await db.query('SELECT routes_limit FROM config_default WHERE id = 1');
      const limit = configResultLimit.rows.length > 0 ? (configResultLimit.rows[0].routes_limit || 1) : 1;

      if (currentRoutes >= limit) {
        throw new Error(`Límite de rutas alcanzado (${limit}). Por favor, actualiza tu suscripción para añadir más rutas.`);
      }

      // 0️⃣.5 Obtener IDs internos a partir de los UUIDs
      // Buscar oficina por public_id
      const oficinaQuery = `SELECT id FROM oficinas WHERE public_id = $1;`;
      const oficinaResult = await db.query(oficinaQuery, [rutaData.oficinaId]);
      if (oficinaResult.rows.length === 0) {
        throw new Error('Oficina no encontrada');
      }
      const oficinaIdInterno = oficinaResult.rows[0].id;

      // Buscar usuario userCreate por id
      const userCreateQuery = `SELECT id FROM usuarios WHERE id = $1;`;
      const userCreateResult = await db.query(userCreateQuery, [rutaData.userCreate]);
      if (userCreateResult.rows.length === 0) {
        throw new Error('Usuario creador no encontrado');
      }
      const userCreateIdInterno = userCreateResult.rows[0].id;

      // Buscar usuario userId por public_id
      const userIdQuery = `SELECT id FROM usuarios WHERE public_id = $1;`;
      const userIdResult = await db.query(userIdQuery, [rutaData.userId]);
      if (userIdResult.rows.length === 0) {
        throw new Error('Usuario no encontrado');
      }
      const userIdInterno = userIdResult.rows[0].id;

      // 1️⃣ Insertar la nueva ruta
      const queryText = `
        INSERT INTO ruta (nombre, "oficinaId", user_create, "userId", "createdAt", "updatedAt", "public_id") 
        VALUES ($1, $2, $3, $4, NOW(), NOW(), $5)
        RETURNING *;
      `;
      const values = [rutaData.nombre, oficinaIdInterno, userCreateIdInterno, userIdInterno, crypto.randomUUID()];
      const rutaResult = await db.query(queryText, values);
      const ruta = rutaResult.rows[0];

      // 2️⃣ Insertar relación en usuariorutas
      const userRutaQuery = `
        INSERT INTO usuariorutas ("usuarioId", "rutaId", "createdAt", "updatedAt")
        VALUES ($1, $2, NOW(), NOW());
      `;
      await db.query(userRutaQuery, [userIdInterno, ruta.id]);

      // 3️⃣ Crear configuración de crédito por defecto para la ruta
      const configQuery = `
        INSERT INTO config_credits (
          "rutaId", max_credits, interes, plazo_minimo, plazo_maximo,
          monto_minimo, monto_maximo, frecuencia_pago, "public_id"
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9
        );
      `;

      // Obtener configuracion por defecto
      const queryConfig = `
        SELECT * FROM config_default WHERE id = 1;
      `;
      const configResult = await db.query(queryConfig);
      const config = configResult.rows[0];
      const configValues = [
        ruta.id,
        config.max_credits,     // max_credits
        config.interes,         // interes
        config.plazo_minimo,    // plazo_minimo
        config.plazo_maximo,    // plazo_maximo
        config.monto_minimo,    // monto_minimo
        config.monto_maximo,    // monto_maximo
        config.frecuencia_pago, // frecuencia_pago por defecto como array ENUM
        crypto.randomUUID()     // public_id
      ];

      await db.query(configQuery, configValues);

      // Crear la caja de la ruta con saldo inicial de 0
      const query = 'INSERT INTO cajas ("saldoActual", "rutaId", "createdAt", "updatedAt", estado, "public_id") VALUES ($1, $2, NOW(), NOW(), $3, $4) RETURNING *';
      const valuesCaja = [0, ruta.id, 'cerrada', crypto.randomUUID()];
      const caja = await db.query(query, valuesCaja);

      await db.query('COMMIT');
      return { message: 'Ruta creada exitosamente' };
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  }, //Verificado

  // Obtener todas las rutas con paginación y búsqueda por nombre, incluyendo datos del usuario y oficina
  getAll: async (page, limit, offset, search) => {
    let queryText = `
      SELECT 
        r.nombre,
        r."createdAt",
        r."updatedAt",
        r.public_id,
        u.nombre AS "usuarioNombre",
        u.correo AS "usuarioCorreo",
        u.public_id AS "usuarioPublicId",
        uc.nombre AS "userCreateNombre",
        uc.correo AS "userCreateCorreo",
        uc.public_id AS "userCreatePublicId",
        o.nombre AS "oficinaNombre",
        o.public_id AS "oficinaPublicId"
      FROM ruta r
      LEFT JOIN usuarios u ON r."userId" = u.id
      LEFT JOIN usuarios uc ON r.user_create = uc.id
      LEFT JOIN oficinas o ON r."oficinaId" = o.id
    `;
    let countQuery = `SELECT COUNT(*) FROM ruta`;
    const values = [limit, offset];
    const countValues = [];

    if (search) {
      queryText += ` WHERE r.nombre ILIKE $3`;
      countQuery += ` WHERE nombre ILIKE $1`;
      values.push(`%${search}%`);
      countValues.push(`%${search}%`);
    }

    queryText += ` LIMIT $1 OFFSET $2;`;
    countQuery += `;`;

    const result = await db.query(queryText, values);

    // Obtener total de registros aplicando el filtro de búsqueda
    const countResult = await db.query(countQuery, countValues);
    const total = Number(countResult.rows[0].count);
    const totalPages = Math.ceil(total / limit);

    return {
      data: result.rows.map(row => ({
        id: row.public_id,
        nombre: row.nombre,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        usuario: {
          id: row.usuarioPublicId,
          nombre: row.usuarioNombre,
          correo: row.usuarioCorreo
        },
        usuarioCreador: {
          id: row.userCreatePublicId,
          nombre: row.userCreateNombre,
          correo: row.userCreateCorreo
        },
        oficina: {
          id: row.oficinaPublicId,
          nombre: row.oficinaNombre
        }
      })),
      total,
      page,
      limit,
      totalPages
    };
  }, //Verificado

  // Obtener una ruta por ID con los usuarios asignados
  getById: async (id) => {
    const queryText = `
      SELECT 
        r.nombre,
        r."createdAt",
        r."updatedAt",
        r.public_id,
        u.nombre AS "usuarioNombre",
        u.correo AS "usuarioCorreo",
        u.public_id AS "usuarioPublicId",
        uc.nombre AS "userCreateNombre",
        uc.correo AS "userCreateCorreo",
        uc.public_id AS "userCreatePublicId",
        o.nombre AS "oficinaNombre",
        o.public_id AS "oficinaPublicId"
      FROM ruta r
      LEFT JOIN usuarios u ON r."userId" = u.id
      LEFT JOIN usuarios uc ON r.user_create = uc.id
      LEFT JOIN oficinas o ON r."oficinaId" = o.id
      WHERE r.public_id = $1;
    `;

    const result = await db.query(queryText, [id]);

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      id: row.public_id,
      nombre: row.nombre,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      usuario: {
        id: row.usuarioPublicId,
        nombre: row.usuarioNombre,
        correo: row.usuarioCorreo
      },
      usuarioCreador: {
        id: row.userCreatePublicId,
        nombre: row.userCreateNombre,
        correo: row.userCreateCorreo
      },
      oficina: {
        id: row.oficinaPublicId,
        nombre: row.oficinaNombre
      }
    };
  }, //Verificado

  // Editar una ruta y actualizar su relación con los usuarios
  update: async (id, updateData) => {
    try {
      // Iniciar transacción manualmente
      await db.query('BEGIN');

      // 0️⃣ Obtener el ID interno de la ruta a partir de su UUID (public_id)
      const rutaQuery = `SELECT id FROM ruta WHERE public_id = $1;`;
      const rutaResult = await db.query(rutaQuery, [id]);
      if (rutaResult.rows.length === 0) {
        await db.query('ROLLBACK');
        return null; // Ruta no encontrada
      }
      const rutaIdInterno = rutaResult.rows[0].id;

      // 1️⃣ Obtener IDs internos de la oficina y el usuario a partir de sus UUIDs
      let oficinaIdInterno = null;
      if (updateData.oficinaId) {
        const oficinaQuery = `SELECT id FROM oficinas WHERE public_id = $1;`;
        const oficinaResult = await db.query(oficinaQuery, [updateData.oficinaId]);
        if (oficinaResult.rows.length === 0) {
          throw new Error('Oficina no encontrada');
        }
        oficinaIdInterno = oficinaResult.rows[0].id;
      }

      let userIdInterno = null;
      if (updateData.userId) {
        const primaryUserId = Array.isArray(updateData.userId) ? updateData.userId[0] : updateData.userId;
        if (primaryUserId) {
          const userQuery = `SELECT id FROM usuarios WHERE public_id = $1;`;
          const userResult = await db.query(userQuery, [primaryUserId]);
          if (userResult.rows.length === 0) {
            throw new Error('Usuario no encontrado');
          }
          userIdInterno = userResult.rows[0].id;
        }
      }

      // 2️⃣ Actualizar la ruta
      const queryText = `
        UPDATE ruta
        SET nombre = $1, "oficinaId" = $2, "userId" = $4, "updatedAt" = NOW()
        WHERE id = $3 
        RETURNING *;
      `;
      const values = [updateData.nombre, oficinaIdInterno, rutaIdInterno, userIdInterno];
      const updateResult = await db.query(queryText, values);

      // 3️⃣ Eliminar relaciones antiguas en usuariorutas
      await db.query(`DELETE FROM usuariorutas WHERE "rutaId" = $1;`, [rutaIdInterno]);

      // 4️⃣ Insertar nuevas relaciones con usuarios
      if (updateData.userId) {
        const userIds = Array.isArray(updateData.userId) ? updateData.userId : [updateData.userId];

        for (const userId of userIds) {
          const userQuery = `SELECT id FROM usuarios WHERE public_id = $1;`;
          const userResult = await db.query(userQuery, [userId]);
          if (userResult.rows.length > 0) {
            const uIdInterno = userResult.rows[0].id;
            await db.query(
              `INSERT INTO usuariorutas ("usuarioId", "rutaId", "createdAt", "updatedAt") VALUES ($1, $2, NOW(), NOW());`,
              [uIdInterno, rutaIdInterno]
            );
          }
        }
      }

      await db.query('COMMIT'); // Confirmar transacción
      return {
        message: 'Ruta actualizada exitosamente'
      }; // Devolver la ruta actualizada
    } catch (error) {
      await db.query('ROLLBACK'); // Revertir cambios en caso de error
      throw error;
    }
  }, //Verificado

  // Obtener rutas por oficina
  getByOficina: async (oficinaId) => {
    // Buscar oficina por public_id para obtener su id interno
    const oficinaQuery = `SELECT id FROM oficinas WHERE public_id = $1;`;
    const oficinaResult = await db.query(oficinaQuery, [oficinaId]);
    if (oficinaResult.rows.length === 0) {
      throw new Error('Oficina no encontrada');
    }
    const oficinaIdInterno = oficinaResult.rows[0].id;

    const queryText = `
        SELECT id, nombre, "createdAt", "updatedAt", public_id
        FROM ruta
        WHERE "oficinaId" = $1
        ORDER BY "createdAt" DESC;
    `;
    const { rows } = await db.query(queryText, [oficinaIdInterno]);

    const data = rows.map(row => ({
      id: row.public_id,
      nombre: row.nombre
    }));

    return data;
  }, //Verificado

  // Ruta del cobrador: Obtiene los clientes asignados a la ruta con sus respectivas cuotas pendientes del día y cuotas atrasadas.
  getRutaDeCobro: async (rutaId) => {
    // 1️⃣ Buscar la ruta por public_id (UUID) para obtener su id interno (entero)
    const rutaQuery = `SELECT id FROM ruta WHERE public_id = $1;`;
    const rutaResult = await db.query(rutaQuery, [rutaId]);
    if (rutaResult.rows.length === 0) {
      throw new Error('Ruta no encontrada');
    }
    const rutaIdInterno = rutaResult.rows[0].id;

    // 2️⃣ Query principal:
    // - Extrae las coordenadas de cobro (latitud y longitud) desde la cadena de texto en clientes.
    // - Obtiene la cuota más urgente/antigua que esté pendiente de pago (hoy o en el pasado).
    // - Cuenta cuántas cuotas tiene atrasadas el crédito (cuotas previas a hoy no pagadas).
    const query = `
      SELECT 
        cl.nombres AS nombre,
        -- Separamos las coordenadas de cobro "latitud,longitud" en dos valores numéricos
        split_part(cl."coordenadasCobro", ',', 1)::float AS lat,
        split_part(cl."coordenadasCobro", ',', 2)::float AS lng,
        COALESCE(cuota_pendiente.monto, 0) AS cuota,
        cuota_pendiente."fechaPago"::date AS "fechaPago",
        cuota_pendiente.monto_pagado,
        COALESCE(SUM(atrasadas."cuotasAtrasadas"), 0) AS "cuotasAtrasadas",
        cr.id AS "creditoId"
      FROM clientes cl
      JOIN creditos cr ON cr."clienteId" = cl.id
      
      -- Subquery cuota_pendiente:
      -- Obtiene exactamente UNA cuota por crédito (la más antigua/urgente que se debe pagar hoy o en el pasado).
      LEFT JOIN (
        SELECT DISTINCT ON (cu."creditoId")
          cu."creditoId",
          cu.monto,
          cu."fechaPago",
          cu.monto_pagado
        FROM cuotas cu
        -- Excluimos abonos realizados hoy para verificar si la cuota ya fue saldada en el día corriente.
        LEFT JOIN (
          SELECT 
            pc."cuotaId", 
            SUM(pc.monto_abonado) AS total_abonado
          FROM pagos_cuotas pc
          JOIN pagos pa ON pa.id = pc."pagoId"
          WHERE pa."createdAt"::date = CURRENT_DATE
          GROUP BY pc."cuotaId"
        ) pagos_dia ON pagos_dia."cuotaId" = cu.id
        WHERE 
          cu."fechaPago"::date <= CURRENT_DATE -- Vence hoy o ya venció
          AND cu.estado != 'pagado'
          -- Si no se ha completado el pago total de la cuota hoy
          AND (pagos_dia.total_abonado IS NULL OR pagos_dia.total_abonado < cu.monto)
        ORDER BY cu."creditoId", 
                -- Prioriza ordenar las cuotas atrasadas (fecha anterior a hoy) antes que las de hoy
                CASE 
                  WHEN cu."fechaPago"::date < CURRENT_DATE THEN 0
                  ELSE 1
                END, 
                cu."fechaPago" -- Si hay varias atrasadas, toma la más antigua
      ) cuota_pendiente ON cuota_pendiente."creditoId" = cr.id
      
      -- Subquery atrasadas:
      -- Cuenta la cantidad de cuotas previas a hoy que siguen en estado 'impago'.
      LEFT JOIN (
        SELECT 
          cu."creditoId",
          COUNT(*) AS "cuotasAtrasadas"
        FROM cuotas cu
        LEFT JOIN (
          SELECT 
            pc."cuotaId", 
            SUM(pc.monto_abonado) AS total_abonado
          FROM pagos_cuotas pc
          JOIN pagos pa ON pa.id = pc."pagoId"
          WHERE pa."createdAt"::date = CURRENT_DATE
          GROUP BY pc."cuotaId"
        ) pagos_dia ON pagos_dia."cuotaId" = cu.id
        WHERE cu."fechaPago"::date < CURRENT_DATE -- Solo previas a hoy
          AND cu.estado != 'pagado'
          AND (pagos_dia.total_abonado IS NULL OR pagos_dia.total_abonado < cu.monto)
        GROUP BY cu."creditoId"
      ) atrasadas ON atrasadas."creditoId" = cr.id
      
      -- Filtramos los clientes que pertenecen a la ruta correspondiente
      WHERE cl."ruta_id" = $1
      GROUP BY cl.id, cr.id, cuota_pendiente.monto, cuota_pendiente."fechaPago", cuota_pendiente.monto_pagado;
    `;

    const { rows } = await db.query(query, [rutaIdInterno]);

    // Formateamos y retornamos únicamente los clientes que tienen cuota o cuotas atrasadas pendientes
    return rows
      .map(row => ({
        lat: row.lat,
        lng: row.lng,
        nombre: row.nombre,
        cuota: parseFloat(row.cuota),
        fechaPago: row.fechaPago,
        cuotasAtrasadas: parseInt(row.cuotasAtrasadas),
        monto_pagado: row.monto_pagado !== null ? parseFloat(row.monto_pagado) : null,
        creditoId: row.creditoId
      }))
      .filter(cliente => cliente.cuota > 0 || cliente.cuotasAtrasadas > 0);
  },

});
module.exports = (db) => ({
  //Crear un cliente
  create: async (clienteData, nacionalidad, userId) => {
    const {
      nombres,
      telefono,
      direccion,
      coordenadasCasa,
      coordenadasCobro,
      identificacion,
      rutaId,
      fotos
    } = clienteData;

    try {
      await db.query('BEGIN');

      // 0️⃣ Verificar si la identificación ya existe
      const checkIdentificacionQuery = `
        SELECT id FROM clientes WHERE identificacion = $1;
      `;
      const checkResult = await db.query(checkIdentificacionQuery, [identificacion]);

      if (checkResult.rows.length > 0) {
        throw { code: 'IDENTIFICACION_DUPLICADA', message: 'Ya existe un cliente con esa identificación' };
      }

      // 1️⃣ Insertar el cliente
      const insertClienteQuery = `
        INSERT INTO clientes (nombres, telefono, direccion, "coordenadasCasa", "coordenadasCobro", identificacion, estado, "ruta_id", nacionalidad, "userId_create", buro, updated, "createdAt", "updatedAt", "public_id")
        VALUES ($1, $2, $3, $4, $5, $6, 'activo', $7, $8, $9, 400, true, NOW(), NOW(), $10)
        RETURNING id;
      `;
      const clienteValues = [nombres, telefono, direccion, coordenadasCasa, coordenadasCobro, identificacion, rutaId, nacionalidad[0], userId, crypto.randomUUID()];
      const result = await db.query(insertClienteQuery, clienteValues);
      const clienteId = result.rows[0].id;

      // 2️⃣ Insertar las fotos en la tabla fotoclientes
      if (Array.isArray(fotos) && fotos.length > 0) {
        const insertFotoQuery = `
          INSERT INTO fotoclientes ("clienteId", foto, "createdAt", "updatedAt")
          VALUES ($1, $2, NOW(), NOW());
        `;

        for (const foto of fotos) {
          await db.query(insertFotoQuery, [clienteId, foto]);
        }
      }

      await db.query('COMMIT');
      return { message: 'Cliente creado exitosamente' };

    } catch (error) {
      await db.query('ROLLBACK');

      // Manejar error personalizado
      if (error.code === 'IDENTIFICACION_DUPLICADA') {
        throw { status: 409, message: error.message }; // 409 Conflict
      }

      throw error;
    }
  }, //Verificado

  // Obtener todos los registros con filtro de búsqueda y paginación
  getAll: async (limit, offset, searchTerm = '', oficinaId = null, rutaId = null, userId = null) => {
    const hasSearch = searchTerm.trim() !== '';

    let queryText = `
      SELECT 
        c.id, c.nombres, c.identificacion, c.nacionalidad, c.estado, c.telefono, c.direccion, 
        c."coordenadasCasa", c."coordenadasCobro", c.buro,
        r.id AS ruta_id, r.nombre AS ruta_nombre, c."public_id"
      FROM clientes c
      LEFT JOIN ruta r ON c."ruta_id" = r.id
    `;

    let params = [];
    let filters = [];

    // Filtro de búsqueda
    if (hasSearch) {
      filters.push(`(
        LOWER(c.nombres) ILIKE LOWER('%' || $${params.length + 1} || '%') OR
        LOWER(c.identificacion) ILIKE LOWER('%' || $${params.length + 1} || '%') OR
        LOWER(c.nacionalidad) ILIKE LOWER('%' || $${params.length + 1} || '%') OR
        LOWER(c.estado) ILIKE LOWER('%' || $${params.length + 1} || '%') OR
        LOWER(c.telefono) ILIKE LOWER('%' || $${params.length + 1} || '%')
      )`);
      params.push(searchTerm);
    }

    // Filtro por oficina
    if (oficinaId) {
      filters.push(`r."oficinaId" = $${params.length + 1}`);
      params.push(oficinaId);
    } else if (userId) {
      // Si no se seleccionó oficina, obtener oficinas asociadas al usuario
      const userOficinasResult = await db.query(`
        SELECT "oficinaId" FROM usuariooficinas WHERE "usuarioId" = $1
      `, [userId]);

      const oficinaIds = userOficinasResult.rows.map(row => row.oficinaId);

      if (oficinaIds.length > 0) {
        const oficinaPlaceholders = oficinaIds.map((_, i) => `$${params.length + i + 1}`).join(',');
        filters.push(`r."oficinaId" IN (${oficinaPlaceholders})`);
        params.push(...oficinaIds);
      } else {
        // Si no tiene oficinas asignadas, devolver vacío
        return {
          data: [],
          total: 0,
          page: Math.floor(offset / limit) + 1,
          limit,
          totalPages: 0
        };
      }
    }

    // Filtro por ruta
    if (rutaId) {
      filters.push(`c."ruta_id" = $${params.length + 1}`);
      params.push(rutaId);
    }

    // WHERE final
    if (filters.length) {
      queryText += ' WHERE ' + filters.join(' AND ');
    }

    // Paginación
    queryText += `
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    params.push(limit, offset);

    // Ejecutar consulta principal
    const result = await db.query(queryText, params);

    // Conteo total sin paginación
    const countQueryText = `
      SELECT COUNT(*) FROM clientes c
      LEFT JOIN ruta r ON c."ruta_id" = r.id
      ${filters.length ? 'WHERE ' + filters.join(' AND ') : ''}
    `;
    const countResult = await db.query(countQueryText, params.slice(0, -2));

    const total = Number(countResult.rows[0].count);

    return {
      data: result.rows.map(cliente => ({
        id: cliente.public_id,
        nombres: cliente.nombres,
        identificacion: cliente.identificacion,
        nacionalidad: cliente.nacionalidad,
        estado: cliente.estado,
        telefono: cliente.telefono,
        direccion: cliente.direccion,
        coordenadasCasa: cliente.coordenadasCasa,
        coordenadasCobro: cliente.coordenadasCobro,
        buro: cliente.buro,
        ruta: rutaId ? { id: cliente.ruta_id, nombre: cliente.ruta_nombre } : null
      })),
      total,
      page: Math.floor(offset / limit) + 1,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }, //Verificado

  // Obtener un cliente por su ID
  getById: async (id) => {
    // 1. Obtener cliente
    const clienteQuery = 'SELECT * FROM clientes WHERE "public_id" = $1;';
    const clienteResult = await db.query(clienteQuery, [id]);
    const cliente = clienteResult.rows[0];

    if (!cliente) return null;

    // 2. Obtener fotos
    const fotosQuery = 'SELECT foto FROM fotoclientes WHERE "clienteId" = $1;';
    const fotosResult = await db.query(fotosQuery, [cliente.id]);
    const fotos = fotosResult.rows.map(row => row.foto);

    // 3. Obtener créditos
    const creditosQuery = 'SELECT * FROM creditos WHERE "clienteId" = $1;';
    const creditosResult = await db.query(creditosQuery, [cliente.id]);
    const creditos = creditosResult.rows;

    // 4. Para cada crédito, obtener cuotas y pagos
    for (let credito of creditos) {
      // Cuotas del crédito
      const cuotasQuery = 'SELECT * FROM cuotas WHERE "creditoId" = $1;';
      const cuotasResult = await db.query(cuotasQuery, [credito.id]);
      const cuotas = cuotasResult.rows;

      // Pagos de cada cuota
      for (let cuota of cuotas) {
        const pagosQuery = 'SELECT * FROM pagos_cuotas WHERE "cuotaId" = $1;';
        const pagosResult = await db.query(pagosQuery, [cuota.id]);
        cuota.pagos = pagosResult.rows;
      }

      credito.cuotas = cuotas;
    }

    // 5. Adjuntar créditos al cliente
    cliente.creditos = creditos;
    
    const dataCliente ={
      id: cliente.public_id,
      nombres : cliente.nombres,
      telefono : cliente.telefono,
      direccion: cliente.direccion,
      coordenadasCasa: cliente.coordenadasCasa,
      coordenadasCobro: cliente.coordenadasCobro,
      identificacion: cliente.identificacion,
      createdAt: cliente.createdAt,
      updatedAt: cliente.updatedAt,
      rutaId: cliente.ruta_id,
      nacionalidad: cliente.nacionalidad,
      userId_create: cliente.userId_create,
      estado: cliente.estado,
      buro: cliente.buro,
      updated: cliente.updated,
      fotos: fotos,
      creditos: creditos
    }

    return dataCliente;
  }, //Verificado

  // Actualizar un cliente por su ID
  update: async (id, updatedData) => {
    // Eliminar campos que no deben actualizarse
    delete updatedData.id;
    delete updatedData.public_id;
    delete updatedData.rutaId;

    const fields = Object.keys(updatedData);
    const values = Object.values(updatedData);

    if (fields.length === 0) {
      throw new Error('No hay datos para actualizar');
    }

    const setClause = fields.map((field, index) => `"${field}" = $${index + 1}`).join(', ');

    const queryText = `
      UPDATE clientes
      SET ${setClause}, "updatedAt" = NOW()
      WHERE "public_id" = $${fields.length + 1}
      RETURNING *;
    `;

    const result = await db.query(queryText, [...values, id]);
    
    return result.rows[0];
  }, //Verificado

  delete: async (id) => {
    // Buscar id interno a partir de public_id
    const clienteRes = await db.query(`SELECT id FROM clientes WHERE "public_id" = $1`, [id]);
    if (clienteRes.rows.length === 0) return null;
    const clienteId = clienteRes.rows[0].id;

    try {
      await db.query('BEGIN');

      // Verificar existencia de cualquier crédito (pagado o no)
      const creditRes = await db.query(`SELECT COUNT(*) FROM creditos WHERE "clienteId" = $1`, [clienteId]);
      const existingCredits = Number(creditRes.rows[0].count);
      if (existingCredits > 0) {
        await db.query('ROLLBACK');
        throw { status: 400, message: 'El cliente tiene créditos asociados y no puede ser eliminado' };
      }

      // Eliminar fotos vinculadas
      await db.query(`DELETE FROM fotoclientes WHERE "clienteId" = $1`, [clienteId]);

      // Eliminar registros en traslado_clientes
      await db.query(`DELETE FROM traslado_clientes WHERE cliente_id = $1`, [clienteId]);

      // Eliminar cliente
      const delRes = await db.query(`DELETE FROM clientes WHERE id = $1 RETURNING *`, [clienteId]);

      await db.query('COMMIT');
      return delRes.rows[0];
    } catch (err) {
      await db.query('ROLLBACK');
      throw err;
    }
  } // Por Verificar
});
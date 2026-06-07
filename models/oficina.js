const db = require('../config/db');

module.exports = (db) => ({
  //Crear una nueva oficina
  create: async (oficinaData) => {
    try {
      await db.query('BEGIN');

      // Insertar la oficina
      const queryText = `
        INSERT INTO oficinas (nombre, direccion, telefono, "createdAt", "updatedAt", public_id)
        VALUES ($1, $2, $3, NOW(), NOW(), $4) RETURNING *;
      `;
      const values = [oficinaData.nombre, oficinaData.direccion, oficinaData.telefono, crypto.randomUUID()];
      const result = await db.query(queryText, values);
      const oficina = result.rows[0];

      // Insertar relación en usuariooficinas si hay un userId
      if (oficinaData.userId) {
        // Buscar el id interno del usuario usando su public_id
        const usuarioQuery = `SELECT id FROM usuarios WHERE public_id = $1;`;
        const usuarioResult = await db.query(usuarioQuery, [oficinaData.userId]);
        
        if (usuarioResult.rows.length === 0) {
          throw new Error('El usuario especificado no existe');
        }

        const usuarioIdInterno = usuarioResult.rows[0].id;

        await db.query(
          `INSERT INTO usuariooficinas ("usuarioId", "oficinaId", "createdAt", "updatedAt") VALUES ($1, $2, NOW(), NOW());`,
          [usuarioIdInterno, oficina.id]
        );
      }

      await db.query('COMMIT');
      return { message: 'Oficina creada exitosamente' };
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  }, //Verificado

  // Obtener todas las oficinas asociadas al usuario
  // Si es administrador, retorna todas las oficinas
  // Si es administrador_oficina, retorna solo las asociadas al usuario
  getAllOficinas: async (role, userId) => {
    let queryText = '';
    let values = [];

    if (role === 'administrador') {
      // Administrador: obtener todas las oficinas
      queryText = `
        SELECT o.* 
        FROM oficinas o
        ORDER BY o."createdAt" DESC;
      `;
    } else if (role === 'administrador_oficina') {
      // Administrador de oficina: obtener solo sus oficinas
      queryText = `
        SELECT o.* 
        FROM oficinas o
        INNER JOIN usuariooficinas uo ON o.id = uo."oficinaId"
        INNER JOIN usuarios u ON uo."usuarioId" = u.id
        WHERE u.public_id = $1
        ORDER BY o."createdAt" DESC;
      `;
      values.push(userId);
    }

    const result = await db.query(queryText, values);

    const data = result.rows.map((row) => ({
      id: row.public_id,
      nombre: row.nombre,
      direccion: row.direccion,
      telefono: row.telefono,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));

    return data;
  }, //Verificado

  // Obtener todas las oficinas con paginación y búsqueda
  getAll: async (page, limit, offset, search) => {
    let queryText = `SELECT * FROM oficinas WHERE 1=1`;
    let values = [];

    if (search && search.trim()) {
      queryText += ` AND (nombre ILIKE $1 OR direccion ILIKE $1 OR telefono ILIKE $1)`;
      values.push(`%${search}%`);
    }

    queryText += ` ORDER BY "createdAt" DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2};`;
    values.push(limit, offset);
    
    const result = await db.query(queryText, values);

    // Obtener total de registros
    let countQuery = `SELECT COUNT(*) AS total FROM oficinas WHERE 1=1`;
    let countValues = [];

    if (search && search.trim()) {
      countQuery += ` AND (nombre ILIKE $1 OR direccion ILIKE $1 OR telefono ILIKE $1)`;
      countValues.push(`%${search}%`);
    }

    countQuery += `;`;
    const countResult = await db.query(countQuery, countValues);
    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    const data = result.rows.map((row) => ({
      id: row.public_id,
      nombre: row.nombre,
      direccion: row.direccion,
      telefono: row.telefono,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));

    return {
      data: data,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages,
    };
  }, //Verificado

  // Obtener una oficina por public_id
  getById: async (id) => {
    const queryText = `SELECT * FROM oficinas WHERE public_id = $1;`;
    const { rows } = await db.query(queryText, [id]);

    if (rows.length === 0) return null;

    return rows[0];
  }, //Verificado

  update: async (id, updateData) => {
    try {
      await db.query('BEGIN');

      // Actualizar la oficina
      const queryText = `
        UPDATE oficinas 
        SET nombre = $1, direccion = $2, telefono = $3, "updatedAt" = NOW()
        WHERE public_id = $4 RETURNING *;
      `;
      const values = [updateData.nombre, updateData.direccion, updateData.telefono, id];
      const result = await db.query(queryText, values);
      
      if (result.rows.length === 0) {
        throw new Error('Oficina no encontrada');
      }

      const oficina = result.rows[0];

      // Eliminar relación previa en usuariooficinas
      await db.query(`DELETE FROM usuariooficinas WHERE "oficinaId" = $1;`, [oficina.id]);

      // Insertar nueva relación si hay un userId
      if (updateData.userId) {
        // Buscar el id interno del usuario usando su public_id
        const usuarioQuery = `SELECT id FROM usuarios WHERE public_id = $1;`;
        const usuarioResult = await db.query(usuarioQuery, [updateData.userId]);
        
        if (usuarioResult.rows.length === 0) {
          throw new Error('El usuario especificado no existe');
        }

        const usuarioIdInterno = usuarioResult.rows[0].id;

        await db.query(
          `INSERT INTO usuariooficinas ("usuarioId", "oficinaId","createdAt", "updatedAt") VALUES ($1, $2, NOW(), NOW());`,
          [usuarioIdInterno, oficina.id]
        );
      }

      await db.query('COMMIT');
      return {
        message: 'Oficina actualizada exitosamente',
      };
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  }, //Verificado

  // Eliminar una oficina (solo si no tiene rutas)
  delete: async (id) => {
    try {
      await db.query('BEGIN');

      // Buscar la oficina por public_id
      const oficinaQuery = `SELECT id FROM oficinas WHERE public_id = $1;`;
      const oficinaResult = await db.query(oficinaQuery, [id]);

      if (oficinaResult.rows.length === 0) {
        throw new Error('Oficina no encontrada');
      }

      const oficinaId = oficinaResult.rows[0].id;

      // Verificar si la oficina tiene rutas
      const rutasQuery = `SELECT COUNT(*) as count FROM ruta WHERE "oficinaId" = $1;`;
      const rutasResult = await db.query(rutasQuery, [oficinaId]);
      const rutasCount = parseInt(rutasResult.rows[0].count);

      if (rutasCount > 0) {
        throw new Error('No se puede eliminar la oficina porque tiene rutas asociadas');
      }

      // Eliminar la relación entre la oficina y el usuario
      await db.query(`DELETE FROM usuariooficinas WHERE "oficinaId" = $1;`, [oficinaId]);

      // Eliminar la oficina
      await db.query(`DELETE FROM oficinas WHERE public_id = $1;`, [id]);

      await db.query('COMMIT');

      return { message: "Oficina eliminada correctamente." };
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  } //Verificado
});
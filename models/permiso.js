const db = require('../config/db');

module.exports = (db) => ({
  // Crear un permiso con un array en descripcion
  create: async (permisoData) => {
    const queryText = `
      INSERT INTO permisos (nombre, descripcion, "createdAt", "updatedAt", "public_id")
      VALUES ($1, $2, NOW(), NOW(), $3) RETURNING *;
    `;
    // Aseguramos que descripcion esté en formato array
    const descripcion = Array.isArray(permisoData.descripcion) ? permisoData.descripcion : [permisoData.descripcion];
    const values = [permisoData.nombre, descripcion, crypto.randomUUID()];
    const { rows } = await db.query(queryText, values);

    // Convertir descripcion a un array antes de devolverlo
    const permisoCreado = rows[0];
    permisoCreado.descripcion = Array.isArray(permisoCreado.descripcion) ? permisoCreado.descripcion : [permisoCreado.descripcion];

    return { message: 'Permiso creado exitosamente' };
  }, //Verificado

  // Obtener todos los permisos
  getAll: async (search = '') => {
    let queryText = `SELECT * FROM permisos`;
    let values = [];

    if (search && search.trim()) {
      queryText += ` WHERE nombre ILIKE $1`;
      values = [`%${search}%`];
    }

    queryText += ` ORDER BY "createdAt" DESC;`;
    const { rows } = await db.query(queryText, values);

    // Aseguramos que descripcion esté como un array
    return rows.map((row) => ({
      ...row,
      descripcion: row.descripcion ? [row.descripcion] : [], // Convertir descripcion a array
    }));
  }, //Verificado

  // Obtener un permiso por ID
  getById: async (id) => {
    const queryText = `SELECT * FROM permisos WHERE public_id = $1;`;
    const { rows } = await db.query(queryText, [id]);
    if (rows.length === 0) return null;

    const permiso = rows[0];
    // Aseguramos que descripcion esté como un array
    permiso.descripcion = permiso.descripcion ? [permiso.descripcion] : [];

    const data = {
      id: permiso.public_id,
      nombre: permiso.nombre,
      descripcion: permiso.descripcion,
      createdAt: permiso.createdAt,
      updatedAt: permiso.updatedAt,
    }

    return data;
  }, //Verificado

  // Obtener un permiso por ID Interno (se usa en login para obtener permisos del usuario)
  getByIdInterno: async (id) => {
    const queryText = `SELECT * FROM permisos WHERE id = $1;`;
    const { rows } = await db.query(queryText, [id]);
    if (rows.length === 0) return null;
    const permiso = rows[0];
    return permiso;
  }, //Verificado

  // Actualizar un permiso
  update: async (id, updateData) => {
    const queryText = `
      UPDATE permisos 
      SET nombre = $1, descripcion = $2, "updatedAt" = NOW()
      WHERE public_id = $3 RETURNING *;
    `;
    // Aseguramos que descripcion esté en formato array
    const descripcion = Array.isArray(updateData.descripcion) ? updateData.descripcion : [updateData.descripcion];
    const values = [updateData.nombre, descripcion, id];
    const { rows } = await db.query(queryText, values);

    // Aseguramos que descripcion esté como un array al devolverlo
    const permiso = rows[0];
    permiso.descripcion = permiso.descripcion ? [permiso.descripcion] : [];

    return { message: 'Permiso actualizado exitosamente' };
  }, //Verificado

  // Eliminar un permiso (solo si no está asignado a usuarios)
  delete: async (id) => {
    // Primero obtener el permiso por public_id para conseguir su id interno
    const getPermiso = `SELECT id FROM permisos WHERE public_id = $1;`;
    const permisoResult = await db.query(getPermiso, [id]);
    
    if (permisoResult.rows.length === 0) {
      return null; // Permiso no encontrado
    }

    const permisoId = permisoResult.rows[0].id;

    // Verificar si hay usuarios con este permiso
    const checkQuery = `SELECT COUNT(*) FROM usuarios WHERE "permisoId" = $1;`;
    const checkResult = await db.query(checkQuery, [permisoId]);
    if (parseInt(checkResult.rows[0].count) > 0) {
      return { error: "No se puede eliminar el permiso porque está asignado a usuarios." };
    }

    const queryText = `DELETE FROM permisos WHERE public_id = $1 RETURNING *;`;
    const { rows } = await db.query(queryText, [id]);
    return rows.length ? { message: 'Permiso eliminado exitosamente' } : null;
  } //Verificado
});
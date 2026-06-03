const bcrypt = require('bcrypt'); // Para comparar la contraseña
const Permisos = require('./permiso');

module.exports = (db) => ({
  // Crear un nuevo usuario
  create: async (usuarioData) => {
    const { nombre, correo, contrasena, tipo, permisoId, estado } = usuarioData;

    // Buscar el id interno del permiso usando su public_id
    let permisoIdInterno = null;
    if (permisoId) {
      const permisoQuery = `SELECT id FROM permisos WHERE public_id = $1;`;
      const permisoResult = await db.query(permisoQuery, [permisoId]);
      
      if (permisoResult.rows.length === 0) {
        throw new Error('El permiso especificado no existe');
      }
      permisoIdInterno = permisoResult.rows[0].id;
    }

    // Encriptar la contraseña antes de guardarla
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(contrasena, saltRounds); // Encriptar la contraseña

    const queryText = `
      INSERT INTO usuarios (nombre, correo, contrasena, tipo, "permisoId", estado, "createdAt", "updatedAt", "public_id")
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW(), $7)
      RETURNING *;
    `;
    const values = [nombre, correo, hashedPassword, tipo, permisoIdInterno, estado, crypto.randomUUID()];
    const result = await db.query(queryText, values);
    return {
      message: 'Usuario creado exitosamente',
    };
  }, //Verificado

  // Obtener todos los usuarios con paginación y busqueda
  getAll: async (page, limit, offset, search) => {
    let queryText = `
      SELECT 
        u.*,
        p.id AS permiso_id,
        p.nombre AS permiso_nombre,
        p.public_id AS permiso_public_id
      FROM usuarios u
      LEFT JOIN permisos p ON u."permisoId" = p.id
      WHERE 1=1
    `;
    let values = [limit, offset];

    if (search && search.trim()) {
      queryText += ` AND (u.nombre ILIKE $3 OR u.correo ILIKE $3 OR u.tipo::text ILIKE $3 OR u.estado::text ILIKE $3)`;
      values.push(`%${search}%`);
    }

    queryText += ` LIMIT $1 OFFSET $2;`;
    const result = await db.query(queryText, values);

    // Obtener el total de registros para cálculo de páginas
    let countQuery = `SELECT COUNT(*) FROM usuarios`;
    let countValues = [];

    if (search && search.trim()) {
      countQuery += ` WHERE nombre ILIKE $1 OR correo ILIKE $1 OR tipo::text ILIKE $1 OR estado::text ILIKE $1`;
      countValues = [`%${search}%`];
    }

    countQuery += `;`;
    const countResult = await db.query(countQuery, countValues);
    const total = Number(countResult.rows[0].count);
    const totalPages = total > 0 ? Math.ceil(Number(total) / Number(limit)) : 1;

    const usuarios = result.rows.map((usuario) => ({
      id: usuario.public_id,
      nombre: usuario.nombre,
      correo: usuario.correo,
      tipo: usuario.tipo,
      createdAt: usuario.createdAt,
      updatedAt: usuario.updatedAt,
      estado: usuario.estado,
      permiso: usuario.permiso_id ? {
        id: usuario.permiso_public_id,
        nombre: usuario.permiso_nombre
      } : null
    }));
    return {
      data: usuarios,
      total: total,
      page: Number(page),
      limit: Number(limit),
      totalPages: totalPages
    };
  }, //Verificado

  // Obtener un usuario por su ID
  getById: async (id) => {
    const queryText = `
      SELECT 
        u.*,
        p.id AS permiso_id,
        p.nombre AS permiso_nombre,
        p.descripcion AS permiso_descripcion,
        p.public_id AS permiso_public_id
      FROM usuarios u
      LEFT JOIN permisos p ON u."permisoId" = p.id
      WHERE u.public_id = $1
    `;
    const result = await db.query(queryText, [id]);
    
    if (result.rows.length === 0) return null;

    const usuario = result.rows[0];
    
    const permiso = usuario.permiso_id ? {
      id: usuario.permiso_public_id,
      nombre: usuario.permiso_nombre
    } : null;

    return {
      id: usuario.public_id,
      nombre: usuario.nombre,
      correo: usuario.correo,
      tipo: usuario.tipo,
      createdAt: usuario.createdAt,
      updatedAt: usuario.updatedAt,
      estado: usuario.estado,
      permisoId: usuario.permisoId,
      permiso: permiso
    };
  }, //Verificado

  // Editar un usuario por su ID
  edit: async (id, usuarioData) => {
    const { nombre, correo, contrasena, tipo, estado, permisoId } = usuarioData;

    // Buscar el id interno del permiso usando su public_id
    let permisoIdInterno = null;
    if (permisoId) {
      const permisoQuery = `SELECT id FROM permisos WHERE public_id = $1;`;
      const permisoResult = await db.query(permisoQuery, [permisoId]);
      
      if (permisoResult.rows.length === 0) {
        throw new Error('El permiso especificado no existe');
      }
      permisoIdInterno = permisoResult.rows[0].id;
    }

    let queryText;
    let values;

    if (contrasena) {
      // Encriptar la nueva contraseña si se proporciona una
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(contrasena, saltRounds); // Encriptar la nueva contraseña

      queryText = `
        UPDATE usuarios 
        SET nombre = $1, correo = $2, contrasena = $3, tipo = $4, "permisoId" = $5, estado = $6, "updatedAt" = NOW()
        WHERE public_id = $7 RETURNING *;
      `;
      values = [nombre, correo, hashedPassword, tipo, permisoIdInterno, estado, id];
    } else {
      // Si no se proporciona nueva contraseña, solo actualizamos los demás campos
      queryText = `
        UPDATE usuarios 
        SET nombre = $1, correo = $2, tipo = $3, "permisoId" = $4, estado = $5, "updatedAt" = NOW()
        WHERE public_id = $6 RETURNING *;
      `;
      values = [nombre, correo, tipo, permisoIdInterno, estado, id];
    }

    const result = await db.query(queryText, values);
    const data = {
      message: 'Usuario actualizado exitosamente',
    };
    return data; // Devuelve el usuario actualizado
  }, //Verificado

  // Buscar usuarios por oficina a través de la ruta asignada
  getUsuariosByOficina: async (oficinaId, page, limit, offset) => {
    const queryText = `
      SELECT DISTINCT u.*
      FROM usuarios u
      JOIN usuariorutas ur ON u.id = ur."usuarioId"
      JOIN ruta r ON ur."rutaId" = r.id
      WHERE r."oficinaId" = $1 AND u.estado != 'archivado'
      LIMIT $2 OFFSET $3;
    `;
    const result = await db.query(queryText, [oficinaId, limit, offset]);

    // Obtener el total de registros para cálculo de páginas
    const countQuery = `
      SELECT COUNT(DISTINCT u.id) AS total
      FROM usuarios u
      JOIN usuariorutas ur ON u.id = ur."usuarioId"
      JOIN ruta r ON ur."rutaId" = r.id
      WHERE r."oficinaId" = $1 AND u.estado != 'archivado';
    `;
    const countResult = await db.query(countQuery, [oficinaId]);
    const total = Number(countResult.rows[0].total);

    return {
      data: result.rows,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit)
    };
  },

  // Obtener un usuario por su correo electrónico
  getByEmail: async (email) => {
    try {
      const res = await db.query('SELECT * FROM usuarios WHERE correo = $1', [email]);
      return res.rows[0]; // Retorna el primer usuario encontrado (debería ser único)
    } catch (error) {
      throw error;
    }
  }, //Usado en auth.controller para login @Verificado

  // Verificar que la contraseña es válida (comparando el hash)
  validatePassword: async (password, hashedPassword) => {
    return bcrypt.compare(password, hashedPassword); // Retorna true o false
  }, //Usado en auth.controller para login @Verificado

});

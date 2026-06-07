module.exports = async (req, res, next) => {
  try {
    const db = req.db;

    const oficinaId = req.query?.oficinaId || req.params?.oficinaId;

    const { userId, role } = req.user;

    // Validar oficinaId
    if (!oficinaId) {
      return res.status(400).json({
        message: "La oficina es obligatoria"
      });
    }

    // ADMINISTRADOR
    // Puede acceder a cualquier oficina
    if (role === "administrador") {
      // Resolver id interno para que esté disponible en req.oficinaId
      const oficinas = await db.query(
        `SELECT id FROM oficinas WHERE public_id = $1`,
        [oficinaId]
      );
      if (oficinas.rows.length > 0) {
        req.oficinaId = oficinas.rows[0].id;
      }
      return next();
    }

    // Obtener la oficina
    const oficinas = await db.query(
      `
      SELECT id, public_id
      FROM oficinas
      WHERE public_id = $1
      `,
      [oficinaId]
    );

    if (!oficinas.rows.length) {
      return res.status(404).json({
        message: "La oficina no existe"
      });
    }

    const oficina = oficinas.rows[0];

    // ADMINISTRADOR OFICINA
    if (role === "administrador_oficina") {
      const usuarioOficina = await db.query(
        `
        SELECT *
        FROM usuariooficinas
        WHERE "usuarioId" = $1
        AND "oficinaId" = $2
        `,
        [userId, oficina.id]
      );

      if (!usuarioOficina.rows.length) {
        return res.status(403).json({
          message: "No tienes acceso a esta oficina"
        });
      }

      req.oficinaId = oficina.id;
      return next();
    }

    // Otros roles no tienen acceso a validar oficina
    return res.status(403).json({
      message: "No tienes permisos para acceder a esta oficina"
    });

  } catch (error) {
    return res.status(500).json({
      message: "Error al validar la oficina",
      error: error.message
    });
  }
};

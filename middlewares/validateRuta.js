module.exports = async (req, res, next) => {
  try {
    const db = req.db;
    const rutaId = req.query?.rutaId || req.params?.rutaId; // Este es el public_id que viene en la URL
    const { userId, role } = req.user;

    // Validar rutaId
    if (!rutaId) {
      return res.status(400).json({
        message: "La ruta es obligatoria"
      });
    }

    // 1. Buscamos la ruta PRIMERO para todos los roles (incluido Administrador)
    // Así obtenemos el ID interno y aseguramos que la ruta realmente exista.
    const rutas = await db.query(
      `
      SELECT id, "oficinaId"
      FROM ruta
      WHERE public_id = $1
      `,
      [rutaId]
    );

    if (!rutas.rows.length) {
      return res.status(404).json({
        message: "La ruta no existe"
      });
    }

    const ruta = rutas.rows[0];

    // 2. Seteamos el ID interno en el request para que esté disponible en el controlador
    req.rutaId = ruta.id;
    // (Opcional) Si tu función 'getAll' o controladores siguientes también necesitan la oficina:
    req.oficinaId = ruta.oficinaId;

    // --- AHORA SÍ EVALUAMOS LOS ROLES ---

    // ADMINISTRADOR
    // Ya tiene el id interno cargado en 'req.rutaIdInterno', puede pasar directo
    if (role === "administrador") {
      return next();
    }

    // ADMINISTRADOR OFICINA
    if (role === "administrador_oficina") {
      const oficina = await db.query(
        `
        SELECT *
        FROM usuariooficinas
        WHERE "usuarioId" = $1
        AND "oficinaId" = $2
        `,
        [userId, ruta.oficinaId]
      );

      if (!oficina.rows.length) {
        return res.status(403).json({
          message: "No tienes acceso a esta oficina"
        });
      }

      return next();
    }

    // COBRADOR
    if (role === "cobrador") {
      const rutaPermitida = await db.query(
        `
        SELECT *
        FROM usuariorutas
        WHERE "usuarioId" = $1
        AND "rutaId" = $2
        `,
        [userId, ruta.id]
      );

      if (!rutaPermitida.rows.length) {
        return res.status(403).json({
          message: "No tienes acceso a esta ruta"
        });
      }

      return next();
    }

    return res.status(403).json({
      message: "No autorizado"
    });

  } catch (error) {
    // Es mejor registrar el error real en tu consola/logs para debugging 
    // y devolver un mensaje genérico de error de servidor.
    console.error("Error en middleware de ruta:", error);
    return res.status(500).json({
      message: "Error interno del servidor al validar los accesos"
    });
  }
};
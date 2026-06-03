module.exports = async (req,res,next) => {
  try {
    const db = req.db;

    const { rutaId } = req.query;

    const { userId, role } = req.user;

    // Validar rutaId
    if (!rutaId) {
      return res.status(400).json({
        message:
          "La ruta es obligatoria"
      });
    }

    // ADMINISTRADOR
    // Puede crear en cualquier ruta
    if ( role === "administrador") {
      return next();
    }

    // Obtener la ruta
    const rutas =
      await db.query(
        `
        SELECT id, "oficinaId"
        FROM ruta
        WHERE public_id = $1
        `,
        [rutaId]
      );

    if (!rutas.rows.length) {
      return res.status(404).json({
        message:
          "La ruta no existe"
      });
    }

    const ruta =
      rutas.rows[0];
    console.log(userId, ruta.id)
    // ADMINISTRADOR OFICINA
    if ( role === "administrador_oficina" ) {

      const oficina =
        await db.query(
          `
          SELECT *
          FROM usuariooficinas
          WHERE "usuarioId" = $1
          AND "oficinaId" = $2
          `,
          [
            userId,
            ruta.oficinaId
          ]
        );

      if (
        !oficina.rows.length
      ) {
        return res
          .status(403)
          .json({
            message:
              "No tienes acceso a esta oficina"
          });
      }

      return next();
    }

    // COBRADOR
    if ( role === "cobrador" ) {

      const rutaPermitida =
        await db.query(
          `
          SELECT *
          FROM usuariorutas
          WHERE "usuarioId" = $1
          AND "rutaId" = $2
          `,
          [
            userId,
            ruta.id
          ]
        );

      if (
        !rutaPermitida.rows.length
      ) {
        return res
          .status(403)
          .json({
            message:
              "No tienes acceso a esta ruta"
          });
      }

      return next();
    }

    return res.status(403).json({
      message:
        "No autorizado"
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message:
        "No tienes acceso a esta ruta"
    });
  }
};
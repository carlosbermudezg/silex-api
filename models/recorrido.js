const pool = require('../config/db');

const Recorrido = {
    //Obtener los pagos del recorrido
    getPagosByRutaAndFecha: async (rutaId, fecha) => {
      try {
        const res = await pool.query(`
          SELECT 
            p.*, 
            c.nombres AS cliente_nombre, 
            c."coordenadasCobro",
            u.nombre AS usuario_nombre
          FROM pagos p
          INNER JOIN clientes c ON p."cliente_id" = c.id
          INNER JOIN usuarios u ON p."user_created_id" = u.id
          WHERE c."rutaId" = $1 AND DATE(p."createdAt") = $2
          ORDER BY p."createdAt" ASC
        `, [rutaId, fecha]);
    
        return res.rows;
      } catch (error) {
        throw error;
      }
    }        
};

module.exports = Recorrido;
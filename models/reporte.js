const db = require('../config/db');

const Reporte = {
  // Obtener reporte de estado de cuenta
  getEstadoCuenta: async (ruta, desde, hasta) => {
    try {
      // Ajustar rango para incluir todo el día
      const desdeInicio = `${desde} 00:00:00`;
      const hastaFin = `${hasta} 23:59:59.999`;
  
      const values = [desdeInicio, hastaFin];
      let rutaFiltro = '';
  
      if (ruta) {
        values.push(Number(ruta));
        rutaFiltro = `AND r.id = $3`;
      }
  
      // 1. Obtener los turnos con datos de usuario y ruta
      const turnosQuery = `
        SELECT 
          t.id,
          t.fecha_apertura,
          t.fecha_cierre,
          t.monto_inicial,
          t.monto_final,
          t.usuario_open,
          t.usuario_close,
          t.sistema,
          c.id AS caja_id,
          r.nombre AS ruta_nombre,
          u.nombre AS usuario_open,
          us.nombre AS usuario_close
        FROM turnos t
        JOIN cajas c ON t.caja_id = c.id
        JOIN usuarios u ON t."usuario_open" = u.id
        JOIN usuarios us ON t."usuario_close" = us.id
        JOIN ruta r ON c."rutaId" = r.id
        WHERE t.fecha_apertura BETWEEN $1 AND $2
        ${rutaFiltro}
        ORDER BY t.fecha_apertura ASC
      `;
  
      const turnosResult = await db.query(turnosQuery, values);
      const turnos = turnosResult.rows;
  
      // 2. Obtener todos los movimientos relacionados a esos turnos
      const turnoIds = turnos.map(t => t.id);
      let movimientos = [];
  
      if (turnoIds.length > 0) {
        const movimientosQuery = `
          SELECT 
            mc.id,
            mc."createdAt",
            mc.monto,
            mc.saldo,
            mc.saldo_anterior,
            mc.category,
            mc.tipo,
            mc.descripcion,
            mc."turnoId",
            u.nombre AS usuario_nombre
          FROM movimientos_caja mc
          JOIN usuarios u ON mc."usuarioId" = u.id
          WHERE mc."turnoId" = ANY($1::int[])
          ORDER BY mc."createdAt" ASC
        `;
  
        const movimientosResult = await db.query(movimientosQuery, [turnoIds]);
        movimientos = movimientosResult.rows;
      }
  
      // 3. Asociar los movimientos a cada turno
      const turnosConMovimientos = turnos.map(turno => {
        const movimientosTurno = movimientos.filter(m => m.turnoId === turno.id);
        const totalAbonos = movimientosTurno.filter( mov => mov.tipo === 'abono').reduce((prev, curr)=> { return prev + Number(curr.monto) }, 0);
        const totalAportes = movimientosTurno.filter( mov => mov.tipo === 'ingreso').reduce((prev, curr)=> { return prev + Number(curr.monto) }, 0);
        const totalGastos = movimientosTurno.filter( mov => mov.tipo === 'gasto').reduce((prev, curr)=> { return prev + Number(curr.monto) }, 0);
        const totalAnulaciones = movimientosTurno.filter( mov => mov.tipo === 'anulacion').reduce((prev, curr)=> { return prev + Number(curr.monto) }, 0);
        const totalCreditos = movimientosTurno.filter( mov => mov.tipo === 'credito').reduce((prev, curr)=> { return prev + Number(curr.monto) }, 0);

        const totalIngresos = movimientosTurno.filter( mov => mov.category === 'ingreso').reduce((prev, curr)=> { return prev + Number(curr.monto) }, 0);
        const totalEgresos = movimientosTurno.filter( mov => mov.category === 'egreso').reduce((prev, curr)=> { return prev + Number(curr.monto) }, 0);
        return {
          ...turno,
          movimientos: movimientosTurno,
          totalAbonos,
          totalAportes,
          totalCreditos,
          totalGastos,
          totalAnulaciones,
          totalIngresos,
          totalEgresos
        };
      });
  
      return turnosConMovimientos;
  
    } catch (error) {
      console.error('Error en getEstadoCuenta:', error);
      throw error;
    }
  } 
};

module.exports = Reporte;
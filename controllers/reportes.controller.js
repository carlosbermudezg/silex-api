const Reporte = require('../models/reporte');
const catchError = require('../utils/catchError');  // Manejador de errores

// Obtener todos los productos con paginación
const getEstadoCuenta = catchError(async (req, res) => {
  const {ruta, desde, hasta} = req.query;
  const reporte = await Reporte.getEstadoCuenta(ruta, desde, hasta);
  return res.status(200).json(reporte);
});

module.exports = {
  getEstadoCuenta,
};
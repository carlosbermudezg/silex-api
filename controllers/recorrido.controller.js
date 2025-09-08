const Recorrido = require('../models/recorrido');
const catchError = require('../utils/catchError');  // Manejador de errores

const getPagosByRutaAndFecha = catchError(async (req, res) => {
    const { rutaId, fecha } = req.query;
  
    if (!rutaId || !fecha) {
      return res.status(400).json({ message: 'Ruta y fecha son requeridos' });
    }
  
    const pagos = await Recorrido.getPagosByRutaAndFecha(rutaId, fecha);
    return res.status(200).json(pagos);
});

module.exports = {
    getPagosByRutaAndFecha,
};
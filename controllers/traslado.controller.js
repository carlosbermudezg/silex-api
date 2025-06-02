// controllers/trasladoController.js
const catchError = require('../utils/catchError');
const Traslado = require('../models/traslado');

const getTrasladosClientesPaginados = catchError(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
  
    const allTraslados = await Traslado.getAllTraslados();
  
    const total = allTraslados.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const end = start + limit;
  
    const paginated = allTraslados.slice(start, end);
  
    return res.status(200).json({
      data: paginated,
      total,
      page,
      limit,
      totalPages
    });
});

const createClienteTrasladoMasivo = catchError(async (req, res) => {
  const {
    oficina_origen_id,
    ruta_origen_id,
    cliente_ids,
    oficina_destino_id,
    ruta_destino_id,
    motivo_traslado
  } = req.body;

  const user_create = req.user.userId;
  console.log(req)

  if (!Array.isArray(cliente_ids) || cliente_ids.length === 0) {
    return res.status(400).json({ message: 'Debe proporcionar al menos un cliente para trasladar.' });
  }

  if (!oficina_origen_id || !ruta_origen_id || !oficina_destino_id || !ruta_destino_id || !motivo_traslado || !user_create) {
    return res.status(400).json({ message: 'Faltan campos obligatorios.' });
  }

  const traslados = await Traslado.createClienteTrasladoMasivo({
    oficina_origen_id,
    ruta_origen_id,
    cliente_ids,
    oficina_destino_id,
    ruta_destino_id,
    motivo_traslado,
    user_create
  });

  return res.status(201).json({ message: 'Traslados registrados exitosamente', traslados });
});

module.exports = {
    getTrasladosClientesPaginados,
    createClienteTrasladoMasivo
};
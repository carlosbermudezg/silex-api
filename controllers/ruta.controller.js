const RutaModel = require('../models/ruta');
const CajaModel = require('../models/caja');
const catchError = require('../utils/catchError');

// Crear una nueva ruta
const createRuta = catchError(async (req, res) => {
  try {
    const Ruta = RutaModel(req.db);
    const { userId } = req.user;
    const rutaData = {
      ...req.body,
      userCreate: userId
    };
    const data = await Ruta.create(rutaData);
    return res.status(201).json(data);
  } catch (error) {
    //Llave duplicada
    if (error.code === '23505') {
      return res.status(400).json({ message: 'Ya existe una ruta con ese nombre en la oficina.' });
    }
    if (error.message.includes('Límite de rutas alcanzado')) {
      return res.status(403).json({ message: error.message });
    }
    throw error;
  }
}); //Verificado

// Obtener todas las rutas con paginación
const getAllRutas = catchError(async (req, res) => {
  const Ruta = RutaModel(req.db);
  const { page = 1, limit = 10, search = '' } = req.query;
  const offset = (page - 1) * parseInt(limit);
  const rutas = await Ruta.getAll(page, limit, offset, search);
  return res.status(200).json(rutas);
}); //Verificado

// Obtener una ruta por id
const getRutaById = catchError(async (req, res) => {
  const Ruta = RutaModel(req.db);
  const { id } = req.params;
  const ruta = await Ruta.getById(id);
  if (!ruta) return res.status(404).json({ message: 'Ruta no encontrada' });
  return res.status(200).json(ruta);
}); //Verificado

// Editar una ruta
const updateRuta = catchError(async (req, res) => {
  const Ruta = RutaModel(req.db);
  const { id } = req.params;
  const updatedRuta = await Ruta.update(id, req.body);
  if (!updatedRuta) {
    return res.status(404).json({ message: 'Ruta no encontrada' });
  }
  return res.status(200).json(updatedRuta);
}); //Verificado

const getRutasByOficina = async (req, res) => {
  try {
    const Ruta = RutaModel(req.db);
    const { oficinaId } = req.query;
    const rutas = await Ruta.getByOficina(oficinaId);
    return res.status(200).json(rutas);

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}; //Verificado

const getRutaDeCobro = catchError(async (req, res) => {
  const Ruta = RutaModel(req.db);
  const { rutaId } = req.query;
  const resultado = await Ruta.getRutaDeCobro(rutaId);
  res.status(200).json(resultado);
});

module.exports = {
  createRuta,
  getAllRutas,
  getRutaById,
  updateRuta,
  getRutasByOficina,
  getRutaDeCobro
};

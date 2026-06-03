const RutaModel = require('../models/ruta');
const CajaModel = require('../models/caja');
const catchError = require('../utils/catchError');

// Crear una nueva ruta
const createRuta = catchError(async (req, res) => {
  try {
    const Ruta = RutaModel(req.db);
    const data = await Ruta.create(req.body);
    return res.status(201).json(data);
  } catch (error) {
    if (error.message.includes('Límite de rutas alcanzado')) {
      return res.status(403).json({ message: error.message });
    }
    throw error;
  }
});

// Obtener todas las rutas con paginación
const getAllRutas = catchError(async (req, res) => {
  const Ruta = RutaModel(req.db);
  const { page = 1, limit = 10 } = req.query;
  const offset = (page - 1) * parseInt(limit);
  const rutas = await Ruta.getAll(page, limit, offset);
  return res.status(200).json(rutas);
});

// Obtener una ruta por ID
const getRutaById = catchError(async (req, res) => {
  const Ruta = RutaModel(req.db);
  const { id } = req.params;
  const ruta = await Ruta.getById(id);
  if (!ruta) return res.status(404).json({ message: 'Ruta no encontrada' });
  return res.status(200).json(ruta);
});

// Editar una ruta
const updateRuta = catchError(async (req, res) => {
  const Ruta = RutaModel(req.db);
  const { id } = req.params;
  const updatedRuta = await Ruta.update(id, req.body);

  if (!updatedRuta) {
    return res.status(404).json({ message: 'Ruta no encontrada' });
  }

  return res.status(200).json({ message: 'Ruta actualizada', data: updatedRuta });
});

// const deleteRuta = async (req, res) => {
//     try {
//         const { id } = req.params;

//         // Verificar si hay clientes asociados a la ruta
//         const clientesAsociados = await Ruta.checkClientesAsociados(id);
//         if (clientesAsociados > 0) {
//             return res.status(400).json({ 
//                 message: 'No se puede eliminar la ruta porque hay clientes asociados a ella.' 
//             });
//         }

//         // Si no hay clientes asociados, eliminar la ruta
//         await Ruta.delete(id);
//         return res.status(200).json({ message: 'Ruta eliminada correctamente' });

//     } catch (error) {
//         return res.status(500).json({ error: error.message });
//     }
// };

// Eliminar una ruta
const deleteRuta = catchError(async (req, res) => {
  const Ruta = RutaModel(req.db);
  const { id } = req.params;

  try {
    const rutaEliminada = await Ruta.delete(id);
    return res.status(200).json({ message: 'Ruta eliminada exitosamente', data: rutaEliminada });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

const getRutasByOficina = async (req, res) => {
  try {
    const Ruta = RutaModel(req.db);
    const { oficinaId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * parseInt(limit);

    const rutas = await Ruta.getByOficina(oficinaId, parseInt(page), parseInt(limit), offset);
    return res.status(200).json(rutas);

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const searchRutasByName = async (req, res) => {
  try {
    const Ruta = RutaModel(req.db);
    const { searchTerm } = req.query;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * parseInt(limit);

    const rutas = await Ruta.searchByName(searchTerm, parseInt(page), parseInt(limit), offset);
    return res.status(200).json(rutas);

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const getRutasByUsuario = async (req, res) => {
  try {
    const Ruta = RutaModel(req.db);
    const { usuarioId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * parseInt(limit);

    if (!usuarioId) {
      return res.status(400).json({ error: "Debe proporcionar un ID de usuario." });
    }

    const rutas = await Ruta.getByUsuario(usuarioId, parseInt(page), parseInt(limit), offset);
    return res.status(200).json(rutas);

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const getRutaDelCobrador = catchError(async (req, res) => {
  const Ruta = RutaModel(req.db);
  const { id } = req.params;
  const resultado = await Ruta.getRutaPorUsuarioId(id);
  res.status(200).json(resultado);
});

module.exports = {
  createRuta,
  getAllRutas,
  getRutaById,
  updateRuta,
  deleteRuta,
  getRutasByOficina,
  searchRutasByName,
  getRutasByUsuario,
  getRutaDelCobrador
};

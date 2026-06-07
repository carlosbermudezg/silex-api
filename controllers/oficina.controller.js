const OficinaModel = require('../models/oficina');
const catchError = require('../utils/catchError');

// Crear una oficina con rutas asociadas
const createOficina = catchError(async (req, res) => {
  const Oficina = OficinaModel(req.db);
  const { nombre, direccion, telefono, userId } = req.body;
  const oficina = await Oficina.create({ nombre, direccion, telefono, userId });
  return res.status(201).json({ data: oficina });
}); //Verificado

// Obtener todas las oficinas con paginacion y busqueda
const getAll = catchError(async (req, res) => {
  const Oficina = OficinaModel(req.db);
  const { search } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  const oficinas = await Oficina.getAll(page, limit, offset, search);

  return res.status(200).json(oficinas);
}); //Verificado

// Obtener todas las oficinas (se obtendrá según el rol del usuario)
// Si es administrador, se obtendrán todas las oficinas, 
// si es administrador_oficina, se obtendrá solo la oficina asociada al usuario
// Sin paginación
const getAllOficinas = catchError(async (req, res) => {
  const Oficina = OficinaModel(req.db);
  const { role, userId } = req.user;
  const oficinas = await Oficina.getAllOficinas(role, userId);
  return res.status(200).json({ data: oficinas });
}); //Verificado

// Obtener una oficina por public_id
const getOficinaById = catchError(async (req, res) => {
  const Oficina = OficinaModel(req.db);
  const oficina = await Oficina.getById(req.params.id);
  if (!oficina) return res.status(404).json({ message: 'Oficina no encontrada' });
  return res.status(200).json({ data: oficina });
}); //Verificado

// Actualizar una oficina y sus rutas
const updateOficina = catchError(async (req, res) => {
  const Oficina = OficinaModel(req.db);
  const oficina = await Oficina.update(req.params.id, req.body);
  return res.status(200).json({ data: oficina });
}); //Verificado

const deleteOficina = catchError(async (req, res) => {
  const Oficina = OficinaModel(req.db);
  const { id } = req.params;
  const result = await Oficina.delete(id);
  return res.status(200).json(result);
}); //Verificado

module.exports = {
  createOficina,
  getAllOficinas,
  getOficinaById,
  updateOficina,
  deleteOficina,
  getAll
};
const ClienteModel = require('../models/cliente');
const catchError = require('../utils/catchError');
const verificarCI = require('../utils/identificarCI');

// Controlador para crear un cliente
const createCliente = catchError(async (req, res) => {
  const Cliente = ClienteModel(req.db);
  const { rutaId } = req.query;
  const { identificacion, nombres, telefono, direccion } = req.body;

  // Validaciones específicas por campo
  if (!nombres || !nombres.trim()) {
    return res.status(400).json({ error: 'El nombre es obligatorio' });
  }

  if (!telefono || !telefono.trim()) {
    return res.status(400).json({ error: 'El teléfono es obligatorio' });
  }

  if (!direccion || !direccion.trim()) {
    return res.status(400).json({ error: 'La dirección es obligatoria' });
  }

  if (!rutaId || !rutaId.toString().trim()) {
    return res.status(400).json({ error: 'La ruta es obligatoria' });
  }

  // Validar identificación
  // const isValidIdentification = verificarCI(identificacion);
  const isValidIdentification = ["Desconocido", true];

  if (isValidIdentification[1] === true) {
    try {
      const client = await Cliente.create(req.body, isValidIdentification, req.user.userId);
      return res.status(201).json({ data: client }); // 201 Created
    } catch (err) {
      if (err.status === 409) {
        return res.status(409).json({ error: err.message }); // Conflicto
      }
      // Otros errores
      return res.status(500).json({ error: err.detail ? err.detail : err });
    }
  } else {
    return res.status(400).json({ error: 'La identificación no es válida' });
  }
}); //Verificado

// Controlador para obtener todos los clientes con paginación
const getAllClientes = catchError(async (req, res) => {
  const Cliente = ClienteModel(req.db);
  try {
    const { limit, page, searchTerm, oficinaId, rutaId } = req.query;

    // Calcular el offset basado en la página solicitada
    const offset = (page - 1) * limit;

    // userId desde el middleware de autenticación
    const userId = req.user?.userId || null;

    const clientes = await Cliente.getAll(limit, offset, searchTerm, oficinaId, rutaId, userId);

    return res.status(200).json(clientes);
  } catch (err) {
    return res.status(500).json({ error: err.detail || 'Ocurrió un error' });
  }
}); //Verificado

// Controlador para obtener un cliente por ID
const getClienteById = catchError(async (req, res) => {
  const Cliente = ClienteModel(req.db);
  const { id } = req.params;
  try {
    const cliente = await Cliente.getById(id);
    if (!cliente) {
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }
    return res.status(200).json(cliente);
  } catch (err) {
    return res.status(500).json({ error: err.detail ? err.detail : "Cliente no encontrado" });
  }
}); //Verificado

// Controlador para editar clientes por id
const updateCliente = catchError(async (req, res) => {
  const Cliente = ClienteModel(req.db);
  const { id } = req.body;
  const updatedData = req.body;
  
  if (!id) {
    return res.status(400).json({ message: 'El ID del cliente es requerido' });
  }
  
  try {
    const cliente = await Cliente.update(id, updatedData);
    if (!cliente) {
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }
    return res.status(200).json({ message: 'Cliente actualizado exitosamente' });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: err.detail ? err.detail : "Ocurrio un error" });
  }
}); //Verificado

// Controlador para eliminar un cliente por id
const deleteCliente = catchError(async (req, res) => {
  const Cliente = ClienteModel(req.db);
  const { id } = req.body;
  try {
    const cliente = await Cliente.delete(id);
    if (!cliente) {
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }
    return res.status(200).json({ message: 'Cliente eliminado exitosamente' });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: err.detail ? err.detail : "Ocurrio un error" });
  }
});
// Verificado

module.exports = {
  createCliente,
  getAllClientes,
  getClienteById,
  updateCliente,
  deleteCliente
};
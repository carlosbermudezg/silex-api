const PermisoModel = require('../models/permiso');

const permisoController = {
  // Crear un permiso con un array en descripcion
  create: async (req, res) => {
    const Permiso = PermisoModel(req.db);
    try {
      const permiso = await Permiso.create(req.body);
      res.status(201).json({ success: true, data: permiso });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }, //Verificado

  // Obtener todos los permisos
  getAll: async (req, res) => {
    const Permiso = PermisoModel(req.db);
    const { search } = req.query;
    try {
      const permisos = await Permiso.getAll(search);
      res.status(200).json({ success: true, data: permisos });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }, //Verificado

  // Obtener un permiso por ID
  getById: async (req, res) => {
    const Permiso = PermisoModel(req.db);
    try {
      const permiso = await Permiso.getById(req.params.id);
      if (!permiso) return res.status(404).json({ success: false, message: "Permiso no encontrado" });

      res.status(200).json({ success: true, data: permiso });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }, //Verificado

  // Actualizar un permiso
  update: async (req, res) => {
    const Permiso = PermisoModel(req.db);
    try {
      const permiso = await Permiso.update(req.params.id, req.body);
      if (!permiso) return res.status(404).json({ success: false, message: "Permiso no encontrado" });

      res.status(200).json({ success: true, data: permiso });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }, //Verificado

  // Eliminar un permiso
  delete: async (req, res) => {
    const Permiso = PermisoModel(req.db);
    try {
      const permiso = await Permiso.delete(req.params.id);
      if (permiso?.error) return res.status(400).json({ success: false, message: permiso.error });
      if (!permiso) return res.status(404).json({ success: false, message: "Permiso no encontrado" });

      res.status(200).json({ success: true, message: "Permiso eliminado correctamente" });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  } //Verificado
};

module.exports = permisoController;
const Backup = require('../models/backup'); // Importar el modelo de configuración
const catchError = require('../utils/catchError');  // Para manejo de errores


const importarTransacciones = catchError(async (req, res) => {
    const { transacciones } = req.body;
  
    if (!Array.isArray(transacciones) || transacciones.length === 0) {
      return res.status(400).json({ message: 'Se requiere un array de transacciones.' });
    }
  
    try {
      const resultado = await Backup.importarTransacciones(transacciones);
      return res.status(200).json({ message: 'Transacciones importadas correctamente.', ...resultado });
    } catch (error) {
      console.error('Error al importar transacciones:', error.message);
      return res.status(500).json({ message: 'Error al importar transacciones.' });
    }
});
  
module.exports = {
    importarTransacciones,
};
// controllers/cajaController.js
const CajaModel = require('../models/caja'); // Importar el modelo de Caja
const PDFDocument = require('pdfkit');
const catchError = require('../utils/catchError');  // Para manejo de errores
const path = require('path');
const QRCode = require('qrcode');

// Función para obtener todas las cajas
const getAllCajas = catchError(async (req, res) => {
  const Caja = CajaModel(req.db);
  const { page = 1, limit = 10, search = '' } = req.query;
  const offset = (page - 1) * limit;
  try {
    const result = await Caja.getAll(
      parseInt(limit),
      parseInt(offset),
      search,
      req.oficinaId || null
    );
    if (!result) {
      return res.status(404).json({ message: 'Cajas no encontradas' });
    }
    return res.status(200).json({
      success: true,
      message: 'Cajas obtenidas correctamente',
      data: result.cajas,
      total: result.total,
      page: result.page,
      totalPages: result.totalPages
    });
  } catch (error) {
    console.log(error)
    return res.status(500).json({ success: false, message: 'Error al obtener cajas', error: error.message });
  }
}); //Verificado

// Función para obtener una caja por su ID de ruta
const getCajaByRutaId = catchError(async (req, res) => {
  const Caja = CajaModel(req.db);
  const id = req.rutaId;
  const { page = 1, limit = 10 } = req.query;
  const offset = (page - 1) * limit;

  try {
    const caja = await Caja.getById(id, parseInt(limit), parseInt(offset));
    if (!caja) {
      return res.status(404).json({ message: 'Caja no encontrada' });
    }
    return res.status(200).json({
      success: true,
      message: 'Caja obtenida correctamente',
      data: caja
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error al obtener la caja', error: error.message });
  }
}); // Verificado

const crearIngreso = catchError(async (req, res) => {
  const Caja = CajaModel(req.db);
  const { descripcion, monto, ingresoCategoryId } = req.body;
  const { userId } = req.user;
  const rutaId = req.rutaId;
  const idempotencyKey = req.headers['idempotency-key'];

  if (!descripcion || !monto || !ingresoCategoryId) {
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  }

  try {
    const ingreso = await Caja.createIngreso({
      descripcion,
      monto,
      ingresoCategoryId,
      userId: userId, //Usuario que crea la transacción
      rutaId: rutaId, //Id de la ruta a la que pertenece la transacción
      idempotencyKey
    });

    return res.status(201).json({ success: true, data: ingreso });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}); //Verificado

const crearEgreso = catchError(async (req, res) => {
  const Caja = CajaModel(req.db);
  const { descripcion, monto, gastoCategoryId, foto } = req.body;
  const { userId, role } = req.user;
  const rutaId = req.rutaId;
  const idempotencyKey = req.headers['idempotency-key'];

  if (!descripcion || !monto || !gastoCategoryId) {
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  }

  try {
    const egreso = await Caja.createEgreso({
      descripcion,
      monto,
      gastoCategoryId,
      userId: userId,
      userRole: role,
      foto: foto,
      rutaId: rutaId,
      idempotencyKey
    });

    return res.status(201).json({ success: true, data: egreso });
  } catch (error) {
    console.log(error)
    return res.status(500).json({ error: error.message });
  }
});

const aprobarEgreso = catchError(async (req, res) => {
  const Caja = CajaModel(req.db);
  const { id } = req.params;
  const { role, userId } = req.user;
  const idempotencyKey = req.headers['idempotency-key'];

  if (!['administrador', 'administrador_oficina'].includes(role)) {
    return res.status(403).json({ error: 'No tienes permisos para aprobar egresos' });
  }

  try {
    const result = await Caja.aprobarEgreso(id, userId, idempotencyKey);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

const rechazarEgreso = catchError(async (req, res) => {
  const Caja = CajaModel(req.db);
  const { id } = req.params;
  const { role, userId } = req.user;
  const idempotencyKey = req.headers['idempotency-key'];

  if (!['administrador', 'administrador_oficina'].includes(role)) {
    return res.status(403).json({ error: 'No tienes permisos para rechazar egresos' });
  }

  try {
    const result = await Caja.rechazarEgreso(id, userId, idempotencyKey);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

const createPago = catchError(async (req, res) => {
  const Credito = CreditoModel(req.db);
  const { creditoId, valor, metodoPago, location } = req.body;
  const userId = req.user.userId;

  if (!creditoId || !metodoPago) {
    return res.status(400).json({ error: "Todos los campos son requeridos" });
  }

  if (valor < 0 || isNaN(valor)) {
    return res.status(400).json({ error: "Todos los campos son requeridos" });
  }

  // Llamamos a la función createPago del modelo que ahora maneja toda la lógica con transacciones
  const resultado = await Credito.createPago({ creditoId, valor, metodoPago, userId, location });
  if (resultado.error) return res.status(404).json({ error: resultado.error });

  return res.status(201).json({
    message: resultado.message,
    pagoId: resultado.pagoId
  });
});

const anularAbono = catchError(async (req, res) => {
  const Caja = CajaModel(req.db);
  const { id, motivo } = req.body;
  const { userId } = req.user;
  const idempotencyKey = req.headers['idempotency-key'];

  try {
    const result = await Caja.anularPago(id, userId, motivo, idempotencyKey);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Función para obtener comprobante por id pdf
const getComprobanteById = catchError(async (req, res) => {
  const Caja = CajaModel(req.db);
  const { id } = req.params;
  const pago = await Caja.getComprobanteById(id);

  if (!pago) {
    return res.status(404).send('Comprobante no encontrado');
  }

  // 1. Contenido para el QR
  const qrData = `Comprobante #${pago.id}\nCliente: ${pago.nombre}\nMonto: $${pago.monto}\nSaldo: $${pago.saldo}\nMétodo: ${pago.metodoPago}\nFecha: ${new Date(pago.createdAt).toLocaleString('es-EC', {
    timeZone: 'America/Guayaquil',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })}`;

  // 2. Generar código QR en base64
  const qrImageDataUrl = await QRCode.toDataURL(qrData);

  const doc = new PDFDocument({
    size: [300, 400],
    margin: 20
  });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="Comprobante_pago_${id}_${pago.nombre}.pdf"`);

  doc.pipe(res);

  // Agrega logo (ruta absoluta y control de errores)
  try {
    const logoPath = path.join(__dirname, '../public/images/logo.png'); // Ajusta esta ruta
    const imageWidth = 150;
    const imageHeight = 30;
    const x = (doc.page.width - imageWidth) / 2;
    doc.image(logoPath, x, undefined, {
      width: imageWidth,
      height: imageHeight,
    });
    doc.moveDown();
  } catch (error) {
    console.error('No se pudo cargar el logo:', error.message);
    doc.moveDown(); // Asegura espacio si falla el logo
  }
  doc.moveDown();
  doc.fontSize(18).font('Helvetica-Bold').text('Comprobante de Pago', { align: 'center' });
  doc.moveDown();

  doc.fontSize(12);
  doc.font('Helvetica-Bold').text('Número de comprobante:', { continued: true });
  doc.font('Helvetica').text(` ${pago.id}`);

  doc.font('Helvetica-Bold').text('Fecha:', { continued: true });
  doc.font('Helvetica').text(` ${new Date(pago.createdAt).toLocaleString('es-EC', {
    timeZone: 'America/Guayaquil',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })}`);

  doc.font('Helvetica-Bold').text('Cliente:', { continued: true });
  doc.font('Helvetica').text(` ${pago.nombre}`);

  doc.font('Helvetica-Bold').text('Monto:', { continued: true });
  doc.font('Helvetica').text(` $${pago.monto}`);

  doc.font('Helvetica-Bold').text('Saldo:', { continued: true });
  doc.font('Helvetica').text(` $${pago.saldo}`);

  doc.font('Helvetica-Bold').text('Método de pago:', { continued: true });
  doc.font('Helvetica').text(` ${pago.metodoPago}`);
  doc.moveDown();

  // 4. Insertar el QR (desde base64)
  const qrBuffer = Buffer.from(qrImageDataUrl.split(',')[1], 'base64');


  const imageWidth = 100;
  const imageHeight = 100;
  const x = (doc.page.width - imageWidth) / 2;

  doc.image(qrBuffer, x, undefined, {
    width: imageWidth,
    height: imageHeight,
  });

  // Pie de página en gris
  doc.fillColor('gray')
    .fontSize(10)
    .text('Gracias por su pago', 20, doc.page.height - 50, {
      align: 'center'
    })
    .text('Dracarys', 20, doc.page.height - 35, {
      align: 'center'
    });

  doc.end();
});

// Endpoint: apertura de caja
const abrirCaja = catchError(async (req, res) => {
  const Caja = CajaModel(req.db);
  const rutaId = req.rutaId;
  const { userId } = req.user;
  const idempotencyKey = req.headers['idempotency-key'];
  try {
    const resultado = await Caja.abrirCaja(rutaId, userId, false, idempotencyKey);
    return res.status(200).json({ success: true, message: resultado.message });
  }
  catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}); //Verificado

// Endpoint: cierre de caja
const cerrarCaja = catchError(async (req, res) => {
  const Caja = CajaModel(req.db);
  const { userId } = req.user;
  const rutaId = req.rutaId;
  const { observaciones } = req.body;
  const idempotencyKey = req.headers['idempotency-key'];
  try {
    const resultado = await Caja.cerrarCaja(rutaId, userId, observaciones, idempotencyKey);
    return res.status(200).json({ success: true, ...resultado });
  }
  catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}); //Verificado

// Endpoint: bloqueo de caja
const bloquearCaja = catchError(async (req, res) => {
  const Caja = CajaModel(req.db);
  const rutaId = req.rutaId;
  try {
    const resultado = await Caja.bloquearCaja(rutaId);
    return res.status(200).json({ success: true, message: resultado.message });
  }
  catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}); //Verificado

module.exports = {
  getAllCajas,
  getCajaByRutaId,
  crearIngreso,
  crearEgreso,
  aprobarEgreso,
  rechazarEgreso,
  abrirCaja,
  bloquearCaja,
  cerrarCaja,
  createPago,
  anularAbono,
  getComprobanteById
};

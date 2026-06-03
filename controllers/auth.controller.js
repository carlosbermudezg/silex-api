const UsuarioModel = require('../models/usuario');
const PermisoModel = require('../models/permiso');
const RutaModel = require('../models/ruta');
const jwt = require('jsonwebtoken');

const login = async (req, res) => {
  const Usuario = UsuarioModel(req.db);
  const Permiso = PermisoModel(req.db);
  const Ruta = RutaModel(req.db);
  const { email, password, company } = req.body;
  const secretKey = process.env.TOKEN;

  try {

    const usuario = await Usuario.getByEmail(email);
    if (!usuario) {
      return res.status(403).json({ success: false, message: 'Credenciales inválidas.' });
    }

    if (!['administrador', 'administrador_oficina'].includes(usuario.tipo)) {
      return res.status(403).json({ success: false, message: 'Solo los administradores pueden acceder.' });
    }

    const isPasswordValid = await Usuario.validatePassword(password, usuario.contrasena);
    if (!isPasswordValid) {
      return res.status(403).json({ success: false, message: 'Credenciales inválidas.' });
    }

    //Obtener permisos desde la tabla permisos
    let permisos = [];
    if (usuario.permisoId) {
      const permisosDescripcion = await Permiso.getByIdInterno(usuario.permisoId);
      if (typeof permisosDescripcion.descripcion != 'object') {
        return res.status(500).json({ success: false, message: 'Error al obtener permisos del usuario.' });
      }
      permisos = Array.isArray(permisosDescripcion.descripcion) ? permisosDescripcion.descripcion : [permisosDescripcion.descripcion];
    }
    //Datos de Login
    const loginData = {
      userId: usuario.id,
      name: usuario.nombre,
      email: usuario.correo,
      role: usuario.tipo,
      status: usuario.estado,
      permisos: permisos,
      company: company,
      platform: 'web',
    };
    // 🎟 Generar el token con los permisos en el payload
    const token = jwt.sign(
      loginData,
      secretKey,
      { expiresIn: '1d' }
    );

    return res.status(200).json({
      success: true,
      message: 'Ha iniciado sesión exitosamente',
      token,
    });

  } catch (error) {
    console.log(error)
    return res.status(500).json({
      success: false,
      message: 'Ha ocurrido un error en el servidor',
      error: error.message
    });
  }
};

const loginmobile = async (req, res) => {
  const Usuario = UsuarioModel(req.db);
  const Permiso = PermisoModel(req.db);
  const Ruta = RutaModel(req.db);
  const { email, password, company } = req.body;
  const secretKey = process.env.TOKEN;

  try {

    const usuario = await Usuario.getByEmail(email);

    if (!usuario) {
      return res.status(403).json({ success: false, message: 'Credenciales inválidas.' });
    }

    if (!['cobrador'].includes(usuario.tipo)) {
      return res.status(403).json({ success: false, message: 'Solo los cobradores pueden acceder.' });
    }

    const isPasswordValid = await Usuario.validatePassword(password, usuario.contrasena);

    if (!isPasswordValid) {
      return res.status(403).json({ success: false, message: 'Credenciales inválidas.' });
    }

    //Obtener permisos desde la tabla permisos
    let permisos = [];
    if (usuario.permisoId) {
      const permisosDescripcion = await Permiso.getByIdInterno(usuario.permisoId);
      if (typeof permisosDescripcion.descripcion != 'object') {
        return res.status(500).json({ success: false, message: 'Error al obtener permisos del usuario.' });
      }
      permisos = Array.isArray(permisosDescripcion.descripcion) ? permisosDescripcion.descripcion : [permisosDescripcion.descripcion];
    }
    //Obtener la ruta asignada al usuario
    let ruta = null;
    if (usuario.tipo === 'cobrador') {
      ruta = await Ruta.getByUserId(usuario.id);
    }
    //Datos de Login
    const loginData = {
      userId: usuario.id,
      name: usuario.nombre,
      email: usuario.correo,
      role: usuario.tipo,
      status: usuario.estado,
      permisos: permisos,
      ruta: {
        id: ruta && ruta.length > 0 ? ruta[0].public_id : null,
        nombre: ruta && ruta.length > 0 ? ruta[0].nombre : null,
      },
      company: company,
      platform: 'mobile',
    };
    // 🎟 Generar el token con los permisos en el payload
    const token = jwt.sign(
      loginData,
      secretKey,
      { expiresIn: '1d' }
    );

    return res.status(200).json({
      success: true,
      message: 'Ha iniciado sesión exitosamente',
      token,
    });

  } catch (error) {
    console.log(error)
    return res.status(500).json({
      success: false,
      message: 'Ha ocurrido un error en el servidor',
      error: error.message
    });
  }
};

module.exports = { login, loginmobile };
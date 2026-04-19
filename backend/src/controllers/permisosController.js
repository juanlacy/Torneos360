import { PermisoDefaultRol, PermisoUsuario, Usuario } from '../models/index.js';
import { registrarAudit } from '../services/auditService.js';

const TODOS_MODULOS = ['torneos', 'clubes', 'jugadores', 'fixture', 'partidos', 'posiciones', 'arbitros', 'veedores', 'staff', 'configuracion', 'reportes'];
const TODAS_ACCIONES = ['ver', 'crear', 'editar', 'eliminar', 'ver_sensibles'];

// =========================================
// GET /permisos/defaults
// Devuelve todos los permisos default por rol
// =========================================
export const getDefaults = async (req, res) => {
  try {
    const permisos = await PermisoDefaultRol.findAll({ order: [['rol', 'ASC'], ['modulo', 'ASC'], ['accion', 'ASC']] });

    // Agrupar por rol
    const mapa = {};
    for (const p of permisos) {
      if (!mapa[p.rol]) mapa[p.rol] = {};
      if (!mapa[p.rol][p.modulo]) mapa[p.rol][p.modulo] = {};
      mapa[p.rol][p.modulo][p.accion] = p.permite;
    }

    res.json({ success: true, data: mapa, modulos: TODOS_MODULOS, acciones: TODAS_ACCIONES });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =========================================
// PUT /permisos/defaults
// Actualiza permisos default de un rol
// Body: { rol, modulo, accion, permite }
// =========================================
export const updateDefault = async (req, res) => {
  try {
    const { rol, modulo, accion, permite } = req.body;

    if (!rol || !modulo || !accion || typeof permite !== 'boolean') {
      return res.status(400).json({ success: false, message: 'rol, modulo, accion y permite son requeridos' });
    }

    const [permiso, created] = await PermisoDefaultRol.findOrCreate({
      where: { rol, modulo, accion },
      defaults: { permite },
    });

    if (!created) {
      await permiso.update({ permite });
    }

    registrarAudit({ req, accion: 'EDITAR_PERMISO_DEFAULT', entidad: 'permisos_default_rol', entidad_id: permiso.id, despues: { rol, modulo, accion, permite } });

    res.json({ success: true, data: permiso });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =========================================
// GET /permisos/usuario/:id
// Devuelve overrides de un usuario especifico
// =========================================
export const getUsuarioOverrides = async (req, res) => {
  try {
    const usuarioId = parseInt(req.params.id);
    const usuario = await Usuario.findByPk(usuarioId, { attributes: ['id', 'nombre', 'apellido', 'email', 'rol'] });

    if (!usuario) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    const overrides = await PermisoUsuario.findAll({
      where: { usuario_id: usuarioId },
      order: [['modulo', 'ASC'], ['accion', 'ASC']],
    });

    res.json({ success: true, data: { usuario, overrides } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =========================================
// PUT /permisos/usuario/:id
// Crea o actualiza un override de permiso para un usuario
// Body: { modulo, accion, permite }
// =========================================
export const updateUsuarioOverride = async (req, res) => {
  try {
    const usuarioId = parseInt(req.params.id);
    const { modulo, accion, permite } = req.body;

    if (!modulo || !accion || typeof permite !== 'boolean') {
      return res.status(400).json({ success: false, message: 'modulo, accion y permite son requeridos' });
    }

    const [permiso, created] = await PermisoUsuario.findOrCreate({
      where: { usuario_id: usuarioId, modulo, accion },
      defaults: { permite },
    });

    if (!created) {
      await permiso.update({ permite });
    }

    registrarAudit({ req, accion: 'EDITAR_PERMISO_USUARIO', entidad: 'permisos_usuario', entidad_id: permiso.id, despues: { usuario_id: usuarioId, modulo, accion, permite } });

    res.json({ success: true, data: permiso });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =========================================
// DELETE /permisos/usuario/:id/:modulo/:accion
// Elimina un override (vuelve al default del rol)
// =========================================
export const deleteUsuarioOverride = async (req, res) => {
  try {
    const { id, modulo, accion } = req.params;

    const deleted = await PermisoUsuario.destroy({
      where: { usuario_id: parseInt(id), modulo, accion },
    });

    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Override no encontrado' });
    }

    registrarAudit({ req, accion: 'ELIMINAR_PERMISO_USUARIO', entidad: 'permisos_usuario', despues: { usuario_id: id, modulo, accion } });

    res.json({ success: true, message: 'Override eliminado, vuelve al default del rol' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

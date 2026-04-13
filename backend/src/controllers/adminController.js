import bcrypt from 'bcrypt';
import { Usuario } from '../models/index.js';
import { registrarAudit, sanitizarParaAudit } from '../services/auditService.js';
import { Op } from 'sequelize';

const ROLES_VALIDOS = ['admin_sistema', 'admin_torneo', 'delegado', 'arbitro', 'veedor', 'entrenador', 'publico'];

// =========================================
// GET /admin/usuarios
// =========================================
export const listarUsuarios = async (req, res) => {
  try {
    const { rol, activo, search, page = 1, limit = 50 } = req.query;
    const where = {};

    if (rol) where.rol = rol;
    if (activo !== undefined) where.activo = activo === 'true';
    if (search) {
      where[Op.or] = [
        { nombre: { [Op.iLike]: `%${search}%` } },
        { apellido: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows } = await Usuario.findAndCountAll({
      where,
      attributes: { exclude: ['password_hash', 'reset_token', 'reset_token_expira', 'verification_token', 'verification_token_expira', 'refresh_token', 'refresh_token_expires'] },
      order: [['creado_en', 'DESC']],
      limit: parseInt(limit),
      offset,
    });

    res.json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / parseInt(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =========================================
// GET /admin/usuarios/:id
// =========================================
export const getUsuario = async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.params.id, {
      attributes: { exclude: ['password_hash', 'reset_token', 'reset_token_expira', 'verification_token', 'verification_token_expira', 'refresh_token', 'refresh_token_expires'] },
    });

    if (!usuario) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    res.json({ success: true, data: usuario });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =========================================
// POST /admin/usuarios
// =========================================
export const crearUsuario = async (req, res) => {
  try {
    const { nombre, apellido, email, password, rol, club_id, entidad_tipo, entidad_id } = req.body;

    if (!nombre || !apellido || !email || !rol) {
      return res.status(400).json({ success: false, message: 'nombre, apellido, email y rol son requeridos' });
    }

    if (!ROLES_VALIDOS.includes(rol)) {
      return res.status(400).json({ success: false, message: `Rol invalido. Roles validos: ${ROLES_VALIDOS.join(', ')}` });
    }

    const existente = await Usuario.findOne({ where: { email: email.toLowerCase().trim() } });
    if (existente) {
      return res.status(409).json({ success: false, message: 'Ya existe un usuario con este email' });
    }

    const userData = {
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      email: email.toLowerCase().trim(),
      rol,
      club_id: club_id ?? null,
      entidad_tipo: entidad_tipo ?? null,
      entidad_id: entidad_id ?? null,
      email_verificado: true,
      activo: true,
    };

    if (password) {
      userData.password_hash = await bcrypt.hash(password, 12);
      userData.oauth_provider = 'local';
    }

    const usuario = await Usuario.create(userData);

    registrarAudit({ req, accion: 'CREAR_USUARIO', entidad: 'usuarios', entidad_id: usuario.id, despues: sanitizarParaAudit(usuario.toJSON()) });

    res.status(201).json({ success: true, data: { id: usuario.id, nombre: usuario.nombre, apellido: usuario.apellido, email: usuario.email, rol: usuario.rol } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =========================================
// PUT /admin/usuarios/:id
// =========================================
export const actualizarUsuario = async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.params.id);
    if (!usuario) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    const antes = sanitizarParaAudit(usuario.toJSON());
    const { nombre, apellido, email, rol, activo, club_id, entidad_tipo, entidad_id, password } = req.body;

    const updates = { actualizado_en: new Date() };
    if (nombre !== undefined) updates.nombre = nombre.trim();
    if (apellido !== undefined) updates.apellido = apellido.trim();
    if (email !== undefined) updates.email = email.toLowerCase().trim();
    if (rol !== undefined) {
      if (!ROLES_VALIDOS.includes(rol)) {
        return res.status(400).json({ success: false, message: `Rol invalido` });
      }
      updates.rol = rol;
    }
    if (activo !== undefined) updates.activo = activo;
    if (club_id !== undefined) updates.club_id = club_id;
    if (entidad_tipo !== undefined) updates.entidad_tipo = entidad_tipo;
    if (entidad_id !== undefined) updates.entidad_id = entidad_id;
    if (password) updates.password_hash = await bcrypt.hash(password, 12);

    await usuario.update(updates);

    registrarAudit({ req, accion: 'EDITAR_USUARIO', entidad: 'usuarios', entidad_id: usuario.id, antes, despues: sanitizarParaAudit(usuario.toJSON()) });

    res.json({ success: true, data: sanitizarParaAudit(usuario.toJSON()) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =========================================
// DELETE /admin/usuarios/:id (soft delete)
// =========================================
export const desactivarUsuario = async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.params.id);
    if (!usuario) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    if (usuario.id === req.user.id) {
      return res.status(400).json({ success: false, message: 'No podes desactivar tu propia cuenta' });
    }

    await usuario.update({ activo: false, actualizado_en: new Date() });

    registrarAudit({ req, accion: 'DESACTIVAR_USUARIO', entidad: 'usuarios', entidad_id: usuario.id });

    res.json({ success: true, message: 'Usuario desactivado' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

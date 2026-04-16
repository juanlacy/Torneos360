import jwt from 'jsonwebtoken';
import { logAuth } from '../config/logger.js';
import { PermisoUsuario, PermisoDefaultRol } from '../models/index.js';

const JWT_SECRET = process.env.JWT_SECRET;

// ═══════════════════════════════════════════════════════════════════════════════
// Autenticacion JWT
// ═══════════════════════════════════════════════════════════════════════════════

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Token no proporcionado' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      logAuth('token_invalid', null, { error: err.message });
      return res.status(403).json({ success: false, message: 'Token invalido o expirado' });
    }
    req.user = user;

    // Flags de rol
    req.isAdminSistema = user.rol === 'admin_sistema';
    req.isAdminTorneo  = user.rol === 'admin_torneo';

    // Club scope (para delegados y entrenadores)
    req.clubId = user.club_id ?? null;

    logAuth('token_ok', user.id, { rol: user.rol, club_id: req.clubId });
    next();
  });
};

/** Auth opcional — no falla si no hay token, pero popula req.user si lo hay */
export const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1];

  if (!token) return next();

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (!err) {
      req.user = user;
      req.isAdminSistema = user.rol === 'admin_sistema';
      req.isAdminTorneo  = user.rol === 'admin_torneo';
      req.clubId = user.club_id ?? null;
    }
    next();
  });
};

// ═══════════════════════════════════════════════════════════════════════════════
// Control de roles
// ═══════════════════════════════════════════════════════════════════════════════

export const requireRole = (rolesPermitidos) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'No autenticado' });
    }
    if (!rolesPermitidos.includes(req.user.rol)) {
      logAuth('access_denied', req.user.id, { rol: req.user.rol, required: rolesPermitidos, url: req.originalUrl });
      return res.status(403).json({
        success: false,
        message: 'No tenes permisos para esta accion',
        code: 'FORBIDDEN',
      });
    }
    next();
  };
};

// Roles predefinidos
export const requireAdmin       = requireRole(['admin_sistema']);
export const requireAdminTorneo = requireRole(['admin_sistema', 'admin_torneo']);
export const requireDelegado    = requireRole(['admin_sistema', 'admin_torneo', 'delegado']);
export const requireArbitro     = requireRole(['admin_sistema', 'admin_torneo', 'arbitro']);
export const requireVeedor      = requireRole(['admin_sistema', 'admin_torneo', 'veedor']);
export const requireStaff       = requireRole(['admin_sistema', 'admin_torneo', 'delegado', 'arbitro', 'veedor', 'entrenador']);

// ═══════════════════════════════════════════════════════════════════════════════
// Helper: verificar permiso de forma programatica (para usar en controllers)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Verifica si el usuario actual tiene un permiso especifico.
 * Util para logica condicional (ej: filtrar campos sensibles).
 * admin_sistema siempre retorna true.
 */
export const tienePermiso = async (req, modulo, accion) => {
  if (req.isAdminSistema) return true;

  // Override por usuario
  const override = await PermisoUsuario.findOne({
    where: { usuario_id: req.user.id, modulo, accion },
  });
  if (override) return override.permite;

  // Default del rol
  const def = await PermisoDefaultRol.findOne({
    where: { rol: req.user.rol, modulo, accion },
  });
  return def?.permite === true;
};

/** Campos sensibles que se ocultan si no tiene 'ver_sensibles' */
export const CAMPOS_SENSIBLES = ['dni', 'fecha_nacimiento', 'telefono', 'email'];

/** Remueve campos sensibles de un objeto o array de objetos */
export const ocultarSensibles = (data, ocultar) => {
  if (!ocultar) return data;
  const limpiar = (obj) => {
    if (!obj) return obj;
    const copia = { ...obj };
    for (const campo of CAMPOS_SENSIBLES) {
      if (campo in copia) copia[campo] = undefined;
    }
    return copia;
  };
  return Array.isArray(data) ? data.map(limpiar) : limpiar(data);
};

// ═══════════════════════════════════════════════════════════════════════════════
// Helpers de scoping por Club (equivalente a hospitalWhere de SistemaGH)
// ═══════════════════════════════════════════════════════════════════════════════

/** WHERE clause para queries de listado — filtra por club segun rol */
export const clubWhere = (req) => {
  if (req.isAdminSistema || req.isAdminTorneo) {
    const qClubId = req.query?.club_id ? parseInt(req.query.club_id) : null;
    return qClubId ? { club_id: qClubId } : {};
  }
  return { club_id: req.clubId };
};

/** club_id para INSERT — respeta el club del rol o lo toma del body */
export const clubData = (req) => {
  if ((req.isAdminSistema || req.isAdminTorneo) && req.body.club_id) {
    return { club_id: parseInt(req.body.club_id) };
  }
  return { club_id: req.clubId };
};

/**
 * Verifica que un club_id pertenezca al scope del usuario.
 * @param {Object} req - Express request
 * @param {number|null} clubId - club_id del recurso a verificar
 * @returns {boolean}
 */
export const tieneAccesoAlClub = (req, clubId) => {
  if (req.isAdminSistema || req.isAdminTorneo) return true;
  if (!clubId) return false;
  return req.clubId === clubId;
};

// ═══════════════════════════════════════════════════════════════════════════════
// Permisos granulares (modulo + accion)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Verifica override del usuario primero; si no existe, cae al default del rol.
 * admin_sistema tiene acceso total sin consulta a BD.
 */
export const requirePermiso = (modulo, accion) => async (req, res, next) => {
  try {
    if (req.isAdminSistema) return next();

    // 1. Override especifico del usuario
    const override = await PermisoUsuario.findOne({
      where: { usuario_id: req.user.id, modulo, accion },
    });
    if (override !== null) {
      return override.permite
        ? next()
        : res.status(403).json({ success: false, message: 'Permiso denegado', code: 'PERMISSION_DENIED' });
    }

    // 2. Default del rol
    const def = await PermisoDefaultRol.findOne({
      where: { rol: req.user.rol, modulo, accion },
    });
    if (def?.permite) return next();

    return res.status(403).json({ success: false, message: 'Sin permiso para esta accion', code: 'PERMISSION_DENIED' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

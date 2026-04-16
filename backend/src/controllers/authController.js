import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { ConfidentialClientApplication } from '@azure/msal-node';
import { Usuario, PermisoDefaultRol, PermisoUsuario, Persona, PersonaRol, Rol, Club, Institucion } from '../models/index.js';
import { logAuth } from '../config/logger.js';
import { v4 as uuidv4 } from 'uuid';
import { enviarVerificacionEmail, enviarResetPassword } from '../services/emailService.js';
import { registrarAudit } from '../services/auditService.js';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname, join, extname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES = process.env.JWT_EXPIRES_IN || '8h';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// MSAL se inicializa lazy — solo cuando se configuren las credenciales de Microsoft
let msalApp = null;
const getMsalApp = () => {
  if (!msalApp && process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET) {
    msalApp = new ConfidentialClientApplication({
      auth: {
        clientId: process.env.MICROSOFT_CLIENT_ID,
        authority: `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID || 'common'}`,
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
      },
    });
  }
  return msalApp;
};

// ─── Modulos y acciones para mis-permisos ────────────────────────────────────
const TODOS_MODULOS = ['torneos', 'clubes', 'jugadores', 'fixture', 'partidos', 'posiciones', 'arbitros', 'veedores', 'staff', 'configuracion', 'reportes'];
const TODAS_ACCIONES = ['ver', 'crear', 'editar', 'eliminar'];

// ─── Multer para avatares ───────────────────────────────────────────────────
const avatarStorage = multer.diskStorage({
  destination: join(__dirname, '..', '..', 'uploads', 'avatars'),
  filename: (req, file, cb) => {
    cb(null, `${req.user.id}-${Date.now()}${extname(file.originalname)}`);
  },
});
export const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpeg|png|webp)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Solo se permiten imagenes JPG, PNG o WebP'));
  },
}).single('avatar');

// ─── Helper: generar JWT ────────────────────────────────────────────────────
const generarToken = (usuario) => {
  return jwt.sign(
    {
      id: usuario.id,
      email: usuario.email,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      rol: usuario.rol,
      avatar_url: usuario.avatar_url,
      club_id: usuario.club_id ?? null,
      persona_id: usuario.persona_id ?? null,
      entidad_tipo: usuario.entidad_tipo ?? null,
      entidad_id: usuario.entidad_id ?? null,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );
};

// ─── Helper: respuesta de usuario ───────────────────────────────────────────
const usuarioResponse = (usuario) => ({
  id: usuario.id,
  nombre: usuario.nombre,
  apellido: usuario.apellido,
  email: usuario.email,
  rol: usuario.rol,
  avatar_url: usuario.avatar_url,
  club_id: usuario.club_id ?? null,
  persona_id: usuario.persona_id ?? null,
  entidad_tipo: usuario.entidad_tipo ?? null,
  entidad_id: usuario.entidad_id ?? null,
});

// =========================================
// POST /auth/login  (local email+password)
// =========================================
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email y contrasena requeridos' });
    }

    const usuario = await Usuario.findOne({ where: { email: email.toLowerCase().trim() } });

    if (!usuario || !usuario.activo) {
      return res.status(401).json({ success: false, message: 'Credenciales invalidas' });
    }

    // Check lockout
    if (usuario.bloqueado_hasta && new Date() < new Date(usuario.bloqueado_hasta)) {
      const minutosRestantes = Math.ceil((new Date(usuario.bloqueado_hasta) - new Date()) / 60000);
      return res.status(423).json({
        success: false,
        code: 'ACCOUNT_LOCKED',
        message: `Cuenta bloqueada por demasiados intentos fallidos. Intenta de nuevo en ${minutosRestantes} minuto${minutosRestantes !== 1 ? 's' : ''}.`,
      });
    }

    if (!usuario.password_hash) {
      return res.status(400).json({
        success: false,
        message: 'Esta cuenta usa inicio de sesion con Google o Microsoft',
        code: 'USE_OAUTH',
      });
    }

    const passwordValida = await bcrypt.compare(password, usuario.password_hash);
    if (!passwordValida) {
      const intentos = (usuario.intentos_fallidos || 0) + 1;
      const MAX_INTENTOS = 5;
      const LOCKOUT_MINUTOS = 15;

      const updateData = { intentos_fallidos: intentos };
      if (intentos >= MAX_INTENTOS) {
        updateData.bloqueado_hasta = new Date(Date.now() + LOCKOUT_MINUTOS * 60 * 1000);
      }

      await usuario.update(updateData);
      registrarAudit({ req, accion: intentos >= MAX_INTENTOS ? 'LOGIN_LOCKOUT' : 'LOGIN_FALLIDO', entidad: 'usuarios', entidad_id: usuario.id, despues: { email: usuario.email, intentos } });
      return res.status(401).json({ success: false, message: 'Credenciales invalidas' });
    }

    // Verificacion de email
    if (usuario.email_verificado === false) {
      return res.status(401).json({
        success: false,
        message: 'Debes verificar tu email antes de iniciar sesion. Revisa tu bandeja de entrada.',
        code: 'EMAIL_NOT_VERIFIED',
      });
    }

    // Reset failed attempts + refresh token
    const refreshToken = crypto.randomBytes(40).toString('hex');
    const refreshExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await usuario.update({
      ultimo_acceso: new Date(),
      intentos_fallidos: 0,
      bloqueado_hasta: null,
      refresh_token: refreshToken,
      refresh_token_expires: refreshExpires,
    });

    const token = generarToken(usuario);

    logAuth('login_local', usuario.id, { email: usuario.email });
    registrarAudit({ req, accion: 'LOGIN', entidad: 'usuarios', entidad_id: usuario.id, despues: { email: usuario.email, rol: usuario.rol } });

    res.json({
      success: true,
      token,
      refresh_token: refreshToken,
      refresh_token_expires: refreshExpires.toISOString(),
      usuario: usuarioResponse(usuario),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =========================================
// POST /auth/google
// =========================================
export const loginGoogle = async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ success: false, message: 'Token de Google requerido' });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: google_id, email, name, given_name, family_name, picture } = payload;

    let usuario = await Usuario.findOne({ where: { google_id } });

    if (!usuario) {
      usuario = await Usuario.findOne({ where: { email: email.toLowerCase() } });

      if (usuario) {
        await usuario.update({ google_id, oauth_provider: 'google', avatar_url: picture || usuario.avatar_url });
      } else {
        usuario = await Usuario.create({
          nombre: given_name || name.split(' ')[0],
          apellido: family_name || name.split(' ').slice(1).join(' ') || '',
          email: email.toLowerCase(),
          google_id,
          oauth_provider: 'google',
          avatar_url: picture,
          rol: 'publico',
          activo: true,
          email_verificado: true,
        });
      }
    }

    if (!usuario.activo) {
      return res.status(403).json({ success: false, message: 'Cuenta desactivada' });
    }

    await usuario.update({ ultimo_acceso: new Date() });
    const token = generarToken(usuario);

    const refreshToken = crypto.randomBytes(40).toString('hex');
    const refreshExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await usuario.update({ refresh_token: refreshToken, refresh_token_expires: refreshExpires });

    logAuth('login_google', usuario.id, { email: usuario.email });

    res.json({
      success: true,
      token,
      refresh_token: refreshToken,
      refresh_token_expires: refreshExpires.toISOString(),
      usuario: usuarioResponse(usuario),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al autenticar con Google: ' + error.message });
  }
};

// =========================================
// POST /auth/microsoft
// =========================================
export const loginMicrosoft = async (req, res) => {
  try {
    const { accessToken } = req.body;

    if (!accessToken) {
      return res.status(400).json({ success: false, message: 'Token de Microsoft requerido' });
    }

    const graphRes = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!graphRes.ok) {
      return res.status(401).json({ success: false, message: 'Token de Microsoft invalido' });
    }

    const msUser = await graphRes.json();
    const { id: microsoft_id, mail, userPrincipalName, givenName, surname, displayName } = msUser;
    const email = (mail || userPrincipalName || '').toLowerCase();

    let usuario = await Usuario.findOne({ where: { microsoft_id } });

    if (!usuario) {
      usuario = await Usuario.findOne({ where: { email } });

      if (usuario) {
        await usuario.update({ microsoft_id, oauth_provider: 'microsoft' });
      } else {
        usuario = await Usuario.create({
          nombre: givenName || displayName.split(' ')[0],
          apellido: surname || displayName.split(' ').slice(1).join(' ') || '',
          email,
          microsoft_id,
          oauth_provider: 'microsoft',
          rol: 'publico',
          activo: true,
          email_verificado: true,
        });
      }
    }

    if (!usuario.activo) {
      return res.status(403).json({ success: false, message: 'Cuenta desactivada' });
    }

    await usuario.update({ ultimo_acceso: new Date() });
    const token = generarToken(usuario);

    const refreshToken = crypto.randomBytes(40).toString('hex');
    const refreshExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await usuario.update({ refresh_token: refreshToken, refresh_token_expires: refreshExpires });

    logAuth('login_microsoft', usuario.id, { email: usuario.email });

    res.json({
      success: true,
      token,
      refresh_token: refreshToken,
      refresh_token_expires: refreshExpires.toISOString(),
      usuario: usuarioResponse(usuario),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al autenticar con Microsoft: ' + error.message });
  }
};

// =========================================
// POST /auth/register
// =========================================
export const register = async (req, res) => {
  try {
    const { nombre, apellido, email, password } = req.body;

    if (!nombre || !apellido || !email || !password) {
      return res.status(400).json({ success: false, message: 'Todos los campos son requeridos' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'La contrasena debe tener al menos 6 caracteres' });
    }

    const existente = await Usuario.findOne({ where: { email: email.toLowerCase().trim() } });
    if (existente) {
      return res.status(409).json({ success: false, message: 'Ya existe una cuenta con este email' });
    }

    const password_hash = await bcrypt.hash(password, 12);
    const verificationToken = uuidv4();

    const usuario = await Usuario.create({
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      email: email.toLowerCase().trim(),
      password_hash,
      rol: 'publico',
      oauth_provider: 'local',
      email_verificado: false,
      verification_token: verificationToken,
      verification_token_expira: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    await enviarVerificacionEmail(usuario, verificationToken);

    logAuth('register', usuario.id, { email: usuario.email });
    registrarAudit({ req, accion: 'REGISTRO', entidad: 'usuarios', entidad_id: usuario.id, despues: { email: usuario.email } });

    res.status(201).json({
      success: true,
      message: 'Cuenta creada. Revisa tu email para verificar tu cuenta.',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =========================================
// POST /auth/verify-email
// =========================================
export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ success: false, message: 'Token requerido' });
    }

    const usuario = await Usuario.findOne({ where: { verification_token: token } });

    if (!usuario || !usuario.verification_token_expira || usuario.verification_token_expira < new Date()) {
      return res.status(400).json({ success: false, message: 'Token invalido o expirado' });
    }

    await usuario.update({
      email_verificado: true,
      verification_token: null,
      verification_token_expira: null,
    });

    res.json({ success: true, message: 'Email verificado exitosamente. Ya podes iniciar sesion.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =========================================
// POST /auth/resend-verification
// =========================================
export const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    const usuario = await Usuario.findOne({ where: { email: email?.toLowerCase() } });

    if (!usuario || usuario.email_verificado) {
      return res.json({ success: true, message: 'Si el email existe y no esta verificado, recibiras un nuevo enlace.' });
    }

    const verificationToken = uuidv4();
    await usuario.update({
      verification_token: verificationToken,
      verification_token_expira: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    await enviarVerificacionEmail(usuario, verificationToken);

    res.json({ success: true, message: 'Si el email existe y no esta verificado, recibiras un nuevo enlace.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =========================================
// POST /auth/forgot-password
// =========================================
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const msg = 'Si el email existe, recibiras las instrucciones para restablecer tu contrasena';

    const usuario = await Usuario.findOne({ where: { email: email?.toLowerCase() } });

    if (!usuario || !usuario.activo || usuario.oauth_provider !== 'local') {
      return res.json({ success: true, message: msg });
    }

    const resetToken = uuidv4();
    const resetExpira = new Date(Date.now() + 60 * 60 * 1000);

    await usuario.update({ reset_token: resetToken, reset_token_expira: resetExpira });
    await enviarResetPassword(usuario, resetToken);

    res.json({ success: true, message: msg });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =========================================
// POST /auth/reset-password
// =========================================
export const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ success: false, message: 'Token y nueva contrasena requeridos' });
    }

    const usuario = await Usuario.findOne({ where: { reset_token: token } });

    if (!usuario || !usuario.reset_token_expira || usuario.reset_token_expira < new Date()) {
      return res.status(400).json({ success: false, message: 'Token invalido o expirado' });
    }

    const hash = await bcrypt.hash(password, 12);

    await usuario.update({
      password_hash: hash,
      reset_token: null,
      reset_token_expira: null,
    });

    res.json({ success: true, message: 'Contrasena actualizada exitosamente' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =========================================
// POST /auth/refresh
// =========================================
export const refresh = async (req, res) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({ success: false, message: 'Refresh token requerido' });
    }

    const usuario = await Usuario.findOne({ where: { refresh_token } });

    if (!usuario || !usuario.refresh_token_expires || usuario.refresh_token_expires < new Date()) {
      return res.status(401).json({ success: false, message: 'Refresh token invalido o expirado' });
    }

    if (!usuario.activo) {
      return res.status(403).json({ success: false, message: 'Cuenta desactivada' });
    }

    const token = generarToken(usuario);

    // Rotar refresh token
    const newRefreshToken = crypto.randomBytes(40).toString('hex');
    const refreshExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await usuario.update({ refresh_token: newRefreshToken, refresh_token_expires: refreshExpires });

    res.json({
      success: true,
      token,
      refresh_token: newRefreshToken,
      refresh_token_expires: refreshExpires.toISOString(),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =========================================
// GET /auth/me
// =========================================
export const me = async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.user.id, {
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
// GET /auth/mis-permisos
// =========================================
export const misPermisos = async (req, res) => {
  try {
    // admin_sistema tiene todos los permisos
    if (req.user.rol === 'admin_sistema') {
      const mapa = {};
      for (const m of TODOS_MODULOS) {
        mapa[m] = {};
        for (const a of TODAS_ACCIONES) mapa[m][a] = true;
      }
      return res.json({ success: true, data: mapa });
    }

    const defaults = await PermisoDefaultRol.findAll({ where: { rol: req.user.rol } });
    const overrides = await PermisoUsuario.findAll({ where: { usuario_id: req.user.id } });

    const overrideMap = {};
    for (const o of overrides) {
      overrideMap[`${o.modulo}:${o.accion}`] = o.permite;
    }

    const mapa = {};
    for (const d of defaults) {
      if (!mapa[d.modulo]) mapa[d.modulo] = {};
      const key = `${d.modulo}:${d.accion}`;
      mapa[d.modulo][d.accion] = key in overrideMap ? overrideMap[key] : d.permite;
    }

    res.json({ success: true, data: mapa });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =========================================
// PUT /auth/perfil
// =========================================
export const updatePerfil = async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.user.id);
    if (!usuario) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

    const { nombre, apellido } = req.body;
    const updates = {};
    if (nombre) updates.nombre = nombre.trim();
    if (apellido) updates.apellido = apellido.trim();
    updates.actualizado_en = new Date();

    await usuario.update(updates);

    res.json({ success: true, data: { nombre: usuario.nombre, apellido: usuario.apellido, avatar_url: usuario.avatar_url } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =========================================
// PUT /auth/cambiar-password
// =========================================
export const cambiarPassword = async (req, res) => {
  try {
    const { password_actual, password_nuevo } = req.body;

    if (!password_actual || !password_nuevo) {
      return res.status(400).json({ success: false, message: 'Contrasena actual y nueva requeridas' });
    }

    if (password_nuevo.length < 6) {
      return res.status(400).json({ success: false, message: 'La nueva contrasena debe tener al menos 6 caracteres' });
    }

    const usuario = await Usuario.findByPk(req.user.id);
    if (!usuario || !usuario.password_hash) {
      return res.status(400).json({ success: false, message: 'No se puede cambiar la contrasena de cuentas OAuth' });
    }

    const valida = await bcrypt.compare(password_actual, usuario.password_hash);
    if (!valida) {
      return res.status(401).json({ success: false, message: 'Contrasena actual incorrecta' });
    }

    const hash = await bcrypt.hash(password_nuevo, 12);
    await usuario.update({ password_hash: hash, actualizado_en: new Date() });

    res.json({ success: true, message: 'Contrasena actualizada exitosamente' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =========================================
// POST /auth/avatar
// =========================================
export const avatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Archivo requerido' });
    }

    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    await Usuario.update({ avatar_url: avatarUrl, actualizado_en: new Date() }, { where: { id: req.user.id } });

    res.json({ success: true, data: { avatar_url: avatarUrl } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =========================================
// POST /auth/logout
// =========================================
export const logout = async (req, res) => {
  try {
    await Usuario.update(
      { refresh_token: null, refresh_token_expires: null },
      { where: { id: req.user.id } }
    );
    res.json({ success: true, message: 'Sesion cerrada' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =========================================
// POST /auth/vincular-dni
// Vincula el usuario logueado con una persona del sistema via DNI.
// Auto-detecta rol y club desde persona_roles.
// =========================================
const ROL_PRIORIDAD = ['delegado_general', 'delegado_auxiliar', 'arbitro', 'veedor', 'entrenador', 'ayudante'];
const ROL_MAPA = {
  delegado_general: 'delegado',
  delegado_auxiliar: 'delegado',
  entrenador: 'entrenador',
  ayudante: 'entrenador',
  arbitro: 'arbitro',
  veedor: 'veedor',
};

export const vincularDni = async (req, res) => {
  try {
    const { dni } = req.body;
    if (!dni) return res.status(400).json({ success: false, message: 'DNI es requerido' });

    const dniNorm = String(dni).replace(/[\s.\-]/g, '').trim();
    if (!dniNorm || dniNorm.length < 7) {
      return res.status(400).json({ success: false, message: 'DNI invalido' });
    }

    const usuario = await Usuario.findByPk(req.user.id);
    if (!usuario) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

    if (usuario.persona_id) {
      return res.status(400).json({ success: false, message: 'Ya tenes un perfil vinculado' });
    }

    // Buscar persona por DNI
    let persona = await Persona.findOne({ where: { dni: dniNorm } });
    let personaCreada = false;

    if (!persona) {
      // Crear persona nueva con datos del usuario
      persona = await Persona.create({
        dni: dniNorm,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        email: usuario.email,
        foto_url: usuario.avatar_url,
        activo: true,
      });
      personaCreada = true;
    } else {
      // Verificar que no haya otro usuario ya vinculado a esta persona
      const otroUsuario = await Usuario.findOne({
        where: { persona_id: persona.id },
      });
      if (otroUsuario && otroUsuario.id !== usuario.id) {
        return res.status(409).json({
          success: false,
          message: 'Esta persona ya tiene un usuario vinculado. Contacta al administrador.',
        });
      }
    }

    // Actualizar usuario con persona_id
    const updates = {
      persona_id: persona.id,
      actualizado_en: new Date(),
    };

    // Auto-detectar rol desde persona_roles
    if (!personaCreada) {
      const rolesActivos = await PersonaRol.findAll({
        where: { persona_id: persona.id, activo: true },
        include: [
          { model: Rol, as: 'rol', attributes: ['id', 'codigo', 'nombre'] },
          {
            model: Club, as: 'club', attributes: ['id'],
            include: [{ model: Institucion, as: 'institucion', attributes: ['nombre'] }],
          },
        ],
      });

      if (rolesActivos.length) {
        // Encontrar el rol de mayor prioridad
        let mejorRol = null;
        let mejorClubId = null;
        let mejorPrioridad = ROL_PRIORIDAD.length;

        for (const pr of rolesActivos) {
          const idx = ROL_PRIORIDAD.indexOf(pr.rol?.codigo);
          if (idx >= 0 && idx < mejorPrioridad) {
            mejorPrioridad = idx;
            mejorRol = pr.rol.codigo;
            mejorClubId = pr.club_id;
          }
        }

        if (mejorRol) {
          updates.rol = ROL_MAPA[mejorRol] || 'publico';
          if (mejorClubId) updates.club_id = mejorClubId;
        }

        // Actualizar nombre/apellido desde la persona (datos mas confiables que OAuth)
        if (persona.nombre) updates.nombre = persona.nombre;
        if (persona.apellido) updates.apellido = persona.apellido;
      }
    }

    await usuario.update(updates);
    await usuario.reload();

    // Generar nuevo JWT con persona_id y rol actualizado
    const token = generarToken(usuario);

    // Preparar info de roles para el frontend
    const rolesInfo = !personaCreada
      ? await PersonaRol.findAll({
          where: { persona_id: persona.id, activo: true },
          include: [
            { model: Rol, as: 'rol', attributes: ['codigo', 'nombre', 'icono', 'color'] },
            {
              model: Club, as: 'club', attributes: ['id'],
              include: [{ model: Institucion, as: 'institucion', attributes: ['nombre', 'nombre_corto'] }],
            },
          ],
        })
      : [];

    registrarAudit({
      req, accion: 'VINCULAR_DNI', entidad: 'usuarios', entidad_id: usuario.id,
      despues: { persona_id: persona.id, rol: usuario.rol, club_id: usuario.club_id },
    });

    res.json({
      success: true,
      data: {
        token,
        user: usuarioResponse(usuario),
        persona: {
          id: persona.id,
          nombre: persona.nombre,
          apellido: persona.apellido,
          dni: persona.dni,
        },
        roles: rolesInfo.map(r => ({
          rol: r.rol?.nombre,
          icono: r.rol?.icono,
          color: r.rol?.color,
          club: r.club?.institucion?.nombre_corto || r.club?.institucion?.nombre || null,
        })),
        persona_creada: personaCreada,
      },
      message: personaCreada
        ? 'Perfil creado. Un administrador te asignara un rol.'
        : `Bienvenido ${persona.nombre} ${persona.apellido}`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

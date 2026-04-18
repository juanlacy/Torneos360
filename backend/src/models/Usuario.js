import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

export const Usuario = sequelize.define('Usuario', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nombre: { type: DataTypes.STRING(100), allowNull: false },
  apellido: { type: DataTypes.STRING(100), allowNull: false },
  email: {
    type: DataTypes.STRING(150), allowNull: false, unique: true,
    validate: { isEmail: true },
  },
  password_hash: { type: DataTypes.STRING(255), allowNull: true },
  rol: {
    type: DataTypes.STRING(30),
    allowNull: false,
    defaultValue: 'publico',
    validate: {
      isIn: [['admin_sistema', 'admin_torneo', 'coordinador', 'delegado', 'arbitro', 'veedor', 'entrenador', 'publico']],
    },
  },
  oauth_provider: {
    type: DataTypes.STRING(20),
    defaultValue: 'local',
    validate: { isIn: [['local', 'google', 'microsoft']] },
  },
  google_id: { type: DataTypes.STRING(255), allowNull: true, unique: true },
  microsoft_id: { type: DataTypes.STRING(255), allowNull: true, unique: true },
  avatar_url: { type: DataTypes.STRING(500), allowNull: true },
  // Vinculacion a persona del dominio (tabla unificada)
  persona_id: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK a personas — vincula usuario con persona fisica' },
  // Legacy (deprecated, usar persona_id + persona_roles)
  entidad_tipo: { type: DataTypes.STRING(30), allowNull: true, comment: 'DEPRECATED' },
  entidad_id: { type: DataTypes.INTEGER, allowNull: true, comment: 'DEPRECATED' },
  club_id: { type: DataTypes.INTEGER, allowNull: true, comment: 'Scope de datos para delegados/entrenadores' },
  // Auth & security
  email_verificado: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  activo: { type: DataTypes.BOOLEAN, defaultValue: true },
  ultimo_acceso: { type: DataTypes.DATE, allowNull: true },
  reset_token: { type: DataTypes.STRING(255), allowNull: true },
  reset_token_expira: { type: DataTypes.DATE, allowNull: true },
  verification_token: { type: DataTypes.STRING(255), allowNull: true },
  verification_token_expira: { type: DataTypes.DATE, allowNull: true },
  intentos_fallidos: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  bloqueado_hasta: { type: DataTypes.DATE, allowNull: true },
  refresh_token: { type: DataTypes.STRING(255), allowNull: true },
  refresh_token_expires: { type: DataTypes.DATE, allowNull: true },
  creado_en: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  actualizado_en: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'usuarios',
  timestamps: false,
  indexes: [
    { name: 'idx_usuarios_email', fields: ['email'] },
    { name: 'idx_usuarios_rol', fields: ['rol'] },
    { name: 'idx_usuarios_club', fields: ['club_id'] },
  ],
});

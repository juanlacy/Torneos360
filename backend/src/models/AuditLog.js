import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

export const AuditLog = sequelize.define('AuditLog', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  usuario_id: { type: DataTypes.INTEGER, allowNull: true },
  accion: { type: DataTypes.STRING(100), allowNull: false, comment: 'Ej: LOGIN, CREAR, EDITAR, ELIMINAR' },
  entidad: { type: DataTypes.STRING(50), allowNull: true, comment: 'Tabla afectada' },
  entidad_id: { type: DataTypes.INTEGER, allowNull: true },
  datos_anteriores: { type: DataTypes.JSONB, allowNull: true },
  datos_nuevos: { type: DataTypes.JSONB, allowNull: true },
  ip: { type: DataTypes.STRING(45), allowNull: true },
  user_agent: { type: DataTypes.STRING(500), allowNull: true },
  creado_en: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'audit_logs',
  timestamps: false,
  indexes: [
    { name: 'idx_audit_usuario', fields: ['usuario_id'] },
    { name: 'idx_audit_entidad', fields: ['entidad', 'entidad_id'] },
    { name: 'idx_audit_fecha', fields: ['creado_en'] },
  ],
});

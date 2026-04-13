import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

/** Override de permisos para un usuario especifico (excepcion sobre el default del rol) */
export const PermisoUsuario = sequelize.define('PermisoUsuario', {
  id:         { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  usuario_id: { type: DataTypes.INTEGER, allowNull: false },
  modulo:     { type: DataTypes.STRING(50), allowNull: false },
  accion:     { type: DataTypes.STRING(20), allowNull: false },
  permite:    { type: DataTypes.BOOLEAN, allowNull: false },
  creado_en:  { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'permisos_usuario',
  timestamps: false,
});

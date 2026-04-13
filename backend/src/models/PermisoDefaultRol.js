import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

/** Permisos por defecto para cada rol — editables desde el panel de administracion */
export const PermisoDefaultRol = sequelize.define('PermisoDefaultRol', {
  id:      { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  rol:     { type: DataTypes.STRING(50), allowNull: false },
  modulo:  { type: DataTypes.STRING(50), allowNull: false },
  accion:  { type: DataTypes.STRING(20), allowNull: false },
  permite: { type: DataTypes.BOOLEAN,   allowNull: false, defaultValue: true },
}, {
  tableName: 'permisos_default_rol',
  timestamps: false,
});

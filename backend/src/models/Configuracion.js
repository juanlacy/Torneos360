import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

/**
 * Configuracion global del sistema.
 * Almacena integraciones (IA, etc.) en un formato clave-valor con JSONB.
 */
export const Configuracion = sequelize.define('Configuracion', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  clave: { type: DataTypes.STRING(100), allowNull: false, unique: true },
  valor: { type: DataTypes.JSONB, defaultValue: {} },
  descripcion: { type: DataTypes.STRING(255), allowNull: true },
  actualizado_en: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'configuraciones',
  timestamps: false,
});

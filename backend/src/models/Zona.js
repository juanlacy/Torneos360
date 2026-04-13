import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

export const Zona = sequelize.define('Zona', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  torneo_id: { type: DataTypes.INTEGER, allowNull: false },
  nombre: { type: DataTypes.STRING(50), allowNull: false },
  color: { type: DataTypes.STRING(7), allowNull: true, comment: 'Color hex para UI' },
  creado_en: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'zonas',
  timestamps: false,
});

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

export const Veedor = sequelize.define('Veedor', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  torneo_id: { type: DataTypes.INTEGER, allowNull: false },
  nombre: { type: DataTypes.STRING(100), allowNull: false },
  apellido: { type: DataTypes.STRING(100), allowNull: false },
  dni: { type: DataTypes.STRING(20), allowNull: false },
  telefono: { type: DataTypes.STRING(30), allowNull: true },
  email: { type: DataTypes.STRING(150), allowNull: true },
  fecha_nacimiento: { type: DataTypes.DATEONLY, allowNull: true },
  foto_url: { type: DataTypes.STRING(500), allowNull: true },
  activo: { type: DataTypes.BOOLEAN, defaultValue: true },
  creado_en: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  actualizado_en: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'veedores',
  timestamps: false,
  indexes: [
    { name: 'idx_veedores_torneo', fields: ['torneo_id'] },
  ],
});

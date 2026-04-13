import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

export const Club = sequelize.define('Club', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  torneo_id: { type: DataTypes.INTEGER, allowNull: false },
  zona_id: { type: DataTypes.INTEGER, allowNull: true },
  nombre: { type: DataTypes.STRING(100), allowNull: false },
  nombre_corto: { type: DataTypes.STRING(30), allowNull: true },
  escudo_url: { type: DataTypes.STRING(500), allowNull: true },
  color_primario: { type: DataTypes.STRING(7), allowNull: true },
  color_secundario: { type: DataTypes.STRING(7), allowNull: true },
  contacto: { type: DataTypes.JSONB, defaultValue: {}, comment: '{telefono, email, direccion}' },
  activo: { type: DataTypes.BOOLEAN, defaultValue: true },
  creado_en: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  actualizado_en: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'clubes',
  timestamps: false,
  indexes: [
    { name: 'idx_clubes_torneo', fields: ['torneo_id'] },
    { name: 'idx_clubes_zona', fields: ['zona_id'] },
  ],
});

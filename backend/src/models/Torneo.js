import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

export const Torneo = sequelize.define('Torneo', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nombre: { type: DataTypes.STRING(100), allowNull: false },
  anio: { type: DataTypes.INTEGER, allowNull: false },
  fecha_inicio: { type: DataTypes.DATEONLY, allowNull: true },
  fecha_fin: { type: DataTypes.DATEONLY, allowNull: true },
  estado: {
    type: DataTypes.STRING(20),
    defaultValue: 'planificacion',
    validate: { isIn: [['planificacion', 'inscripcion', 'en_curso', 'finalizado']] },
  },
  // Branding
  logo_url: { type: DataTypes.STRING(500), allowNull: true },
  favicon_url: { type: DataTypes.STRING(500), allowNull: true },
  color_primario: { type: DataTypes.STRING(7), defaultValue: '#762c7e', comment: 'Color principal (botones, links)' },
  color_secundario: { type: DataTypes.STRING(7), defaultValue: '#4f2f7d', comment: 'Color sidebar' },
  color_acento: { type: DataTypes.STRING(7), defaultValue: '#8cb24d', comment: 'Color acento (highlights)' },
  // Config flexible
  config: { type: DataTypes.JSONB, defaultValue: {} },
  creado_en: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  actualizado_en: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'torneos',
  timestamps: false,
});

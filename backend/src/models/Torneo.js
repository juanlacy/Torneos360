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
  config: { type: DataTypes.JSONB, defaultValue: {} },
  creado_en: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  actualizado_en: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'torneos',
  timestamps: false,
});

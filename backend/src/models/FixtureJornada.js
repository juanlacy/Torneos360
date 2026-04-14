import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

export const FixtureJornada = sequelize.define('FixtureJornada', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  torneo_id: { type: DataTypes.INTEGER, allowNull: false },
  zona_id: { type: DataTypes.INTEGER, allowNull: true },
  numero_jornada: { type: DataTypes.INTEGER, allowNull: false },
  fase: {
    type: DataTypes.STRING(10),
    defaultValue: 'ida',
    validate: { isIn: [['ida', 'vuelta']] },
  },
  fecha: { type: DataTypes.DATEONLY, allowNull: true },
  estado: {
    type: DataTypes.STRING(20),
    defaultValue: 'programada',
    validate: { isIn: [['programada', 'en_curso', 'finalizada', 'suspendida']] },
  },
  creado_en: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  actualizado_en: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'fixture_jornadas',
  timestamps: false,
  indexes: [
    { name: 'idx_jornadas_torneo', fields: ['torneo_id'] },
    { name: 'idx_jornadas_zona', fields: ['zona_id'] },
  ],
});

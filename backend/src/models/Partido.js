import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

export const Partido = sequelize.define('Partido', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  jornada_id: { type: DataTypes.INTEGER, allowNull: false },
  categoria_id: { type: DataTypes.INTEGER, allowNull: false },
  club_local_id: { type: DataTypes.INTEGER, allowNull: false },
  club_visitante_id: { type: DataTypes.INTEGER, allowNull: false },
  estado: {
    type: DataTypes.STRING(20),
    defaultValue: 'programado',
    validate: { isIn: [['programado', 'en_curso', 'finalizado', 'suspendido']] },
  },
  goles_local: { type: DataTypes.INTEGER, defaultValue: 0 },
  goles_visitante: { type: DataTypes.INTEGER, defaultValue: 0 },
  arbitro_id: { type: DataTypes.INTEGER, allowNull: true },
  veedor_id: { type: DataTypes.INTEGER, allowNull: true },
  cancha: { type: DataTypes.STRING(50), allowNull: true },
  hora_inicio: { type: DataTypes.DATE, allowNull: true },
  hora_fin: { type: DataTypes.DATE, allowNull: true },
  confirmado_arbitro: { type: DataTypes.BOOLEAN, defaultValue: false },
  observaciones: { type: DataTypes.TEXT, allowNull: true },
  creado_en: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  actualizado_en: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'partidos',
  timestamps: false,
  indexes: [
    { name: 'idx_partidos_jornada', fields: ['jornada_id'] },
    { name: 'idx_partidos_categoria', fields: ['categoria_id'] },
    { name: 'idx_partidos_estado', fields: ['estado'] },
  ],
});

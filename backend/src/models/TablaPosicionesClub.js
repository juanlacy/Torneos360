import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

export const TablaPosicionesClub = sequelize.define('TablaPosicionesClub', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  torneo_id: { type: DataTypes.INTEGER, allowNull: false },
  zona_id: { type: DataTypes.INTEGER, allowNull: true },
  club_id: { type: DataTypes.INTEGER, allowNull: false },
  puntos_totales: { type: DataTypes.INTEGER, defaultValue: 0 },
  pj: { type: DataTypes.INTEGER, defaultValue: 0 },
  pg: { type: DataTypes.INTEGER, defaultValue: 0 },
  pe: { type: DataTypes.INTEGER, defaultValue: 0 },
  pp: { type: DataTypes.INTEGER, defaultValue: 0 },
  gf: { type: DataTypes.INTEGER, defaultValue: 0 },
  gc: { type: DataTypes.INTEGER, defaultValue: 0 },
  dg: { type: DataTypes.INTEGER, defaultValue: 0 },
  detalle: { type: DataTypes.JSONB, defaultValue: {}, comment: '{cat_2013: 15, cat_2014: 12, ...}' },
  actualizado_en: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'tabla_posiciones_club',
  timestamps: false,
  indexes: [
    { name: 'idx_posiciones_club_torneo', fields: ['torneo_id', 'club_id'], unique: true },
  ],
});

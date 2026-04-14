import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

export const TablaPosiciones = sequelize.define('TablaPosiciones', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  torneo_id: { type: DataTypes.INTEGER, allowNull: false },
  categoria_id: { type: DataTypes.INTEGER, allowNull: false },
  zona_id: { type: DataTypes.INTEGER, allowNull: true },
  club_id: { type: DataTypes.INTEGER, allowNull: false },
  pj: { type: DataTypes.INTEGER, defaultValue: 0, comment: 'Partidos jugados' },
  pg: { type: DataTypes.INTEGER, defaultValue: 0, comment: 'Partidos ganados' },
  pe: { type: DataTypes.INTEGER, defaultValue: 0, comment: 'Partidos empatados' },
  pp: { type: DataTypes.INTEGER, defaultValue: 0, comment: 'Partidos perdidos' },
  gf: { type: DataTypes.INTEGER, defaultValue: 0, comment: 'Goles a favor' },
  gc: { type: DataTypes.INTEGER, defaultValue: 0, comment: 'Goles en contra' },
  dg: { type: DataTypes.INTEGER, defaultValue: 0, comment: 'Diferencia de gol' },
  puntos: { type: DataTypes.INTEGER, defaultValue: 0 },
  actualizado_en: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'tabla_posiciones',
  timestamps: false,
  indexes: [
    { name: 'idx_posiciones_torneo_cat_club', fields: ['torneo_id', 'categoria_id', 'club_id'], unique: true },
  ],
});

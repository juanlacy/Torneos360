import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

/**
 * Alineacion de jugadores en un partido especifico.
 * Cada persona con rol 'jugador' en la lista de buena fe que participa en el partido
 * se registra aqui con el numero de camiseta que usa en ese partido.
 */
export const PartidoAlineacion = sequelize.define('PartidoAlineacion', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  partido_id: { type: DataTypes.INTEGER, allowNull: false },
  persona_id: { type: DataTypes.INTEGER, allowNull: false },
  club_id: { type: DataTypes.INTEGER, allowNull: false, comment: 'Club por el que juega (local o visitante)' },
  numero_camiseta: { type: DataTypes.INTEGER, allowNull: true },
  titular: { type: DataTypes.BOOLEAN, defaultValue: true },
  confirmado: { type: DataTypes.BOOLEAN, defaultValue: false, comment: 'true cuando el delegado confirma la alineacion' },
  creado_en: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'partido_alineaciones',
  timestamps: false,
  indexes: [
    { name: 'idx_alineacion_partido', fields: ['partido_id'] },
    { name: 'idx_alineacion_persona', fields: ['persona_id'] },
    { name: 'idx_alineacion_unique', fields: ['partido_id', 'persona_id'], unique: true },
  ],
});

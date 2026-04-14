import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

export const PartidoEvento = sequelize.define('PartidoEvento', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  partido_id: { type: DataTypes.INTEGER, allowNull: false },
  tipo: {
    type: DataTypes.STRING(30),
    allowNull: false,
    validate: { isIn: [['gol', 'amarilla', 'roja', 'sustitucion', 'informe', 'inicio', 'fin', 'penal']] },
  },
  jugador_id: { type: DataTypes.INTEGER, allowNull: true },
  jugador_reemplaza_id: { type: DataTypes.INTEGER, allowNull: true, comment: 'Para sustituciones: jugador que sale' },
  club_id: { type: DataTypes.INTEGER, allowNull: true },
  minuto: { type: DataTypes.INTEGER, allowNull: true },
  detalle: { type: DataTypes.TEXT, allowNull: true },
  registrado_por: { type: DataTypes.INTEGER, allowNull: true, comment: 'usuario_id que registro el evento' },
  creado_en: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'partido_eventos',
  timestamps: false,
  indexes: [
    { name: 'idx_eventos_partido', fields: ['partido_id'] },
    { name: 'idx_eventos_tipo', fields: ['tipo'] },
  ],
});

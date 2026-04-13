import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

export const Jugador = sequelize.define('Jugador', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  club_id: { type: DataTypes.INTEGER, allowNull: false },
  categoria_id: { type: DataTypes.INTEGER, allowNull: false },
  nombre: { type: DataTypes.STRING(100), allowNull: false },
  apellido: { type: DataTypes.STRING(100), allowNull: false },
  dni: { type: DataTypes.STRING(20), allowNull: false },
  fecha_nacimiento: { type: DataTypes.DATEONLY, allowNull: false },
  foto_url: { type: DataTypes.STRING(500), allowNull: true },
  numero_camiseta: { type: DataTypes.INTEGER, allowNull: true },
  estado_fichaje: {
    type: DataTypes.STRING(20),
    defaultValue: 'pendiente',
    validate: { isIn: [['pendiente', 'aprobado', 'rechazado', 'baja']] },
  },
  ficha_medica: {
    type: DataTypes.JSONB,
    defaultValue: {},
    comment: '{apto_fisico, fecha_apto, grupo_sanguineo, alergias, obra_social, observaciones}',
  },
  datos_personales: {
    type: DataTypes.JSONB,
    defaultValue: {},
    comment: '{direccion, telefono_tutor, nombre_tutor, email_tutor}',
  },
  observaciones: { type: DataTypes.TEXT, allowNull: true },
  activo: { type: DataTypes.BOOLEAN, defaultValue: true },
  creado_en: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  actualizado_en: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'jugadores',
  timestamps: false,
  indexes: [
    { name: 'idx_jugadores_club', fields: ['club_id'] },
    { name: 'idx_jugadores_categoria', fields: ['categoria_id'] },
    { name: 'idx_jugadores_dni', fields: ['dni'] },
    { name: 'idx_jugadores_estado', fields: ['estado_fichaje'] },
  ],
});

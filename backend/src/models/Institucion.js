import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

/**
 * Institucion — El club "platonico", con identidad propia global.
 *
 * Una institucion existe en el sistema independientemente de los torneos.
 * Una misma institucion (ej: "CALE") puede participar en multiples torneos:
 *   - CALE en CAFI 2026 Baby Futbol
 *   - CALE en METRO Futsal 2026
 *
 * Cada participacion es una fila en la tabla `clubes` que apunta a esta
 * institucion pero con su propio torneo_id y zona_id.
 *
 * Los datos visuales (escudo, colores, nombre) viven aqui una sola vez.
 * Si CALE cambia su logo, se actualiza una vez y se refleja en todos los
 * torneos donde participa.
 */
export const Institucion = sequelize.define('Institucion', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nombre: { type: DataTypes.STRING(150), allowNull: false, unique: true },
  nombre_corto: { type: DataTypes.STRING(30), allowNull: true },
  escudo_url: { type: DataTypes.STRING(500), allowNull: true },
  color_primario: { type: DataTypes.STRING(7), allowNull: true },
  color_secundario: { type: DataTypes.STRING(7), allowNull: true },
  cuit: { type: DataTypes.STRING(20), allowNull: true },
  direccion: { type: DataTypes.STRING(250), allowNull: true },
  contacto: {
    type: DataTypes.JSONB,
    defaultValue: {},
    comment: '{telefono, email, web, referente}',
  },
  fundacion: { type: DataTypes.DATEONLY, allowNull: true, comment: 'Fecha de fundacion' },
  observaciones: { type: DataTypes.TEXT, allowNull: true },
  activo: { type: DataTypes.BOOLEAN, defaultValue: true },
  creado_en: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  actualizado_en: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'instituciones',
  timestamps: false,
  indexes: [
    { name: 'idx_instituciones_nombre', fields: ['nombre'], unique: true },
    { name: 'idx_instituciones_activo', fields: ['activo'] },
  ],
});

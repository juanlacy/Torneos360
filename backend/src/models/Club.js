import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

/**
 * Club — Participacion de una Institucion en un Torneo especifico.
 *
 * Los datos visuales (nombre, escudo, colores) NO se guardan aca: viven en
 * `instituciones`. Este modelo expone `nombre`, `nombre_corto`, `escudo_url`,
 * etc como campos VIRTUAL que leen de la institucion incluida.
 *
 * Para que los virtuals funcionen, siempre hay que incluir `institucion` en
 * las queries (`include: [{ model: Institucion, as: 'institucion' }]`).
 * Si no se incluye, los virtuals devuelven null.
 */
export const Club = sequelize.define('Club', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  institucion_id: { type: DataTypes.INTEGER, allowNull: false },
  torneo_id: { type: DataTypes.INTEGER, allowNull: false },
  zona_id: { type: DataTypes.INTEGER, allowNull: true },
  sufijo: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: '',
    comment: 'Identificador de equipo: A, B, Reserva, etc. Vacio si la institucion tiene un solo club en el torneo.',
  },
  nombre_override: { type: DataTypes.STRING(100), allowNull: true },
  activo: { type: DataTypes.BOOLEAN, defaultValue: true },
  creado_en: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  actualizado_en: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },

  // ─── Virtuals que delegan a la institucion asociada ──────────────────────
  // Requieren que el query incluya `{ model: Institucion, as: 'institucion' }`.
  nombre: {
    type: DataTypes.VIRTUAL,
    get() {
      const base = this.getDataValue('nombre_override') || this.institucion?.nombre || null;
      const suf = this.getDataValue('sufijo');
      if (base && suf) return `${base} ${suf}`;
      return base;
    },
  },
  nombre_corto: {
    type: DataTypes.VIRTUAL,
    get() {
      const base = this.institucion?.nombre_corto || null;
      const suf = this.getDataValue('sufijo');
      if (base && suf) return `${base} ${suf}`;
      return base;
    },
  },
  escudo_url: {
    type: DataTypes.VIRTUAL,
    get() { return this.institucion?.escudo_url || null; },
  },
  color_primario: {
    type: DataTypes.VIRTUAL,
    get() { return this.institucion?.color_primario || null; },
  },
  color_secundario: {
    type: DataTypes.VIRTUAL,
    get() { return this.institucion?.color_secundario || null; },
  },
  contacto: {
    type: DataTypes.VIRTUAL,
    get() { return this.institucion?.contacto || {}; },
  },
}, {
  tableName: 'clubes',
  timestamps: false,
  indexes: [
    { name: 'idx_clubes_torneo', fields: ['torneo_id'] },
    { name: 'idx_clubes_zona', fields: ['zona_id'] },
    { name: 'idx_clubes_institucion', fields: ['institucion_id'] },
    { name: 'idx_clubes_unique', fields: ['institucion_id', 'torneo_id', 'sufijo'], unique: true },
  ],
});

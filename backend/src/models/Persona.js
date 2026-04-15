import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

/**
 * Persona — Tabla unificada de personas fisicas del sistema.
 *
 * Reemplaza los campos personales duplicados en jugadores/staff/arbitros/veedores.
 * Una persona (identificada por DNI) puede tener N roles via la tabla `persona_roles`.
 *
 * Ejemplos de una persona:
 *  - Juan Perez (DNI 12345678) → rol "Jugador" del Club A categoria 2015
 *                              → rol "Entrenador" del Club B (cuando termine de jugar pasa a DT)
 *  - Maria Lopez (DNI 87654321) → rol "Delegada General" del Club C
 *                               → rol "Veedora" del Torneo 2026
 */
export const Persona = sequelize.define('Persona', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  dni: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
    comment: 'Identificador natural. Se normaliza sin puntos ni espacios.',
  },
  nombre: { type: DataTypes.STRING(100), allowNull: false },
  apellido: { type: DataTypes.STRING(100), allowNull: false },
  fecha_nacimiento: { type: DataTypes.DATEONLY, allowNull: true },
  sexo: {
    type: DataTypes.STRING(1),
    allowNull: true,
    validate: { isIn: [['M', 'F', 'X']] },
  },
  telefono: { type: DataTypes.STRING(30), allowNull: true },
  email: { type: DataTypes.STRING(150), allowNull: true },
  foto_url: { type: DataTypes.STRING(500), allowNull: true },
  observaciones: { type: DataTypes.TEXT, allowNull: true },
  activo: { type: DataTypes.BOOLEAN, defaultValue: true },
  creado_en: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  actualizado_en: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'personas',
  timestamps: false,
  indexes: [
    { name: 'idx_personas_dni', fields: ['dni'], unique: true },
    { name: 'idx_personas_apellido', fields: ['apellido'] },
    { name: 'idx_personas_activo', fields: ['activo'] },
  ],
});

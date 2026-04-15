import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

/**
 * PersonaRol — Asignacion N:M de una persona a un rol con contexto.
 *
 * Una fila representa "Juan Perez es Entrenador del Club A desde el 15/04/2026".
 * Una persona puede tener muchas filas activas al mismo tiempo (varios roles).
 *
 * Dependiendo del rol.ambito, los campos de contexto son obligatorios:
 *  - club_id      → requerido si rol.ambito = 'club'
 *  - torneo_id    → requerido si rol.ambito = 'torneo'
 *  - categoria_id → requerido si rol.requiere_categoria = true (solo jugadores)
 *  - numero_camiseta → requerido si rol.requiere_numero_camiseta = true
 *
 * Historial: cuando una persona deja de cumplir un rol, en vez de borrar la fila
 * se setea `fecha_hasta` y `activo = false`, manteniendo el historial completo.
 */
export const PersonaRol = sequelize.define('PersonaRol', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  persona_id: { type: DataTypes.INTEGER, allowNull: false },
  rol_id: { type: DataTypes.INTEGER, allowNull: false },
  club_id: { type: DataTypes.INTEGER, allowNull: true },
  torneo_id: { type: DataTypes.INTEGER, allowNull: true },
  categoria_id: { type: DataTypes.INTEGER, allowNull: true },
  numero_camiseta: { type: DataTypes.INTEGER, allowNull: true },
  estado_fichaje: {
    type: DataTypes.STRING(20),
    allowNull: true,
    validate: { isIn: [[null, 'pendiente', 'aprobado', 'rechazado', 'baja']] },
    comment: 'Solo para jugadores',
  },
  fecha_desde: { type: DataTypes.DATEONLY, allowNull: true, defaultValue: DataTypes.NOW },
  fecha_hasta: { type: DataTypes.DATEONLY, allowNull: true },
  observaciones: { type: DataTypes.TEXT, allowNull: true },
  activo: { type: DataTypes.BOOLEAN, defaultValue: true },
  creado_en: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  actualizado_en: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'persona_roles',
  timestamps: false,
  indexes: [
    { name: 'idx_persona_roles_persona', fields: ['persona_id'] },
    { name: 'idx_persona_roles_rol', fields: ['rol_id'] },
    { name: 'idx_persona_roles_club', fields: ['club_id'] },
    { name: 'idx_persona_roles_torneo', fields: ['torneo_id'] },
    { name: 'idx_persona_roles_categoria', fields: ['categoria_id'] },
    { name: 'idx_persona_roles_activo', fields: ['activo'] },
  ],
});

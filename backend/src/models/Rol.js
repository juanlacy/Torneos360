import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

/**
 * Rol — Catalogo editable de roles que una persona puede desempenar en el sistema.
 *
 * Reemplaza al modelo RolStaff ampliandolo para cubrir TODOS los roles
 * (no solo los del staff del club): Jugador, DT, Delegado, Arbitro, Veedor, Utilero, etc.
 *
 * El `ambito` define que contexto requiere el rol al asignarlo:
 *  - 'club'   → persona_roles.club_id es obligatorio (jugador, DT, delegado, utilero, ...)
 *  - 'torneo' → persona_roles.torneo_id es obligatorio (arbitro, veedor, comisario, ...)
 *  - 'global' → sin contexto (uso futuro: instructor de cursos, etc)
 *
 * El `categoria_fn` agrupa los roles en la UI:
 *  - 'jugador'         → pantalla /jugadores
 *  - 'staff_club'      → pantalla /staff
 *  - 'oficial_torneo'  → pantalla /arbitros o /veedores
 */
export const Rol = sequelize.define('Rol', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  codigo: {
    type: DataTypes.STRING(40),
    allowNull: false,
    unique: true,
    comment: 'Identificador estable (jugador, entrenador, delegado_general, arbitro, ...)',
  },
  nombre: { type: DataTypes.STRING(80), allowNull: false },
  descripcion: { type: DataTypes.TEXT, allowNull: true },
  ambito: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'club',
    validate: { isIn: [['club', 'torneo', 'global']] },
  },
  categoria_fn: {
    type: DataTypes.STRING(30),
    allowNull: false,
    defaultValue: 'staff_club',
    validate: { isIn: [['jugador', 'staff_club', 'oficial_torneo', 'otro']] },
    comment: 'Agrupador funcional para mostrar el rol en la pantalla correspondiente',
  },
  icono: { type: DataTypes.STRING(40), allowNull: true },
  color: { type: DataTypes.STRING(20), allowNull: true },
  puede_firmar_alineacion: { type: DataTypes.BOOLEAN, defaultValue: false },
  puede_dirigir_partido: { type: DataTypes.BOOLEAN, defaultValue: false },
  requiere_categoria: { type: DataTypes.BOOLEAN, defaultValue: false },
  requiere_numero_camiseta: { type: DataTypes.BOOLEAN, defaultValue: false },
  orden: { type: DataTypes.INTEGER, defaultValue: 0 },
  activo: { type: DataTypes.BOOLEAN, defaultValue: true },
  es_sistema: { type: DataTypes.BOOLEAN, defaultValue: false },
  creado_en: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  actualizado_en: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'roles',
  timestamps: false,
  indexes: [
    { name: 'idx_roles_codigo', fields: ['codigo'], unique: true },
    { name: 'idx_roles_ambito', fields: ['ambito'] },
    { name: 'idx_roles_categoria_fn', fields: ['categoria_fn'] },
    { name: 'idx_roles_activo', fields: ['activo'] },
  ],
});

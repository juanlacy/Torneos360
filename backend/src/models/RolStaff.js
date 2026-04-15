import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

/**
 * RolStaff — Catalogo de roles de Staff del club.
 *
 * Reemplaza el ENUM hardcodeado de Staff.tipo por una tabla editable desde la UI,
 * permitiendo agregar roles nuevos (Utilero, Medico, Preparador Fisico, Dirigente, etc)
 * sin tocar codigo.
 *
 * El campo `codigo` se mantiene como identificador estable para el backend
 * (usado por checks del flujo de partido: ej. confirmar alineacion requiere
 * rol con codigo 'delegado_general' o 'delegado_auxiliar').
 */
export const RolStaff = sequelize.define('RolStaff', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  codigo: {
    type: DataTypes.STRING(40),
    allowNull: false,
    unique: true,
    comment: 'Identificador estable para logica de backend (ej: delegado_general)',
  },
  nombre: { type: DataTypes.STRING(80), allowNull: false },
  descripcion: { type: DataTypes.TEXT, allowNull: true },
  icono: {
    type: DataTypes.STRING(40),
    allowNull: true,
    comment: 'Nombre de material icon (ej: sports, medical_services)',
  },
  color: {
    type: DataTypes.STRING(20),
    allowNull: true,
    comment: 'Color hex para badges en la UI',
  },
  puede_firmar_alineacion: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Si este rol puede firmar confirmaciones de alineacion del partido',
  },
  orden: { type: DataTypes.INTEGER, defaultValue: 0 },
  activo: { type: DataTypes.BOOLEAN, defaultValue: true },
  es_sistema: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Roles del sistema no se pueden eliminar (solo desactivar)',
  },
  creado_en: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  actualizado_en: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'roles_staff',
  timestamps: false,
  indexes: [
    { name: 'idx_roles_staff_codigo', fields: ['codigo'], unique: true },
    { name: 'idx_roles_staff_activo', fields: ['activo'] },
  ],
});

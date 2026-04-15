import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

export const Staff = sequelize.define('Staff', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  club_id: { type: DataTypes.INTEGER, allowNull: false },
  nombre: { type: DataTypes.STRING(100), allowNull: false },
  apellido: { type: DataTypes.STRING(100), allowNull: false },
  dni: { type: DataTypes.STRING(20), allowNull: false },
  // FK al catalogo de roles (reemplaza al ENUM hardcodeado)
  rol_id: { type: DataTypes.INTEGER, allowNull: true },
  // Legacy: se mantiene por backward-compat pero ya no se valida
  tipo: { type: DataTypes.STRING(40), allowNull: true },
  telefono: { type: DataTypes.STRING(30), allowNull: true },
  email: { type: DataTypes.STRING(150), allowNull: true },
  fecha_nacimiento: { type: DataTypes.DATEONLY, allowNull: true },
  foto_url: { type: DataTypes.STRING(500), allowNull: true },
  activo: { type: DataTypes.BOOLEAN, defaultValue: true },
  creado_en: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  actualizado_en: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'staff',
  timestamps: false,
  indexes: [
    { name: 'idx_staff_club', fields: ['club_id'] },
    { name: 'idx_staff_tipo', fields: ['tipo'] },
    { name: 'idx_staff_rol_id', fields: ['rol_id'] },
  ],
});

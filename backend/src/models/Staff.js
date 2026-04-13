import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

export const Staff = sequelize.define('Staff', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  club_id: { type: DataTypes.INTEGER, allowNull: false },
  nombre: { type: DataTypes.STRING(100), allowNull: false },
  apellido: { type: DataTypes.STRING(100), allowNull: false },
  dni: { type: DataTypes.STRING(20), allowNull: false },
  tipo: {
    type: DataTypes.STRING(30),
    allowNull: false,
    validate: { isIn: [['entrenador', 'ayudante', 'delegado_general', 'delegado_auxiliar']] },
  },
  telefono: { type: DataTypes.STRING(30), allowNull: true },
  email: { type: DataTypes.STRING(150), allowNull: true },
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
  ],
});

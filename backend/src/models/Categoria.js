import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

export const Categoria = sequelize.define('Categoria', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  torneo_id: { type: DataTypes.INTEGER, allowNull: false },
  nombre: { type: DataTypes.STRING(50), allowNull: false, comment: 'Ej: 2013, 2014, Preliminar' },
  anio_nacimiento: { type: DataTypes.INTEGER, allowNull: false },
  es_preliminar: { type: DataTypes.BOOLEAN, defaultValue: false, comment: 'No suma puntos al club' },
  max_jugadores: { type: DataTypes.INTEGER, defaultValue: 25 },
  orden: { type: DataTypes.INTEGER, defaultValue: 0, comment: 'Orden de visualizacion' },
  config: { type: DataTypes.JSONB, defaultValue: {} },
  creado_en: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  actualizado_en: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'categorias',
  timestamps: false,
  indexes: [
    { name: 'idx_categorias_torneo', fields: ['torneo_id'] },
  ],
});

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

export const Documento = sequelize.define('Documento', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  entidad_tipo: { type: DataTypes.STRING(30), allowNull: false, comment: 'personas|clubes|instituciones' },
  entidad_id: { type: DataTypes.INTEGER, allowNull: false },
  tipo: {
    type: DataTypes.STRING(30), allowNull: false,
    validate: { isIn: [['apto_medico', 'dni', 'foto', 'ficha', 'contrato', 'otro']] },
  },
  archivo_url: { type: DataTypes.STRING(500), allowNull: false },
  nombre_original: { type: DataTypes.STRING(255), allowNull: true },
  mime_type: { type: DataTypes.STRING(100), allowNull: true },
  tamano: { type: DataTypes.INTEGER, allowNull: true, comment: 'Bytes' },
  descripcion: { type: DataTypes.STRING(255), allowNull: true },
  subido_por: { type: DataTypes.INTEGER, allowNull: true, comment: 'usuario_id' },
  creado_en: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'documentos',
  timestamps: false,
  indexes: [
    { name: 'idx_documentos_entidad', fields: ['entidad_tipo', 'entidad_id'] },
    { name: 'idx_documentos_tipo', fields: ['tipo'] },
  ],
});

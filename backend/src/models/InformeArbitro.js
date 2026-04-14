import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

export const InformeArbitro = sequelize.define('InformeArbitro', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  partido_id: { type: DataTypes.INTEGER, allowNull: false },
  arbitro_id: { type: DataTypes.INTEGER, allowNull: true },
  usuario_id: { type: DataTypes.INTEGER, allowNull: false, comment: 'Quien creo el informe' },
  audio_url: { type: DataTypes.STRING(500), allowNull: true, comment: 'Path al archivo de audio' },
  transcripcion: { type: DataTypes.TEXT, allowNull: true, comment: 'Transcripcion del audio (IA)' },
  resumen: { type: DataTypes.TEXT, allowNull: true, comment: 'Resumen generado por IA' },
  texto_manual: { type: DataTypes.TEXT, allowNull: true, comment: 'Texto escrito manualmente' },
  tipo: {
    type: DataTypes.STRING(30),
    defaultValue: 'general',
    validate: { isIn: [['general', 'disciplinario', 'incidente', 'suspension']] },
  },
  estado: {
    type: DataTypes.STRING(20),
    defaultValue: 'borrador',
    validate: { isIn: [['borrador', 'confirmado']] },
  },
  metadata: { type: DataTypes.JSONB, defaultValue: {}, comment: 'Datos extras: modelo IA usado, duracion audio, etc.' },
  creado_en: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  actualizado_en: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'informes_arbitro',
  timestamps: false,
  indexes: [
    { name: 'idx_informes_partido', fields: ['partido_id'] },
    { name: 'idx_informes_arbitro', fields: ['arbitro_id'] },
  ],
});

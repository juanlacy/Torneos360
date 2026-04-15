import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

/**
 * Confirmaciones de un partido por DNI + firma digital.
 * tipos:
 *  - alineacion_local: delegado del club local confirma su lista
 *  - alineacion_visitante: delegado del club visitante confirma su lista
 *  - cierre_arbitro: arbitro cierra el partido
 */
export const PartidoConfirmacion = sequelize.define('PartidoConfirmacion', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  partido_id: { type: DataTypes.INTEGER, allowNull: false },
  tipo: {
    type: DataTypes.STRING(30),
    allowNull: false,
    validate: { isIn: [['alineacion_local', 'alineacion_visitante', 'cierre_arbitro']] },
  },
  dni_ingresado: { type: DataTypes.STRING(20), allowNull: false },
  firma_data_url: { type: DataTypes.TEXT, allowNull: true, comment: 'Data URL base64 PNG del canvas' },
  usuario_id: { type: DataTypes.INTEGER, allowNull: true, comment: 'Usuario logueado que ejecuto la accion' },
  nombre_firmante: { type: DataTypes.STRING(200), allowNull: true, comment: 'Nombre de la persona que firma' },
  creado_en: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'partido_confirmaciones',
  timestamps: false,
  indexes: [
    { name: 'idx_confirm_partido', fields: ['partido_id'] },
    { name: 'idx_confirm_tipo', fields: ['tipo'] },
  ],
});

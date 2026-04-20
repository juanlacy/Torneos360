import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

/**
 * SancionDisciplinaria — caso resuelto (o pendiente) del Tribunal de Disciplina.
 *
 * Motivos:
 *  - acumulacion_amarillas : jugador llego al limite de amarillas (config.amarillas_para_suspension)
 *  - roja_directa          : expulsion en un partido
 *  - doble_amarilla        : 2 amarillas en mismo partido -> sancion (si config asi lo define)
 *  - informe_arbitro       : sancion derivada de un informe
 *  - otro                  : caso manual
 *
 * Estados:
 *  - propuesta : el tribunal (o auto-detect) creo el caso pero aun no lo aplico
 *  - aplicada  : resuelto — el jugador tiene N fechas de suspension
 *  - cumplida  : el jugador ya cumplio las fechas de suspension
 *  - apelada   : la persona o su club envio apelacion; pendiente de revision
 *  - revocada  : la sancion fue anulada (por apelacion o error)
 */
export const SancionDisciplinaria = sequelize.define('SancionDisciplinaria', {
  id:         { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  torneo_id:  { type: DataTypes.INTEGER, allowNull: false },
  persona_id: { type: DataTypes.INTEGER, allowNull: false },
  tipo_persona: {
    type: DataTypes.STRING(20), allowNull: false, defaultValue: 'jugador',
    validate: { isIn: [['jugador', 'arbitro', 'delegado', 'entrenador', 'club']] },
  },
  motivo: {
    type: DataTypes.STRING(40), allowNull: false,
    validate: { isIn: [['acumulacion_amarillas', 'roja_directa', 'doble_amarilla', 'informe_arbitro', 'otro']] },
  },
  partido_id:        { type: DataTypes.INTEGER, allowNull: true },
  fechas_suspension: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  multa:             { type: DataTypes.DECIMAL(10, 2), allowNull: true },
  detalle:           { type: DataTypes.TEXT, allowNull: true },
  estado: {
    type: DataTypes.STRING(20), allowNull: false, defaultValue: 'propuesta',
    validate: { isIn: [['propuesta', 'aplicada', 'cumplida', 'apelada', 'revocada']] },
  },
  creada_por:           { type: DataTypes.INTEGER, allowNull: true },
  apelacion_texto:      { type: DataTypes.TEXT, allowNull: true },
  resolucion_apelacion: {
    type: DataTypes.STRING(20), allowNull: true,
    validate: { isIn: [[null, 'confirmada', 'reducida', 'revocada']] },
  },
  resuelta_en:    { type: DataTypes.DATE, allowNull: true },
  resuelta_por:   { type: DataTypes.INTEGER, allowNull: true },
  creado_en:      { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  actualizado_en: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'sanciones_disciplinarias',
  timestamps: false,
  indexes: [
    { name: 'idx_sanciones_torneo',  fields: ['torneo_id'] },
    { name: 'idx_sanciones_persona', fields: ['persona_id'] },
    { name: 'idx_sanciones_partido', fields: ['partido_id'] },
    { name: 'idx_sanciones_estado',  fields: ['estado'] },
  ],
});

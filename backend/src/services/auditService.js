import { AuditLog } from '../models/index.js';

/**
 * Registra una entrada en audit_logs.
 *
 * @param {Object} params
 * @param {Object}  params.req          - Express request (extrae usuario, IP, user-agent)
 * @param {string}  params.accion       - Verbo en mayusculas: LOGIN, CREAR, EDITAR, ELIMINAR, etc.
 * @param {string}  params.entidad      - Nombre de la tabla/entidad: usuarios, jugadores, etc.
 * @param {number}  [params.entidad_id] - ID del registro afectado
 * @param {Object}  [params.antes]      - Snapshot de datos anteriores (para edicion/eliminacion)
 * @param {Object}  [params.despues]    - Snapshot de datos nuevos (para creacion/edicion)
 */
export const registrarAudit = async ({ req, accion, entidad, entidad_id = null, antes = null, despues = null }) => {
  try {
    await AuditLog.create({
      usuario_id:       req?.user?.id ?? null,
      accion,
      entidad,
      entidad_id,
      datos_anteriores: antes,
      datos_nuevos:     despues,
      ip:               req?.ip || req?.headers?.['x-forwarded-for'] || null,
      user_agent:       req?.headers?.['user-agent']?.substring(0, 500) || null,
    });
  } catch {
    console.error(`[audit] Error al registrar ${accion} en ${entidad}:${entidad_id}`);
  }
};

const CAMPOS_EXCLUIDOS = new Set([
  'password', 'password_hash',
  'refresh_token', 'refresh_token_expires',
  'verification_token', 'verification_token_expira',
  'reset_token', 'reset_token_expira',
]);

/**
 * Sanitiza un objeto para auditoria: excluye campos sensibles.
 * @param {Object} datos - Objeto plano (ej: model.toJSON())
 * @returns {Object} Datos sin campos sensibles
 */
export const sanitizarParaAudit = (datos) => {
  if (!datos || typeof datos !== 'object') return datos;
  const limpio = {};
  for (const [key, value] of Object.entries(datos)) {
    if (!CAMPOS_EXCLUIDOS.has(key)) {
      limpio[key] = value;
    }
  }
  return limpio;
};

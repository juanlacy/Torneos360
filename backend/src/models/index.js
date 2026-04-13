import { sequelize } from '../config/db.js';

// ─── Modelos ────────────────────────────────────────────────────────────────
export { sequelize } from '../config/db.js';
export { Usuario } from './Usuario.js';
export { PermisoDefaultRol } from './PermisoDefaultRol.js';
export { PermisoUsuario } from './PermisoUsuario.js';
export { AuditLog } from './AuditLog.js';
export { Torneo } from './Torneo.js';

// ─── Asociaciones ───────────────────────────────────────────────────────────
import { Usuario } from './Usuario.js';
import { PermisoUsuario } from './PermisoUsuario.js';
import { AuditLog } from './AuditLog.js';

// Usuario <-> PermisoUsuario
Usuario.hasMany(PermisoUsuario, { foreignKey: 'usuario_id', as: 'permisos' });
PermisoUsuario.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'usuario' });

// Usuario <-> AuditLog
Usuario.hasMany(AuditLog, { foreignKey: 'usuario_id', as: 'auditLogs' });
AuditLog.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'usuario' });

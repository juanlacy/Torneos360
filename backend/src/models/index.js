import { sequelize } from '../config/db.js';

// ─── Modelos ────────────────────────────────────────────────────────────────
export { sequelize } from '../config/db.js';
export { Usuario } from './Usuario.js';
export { PermisoDefaultRol } from './PermisoDefaultRol.js';
export { PermisoUsuario } from './PermisoUsuario.js';
export { AuditLog } from './AuditLog.js';
export { Torneo } from './Torneo.js';
export { Zona } from './Zona.js';
export { Club } from './Club.js';
export { Categoria } from './Categoria.js';
export { Jugador } from './Jugador.js';
export { Staff } from './Staff.js';
export { Arbitro } from './Arbitro.js';
export { Veedor } from './Veedor.js';

// ─── Asociaciones ───────────────────────────────────────────────────────────
import { Usuario } from './Usuario.js';
import { PermisoUsuario } from './PermisoUsuario.js';
import { AuditLog } from './AuditLog.js';
import { Torneo } from './Torneo.js';
import { Zona } from './Zona.js';
import { Club } from './Club.js';
import { Categoria } from './Categoria.js';
import { Jugador } from './Jugador.js';
import { Staff } from './Staff.js';
import { Arbitro } from './Arbitro.js';
import { Veedor } from './Veedor.js';

// Usuario <-> PermisoUsuario
Usuario.hasMany(PermisoUsuario, { foreignKey: 'usuario_id', as: 'permisos' });
PermisoUsuario.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'usuario' });

// Usuario <-> AuditLog
Usuario.hasMany(AuditLog, { foreignKey: 'usuario_id', as: 'auditLogs' });
AuditLog.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'usuario' });

// Torneo <-> Zona
Torneo.hasMany(Zona, { foreignKey: 'torneo_id', as: 'zonas' });
Zona.belongsTo(Torneo, { foreignKey: 'torneo_id', as: 'torneo' });

// Torneo <-> Categoria
Torneo.hasMany(Categoria, { foreignKey: 'torneo_id', as: 'categorias' });
Categoria.belongsTo(Torneo, { foreignKey: 'torneo_id', as: 'torneo' });

// Torneo <-> Club
Torneo.hasMany(Club, { foreignKey: 'torneo_id', as: 'clubes' });
Club.belongsTo(Torneo, { foreignKey: 'torneo_id', as: 'torneo' });

// Zona <-> Club
Zona.hasMany(Club, { foreignKey: 'zona_id', as: 'clubes' });
Club.belongsTo(Zona, { foreignKey: 'zona_id', as: 'zona' });

// Club <-> Jugador
Club.hasMany(Jugador, { foreignKey: 'club_id', as: 'jugadores' });
Jugador.belongsTo(Club, { foreignKey: 'club_id', as: 'club' });

// Categoria <-> Jugador
Categoria.hasMany(Jugador, { foreignKey: 'categoria_id', as: 'jugadores' });
Jugador.belongsTo(Categoria, { foreignKey: 'categoria_id', as: 'categoria' });

// Club <-> Staff
Club.hasMany(Staff, { foreignKey: 'club_id', as: 'staff' });
Staff.belongsTo(Club, { foreignKey: 'club_id', as: 'club' });

// Torneo <-> Arbitro
Torneo.hasMany(Arbitro, { foreignKey: 'torneo_id', as: 'arbitros' });
Arbitro.belongsTo(Torneo, { foreignKey: 'torneo_id', as: 'torneo' });

// Torneo <-> Veedor
Torneo.hasMany(Veedor, { foreignKey: 'torneo_id', as: 'veedores' });
Veedor.belongsTo(Torneo, { foreignKey: 'torneo_id', as: 'torneo' });

// Usuario <-> Club (scope de delegados/entrenadores)
Usuario.belongsTo(Club, { foreignKey: 'club_id', as: 'club' });
Club.hasMany(Usuario, { foreignKey: 'club_id', as: 'usuarios' });

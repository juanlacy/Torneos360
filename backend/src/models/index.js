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
export { FixtureJornada } from './FixtureJornada.js';
export { Partido } from './Partido.js';
export { PartidoEvento } from './PartidoEvento.js';
export { TablaPosiciones } from './TablaPosiciones.js';
export { TablaPosicionesClub } from './TablaPosicionesClub.js';

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
import { FixtureJornada } from './FixtureJornada.js';
import { Partido } from './Partido.js';
import { PartidoEvento } from './PartidoEvento.js';
import { TablaPosiciones } from './TablaPosiciones.js';
import { TablaPosicionesClub } from './TablaPosicionesClub.js';

// ─── Auth ───────────────────────────────────────────────────────────────────
Usuario.hasMany(PermisoUsuario, { foreignKey: 'usuario_id', as: 'permisos' });
PermisoUsuario.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'usuario' });
Usuario.hasMany(AuditLog, { foreignKey: 'usuario_id', as: 'auditLogs' });
AuditLog.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'usuario' });

// ─── Torneo estructura ──────────────────────────────────────────────────────
Torneo.hasMany(Zona, { foreignKey: 'torneo_id', as: 'zonas' });
Zona.belongsTo(Torneo, { foreignKey: 'torneo_id', as: 'torneo' });

Torneo.hasMany(Categoria, { foreignKey: 'torneo_id', as: 'categorias' });
Categoria.belongsTo(Torneo, { foreignKey: 'torneo_id', as: 'torneo' });

Torneo.hasMany(Club, { foreignKey: 'torneo_id', as: 'clubes' });
Club.belongsTo(Torneo, { foreignKey: 'torneo_id', as: 'torneo' });

Zona.hasMany(Club, { foreignKey: 'zona_id', as: 'clubes' });
Club.belongsTo(Zona, { foreignKey: 'zona_id', as: 'zona' });

// ─── Personas ───────────────────────────────────────────────────────────────
Club.hasMany(Jugador, { foreignKey: 'club_id', as: 'jugadores' });
Jugador.belongsTo(Club, { foreignKey: 'club_id', as: 'club' });

Categoria.hasMany(Jugador, { foreignKey: 'categoria_id', as: 'jugadores' });
Jugador.belongsTo(Categoria, { foreignKey: 'categoria_id', as: 'categoria' });

Club.hasMany(Staff, { foreignKey: 'club_id', as: 'staff' });
Staff.belongsTo(Club, { foreignKey: 'club_id', as: 'club' });

Torneo.hasMany(Arbitro, { foreignKey: 'torneo_id', as: 'arbitros' });
Arbitro.belongsTo(Torneo, { foreignKey: 'torneo_id', as: 'torneo' });

Torneo.hasMany(Veedor, { foreignKey: 'torneo_id', as: 'veedores' });
Veedor.belongsTo(Torneo, { foreignKey: 'torneo_id', as: 'torneo' });

Usuario.belongsTo(Club, { foreignKey: 'club_id', as: 'club' });
Club.hasMany(Usuario, { foreignKey: 'club_id', as: 'usuarios' });

// ─── Competencia ────────────────────────────────────────────────────────────
Torneo.hasMany(FixtureJornada, { foreignKey: 'torneo_id', as: 'jornadas' });
FixtureJornada.belongsTo(Torneo, { foreignKey: 'torneo_id', as: 'torneo' });

Zona.hasMany(FixtureJornada, { foreignKey: 'zona_id', as: 'jornadas' });
FixtureJornada.belongsTo(Zona, { foreignKey: 'zona_id', as: 'zona' });

FixtureJornada.hasMany(Partido, { foreignKey: 'jornada_id', as: 'partidos' });
Partido.belongsTo(FixtureJornada, { foreignKey: 'jornada_id', as: 'jornada' });

Categoria.hasMany(Partido, { foreignKey: 'categoria_id', as: 'partidos' });
Partido.belongsTo(Categoria, { foreignKey: 'categoria_id', as: 'categoria' });

Club.hasMany(Partido, { foreignKey: 'club_local_id', as: 'partidos_local' });
Club.hasMany(Partido, { foreignKey: 'club_visitante_id', as: 'partidos_visitante' });
Partido.belongsTo(Club, { foreignKey: 'club_local_id', as: 'clubLocal' });
Partido.belongsTo(Club, { foreignKey: 'club_visitante_id', as: 'clubVisitante' });

Arbitro.hasMany(Partido, { foreignKey: 'arbitro_id', as: 'partidos' });
Partido.belongsTo(Arbitro, { foreignKey: 'arbitro_id', as: 'arbitro' });

Veedor.hasMany(Partido, { foreignKey: 'veedor_id', as: 'partidos' });
Partido.belongsTo(Veedor, { foreignKey: 'veedor_id', as: 'veedor' });

// Partido <-> Eventos
Partido.hasMany(PartidoEvento, { foreignKey: 'partido_id', as: 'eventos' });
PartidoEvento.belongsTo(Partido, { foreignKey: 'partido_id', as: 'partido' });

PartidoEvento.belongsTo(Jugador, { foreignKey: 'jugador_id', as: 'jugador' });
PartidoEvento.belongsTo(Jugador, { foreignKey: 'jugador_reemplaza_id', as: 'jugadorReemplaza' });
PartidoEvento.belongsTo(Club, { foreignKey: 'club_id', as: 'club' });

// Posiciones
TablaPosiciones.belongsTo(Torneo, { foreignKey: 'torneo_id', as: 'torneo' });
TablaPosiciones.belongsTo(Categoria, { foreignKey: 'categoria_id', as: 'categoria' });
TablaPosiciones.belongsTo(Zona, { foreignKey: 'zona_id', as: 'zona' });
TablaPosiciones.belongsTo(Club, { foreignKey: 'club_id', as: 'club' });

TablaPosicionesClub.belongsTo(Torneo, { foreignKey: 'torneo_id', as: 'torneo' });
TablaPosicionesClub.belongsTo(Zona, { foreignKey: 'zona_id', as: 'zona' });
TablaPosicionesClub.belongsTo(Club, { foreignKey: 'club_id', as: 'club' });

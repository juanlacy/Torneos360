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
export { Institucion } from './Institucion.js';
export { Categoria } from './Categoria.js';
export { Persona } from './Persona.js';
export { Rol } from './Rol.js';
export { PersonaRol } from './PersonaRol.js';
export { FixtureJornada } from './FixtureJornada.js';
export { Partido } from './Partido.js';
export { PartidoEvento } from './PartidoEvento.js';
export { PartidoAlineacion } from './PartidoAlineacion.js';
export { PartidoConfirmacion } from './PartidoConfirmacion.js';
export { TablaPosiciones } from './TablaPosiciones.js';
export { TablaPosicionesClub } from './TablaPosicionesClub.js';
export { Configuracion } from './Configuracion.js';
export { InformeArbitro } from './InformeArbitro.js';
export { Documento } from './Documento.js';
export { SancionDisciplinaria } from './SancionDisciplinaria.js';

// ─── Asociaciones ───────────────────────────────────────────────────────────
import { Usuario } from './Usuario.js';
import { PermisoUsuario } from './PermisoUsuario.js';
import { AuditLog } from './AuditLog.js';
import { Torneo } from './Torneo.js';
import { Zona } from './Zona.js';
import { Club } from './Club.js';
import { Institucion } from './Institucion.js';
import { Categoria } from './Categoria.js';
import { Persona } from './Persona.js';
import { Rol } from './Rol.js';
import { PersonaRol } from './PersonaRol.js';
import { FixtureJornada } from './FixtureJornada.js';
import { Partido } from './Partido.js';
import { PartidoEvento } from './PartidoEvento.js';
import { PartidoAlineacion } from './PartidoAlineacion.js';
import { PartidoConfirmacion } from './PartidoConfirmacion.js';
import { TablaPosiciones } from './TablaPosiciones.js';
import { TablaPosicionesClub } from './TablaPosicionesClub.js';
import { InformeArbitro } from './InformeArbitro.js';
import { SancionDisciplinaria } from './SancionDisciplinaria.js';

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

// Institucion <-> Club (una institucion puede participar en muchos torneos)
Institucion.hasMany(Club, { foreignKey: 'institucion_id', as: 'participaciones' });
Club.belongsTo(Institucion, { foreignKey: 'institucion_id', as: 'institucion' });

Usuario.belongsTo(Club, { foreignKey: 'club_id', as: 'club' });
Club.hasMany(Usuario, { foreignKey: 'club_id', as: 'usuarios' });

// Usuario <-> Persona (1:1)
Usuario.belongsTo(Persona, { foreignKey: 'persona_id', as: 'persona' });
Persona.hasOne(Usuario, { foreignKey: 'persona_id', as: 'usuario' });

// ─── Personas y Roles (arquitectura unificada) ──────────────────────────────
Persona.hasMany(PersonaRol, { foreignKey: 'persona_id', as: 'roles_asignados' });
PersonaRol.belongsTo(Persona, { foreignKey: 'persona_id', as: 'persona' });

Rol.hasMany(PersonaRol, { foreignKey: 'rol_id', as: 'asignaciones' });
PersonaRol.belongsTo(Rol, { foreignKey: 'rol_id', as: 'rol' });

Club.hasMany(PersonaRol, { foreignKey: 'club_id', as: 'miembros' });
PersonaRol.belongsTo(Club, { foreignKey: 'club_id', as: 'club' });

Torneo.hasMany(PersonaRol, { foreignKey: 'torneo_id', as: 'oficiales' });
PersonaRol.belongsTo(Torneo, { foreignKey: 'torneo_id', as: 'torneo' });

Categoria.hasMany(PersonaRol, { foreignKey: 'categoria_id', as: 'jugadores' });
PersonaRol.belongsTo(Categoria, { foreignKey: 'categoria_id', as: 'categoria' });

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

// Partido arbitro/veedor/mejor jugador → Persona
Partido.belongsTo(Persona, { foreignKey: 'arbitro_id', as: 'arbitro' });
Partido.belongsTo(Persona, { foreignKey: 'veedor_id', as: 'veedor' });
Partido.belongsTo(Persona, { foreignKey: 'mejor_jugador_id', as: 'mejorJugador' });

// Partido <-> Eventos
Partido.hasMany(PartidoEvento, { foreignKey: 'partido_id', as: 'eventos' });
PartidoEvento.belongsTo(Partido, { foreignKey: 'partido_id', as: 'partido' });

PartidoEvento.belongsTo(Persona, { foreignKey: 'persona_id', as: 'jugador' });
PartidoEvento.belongsTo(Persona, { foreignKey: 'persona_reemplaza_id', as: 'jugadorReemplaza' });
PartidoEvento.belongsTo(Club, { foreignKey: 'club_id', as: 'club' });

// Partido <-> Alineaciones
Partido.hasMany(PartidoAlineacion, { foreignKey: 'partido_id', as: 'alineaciones' });
PartidoAlineacion.belongsTo(Partido, { foreignKey: 'partido_id', as: 'partido' });
PartidoAlineacion.belongsTo(Persona, { foreignKey: 'persona_id', as: 'jugador' });
PartidoAlineacion.belongsTo(Club, { foreignKey: 'club_id', as: 'club' });

// Partido <-> Confirmaciones
Partido.hasMany(PartidoConfirmacion, { foreignKey: 'partido_id', as: 'confirmaciones' });
PartidoConfirmacion.belongsTo(Partido, { foreignKey: 'partido_id', as: 'partido' });
PartidoConfirmacion.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'usuario' });

// Posiciones
TablaPosiciones.belongsTo(Torneo, { foreignKey: 'torneo_id', as: 'torneo' });
TablaPosiciones.belongsTo(Categoria, { foreignKey: 'categoria_id', as: 'categoria' });
TablaPosiciones.belongsTo(Zona, { foreignKey: 'zona_id', as: 'zona' });
TablaPosiciones.belongsTo(Club, { foreignKey: 'club_id', as: 'club' });

TablaPosicionesClub.belongsTo(Torneo, { foreignKey: 'torneo_id', as: 'torneo' });
TablaPosicionesClub.belongsTo(Zona, { foreignKey: 'zona_id', as: 'zona' });
TablaPosicionesClub.belongsTo(Club, { foreignKey: 'club_id', as: 'club' });

// ─── Informes ───────────────────────────────────────────────────────────────
Partido.hasMany(InformeArbitro, { foreignKey: 'partido_id', as: 'informes' });
InformeArbitro.belongsTo(Partido, { foreignKey: 'partido_id', as: 'partido' });
InformeArbitro.belongsTo(Persona, { foreignKey: 'arbitro_id', as: 'arbitro' });
InformeArbitro.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'usuario' });

// ─── Tribunal de Disciplina ─────────────────────────────────────────────────
Torneo.hasMany(SancionDisciplinaria, { foreignKey: 'torneo_id', as: 'sanciones' });
SancionDisciplinaria.belongsTo(Torneo,  { foreignKey: 'torneo_id',  as: 'torneo' });
SancionDisciplinaria.belongsTo(Persona, { foreignKey: 'persona_id', as: 'persona' });
SancionDisciplinaria.belongsTo(Partido, { foreignKey: 'partido_id', as: 'partido' });
SancionDisciplinaria.belongsTo(Usuario, { foreignKey: 'creada_por', as: 'creador' });
SancionDisciplinaria.belongsTo(Usuario, { foreignKey: 'resuelta_por', as: 'resolvedor' });
Persona.hasMany(SancionDisciplinaria, { foreignKey: 'persona_id', as: 'sanciones' });

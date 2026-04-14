import { getIO } from '../config/socket.js';
import { logSystem } from '../config/logger.js';

/**
 * Emite un evento a todos los suscriptores de un partido.
 * Tambien emite a la room de la jornada para el marcador en vivo.
 */
export const emitMatchEvent = (partidoId, jornadaId, eventName, data) => {
  try {
    const io = getIO();
    io.to(`match:${partidoId}`).emit(eventName, data);
    if (jornadaId) {
      io.to(`jornada:${jornadaId}`).emit(eventName, { ...data, partido_id: partidoId });
    }
    // Broadcast global para dashboards
    io.emit('global:match_update', { partido_id: partidoId, event: eventName, ...data });
  } catch (error) {
    logSystem(`Error emitiendo socket ${eventName}: ${error.message}`, 'warn');
  }
};

/** Partido iniciado */
export const emitMatchStart = (partido) => {
  emitMatchEvent(partido.id, partido.jornada_id, 'match:start', {
    partido_id: partido.id,
    estado: 'en_curso',
    hora_inicio: partido.hora_inicio,
    club_local_id: partido.club_local_id,
    club_visitante_id: partido.club_visitante_id,
  });
};

/** Nuevo evento en el partido (gol, tarjeta, etc.) */
export const emitMatchEventNew = (partido, evento) => {
  emitMatchEvent(partido.id, partido.jornada_id, 'match:event', {
    partido_id: partido.id,
    evento,
    goles_local: partido.goles_local,
    goles_visitante: partido.goles_visitante,
  });
};

/** Marcador actualizado */
export const emitMatchScore = (partido) => {
  emitMatchEvent(partido.id, partido.jornada_id, 'match:score', {
    partido_id: partido.id,
    goles_local: partido.goles_local,
    goles_visitante: partido.goles_visitante,
  });
};

/** Partido finalizado */
export const emitMatchEnd = (partido) => {
  emitMatchEvent(partido.id, partido.jornada_id, 'match:end', {
    partido_id: partido.id,
    estado: 'finalizado',
    goles_local: partido.goles_local,
    goles_visitante: partido.goles_visitante,
    hora_fin: partido.hora_fin,
  });
};

/** Partido confirmado por arbitro */
export const emitMatchConfirm = (partido) => {
  emitMatchEvent(partido.id, partido.jornada_id, 'match:confirm', {
    partido_id: partido.id,
    confirmado_arbitro: true,
  });
};

/** Posiciones actualizadas */
export const emitStandingsUpdate = (torneoId) => {
  try {
    const io = getIO();
    io.emit('standings:update', { torneo_id: torneoId });
  } catch (error) {
    logSystem(`Error emitiendo standings update: ${error.message}`, 'warn');
  }
};

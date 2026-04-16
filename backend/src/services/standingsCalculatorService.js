import { TablaPosiciones, TablaPosicionesClub, Partido, Club, Categoria, FixtureJornada, Torneo } from '../models/index.js';
import { sequelize } from '../config/db.js';

/**
 * Recalcula las tablas de posiciones de un torneo completo.
 * Lee la configuracion de puntos del torneo (config.puntos_victoria, config.puntos_empate).
 *
 * 1. Calcula posiciones por categoria
 * 2. Calcula posiciones generales del club (suma de categorias NO preliminares)
 */
export const recalcularPosiciones = async (torneoId) => {
  const t = await sequelize.transaction();

  try {
    const torneo = await Torneo.findByPk(torneoId);
    if (!torneo) throw new Error('Torneo no encontrado');

    // Leer config de puntos (default: 3 victoria, 1 empate — CAFI usa 2 victoria, 1 empate)
    const ptsVictoria = torneo.config?.puntos_victoria ?? 3;
    const ptsEmpate   = torneo.config?.puntos_empate ?? 1;

    const categorias = await Categoria.findAll({ where: { torneo_id: torneoId } });

    // Limpiar posiciones existentes
    await TablaPosiciones.destroy({ where: { torneo_id: torneoId }, transaction: t });
    await TablaPosicionesClub.destroy({ where: { torneo_id: torneoId }, transaction: t });

    // Obtener todos los partidos finalizados del torneo
    const partidos = await Partido.findAll({
      where: { estado: 'finalizado' },
      include: [{
        model: FixtureJornada, as: 'jornada',
        where: { torneo_id: torneoId },
        attributes: ['zona_id'],
      }],
    });

    // ─── Calcular posiciones por categoria ──────────────────────
    const posMap = {};

    const getPos = (catId, clubId, zonaId) => {
      const key = `${catId}-${clubId}`;
      if (!posMap[key]) {
        posMap[key] = {
          torneo_id: torneoId, categoria_id: catId, zona_id: zonaId, club_id: clubId,
          pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, dg: 0, puntos: 0,
        };
      }
      return posMap[key];
    };

    for (const partido of partidos) {
      const zonaId = partido.jornada?.zona_id ?? null;
      const local = getPos(partido.categoria_id, partido.club_local_id, zonaId);
      const visit = getPos(partido.categoria_id, partido.club_visitante_id, zonaId);

      local.pj++;
      visit.pj++;
      local.gf += partido.goles_local;
      local.gc += partido.goles_visitante;
      visit.gf += partido.goles_visitante;
      visit.gc += partido.goles_local;

      if (partido.goles_local > partido.goles_visitante) {
        local.pg++;
        local.puntos += ptsVictoria;
        visit.pp++;
      } else if (partido.goles_local < partido.goles_visitante) {
        visit.pg++;
        visit.puntos += ptsVictoria;
        local.pp++;
      } else {
        local.pe++;
        visit.pe++;
        local.puntos += ptsEmpate;
        visit.puntos += ptsEmpate;
      }
    }

    const posiciones = Object.values(posMap).map(p => ({
      ...p, dg: p.gf - p.gc, actualizado_en: new Date(),
    }));

    if (posiciones.length) {
      await TablaPosiciones.bulkCreate(posiciones, { transaction: t });
    }

    // ─── Calcular posiciones generales del club ─────────────────
    const categoriasNoPreliminar = categorias.filter(c => !c.es_preliminar).map(c => c.id);
    const clubPosMap = {};

    for (const pos of posiciones) {
      if (!categoriasNoPreliminar.includes(pos.categoria_id)) continue;

      if (!clubPosMap[pos.club_id]) {
        clubPosMap[pos.club_id] = {
          torneo_id: torneoId, zona_id: pos.zona_id, club_id: pos.club_id,
          puntos_totales: 0, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, dg: 0,
          detalle: {},
        };
      }

      const catNombre = categorias.find(c => c.id === pos.categoria_id)?.nombre || `cat_${pos.categoria_id}`;
      const cp = clubPosMap[pos.club_id];
      cp.puntos_totales += pos.puntos;
      cp.pj += pos.pj;
      cp.pg += pos.pg;
      cp.pe += pos.pe;
      cp.pp += pos.pp;
      cp.gf += pos.gf;
      cp.gc += pos.gc;
      cp.detalle[catNombre] = pos.puntos;
    }

    const clubPosiciones = Object.values(clubPosMap).map(p => ({
      ...p, dg: p.gf - p.gc, actualizado_en: new Date(),
    }));

    if (clubPosiciones.length) {
      await TablaPosicionesClub.bulkCreate(clubPosiciones, { transaction: t });
    }

    await t.commit();
    return { posiciones_por_categoria: posiciones.length, posiciones_club: clubPosiciones.length };
  } catch (error) {
    await t.rollback();
    throw error;
  }
};

export const recalcularDespuesDePartido = async (partidoId) => {
  const partido = await Partido.findByPk(partidoId, {
    include: [{ model: FixtureJornada, as: 'jornada', attributes: ['torneo_id'] }],
  });
  if (!partido?.jornada?.torneo_id) throw new Error('Partido o torneo no encontrado');
  return recalcularPosiciones(partido.jornada.torneo_id);
};

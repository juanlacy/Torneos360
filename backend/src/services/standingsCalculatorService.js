import { TablaPosiciones, TablaPosicionesClub, Partido, Club, Categoria, FixtureJornada } from '../models/index.js';
import { sequelize } from '../config/db.js';

/**
 * Recalcula las tablas de posiciones de un torneo completo.
 * Se basa en todos los partidos finalizados.
 *
 * 1. Calcula posiciones por categoria
 * 2. Calcula posiciones generales del club (suma de 6 categorias, excluye preliminar)
 */
export const recalcularPosiciones = async (torneoId) => {
  const t = await sequelize.transaction();

  try {
    // Obtener todas las categorias del torneo
    const categorias = await Categoria.findAll({ where: { torneo_id: torneoId } });
    const clubes = await Club.findAll({ where: { torneo_id: torneoId, activo: true } });

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
    const posMap = {}; // key: `${categoriaId}-${clubId}`

    const getPos = (catId, clubId, zonaId) => {
      const key = `${catId}-${clubId}`;
      if (!posMap[key]) {
        posMap[key] = {
          torneo_id: torneoId,
          categoria_id: catId,
          zona_id: zonaId,
          club_id: clubId,
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
        // Gano local
        local.pg++;
        local.puntos += 3;
        visit.pp++;
      } else if (partido.goles_local < partido.goles_visitante) {
        // Gano visitante
        visit.pg++;
        visit.puntos += 3;
        local.pp++;
      } else {
        // Empate
        local.pe++;
        visit.pe++;
        local.puntos += 1;
        visit.puntos += 1;
      }
    }

    // Calcular diferencia de gol y guardar
    const posiciones = Object.values(posMap).map(p => ({
      ...p,
      dg: p.gf - p.gc,
      actualizado_en: new Date(),
    }));

    if (posiciones.length) {
      await TablaPosiciones.bulkCreate(posiciones, { transaction: t });
    }

    // ─── Calcular posiciones generales del club ─────────────────
    // Sumar puntos de todas las categorias NO preliminares
    const categoriasNoPreliminar = categorias.filter(c => !c.es_preliminar).map(c => c.id);
    const clubPosMap = {}; // key: clubId

    for (const pos of posiciones) {
      if (!categoriasNoPreliminar.includes(pos.categoria_id)) continue;

      if (!clubPosMap[pos.club_id]) {
        clubPosMap[pos.club_id] = {
          torneo_id: torneoId,
          zona_id: pos.zona_id,
          club_id: pos.club_id,
          puntos_totales: 0,
          detalle: {},
        };
      }

      const catNombre = categorias.find(c => c.id === pos.categoria_id)?.nombre || `cat_${pos.categoria_id}`;
      clubPosMap[pos.club_id].puntos_totales += pos.puntos;
      clubPosMap[pos.club_id].detalle[catNombre] = pos.puntos;
    }

    const clubPosiciones = Object.values(clubPosMap).map(p => ({
      ...p,
      actualizado_en: new Date(),
    }));

    if (clubPosiciones.length) {
      await TablaPosicionesClub.bulkCreate(clubPosiciones, { transaction: t });
    }

    await t.commit();

    return {
      posiciones_por_categoria: posiciones.length,
      posiciones_club: clubPosiciones.length,
    };
  } catch (error) {
    await t.rollback();
    throw error;
  }
};

/**
 * Recalcula posiciones despues de que un partido finaliza.
 * Wrapper conveniente que recalcula todo el torneo.
 */
export const recalcularDespuesDePartido = async (partidoId) => {
  const partido = await Partido.findByPk(partidoId, {
    include: [{ model: FixtureJornada, as: 'jornada', attributes: ['torneo_id'] }],
  });
  if (!partido?.jornada?.torneo_id) throw new Error('Partido o torneo no encontrado');
  return recalcularPosiciones(partido.jornada.torneo_id);
};

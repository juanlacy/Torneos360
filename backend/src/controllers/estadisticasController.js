import { Op, fn, col, literal } from 'sequelize';
import {
  sequelize, PartidoEvento, Partido, FixtureJornada, Persona, PersonaRol, Rol, Club, Institucion, Categoria,
} from '../models/index.js';

/**
 * GET /estadisticas/:torneoId/goleadores
 *
 * Top N goleadores del torneo. Agrupa eventos tipo='gol' por persona_id,
 * cuenta goles, y devuelve datos de la persona + club + categoria.
 *
 * Query params:
 *   - limit (default 20)
 *   - zona_id (filtrar por zona del club)
 *   - categoria_id (filtrar por categoria del partido)
 */
export const goleadores = async (req, res) => {
  try {
    const torneoId = parseInt(req.params.torneoId);
    const limit = parseInt(req.query.limit) || 20;
    const { zona_id, categoria_id } = req.query;

    // Subquery: jornada_ids del torneo
    const jornadaWhere = { torneo_id: torneoId };
    const jornadaIds = (await FixtureJornada.findAll({
      where: jornadaWhere, attributes: ['id'], raw: true,
    })).map(j => j.id);

    if (!jornadaIds.length) {
      return res.json({ success: true, data: [] });
    }

    // Filtro de partidos
    const partidoWhere = { jornada_id: jornadaIds, estado: 'finalizado' };
    if (categoria_id) partidoWhere.categoria_id = categoria_id;

    const partidoIds = (await Partido.findAll({
      where: partidoWhere, attributes: ['id'], raw: true,
    })).map(p => p.id);

    if (!partidoIds.length) {
      return res.json({ success: true, data: [] });
    }

    // Agrupar goles por persona_id
    const golesRaw = await PartidoEvento.findAll({
      where: { partido_id: partidoIds, tipo: 'gol', persona_id: { [Op.ne]: null } },
      attributes: [
        'persona_id',
        'club_id',
        [fn('COUNT', col('PartidoEvento.id')), 'goles'],
      ],
      group: ['persona_id', 'club_id'],
      order: [[literal('goles'), 'DESC']],
      limit,
      raw: true,
    });

    if (!golesRaw.length) {
      return res.json({ success: true, data: [] });
    }

    // Enriquecer con datos de persona + club
    const resultado = [];
    for (const g of golesRaw) {
      const persona = await Persona.findByPk(g.persona_id, {
        attributes: ['id', 'nombre', 'apellido', 'foto_url', 'dni'],
      });
      if (!persona) continue;

      // Buscar el club con institucion para nombre/escudo
      let clubData = null;
      if (g.club_id) {
        const club = await Club.findByPk(g.club_id, {
          include: [{ model: Institucion, as: 'institucion' }],
        });
        if (club) {
          clubData = {
            id: club.id,
            zona_id: club.zona_id,
            nombre: club.nombre,
            nombre_corto: club.nombre_corto,
            escudo_url: club.escudo_url,
            color_primario: club.color_primario,
          };
        }
      }

      // Buscar categoria (del persona_rol del jugador)
      const rolJugador = await Rol.findOne({ where: { codigo: 'jugador' }, attributes: ['id'] });
      const pr = rolJugador ? await PersonaRol.findOne({
        where: { persona_id: g.persona_id, rol_id: rolJugador.id, club_id: g.club_id, activo: true },
        include: [{ model: Categoria, as: 'categoria', attributes: ['id', 'nombre'] }],
      }) : null;

      resultado.push({
        persona_id: persona.id,
        nombre: persona.nombre,
        apellido: persona.apellido,
        foto_url: persona.foto_url,
        goles: parseInt(g.goles),
        club: clubData,
        categoria: pr?.categoria || null,
      });
    }

    // Filtrar por zona si se pidio (post-filter porque los goles no tienen zona directa)
    let final = resultado;
    if (zona_id) {
      const clubIdsZona = new Set(
        (await Club.findAll({ where: { torneo_id: torneoId, zona_id }, attributes: ['id'], raw: true }))
          .map(c => c.id),
      );
      final = resultado.filter(r => r.club && clubIdsZona.has(r.club.id));
    }

    res.json({ success: true, data: final });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /estadisticas/:torneoId/tarjetas
 *
 * Ranking de tarjetas (amarillas + rojas) por jugador.
 * Incluye totales por club. Filtrable por zona y categoria.
 */
export const tarjetas = async (req, res) => {
  try {
    const torneoId = parseInt(req.params.torneoId);
    const limit = parseInt(req.query.limit) || 30;
    const { zona_id, categoria_id } = req.query;

    const jornadaIds = (await FixtureJornada.findAll({
      where: { torneo_id: torneoId }, attributes: ['id'], raw: true,
    })).map(j => j.id);

    if (!jornadaIds.length) return res.json({ success: true, data: [] });

    const partidoWhere = { jornada_id: jornadaIds, estado: 'finalizado' };
    if (categoria_id) partidoWhere.categoria_id = categoria_id;

    const partidoIds = (await Partido.findAll({
      where: partidoWhere, attributes: ['id'], raw: true,
    })).map(p => p.id);

    if (!partidoIds.length) return res.json({ success: true, data: [] });

    const tarjetasRaw = await PartidoEvento.findAll({
      where: {
        partido_id: partidoIds,
        tipo: { [Op.in]: ['amarilla', 'roja'] },
        persona_id: { [Op.ne]: null },
      },
      attributes: [
        'persona_id', 'club_id', 'tipo',
        [fn('COUNT', col('PartidoEvento.id')), 'cantidad'],
      ],
      group: ['persona_id', 'club_id', 'tipo'],
      raw: true,
    });

    // Agrupar por persona
    const mapa = new Map();
    for (const t of tarjetasRaw) {
      const key = `${t.persona_id}-${t.club_id}`;
      if (!mapa.has(key)) mapa.set(key, { persona_id: t.persona_id, club_id: t.club_id, amarillas: 0, rojas: 0 });
      const entry = mapa.get(key);
      if (t.tipo === 'amarilla') entry.amarillas = parseInt(t.cantidad);
      if (t.tipo === 'roja') entry.rojas = parseInt(t.cantidad);
    }

    // Ordenar por total (rojas pesan más) y enriquecer
    const ordenado = [...mapa.values()]
      .map(e => ({ ...e, total: e.rojas * 3 + e.amarillas }))
      .sort((a, b) => b.total - a.total)
      .slice(0, limit);

    const resultado = [];
    for (const e of ordenado) {
      const persona = await Persona.findByPk(e.persona_id, {
        attributes: ['id', 'nombre', 'apellido', 'foto_url'],
      });
      if (!persona) continue;

      let clubData = null;
      if (e.club_id) {
        const club = await Club.findByPk(e.club_id, {
          include: [{ model: Institucion, as: 'institucion' }],
        });
        if (club) clubData = { id: club.id, zona_id: club.zona_id, nombre: club.nombre, nombre_corto: club.nombre_corto, escudo_url: club.escudo_url, color_primario: club.color_primario };
      }

      resultado.push({
        persona_id: persona.id,
        nombre: persona.nombre,
        apellido: persona.apellido,
        foto_url: persona.foto_url,
        amarillas: e.amarillas,
        rojas: e.rojas,
        club: clubData,
      });
    }

    res.json({ success: true, data: resultado });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

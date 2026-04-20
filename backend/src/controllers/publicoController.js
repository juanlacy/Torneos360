import { Op, fn, col, literal } from 'sequelize';
import {
  Torneo, Zona, Categoria, Club, Institucion,
  FixtureJornada, Partido, Persona,
  TablaPosiciones, TablaPosicionesClub,
  PartidoEvento, PersonaRol, Rol,
} from '../models/index.js';

/**
 * Endpoints publicos — sin autenticacion.
 * Solo lectura. Reusan los modelos existentes pero sin requirePermiso.
 */

// GET /publico/torneos
export const listarTorneos = async (req, res) => {
  try {
    const torneos = await Torneo.findAll({
      attributes: ['id', 'nombre', 'anio', 'estado', 'logo_url', 'favicon_url', 'color_primario', 'color_secundario', 'color_acento'],
      order: [['anio', 'DESC'], ['nombre', 'ASC']],
    });
    res.json({ success: true, data: torneos });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /publico/torneos/:id
export const obtenerTorneo = async (req, res) => {
  try {
    const torneo = await Torneo.findByPk(req.params.id, {
      include: [
        { model: Zona, as: 'zonas', attributes: ['id', 'nombre', 'color'] },
        { model: Categoria, as: 'categorias', attributes: ['id', 'nombre', 'anio_nacimiento', 'es_preliminar', 'orden'] },
      ],
    });
    if (!torneo) return res.status(404).json({ success: false, message: 'Torneo no encontrado' });
    res.json({ success: true, data: torneo });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /publico/torneos/:id/branding
export const branding = async (req, res) => {
  try {
    const torneo = await Torneo.findByPk(req.params.id, {
      attributes: ['id', 'nombre', 'logo_url', 'favicon_url', 'color_primario', 'color_secundario', 'color_acento'],
    });
    if (!torneo) return res.status(404).json({ success: false, message: 'Torneo no encontrado' });
    res.json({ success: true, data: torneo });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /publico/torneos/:id/posiciones?categoria_id=X&zona_id=X
export const posiciones = async (req, res) => {
  try {
    const torneoId = parseInt(req.params.id);
    const { categoria_id, zona_id } = req.query;

    // Si categoria_id → posiciones por categoria
    if (categoria_id) {
      const where = { torneo_id: torneoId, categoria_id };
      if (zona_id) where.zona_id = zona_id;

      const data = await TablaPosiciones.findAll({
        where,
        include: [
          { model: Club, as: 'club', attributes: ['id', 'sufijo', 'zona_id', 'nombre', 'nombre_corto', 'escudo_url', 'color_primario', 'color_secundario'], include: [{ model: Institucion, as: 'institucion' }] },
          { model: Zona, as: 'zona', attributes: ['id', 'nombre', 'color'] },
        ],
        order: [['puntos', 'DESC'], ['dg', 'DESC'], ['gf', 'DESC']],
      });
      return res.json({ success: true, data });
    }

    // General por club
    const where = { torneo_id: torneoId };
    if (zona_id) where.zona_id = zona_id;

    const data = await TablaPosicionesClub.findAll({
      where,
      include: [
        { model: Club, as: 'club', attributes: ['id', 'sufijo', 'zona_id', 'nombre', 'nombre_corto', 'escudo_url', 'color_primario', 'color_secundario'], include: [{ model: Institucion, as: 'institucion' }] },
        { model: Zona, as: 'zona', attributes: ['id', 'nombre', 'color'] },
      ],
      order: [['puntos_totales', 'DESC'], ['dg', 'DESC'], ['gf', 'DESC']],
    });
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /publico/torneos/:id/goleadores?limit=20&categoria_id=X
export const goleadores = async (req, res) => {
  try {
    const torneoId = parseInt(req.params.id);
    const limit = parseInt(req.query.limit) || 20;
    const { categoria_id } = req.query;

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

    const golesRaw = await PartidoEvento.findAll({
      where: { partido_id: partidoIds, tipo: 'gol', persona_id: { [Op.ne]: null } },
      attributes: ['persona_id', 'club_id', [fn('COUNT', col('PartidoEvento.id')), 'goles']],
      group: ['persona_id', 'club_id'],
      order: [[literal('goles'), 'DESC']],
      limit,
      raw: true,
    });

    const resultado = [];
    const rolJugador = await Rol.findOne({ where: { codigo: 'jugador' }, attributes: ['id'] });

    for (const g of golesRaw) {
      const persona = await Persona.findByPk(g.persona_id, {
        attributes: ['id', 'nombre', 'apellido', 'foto_url'],
      });
      if (!persona) continue;

      let clubData = null;
      if (g.club_id) {
        const club = await Club.findByPk(g.club_id, {
          include: [{ model: Institucion, as: 'institucion' }],
        });
        if (club) clubData = { id: club.id, zona_id: club.zona_id, nombre: club.nombre, nombre_corto: club.nombre_corto, escudo_url: club.escudo_url, color_primario: club.color_primario };
      }

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

    res.json({ success: true, data: resultado });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /publico/torneos/:id/en-vivo
// Lista de partidos en_curso del torneo (sin auth, para banner publico)
export const partidosEnVivo = async (req, res) => {
  try {
    const torneoId = parseInt(req.params.id);
    const jornadaIds = (await FixtureJornada.findAll({
      where: { torneo_id: torneoId }, attributes: ['id'], raw: true,
    })).map(j => j.id);

    if (!jornadaIds.length) return res.json({ success: true, data: [] });

    const partidos = await Partido.findAll({
      where: { jornada_id: jornadaIds, estado: 'en_curso' },
      include: [
        { model: Club, as: 'clubLocal', attributes: ['id', 'sufijo', 'zona_id', 'nombre', 'nombre_corto', 'escudo_url', 'color_primario'], include: [{ model: Institucion, as: 'institucion' }] },
        { model: Club, as: 'clubVisitante', attributes: ['id', 'sufijo', 'zona_id', 'nombre', 'nombre_corto', 'escudo_url', 'color_primario'], include: [{ model: Institucion, as: 'institucion' }] },
        { model: Categoria, as: 'categoria', attributes: ['id', 'nombre'] },
        { model: FixtureJornada, as: 'jornada', attributes: ['numero_jornada', 'fase'] },
      ],
      order: [['hora_inicio', 'ASC']],
    });

    res.json({ success: true, data: partidos });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /publico/torneos/:id/tarjetas?limit=30&categoria_id=X&zona_id=X
export const tarjetas = async (req, res) => {
  try {
    const torneoId = parseInt(req.params.id);
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

    const mapa = new Map();
    for (const t of tarjetasRaw) {
      const key = `${t.persona_id}-${t.club_id}`;
      if (!mapa.has(key)) mapa.set(key, { persona_id: t.persona_id, club_id: t.club_id, amarillas: 0, rojas: 0 });
      const entry = mapa.get(key);
      if (t.tipo === 'amarilla') entry.amarillas = parseInt(t.cantidad);
      if (t.tipo === 'roja') entry.rojas = parseInt(t.cantidad);
    }

    const ordenado = [...mapa.values()]
      .map(e => ({ ...e, total: e.rojas * 3 + e.amarillas }))
      .sort((a, b) => b.total - a.total)
      .slice(0, limit);

    const rolJugador = await Rol.findOne({ where: { codigo: 'jugador' }, attributes: ['id'] });

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

      const pr = rolJugador ? await PersonaRol.findOne({
        where: { persona_id: e.persona_id, rol_id: rolJugador.id, club_id: e.club_id, activo: true },
        include: [{ model: Categoria, as: 'categoria', attributes: ['id', 'nombre'] }],
      }) : null;

      resultado.push({
        persona_id: persona.id,
        nombre: persona.nombre,
        apellido: persona.apellido,
        foto_url: persona.foto_url,
        amarillas: e.amarillas,
        rojas: e.rojas,
        club: clubData,
        categoria: pr?.categoria || null,
      });
    }

    // Filtro por zona (post-filter)
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

// GET /publico/torneos/:id/fixture?jornada_id=X
export const fixture = async (req, res) => {
  try {
    const torneoId = parseInt(req.params.id);
    const { jornada_id } = req.query;

    // Si piden jornada especifica → devolver partidos
    if (jornada_id) {
      const partidos = await Partido.findAll({
        where: { jornada_id },
        include: [
          { model: Club, as: 'clubLocal', attributes: ['id', 'sufijo', 'zona_id', 'nombre', 'nombre_corto', 'escudo_url', 'color_primario', 'color_secundario'], include: [{ model: Institucion, as: 'institucion' }] },
          { model: Club, as: 'clubVisitante', attributes: ['id', 'sufijo', 'zona_id', 'nombre', 'nombre_corto', 'escudo_url', 'color_primario', 'color_secundario'], include: [{ model: Institucion, as: 'institucion' }] },
          { model: Categoria, as: 'categoria', attributes: ['id', 'nombre'] },
        ],
        order: [['categoria_id', 'ASC'], ['id', 'ASC']],
      });
      return res.json({ success: true, data: partidos });
    }

    // Lista de jornadas
    const jornadas = await FixtureJornada.findAll({
      where: { torneo_id: torneoId },
      attributes: ['id', 'numero_jornada', 'fase', 'fecha', 'estado'],
      order: [['numero_jornada', 'ASC'], ['fase', 'ASC']],
    });
    res.json({ success: true, data: jornadas });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

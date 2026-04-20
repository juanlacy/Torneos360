import { Op, fn, col } from 'sequelize';
import {
  Partido, FixtureJornada, Categoria, Club, Institucion,
  PartidoEvento, SancionDisciplinaria, Torneo, Persona, Rol, PersonaRol,
} from '../models/index.js';

/**
 * GET /notificaciones?torneo_id=X
 *
 * Devuelve un resumen de "cosas que alguien deberia atender":
 *   - partido_sin_arbitro   — partido programado/en_curso sin arbitro_id
 *   - partido_sin_veedor    — id. sin veedor_id
 *   - partido_sin_confirmar — finalizado y sin confirmado_arbitro
 *
 * Prioridad por severidad:
 *   - danger  : partido a <=2 dias (o sin fecha y estado en_curso)
 *   - warning : partido a <=7 dias
 *   - info    : partido a >7 dias o sin fecha
 *
 * Respuesta: { success, total, items: [...], por_tipo: { sin_arbitro, sin_veedor, sin_confirmar } }
 */
export const listar = async (req, res) => {
  try {
    const torneoId = parseInt(req.query.torneo_id);
    if (!torneoId) return res.status(400).json({ success: false, message: 'torneo_id es requerido' });

    // Jornadas del torneo
    const jornadas = await FixtureJornada.findAll({
      where: { torneo_id: torneoId },
      attributes: ['id', 'zona_id', 'numero_jornada', 'fase', 'fecha'],
      raw: true,
    });
    if (!jornadas.length) return res.json({ success: true, total: 0, items: [], por_tipo: { sin_arbitro: 0, sin_veedor: 0, sin_confirmar: 0 } });

    const jornadaById = new Map(jornadas.map(j => [j.id, j]));
    const jornadaIds = jornadas.map(j => j.id);

    // Traer partidos no finalizados (para arbitro/veedor) + finalizados sin confirmar
    const partidos = await Partido.findAll({
      where: {
        jornada_id: jornadaIds,
        [Op.or]: [
          { estado: { [Op.in]: ['programado', 'en_curso'] } },
          { [Op.and]: [{ estado: 'finalizado' }, { confirmado_arbitro: false }] },
        ],
      },
      include: [
        { model: Club, as: 'clubLocal',     attributes: ['id', 'sufijo', 'nombre', 'nombre_corto'], include: [{ model: Institucion, as: 'institucion' }] },
        { model: Club, as: 'clubVisitante', attributes: ['id', 'sufijo', 'nombre', 'nombre_corto'], include: [{ model: Institucion, as: 'institucion' }] },
        { model: Categoria, as: 'categoria', attributes: ['id', 'nombre'] },
      ],
      order: [['hora_inicio', 'ASC'], ['id', 'ASC']],
    });

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const diasHasta = (fechaIso) => {
      if (!fechaIso) return null;
      const d = new Date(fechaIso + 'T12:00:00Z');
      return Math.round((d.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
    };
    const severidad = (dias, estado) => {
      if (estado === 'en_curso') return 'danger';
      if (dias === null) return 'info';
      if (dias <= 2) return 'danger';
      if (dias <= 7) return 'warning';
      return 'info';
    };

    const items = [];
    for (const p of partidos) {
      const jornada = jornadaById.get(p.jornada_id);
      const dias = diasHasta(jornada?.fecha);
      const base = {
        partido_id: p.id,
        jornada_id: p.jornada_id,
        fase: jornada?.fase,
        numero_jornada: jornada?.numero_jornada,
        zona_id: jornada?.zona_id,
        fecha: jornada?.fecha,
        dias_hasta: dias,
        categoria: p.categoria?.nombre,
        local:     p.clubLocal?.nombre_corto     || p.clubLocal?.nombre,
        visitante: p.clubVisitante?.nombre_corto || p.clubVisitante?.nombre,
        estado: p.estado,
      };

      // Solo alertar sobre la proxima fecha (dentro de DIAS_AVISO) o partidos en curso/recien pasados
      const DIAS_AVISO = parseInt(req.query.dias_aviso) || 5;
      const dentroDeVentana = p.estado === 'en_curso'
        || (dias !== null && dias >= 0 && dias <= DIAS_AVISO)
        || (dias !== null && dias < 0 && dias >= -DIAS_AVISO && p.estado === 'finalizado');
      if (!dentroDeVentana && p.estado !== 'finalizado') continue;

      if ((p.estado === 'programado' || p.estado === 'en_curso') && !p.arbitro_id) {
        items.push({ ...base, tipo: 'partido_sin_arbitro', severidad: severidad(dias, p.estado) });
      }
      if ((p.estado === 'programado' || p.estado === 'en_curso') && !p.veedor_id) {
        items.push({ ...base, tipo: 'partido_sin_veedor', severidad: severidad(dias, p.estado) });
      }
      if (p.estado === 'finalizado' && !p.confirmado_arbitro && dias !== null && dias >= -DIAS_AVISO) {
        items.push({ ...base, tipo: 'partido_sin_confirmar', severidad: 'warning' });
      }
    }

    // Ordenar por severidad (danger primero) y luego por dias_hasta
    const orden = { danger: 0, warning: 1, info: 2 };
    items.sort((a, b) => {
      const sd = (orden[a.severidad] ?? 3) - (orden[b.severidad] ?? 3);
      if (sd !== 0) return sd;
      return (a.dias_hasta ?? 9999) - (b.dias_hasta ?? 9999);
    });

    // ─── Tribunal: casos pendientes ──────────────────────────────────────
    // 1. Acumulaciones no-sancionadas aun
    // 2. Rojas directas sin sancion creada
    // 3. Apelaciones en estado 'apelada' pendientes de resolver
    const torneo = await Torneo.findByPk(torneoId, { attributes: ['config'] });
    const limiteAmarillas = torneo?.config?.amarillas_para_suspension ?? 5;

    const partidosFinIds = (await Partido.findAll({
      where: { jornada_id: jornadaIds, estado: 'finalizado' },
      attributes: ['id'], raw: true,
    })).map(p => p.id);

    let casosTribunal = 0;
    if (partidosFinIds.length) {
      // Sanciones ya creadas (no revocadas, no cumplidas)
      const sanciones = await SancionDisciplinaria.findAll({
        where: { torneo_id: torneoId, estado: { [Op.notIn]: ['revocada', 'cumplida'] } },
        raw: true,
      });
      const porPersonaMotivo = new Map();
      const porPartidoRoja = new Set();
      for (const s of sanciones) {
        const k = `${s.persona_id}-${s.motivo}`;
        porPersonaMotivo.set(k, (porPersonaMotivo.get(k) || 0) + 1);
        if (s.motivo === 'roja_directa' && s.partido_id) porPartidoRoja.add(`${s.partido_id}-${s.persona_id}`);
      }

      // Acumulaciones sin sancionar
      const amarillas = await PartidoEvento.findAll({
        where: { partido_id: partidosFinIds, tipo: 'amarilla', persona_id: { [Op.ne]: null } },
        attributes: ['persona_id', [fn('COUNT', col('PartidoEvento.id')), 'cantidad']],
        group: ['persona_id'], raw: true,
      });
      for (const a of amarillas) {
        const c = parseInt(a.cantidad);
        if (c < limiteAmarillas) continue;
        const saltos = Math.floor(c / limiteAmarillas);
        const ya = porPersonaMotivo.get(`${a.persona_id}-acumulacion_amarillas`) || 0;
        if (saltos > ya) casosTribunal += (saltos - ya);
      }

      // Rojas directas sin sancion
      const rojas = await PartidoEvento.findAll({
        where: { partido_id: partidosFinIds, tipo: 'roja', persona_id: { [Op.ne]: null } },
        attributes: ['persona_id', 'partido_id'], raw: true,
      });
      for (const r of rojas) {
        if (!porPartidoRoja.has(`${r.partido_id}-${r.persona_id}`)) casosTribunal++;
      }

      // Apelaciones pendientes
      const apeladas = await SancionDisciplinaria.count({ where: { torneo_id: torneoId, estado: 'apelada' } });
      casosTribunal += apeladas;
    }

    if (casosTribunal > 0) {
      items.push({
        tipo: 'tribunal_casos_pendientes',
        severidad: 'warning',
        casos: casosTribunal,
        link: '/tribunal',
      });
    }

    const por_tipo = {
      sin_arbitro:   items.filter(i => i.tipo === 'partido_sin_arbitro').length,
      sin_veedor:    items.filter(i => i.tipo === 'partido_sin_veedor').length,
      sin_confirmar: items.filter(i => i.tipo === 'partido_sin_confirmar').length,
      tribunal:      casosTribunal,
    };

    res.json({ success: true, total: items.length, items, por_tipo });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

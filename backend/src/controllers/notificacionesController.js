import { Op } from 'sequelize';
import {
  Partido, FixtureJornada, Categoria, Club, Institucion,
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

      if ((p.estado === 'programado' || p.estado === 'en_curso') && !p.arbitro_id) {
        items.push({ ...base, tipo: 'partido_sin_arbitro', severidad: severidad(dias, p.estado) });
      }
      if ((p.estado === 'programado' || p.estado === 'en_curso') && !p.veedor_id) {
        items.push({ ...base, tipo: 'partido_sin_veedor', severidad: severidad(dias, p.estado) });
      }
      if (p.estado === 'finalizado' && !p.confirmado_arbitro) {
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

    const por_tipo = {
      sin_arbitro:   items.filter(i => i.tipo === 'partido_sin_arbitro').length,
      sin_veedor:    items.filter(i => i.tipo === 'partido_sin_veedor').length,
      sin_confirmar: items.filter(i => i.tipo === 'partido_sin_confirmar').length,
    };

    res.json({ success: true, total: items.length, items, por_tipo });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

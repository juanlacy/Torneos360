import { Op, fn, col, literal } from 'sequelize';
import {
  sequelize,
  SancionDisciplinaria, Partido, PartidoEvento, FixtureJornada,
  Persona, PersonaRol, Club, Institucion, Categoria, Torneo, Rol,
} from '../models/index.js';
import { registrarAudit } from '../services/auditService.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Lee el reglamento del torneo con defaults */
const leerReglamento = (torneo) => {
  const c = torneo?.config || {};
  return {
    amarillas_para_suspension: c.amarillas_para_suspension ?? 5,
    fechas_por_acumulacion_amarillas: c.fechas_por_acumulacion_amarillas ?? 1,
    fechas_por_roja: c.fechas_por_roja ?? 2,
    permite_apelacion: c.permite_apelacion ?? true,
    publicar_sanciones: c.publicar_sanciones ?? true,
  };
};

// ─── GET /tribunal/:torneoId/pendientes ────────────────────────────────────
/**
 * Auto-detecta casos que requieren revision:
 *  1. Personas con >= amarillas_para_suspension amarillas acumuladas
 *     en el torneo, sin sancion por 'acumulacion_amarillas' correspondiente
 *  2. Rojas directas en partidos finalizados sin sancion 'roja_directa' creada
 * Incluye sanciones ya propuestas (estado='propuesta') para completar la vista.
 */
export const pendientes = async (req, res) => {
  try {
    const torneoId = parseInt(req.params.torneoId);
    const torneo = await Torneo.findByPk(torneoId);
    if (!torneo) return res.status(404).json({ success: false, message: 'Torneo no encontrado' });
    const regla = leerReglamento(torneo);

    // Jornadas + partidos del torneo
    const jornadaIds = (await FixtureJornada.findAll({
      where: { torneo_id: torneoId }, attributes: ['id'], raw: true,
    })).map(j => j.id);
    if (!jornadaIds.length) return res.json({ success: true, data: { sanciones_propuestas: [], acumulaciones: [], rojas_sin_sancion: [] }, reglamento: regla });

    // Sanciones ya registradas (propuestas + aplicadas + apeladas — para excluir duplicados)
    const sanciones = await SancionDisciplinaria.findAll({
      where: { torneo_id: torneoId, estado: { [Op.notIn]: ['revocada', 'cumplida'] } },
      raw: true,
    });
    const sancionesPorPersonaYMotivo = new Map();  // `${persona_id}-${motivo}` → count
    const sancionesPorPartidoRoja = new Set();     // `${partido_id}-${persona_id}`
    for (const s of sanciones) {
      const k = `${s.persona_id}-${s.motivo}`;
      sancionesPorPersonaYMotivo.set(k, (sancionesPorPersonaYMotivo.get(k) || 0) + 1);
      if (s.motivo === 'roja_directa' && s.partido_id) {
        sancionesPorPartidoRoja.add(`${s.partido_id}-${s.persona_id}`);
      }
    }

    // ─── 1) Acumulacion de amarillas ──────────────────────────────────────
    const amarillasRaw = await PartidoEvento.findAll({
      where: {
        partido_id: {
          [Op.in]: (await Partido.findAll({
            where: { jornada_id: jornadaIds, estado: 'finalizado' },
            attributes: ['id'], raw: true,
          })).map(p => p.id),
        },
        tipo: 'amarilla',
        persona_id: { [Op.ne]: null },
      },
      attributes: ['persona_id', [fn('COUNT', col('PartidoEvento.id')), 'cantidad']],
      group: ['persona_id'],
      raw: true,
    });

    const acumulaciones = [];
    for (const row of amarillasRaw) {
      const cantidad = parseInt(row.cantidad);
      if (cantidad < regla.amarillas_para_suspension) continue;

      // Cuantas sanciones ya cubrieron sus acumulaciones? Cada N amarillas = 1 sancion.
      const saltosEsperados = Math.floor(cantidad / regla.amarillas_para_suspension);
      const sancionesYa = sancionesPorPersonaYMotivo.get(`${row.persona_id}-acumulacion_amarillas`) || 0;
      if (sancionesYa >= saltosEsperados) continue;  // ya fue sancionado

      // Enriquecer con datos de la persona + club actual
      const persona = await Persona.findByPk(row.persona_id, { attributes: ['id', 'nombre', 'apellido', 'foto_url', 'dni'] });
      if (!persona) continue;
      const rolJugador = await Rol.findOne({ where: { codigo: 'jugador' }, attributes: ['id'] });
      const pr = rolJugador ? await PersonaRol.findOne({
        where: { persona_id: row.persona_id, rol_id: rolJugador.id, activo: true },
        include: [
          { model: Club, as: 'club', attributes: ['id', 'nombre_corto'], include: [{ model: Institucion, as: 'institucion', attributes: ['nombre', 'nombre_corto'] }] },
          { model: Categoria, as: 'categoria', attributes: ['id', 'nombre'] },
        ],
      }) : null;

      acumulaciones.push({
        persona_id: persona.id,
        nombre: persona.nombre,
        apellido: persona.apellido,
        foto_url: persona.foto_url,
        club: pr?.club ? { id: pr.club.id, nombre: pr.club.nombre_corto || pr.club.institucion?.nombre_corto || pr.club.institucion?.nombre } : null,
        categoria: pr?.categoria?.nombre,
        amarillas_total: cantidad,
        saltos_esperados: saltosEsperados,
        sanciones_ya: sancionesYa,
        fechas_sugeridas: regla.fechas_por_acumulacion_amarillas * (saltosEsperados - sancionesYa),
      });
    }

    // ─── 2) Rojas directas sin sancion ────────────────────────────────────
    const rojasRaw = await PartidoEvento.findAll({
      where: {
        partido_id: {
          [Op.in]: (await Partido.findAll({
            where: { jornada_id: jornadaIds, estado: 'finalizado' },
            attributes: ['id'], raw: true,
          })).map(p => p.id),
        },
        tipo: 'roja',
        persona_id: { [Op.ne]: null },
      },
      attributes: ['persona_id', 'partido_id', 'detalle'],
      raw: true,
    });

    const rojas_sin_sancion = [];
    for (const row of rojasRaw) {
      if (sancionesPorPartidoRoja.has(`${row.partido_id}-${row.persona_id}`)) continue;
      const persona = await Persona.findByPk(row.persona_id, { attributes: ['id', 'nombre', 'apellido', 'foto_url'] });
      if (!persona) continue;
      const partido = await Partido.findByPk(row.partido_id, {
        include: [
          { model: Club, as: 'clubLocal', attributes: ['id', 'nombre_corto'], include: [{ model: Institucion, as: 'institucion', attributes: ['nombre_corto'] }] },
          { model: Club, as: 'clubVisitante', attributes: ['id', 'nombre_corto'], include: [{ model: Institucion, as: 'institucion', attributes: ['nombre_corto'] }] },
          { model: Categoria, as: 'categoria', attributes: ['nombre'] },
        ],
      });
      rojas_sin_sancion.push({
        persona_id: persona.id,
        nombre: persona.nombre,
        apellido: persona.apellido,
        foto_url: persona.foto_url,
        partido_id: row.partido_id,
        detalle: row.detalle,
        categoria: partido?.categoria?.nombre,
        match: partido ? `${partido.clubLocal?.nombre_corto || partido.clubLocal?.institucion?.nombre_corto} vs ${partido.clubVisitante?.nombre_corto || partido.clubVisitante?.institucion?.nombre_corto}` : '',
        es_doble_amarilla: /doble amarilla/i.test(row.detalle || ''),
        fechas_sugeridas: regla.fechas_por_roja,
      });
    }

    // ─── 3) Sanciones propuestas existentes (creadas a mano o auto) ───────
    const sanciones_propuestas = await SancionDisciplinaria.findAll({
      where: { torneo_id: torneoId, estado: 'propuesta' },
      include: [
        { model: Persona, as: 'persona', attributes: ['id', 'nombre', 'apellido', 'foto_url'] },
        { model: Partido, as: 'partido', attributes: ['id'], required: false, include: [
          { model: Categoria, as: 'categoria', attributes: ['nombre'] },
        ] },
      ],
      order: [['creado_en', 'DESC']],
    });

    res.json({
      success: true,
      data: { sanciones_propuestas, acumulaciones, rojas_sin_sancion },
      reglamento: regla,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET /tribunal/:torneoId/sanciones ─────────────────────────────────────
export const listar = async (req, res) => {
  try {
    const torneoId = parseInt(req.params.torneoId);
    const { estado, persona_id, motivo } = req.query;

    const where = { torneo_id: torneoId };
    if (estado)     where.estado = estado;
    if (persona_id) where.persona_id = persona_id;
    if (motivo)     where.motivo = motivo;

    const sanciones = await SancionDisciplinaria.findAll({
      where,
      include: [
        { model: Persona, as: 'persona', attributes: ['id', 'nombre', 'apellido', 'foto_url', 'dni'] },
        { model: Partido, as: 'partido', required: false, include: [
          { model: Categoria, as: 'categoria', attributes: ['nombre'] },
        ] },
      ],
      order: [['creado_en', 'DESC']],
    });

    res.json({ success: true, data: sanciones });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET /tribunal/:torneoId/historial/:personaId ──────────────────────────
export const historialPersona = async (req, res) => {
  try {
    const torneoId = parseInt(req.params.torneoId);
    const personaId = parseInt(req.params.personaId);

    const persona = await Persona.findByPk(personaId, { attributes: ['id', 'nombre', 'apellido', 'dni', 'foto_url'] });
    if (!persona) return res.status(404).json({ success: false, message: 'Persona no encontrada' });

    // Sanciones en este torneo
    const sanciones = await SancionDisciplinaria.findAll({
      where: { persona_id: personaId, torneo_id: torneoId },
      include: [{ model: Partido, as: 'partido', required: false, include: [{ model: Categoria, as: 'categoria', attributes: ['nombre'] }] }],
      order: [['creado_en', 'DESC']],
    });

    // Tarjetas totales en el torneo
    const jornadaIds = (await FixtureJornada.findAll({ where: { torneo_id: torneoId }, attributes: ['id'], raw: true })).map(j => j.id);
    const partidoIds = (await Partido.findAll({ where: { jornada_id: jornadaIds }, attributes: ['id'], raw: true })).map(p => p.id);

    const tarjetasRaw = partidoIds.length ? await PartidoEvento.findAll({
      where: { persona_id: personaId, partido_id: partidoIds, tipo: { [Op.in]: ['amarilla', 'roja'] } },
      attributes: ['tipo', [fn('COUNT', col('PartidoEvento.id')), 'cantidad']],
      group: ['tipo'],
      raw: true,
    }) : [];

    const stats = { amarillas: 0, rojas: 0 };
    for (const t of tarjetasRaw) {
      if (t.tipo === 'amarilla') stats.amarillas = parseInt(t.cantidad);
      if (t.tipo === 'roja')     stats.rojas = parseInt(t.cantidad);
    }

    // Antecedentes (sanciones en OTROS torneos)
    const antecedentes = await SancionDisciplinaria.findAll({
      where: { persona_id: personaId, torneo_id: { [Op.ne]: torneoId } },
      include: [{ model: Torneo, as: 'torneo', attributes: ['id', 'nombre', 'anio'] }],
      order: [['creado_en', 'DESC']],
    });

    res.json({
      success: true,
      data: { persona, stats, sanciones, antecedentes },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── POST /tribunal/sanciones ──────────────────────────────────────────────
export const crearSancion = async (req, res) => {
  try {
    const {
      torneo_id, persona_id, tipo_persona = 'jugador', motivo, partido_id,
      fechas_suspension, multa, detalle, estado = 'aplicada',
    } = req.body;

    if (!torneo_id || !persona_id || !motivo || fechas_suspension === undefined) {
      return res.status(400).json({ success: false, message: 'torneo_id, persona_id, motivo y fechas_suspension son requeridos' });
    }

    const sancion = await SancionDisciplinaria.create({
      torneo_id, persona_id, tipo_persona, motivo, partido_id: partido_id || null,
      fechas_suspension: parseInt(fechas_suspension),
      multa: multa ? parseFloat(multa) : null,
      detalle: detalle || null,
      estado,
      creada_por: req.user?.id || null,
    });

    registrarAudit({ req, accion: 'CREAR_SANCION', entidad: 'sanciones_disciplinarias', entidad_id: sancion.id, despues: sancion.toJSON() });
    res.status(201).json({ success: true, data: sancion });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── PUT /tribunal/sanciones/:id ───────────────────────────────────────────
export const actualizarSancion = async (req, res) => {
  try {
    const s = await SancionDisciplinaria.findByPk(req.params.id);
    if (!s) return res.status(404).json({ success: false, message: 'Sancion no encontrada' });

    const antes = s.toJSON();
    const campos = ['fechas_suspension', 'multa', 'detalle', 'estado', 'apelacion_texto', 'resolucion_apelacion'];
    const updates = { actualizado_en: new Date() };
    for (const c of campos) if (req.body[c] !== undefined) updates[c] = req.body[c];

    // Si resuelve apelacion, sellar
    if (req.body.resolucion_apelacion) {
      updates.resuelta_en = new Date();
      updates.resuelta_por = req.user?.id || null;
    }

    await s.update(updates);
    registrarAudit({ req, accion: 'EDITAR_SANCION', entidad: 'sanciones_disciplinarias', entidad_id: s.id, antes, despues: s.toJSON() });
    res.json({ success: true, data: s });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET /publico/torneos/:id/sanciones ────────────────────────────────────
export const sancionesPublicas = async (req, res) => {
  try {
    const torneoId = parseInt(req.params.id);
    const torneo = await Torneo.findByPk(torneoId, { attributes: ['id', 'config'] });
    if (!torneo) return res.status(404).json({ success: false, message: 'Torneo no encontrado' });
    const regla = leerReglamento(torneo);
    if (!regla.publicar_sanciones) return res.json({ success: true, data: [] });

    const sanciones = await SancionDisciplinaria.findAll({
      where: { torneo_id: torneoId, estado: { [Op.in]: ['aplicada', 'cumplida', 'apelada'] } },
      attributes: ['id', 'motivo', 'fechas_suspension', 'estado', 'creado_en', 'detalle'],
      include: [
        { model: Persona, as: 'persona', attributes: ['id', 'nombre', 'apellido', 'foto_url'] },
        { model: Partido, as: 'partido', required: false, attributes: ['id'], include: [{ model: Categoria, as: 'categoria', attributes: ['nombre'] }] },
      ],
      order: [['creado_en', 'DESC']],
    });

    res.json({ success: true, data: sanciones });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

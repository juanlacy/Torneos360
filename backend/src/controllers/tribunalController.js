import { Op, fn, col, literal } from 'sequelize';
import {
  sequelize,
  SancionDisciplinaria, Partido, PartidoEvento, FixtureJornada,
  Persona, PersonaRol, Club, Institucion, Categoria, Torneo, Rol, Usuario,
} from '../models/index.js';
import { registrarAudit } from '../services/auditService.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Recorre las sanciones en estado='aplicada' de un torneo y marca como
 * 'cumplida' aquellas donde el club del jugador ya jugo N fechas posteriores
 * al partido origen (N = fechas_suspension).
 *
 * Criterio de "posterior":
 *  - Si la jornada origen tiene fecha calendario, se usa fecha > origen.fecha
 *  - Si no, se usa el orden natural: ida{numero > origen}, o toda vuelta si
 *    origen era ida; vuelta{numero > origen} si origen era vuelta.
 */
const evaluarSancionesCumplidas = async (torneoId) => {
  try {
    const rolJugador = await Rol.findOne({ where: { codigo: 'jugador' }, attributes: ['id'] });
    if (!rolJugador) return;

    const sanciones = await SancionDisciplinaria.findAll({
      where: { torneo_id: torneoId, estado: 'aplicada', fechas_suspension: { [Op.gt]: 0 } },
      include: [{ model: Partido, as: 'partido', include: [{ model: FixtureJornada, as: 'jornada' }] }],
    });

    for (const s of sanciones) {
      if (!s.partido || !s.partido.jornada) continue;
      const jOrigen = s.partido.jornada;

      const pr = await PersonaRol.findOne({
        where: { persona_id: s.persona_id, rol_id: rolJugador.id, categoria_id: s.partido.categoria_id, activo: true },
        attributes: ['club_id'],
      });
      if (!pr?.club_id) continue;

      const jornadaWhere = { torneo_id: torneoId };
      if (jOrigen.fecha) {
        jornadaWhere.fecha = { [Op.gt]: jOrigen.fecha };
      } else if (jOrigen.fase === 'ida') {
        jornadaWhere[Op.or] = [
          { fase: 'ida', numero_jornada: { [Op.gt]: jOrigen.numero_jornada } },
          { fase: 'vuelta' },
        ];
      } else {
        jornadaWhere.fase = 'vuelta';
        jornadaWhere.numero_jornada = { [Op.gt]: jOrigen.numero_jornada };
      }

      const jugadas = await Partido.count({
        where: {
          categoria_id: s.partido.categoria_id,
          estado: 'finalizado',
          [Op.or]: [{ club_local_id: pr.club_id }, { club_visitante_id: pr.club_id }],
        },
        include: [{ model: FixtureJornada, as: 'jornada', where: jornadaWhere, attributes: [], required: true }],
      });

      if (jugadas >= s.fechas_suspension) {
        await s.update({ estado: 'cumplida', resuelta_en: s.resuelta_en || new Date() });
      }
    }
  } catch (e) {
    console.error('[evaluarSancionesCumplidas]', e.message);
  }
};

/**
 * Para una sancion, devuelve el club_id del jugador afectado segun su
 * PersonaRol activa en la categoria del partido origen. Usado para validar
 * permisos de apelacion.
 */
const clubIdJugadorSancion = async (sancion) => {
  if (!sancion) return null;
  let categoriaId = null;
  if (sancion.partido_id) {
    const p = await Partido.findByPk(sancion.partido_id, { attributes: ['categoria_id'] });
    categoriaId = p?.categoria_id;
  }
  const rolJugador = await Rol.findOne({ where: { codigo: 'jugador' }, attributes: ['id'] });
  if (!rolJugador) return null;
  const where = { persona_id: sancion.persona_id, rol_id: rolJugador.id, activo: true };
  if (categoriaId) where.categoria_id = categoriaId;
  const pr = await PersonaRol.findOne({ where, attributes: ['club_id'] });
  return pr?.club_id ?? null;
};

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

    // Evaluar cumplidas antes de calcular pendientes
    await evaluarSancionesCumplidas(torneoId);

    // Jornadas + partidos del torneo
    const jornadaIds = (await FixtureJornada.findAll({
      where: { torneo_id: torneoId }, attributes: ['id'], raw: true,
    })).map(j => j.id);
    if (!jornadaIds.length) return res.json({ success: true, data: { sanciones_propuestas: [], acumulaciones: [], rojas_sin_sancion: [] }, reglamento: regla });

    // Sanciones ya registradas — se incluyen todas menos las revocadas para
    // evitar duplicar casos. Una sancion cumplida SI cuenta como "ya procesada"
    // (no volvemos a ofrecer el mismo caso en pendientes).
    const sanciones = await SancionDisciplinaria.findAll({
      where: { torneo_id: torneoId, estado: { [Op.ne]: 'revocada' } },
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

    // Evaluar cumplidas antes de listar
    await evaluarSancionesCumplidas(torneoId);

    const where = { torneo_id: torneoId };
    if (estado)     where.estado = estado;
    if (persona_id) where.persona_id = persona_id;
    if (motivo)     where.motivo = motivo;

    const sanciones = await SancionDisciplinaria.findAll({
      where,
      include: [
        { model: Persona, as: 'persona', attributes: ['id', 'nombre', 'apellido', 'foto_url', 'dni'] },
        { model: Partido, as: 'partido', required: false, include: [
          { model: Categoria, as: 'categoria', attributes: ['id', 'nombre'] },
        ] },
      ],
      order: [['creado_en', 'DESC']],
    });

    // Enriquecer con club_id del jugador (para validar permiso de apelacion en front)
    const rolJugador = await Rol.findOne({ where: { codigo: 'jugador' }, attributes: ['id'] });
    const data = await Promise.all(sanciones.map(async (s) => {
      const plain = s.toJSON();
      if (rolJugador) {
        const where2 = { persona_id: s.persona_id, rol_id: rolJugador.id, activo: true };
        if (plain.partido?.categoria?.id) where2.categoria_id = plain.partido.categoria.id;
        const pr = await PersonaRol.findOne({ where: where2, attributes: ['club_id'] });
        plain.club_id_jugador = pr?.club_id ?? null;
      }
      return plain;
    }));

    res.json({ success: true, data });
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

    // Verificar que req.user.id exista en usuarios (puede ser stale token de un user borrado)
    let creada_por = null;
    if (req.user?.id) {
      const u = await Usuario.findByPk(req.user.id, { attributes: ['id'] });
      if (u) creada_por = u.id;
    }

    const sancion = await SancionDisciplinaria.create({
      torneo_id, persona_id, tipo_persona, motivo, partido_id: partido_id || null,
      fechas_suspension: parseInt(fechas_suspension),
      multa: multa ? parseFloat(multa) : null,
      detalle: detalle || null,
      estado,
      creada_por,
    });

    registrarAudit({ req, accion: 'CREAR_SANCION', entidad: 'sanciones_disciplinarias', entidad_id: sancion.id, despues: sancion.toJSON() });
    res.status(201).json({ success: true, data: sancion });
  } catch (error) {
    console.error('[tribunal.crearSancion]', error.name, error.message, error.errors || '', 'body:', JSON.stringify(req.body));
    res.status(500).json({ success: false, message: error.message, name: error.name, errors: error.errors?.map(e => ({ path: e.path, message: e.message, value: e.value })) });
  }
};

// ─── PUT /tribunal/sanciones/:id ───────────────────────────────────────────
export const actualizarSancion = async (req, res) => {
  try {
    const s = await SancionDisciplinaria.findByPk(req.params.id);
    if (!s) return res.status(404).json({ success: false, message: 'Sancion no encontrada' });

    const esApelacion = req.body.estado === 'apelada' || req.body.apelacion_texto !== undefined;
    const esResolucion = !!req.body.resolucion_apelacion;
    const esAdmin = req.isAdminSistema || req.isAdminTorneo;

    // Apelacion: solo el delegado del club del jugador (o admin) puede registrarla
    if (esApelacion && !esResolucion && !esAdmin) {
      const userClubId = req.user?.club_id;
      const userRol = req.user?.rol;
      const isDelegado = userRol === 'delegado' || (req.rolesActivos || []).includes('delegado');
      const clubJugador = await clubIdJugadorSancion(s);

      if (!isDelegado || !userClubId || !clubJugador || userClubId !== clubJugador) {
        return res.status(403).json({
          success: false,
          message: 'Solo el delegado del club del jugador sancionado puede registrar una apelacion',
        });
      }
    }

    const antes = s.toJSON();
    const campos = ['fechas_suspension', 'multa', 'detalle', 'estado', 'apelacion_texto', 'resolucion_apelacion'];
    const updates = { actualizado_en: new Date() };
    for (const c of campos) if (req.body[c] !== undefined) updates[c] = req.body[c];

    // Si resuelve apelacion, sellar
    if (esResolucion) {
      updates.resuelta_en = new Date();
      let resuelta_por = null;
      if (req.user?.id) {
        const u = await Usuario.findByPk(req.user.id, { attributes: ['id'] });
        if (u) resuelta_por = u.id;
      }
      updates.resuelta_por = resuelta_por;
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

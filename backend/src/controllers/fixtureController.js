import { FixtureJornada, Partido, Club, Categoria, Zona, Persona, Institucion } from '../models/index.js';
import { generarFixture } from '../services/fixtureGeneratorService.js';
import { registrarAudit } from '../services/auditService.js';
import { Op, fn, col } from 'sequelize';

// Horario fijo por categoria (anio_nacimiento -> hora)
const HORARIOS_CATEGORIA = {
  2013: '14:00', 2019: '15:00', 2014: '16:00', 2018: '17:00',
  2017: '18:00', 2016: '19:00', 2015: '20:00',
};

// POST /fixture/generar/:torneoId
export const generar = async (req, res) => {
  try {
    const torneoId = parseInt(req.params.torneoId);

    // Verificar que no exista fixture previo
    const existente = await FixtureJornada.count({ where: { torneo_id: torneoId } });
    if (existente > 0) {
      return res.status(400).json({ success: false, message: 'Ya existe un fixture para este torneo. Elimina el existente primero.' });
    }

    const resultado = await generarFixture(torneoId);
    registrarAudit({ req, accion: 'GENERAR_FIXTURE', entidad: 'torneos', entidad_id: torneoId, despues: resultado });

    res.status(201).json({
      success: true,
      data: resultado,
      message: `Fixture generado: ${resultado.jornadas} jornadas, ${resultado.partidos} partidos`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /fixture/:torneoId  (eliminar fixture completo)
export const eliminar = async (req, res) => {
  try {
    const torneoId = parseInt(req.params.torneoId);
    const jornadas = await FixtureJornada.findAll({ where: { torneo_id: torneoId }, attributes: ['id'] });
    const jornadaIds = jornadas.map(j => j.id);

    if (jornadaIds.length) {
      await Partido.destroy({ where: { jornada_id: jornadaIds } });
    }
    await FixtureJornada.destroy({ where: { torneo_id: torneoId } });

    registrarAudit({ req, accion: 'ELIMINAR_FIXTURE', entidad: 'torneos', entidad_id: torneoId });
    res.json({ success: true, message: 'Fixture eliminado' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /fixture/:torneoId/jornadas
export const listarJornadas = async (req, res) => {
  try {
    const { zona_id, fase } = req.query;
    const where = { torneo_id: parseInt(req.params.torneoId) };
    if (zona_id) where.zona_id = zona_id;
    if (fase) where.fase = fase;

    const jornadas = await FixtureJornada.findAll({
      where,
      include: [{ model: Zona, as: 'zona', attributes: ['id', 'nombre', 'color'] }],
      order: [['fase', 'ASC'], ['numero_jornada', 'ASC']],
    });

    // Precomputar estado visual en base a los partidos (1 query agregada)
    const jornadaIds = jornadas.map(j => j.id);
    const counts = jornadaIds.length ? await Partido.findAll({
      where: { jornada_id: jornadaIds },
      attributes: ['jornada_id', 'estado', [fn('COUNT', col('id')), 'cantidad']],
      group: ['jornada_id', 'estado'],
      raw: true,
    }) : [];

    const byJornada = new Map();
    for (const c of counts) {
      if (!byJornada.has(c.jornada_id)) byJornada.set(c.jornada_id, { programado: 0, en_curso: 0, finalizado: 0, suspendido: 0, total: 0 });
      const entry = byJornada.get(c.jornada_id);
      const n = parseInt(c.cantidad);
      entry[c.estado] = n;
      entry.total += n;
    }

    const data = jornadas.map(j => {
      const plain = j.toJSON();
      const s = byJornada.get(j.id) || { total: 0, en_curso: 0, finalizado: 0, programado: 0 };
      let estadoVisual = 'programada';
      if (s.total > 0) {
        if (s.finalizado === s.total)                                estadoVisual = 'finalizada';
        else if (s.en_curso > 0 || (s.finalizado > 0 && s.finalizado < s.total)) estadoVisual = 'en_curso';
        else                                                         estadoVisual = 'programada';
      }
      plain._estadoVisual = estadoVisual;
      plain._partidosCount = s;
      return plain;
    });

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /fixture/jornada/:jornadaId/partidos
// GET /fixture/:torneoId/partidos?jornada_id=X
// Ruta alternativa que acepta jornada_id como query param
export const partidosPorTorneo = async (req, res) => {
  try {
    const { jornada_id, categoria_id } = req.query;
    if (!jornada_id) {
      return res.status(400).json({ success: false, message: 'jornada_id es requerido' });
    }
    // Redirigir a la logica existente
    req.params.jornadaId = jornada_id;
    return partidosPorJornada(req, res);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const partidosPorJornada = async (req, res) => {
  try {
    const { categoria_id } = req.query;
    const where = { jornada_id: parseInt(req.params.jornadaId) };
    if (categoria_id) where.categoria_id = categoria_id;

    const partidos = await Partido.findAll({
      where,
      include: [
        { model: Club, as: 'clubLocal', attributes: ['id', 'sufijo', 'zona_id', 'nombre', 'nombre_corto', 'escudo_url', 'color_primario', 'color_secundario'], include: [{ model: Institucion, as: 'institucion' }] },
        { model: Club, as: 'clubVisitante', attributes: ['id', 'sufijo', 'zona_id', 'nombre', 'nombre_corto', 'escudo_url', 'color_primario', 'color_secundario'], include: [{ model: Institucion, as: 'institucion' }] },
        { model: Categoria, as: 'categoria', attributes: ['id', 'nombre', 'anio_nacimiento', 'es_preliminar'] },
        { model: Persona, as: 'arbitro', attributes: ['id', 'nombre', 'apellido'] },
      ],
      order: [['categoria_id', 'ASC']],
    });
    res.json({ success: true, data: partidos });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /fixture/jornada/:jornadaId
export const actualizarJornada = async (req, res) => {
  try {
    const jornada = await FixtureJornada.findByPk(req.params.jornadaId);
    if (!jornada) return res.status(404).json({ success: false, message: 'Jornada no encontrada' });

    const { fecha, estado } = req.body;
    if (fecha !== undefined) jornada.fecha = fecha;
    if (estado !== undefined) jornada.estado = estado;
    jornada.actualizado_en = new Date();
    await jornada.save();

    res.json({ success: true, data: jornada });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// Creacion manual de fixture
// ═══════════════════════════════════════════════════════════════════════════

// POST /fixture/jornada  (crear jornada manualmente)
export const crearJornada = async (req, res) => {
  try {
    const { torneo_id, zona_id, numero_jornada, fase, fecha } = req.body;
    if (!torneo_id || !numero_jornada) {
      return res.status(400).json({ success: false, message: 'torneo_id y numero_jornada son requeridos' });
    }

    const jornada = await FixtureJornada.create({
      torneo_id, zona_id: zona_id || null,
      numero_jornada, fase: fase || 'ida', fecha: fecha || null,
    });

    res.status(201).json({ success: true, data: jornada });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /fixture/jornada/:jornadaId
export const eliminarJornada = async (req, res) => {
  try {
    await Partido.destroy({ where: { jornada_id: req.params.jornadaId } });
    const deleted = await FixtureJornada.destroy({ where: { id: req.params.jornadaId } });
    if (!deleted) return res.status(404).json({ success: false, message: 'Jornada no encontrada' });
    res.json({ success: true, message: 'Jornada y sus partidos eliminados' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /fixture/jornada/:jornadaId/enfrentamiento
 *
 * Agrega un cruce (enfrentamiento) a la jornada.
 * Genera automaticamente 7 partidos (uno por categoria) con horarios fijos.
 *
 * Body: { club_local_id, club_visitante_id }
 */
export const agregarEnfrentamiento = async (req, res) => {
  try {
    const jornadaId = parseInt(req.params.jornadaId);
    const { club_local_id, club_visitante_id, arbitro_id } = req.body;

    if (!club_local_id || !club_visitante_id) {
      return res.status(400).json({ success: false, message: 'club_local_id y club_visitante_id son requeridos' });
    }
    if (club_local_id === club_visitante_id) {
      return res.status(400).json({ success: false, message: 'Un club no puede jugar contra si mismo' });
    }

    const jornada = await FixtureJornada.findByPk(jornadaId);
    if (!jornada) return res.status(404).json({ success: false, message: 'Jornada no encontrada' });

    // Verificar que no exista ya este cruce en la jornada
    const yaExiste = await Partido.findOne({
      where: {
        jornada_id: jornadaId,
        [Op.or]: [
          { club_local_id, club_visitante_id },
          { club_local_id: club_visitante_id, club_visitante_id: club_local_id },
        ],
      },
    });
    if (yaExiste) {
      return res.status(409).json({ success: false, message: 'Este cruce ya existe en la jornada' });
    }

    // Obtener categorias del torneo
    const categorias = await Categoria.findAll({
      where: { torneo_id: jornada.torneo_id },
      order: [['orden', 'ASC']],
    });

    // Crear un partido por categoria con horario asignado
    const partidos = [];
    for (const cat of categorias) {
      const hora = HORARIOS_CATEGORIA[cat.anio_nacimiento];
      let horaInicio = null;
      if (hora && jornada.fecha) {
        horaInicio = new Date(`${jornada.fecha}T${hora}:00`);
      }

      const partido = await Partido.create({
        jornada_id: jornadaId,
        categoria_id: cat.id,
        club_local_id,
        club_visitante_id,
        arbitro_id: arbitro_id || null,
        cancha: req.body.cancha || null,
        hora_inicio: horaInicio,
      });
      partidos.push(partido);
    }

    // Recargar con includes
    const partidosCompletos = await Partido.findAll({
      where: { id: partidos.map(p => p.id) },
      include: [
        { model: Club, as: 'clubLocal', attributes: ['id', 'sufijo', 'zona_id', 'nombre', 'nombre_corto', 'escudo_url', 'color_primario', 'color_secundario'], include: [{ model: Institucion, as: 'institucion' }] },
        { model: Club, as: 'clubVisitante', attributes: ['id', 'sufijo', 'zona_id', 'nombre', 'nombre_corto', 'escudo_url', 'color_primario', 'color_secundario'], include: [{ model: Institucion, as: 'institucion' }] },
        { model: Categoria, as: 'categoria', attributes: ['id', 'nombre', 'anio_nacimiento'] },
      ],
      order: [['hora_inicio', 'ASC']],
    });

    registrarAudit({ req, accion: 'CREAR_ENFRENTAMIENTO', entidad: 'fixture_jornadas', entidad_id: jornadaId,
      despues: { club_local_id, club_visitante_id, partidos: partidos.length } });

    res.status(201).json({
      success: true,
      data: partidosCompletos,
      message: `Cruce creado: ${categorias.length} partidos generados con horarios`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /fixture/jornada/:jornadaId/enfrentamiento  (eliminar un cruce)
// Body: { club_local_id, club_visitante_id }
export const eliminarEnfrentamiento = async (req, res) => {
  try {
    const jornadaId = parseInt(req.params.jornadaId);
    const { club_local_id, club_visitante_id } = req.body;

    const deleted = await Partido.destroy({
      where: {
        jornada_id: jornadaId,
        club_local_id, club_visitante_id,
      },
    });

    res.json({ success: true, message: `${deleted} partidos eliminados` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /fixture/horarios  (devuelve los horarios fijos por categoria)
export const getHorarios = (req, res) => {
  res.json({ success: true, data: HORARIOS_CATEGORIA });
};

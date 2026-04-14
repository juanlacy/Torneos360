import { FixtureJornada, Partido, Club, Categoria, Zona, Arbitro, Veedor } from '../models/index.js';
import { generarFixture } from '../services/fixtureGeneratorService.js';
import { registrarAudit } from '../services/auditService.js';

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
    res.json({ success: true, data: jornadas });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /fixture/jornada/:jornadaId/partidos
export const partidosPorJornada = async (req, res) => {
  try {
    const { categoria_id } = req.query;
    const where = { jornada_id: parseInt(req.params.jornadaId) };
    if (categoria_id) where.categoria_id = categoria_id;

    const partidos = await Partido.findAll({
      where,
      include: [
        { model: Club, as: 'clubLocal', attributes: ['id', 'nombre', 'nombre_corto', 'escudo_url', 'color_primario'] },
        { model: Club, as: 'clubVisitante', attributes: ['id', 'nombre', 'nombre_corto', 'escudo_url', 'color_primario'] },
        { model: Categoria, as: 'categoria', attributes: ['id', 'nombre', 'anio_nacimiento', 'es_preliminar'] },
        { model: Arbitro, as: 'arbitro', attributes: ['id', 'nombre', 'apellido'] },
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

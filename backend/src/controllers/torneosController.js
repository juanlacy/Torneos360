import { Torneo, Zona, Categoria, Club } from '../models/index.js';
import { registrarAudit } from '../services/auditService.js';

// GET /torneos
export const listar = async (req, res) => {
  try {
    const torneos = await Torneo.findAll({
      order: [['anio', 'DESC']],
      include: [
        { model: Zona, as: 'zonas', attributes: ['id', 'nombre', 'color'] },
        { model: Categoria, as: 'categorias', attributes: ['id', 'nombre', 'anio_nacimiento', 'es_preliminar', 'orden'] },
      ],
    });
    res.json({ success: true, data: torneos });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /torneos/:id
export const obtener = async (req, res) => {
  try {
    const torneo = await Torneo.findByPk(req.params.id, {
      include: [
        { model: Zona, as: 'zonas', include: [{ model: Club, as: 'clubes', attributes: ['id', 'nombre', 'nombre_corto', 'escudo_url'] }] },
        { model: Categoria, as: 'categorias', order: [['orden', 'ASC']] },
        { model: Club, as: 'clubes', attributes: ['id', 'nombre', 'nombre_corto', 'escudo_url', 'zona_id', 'activo'] },
      ],
    });
    if (!torneo) return res.status(404).json({ success: false, message: 'Torneo no encontrado' });
    res.json({ success: true, data: torneo });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /torneos
export const crear = async (req, res) => {
  try {
    const { nombre, anio, fecha_inicio, fecha_fin, config } = req.body;
    if (!nombre || !anio) return res.status(400).json({ success: false, message: 'nombre y anio son requeridos' });

    const torneo = await Torneo.create({ nombre, anio, fecha_inicio, fecha_fin, config });
    registrarAudit({ req, accion: 'CREAR', entidad: 'torneos', entidad_id: torneo.id, despues: torneo.toJSON() });
    res.status(201).json({ success: true, data: torneo });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /torneos/:id
export const actualizar = async (req, res) => {
  try {
    const torneo = await Torneo.findByPk(req.params.id);
    if (!torneo) return res.status(404).json({ success: false, message: 'Torneo no encontrado' });

    const antes = torneo.toJSON();
    const { nombre, anio, fecha_inicio, fecha_fin, estado, config } = req.body;
    await torneo.update({
      ...(nombre !== undefined && { nombre }),
      ...(anio !== undefined && { anio }),
      ...(fecha_inicio !== undefined && { fecha_inicio }),
      ...(fecha_fin !== undefined && { fecha_fin }),
      ...(estado !== undefined && { estado }),
      ...(config !== undefined && { config }),
      actualizado_en: new Date(),
    });

    registrarAudit({ req, accion: 'EDITAR', entidad: 'torneos', entidad_id: torneo.id, antes, despues: torneo.toJSON() });
    res.json({ success: true, data: torneo });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /torneos/:id/generar-categorias  (genera las 7 categorias del anio)
export const generarCategorias = async (req, res) => {
  try {
    const torneo = await Torneo.findByPk(req.params.id);
    if (!torneo) return res.status(404).json({ success: false, message: 'Torneo no encontrado' });

    const anio = torneo.anio;
    const categoriasData = [
      { nombre: `${anio - 13}`, anio_nacimiento: anio - 13, es_preliminar: false, orden: 1 },
      { nombre: `${anio - 12}`, anio_nacimiento: anio - 12, es_preliminar: false, orden: 2 },
      { nombre: `${anio - 11}`, anio_nacimiento: anio - 11, es_preliminar: false, orden: 3 },
      { nombre: `${anio - 10}`, anio_nacimiento: anio - 10, es_preliminar: false, orden: 4 },
      { nombre: `${anio - 9}`,  anio_nacimiento: anio - 9,  es_preliminar: false, orden: 5 },
      { nombre: `${anio - 8}`,  anio_nacimiento: anio - 8,  es_preliminar: false, orden: 6 },
      { nombre: `Preliminar ${anio - 7}`, anio_nacimiento: anio - 7, es_preliminar: true, orden: 7 },
    ];

    const categorias = await Categoria.bulkCreate(
      categoriasData.map(c => ({ ...c, torneo_id: torneo.id })),
      { ignoreDuplicates: true }
    );

    res.status(201).json({ success: true, data: categorias, message: `${categorias.length} categorias creadas` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /torneos/:id/zonas
export const crearZona = async (req, res) => {
  try {
    const { nombre, color } = req.body;
    if (!nombre) return res.status(400).json({ success: false, message: 'nombre es requerido' });

    const zona = await Zona.create({ torneo_id: parseInt(req.params.id), nombre, color });
    res.status(201).json({ success: true, data: zona });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /torneos/:torneoId/zonas/:id
export const eliminarZona = async (req, res) => {
  try {
    const deleted = await Zona.destroy({ where: { id: req.params.id, torneo_id: req.params.torneoId } });
    if (!deleted) return res.status(404).json({ success: false, message: 'Zona no encontrada' });
    res.json({ success: true, message: 'Zona eliminada' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

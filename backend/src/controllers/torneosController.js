import { Torneo, Zona, Categoria, Club } from '../models/index.js';
import { registrarAudit } from '../services/auditService.js';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname, join, extname } from 'path';
import { unlinkSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

// Multer para logos de torneo
const logoStorage = multer.diskStorage({
  destination: join(__dirname, '..', '..', 'uploads', 'torneos'),
  filename: (req, file, cb) => cb(null, `torneo-${req.params.id}-${Date.now()}${extname(file.originalname)}`),
});
export const uploadLogo = multer({
  storage: logoStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpeg|png|webp|svg\+xml)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Solo imagenes JPG, PNG, WebP o SVG'));
  },
}).single('logo');

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

// ═══════════════════════════════════════════════════════════════════════════
// Branding del torneo
// ═══════════════════════════════════════════════════════════════════════════

// GET /torneos/:id/branding  (publico — para que el frontend aplique colores)
export const getBranding = async (req, res) => {
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

// PUT /torneos/:id/branding
export const updateBranding = async (req, res) => {
  try {
    const torneo = await Torneo.findByPk(req.params.id);
    if (!torneo) return res.status(404).json({ success: false, message: 'Torneo no encontrado' });

    const { color_primario, color_secundario, color_acento, logo_url, favicon_url } = req.body;
    const updates = { actualizado_en: new Date() };
    if (color_primario !== undefined) updates.color_primario = color_primario;
    if (color_secundario !== undefined) updates.color_secundario = color_secundario;
    if (color_acento !== undefined) updates.color_acento = color_acento;
    if (logo_url !== undefined) updates.logo_url = logo_url;
    if (favicon_url !== undefined) updates.favicon_url = favicon_url;

    await torneo.update(updates);
    registrarAudit({ req, accion: 'EDITAR_BRANDING', entidad: 'torneos', entidad_id: torneo.id, despues: updates });

    res.json({ success: true, data: {
      id: torneo.id, nombre: torneo.nombre,
      logo_url: torneo.logo_url, favicon_url: torneo.favicon_url,
      color_primario: torneo.color_primario, color_secundario: torneo.color_secundario, color_acento: torneo.color_acento,
    }});
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /torneos/:id/upload-logo
export const subirLogo = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'Archivo requerido' });

    const torneo = await Torneo.findByPk(req.params.id);
    if (!torneo) return res.status(404).json({ success: false, message: 'Torneo no encontrado' });

    // Borrar logo anterior si existe
    if (torneo.logo_url) {
      const oldPath = join(__dirname, '..', '..', torneo.logo_url);
      if (existsSync(oldPath)) try { unlinkSync(oldPath); } catch {}
    }

    const logoUrl = `/uploads/torneos/${req.file.filename}`;
    await torneo.update({ logo_url: logoUrl, actualizado_en: new Date() });

    res.json({ success: true, data: { logo_url: logoUrl } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

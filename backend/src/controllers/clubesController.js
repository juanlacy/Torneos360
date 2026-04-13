import { Club, Zona, Jugador, Staff, Categoria } from '../models/index.js';
import { clubWhere, tieneAccesoAlClub } from '../middleware/authMiddleware.js';
import { registrarAudit } from '../services/auditService.js';
import { Op } from 'sequelize';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname, join, extname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

// Multer para escudos
const escudoStorage = multer.diskStorage({
  destination: join(__dirname, '..', '..', 'uploads', 'escudos'),
  filename: (req, file, cb) => cb(null, `club-${Date.now()}${extname(file.originalname)}`),
});
export const uploadEscudo = multer({
  storage: escudoStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpeg|png|webp|svg\+xml)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Solo imagenes JPG, PNG, WebP o SVG'));
  },
}).single('escudo');

// GET /clubes
export const listar = async (req, res) => {
  try {
    const { torneo_id, zona_id, search } = req.query;
    const where = { ...clubWhere(req) };
    if (torneo_id) where.torneo_id = torneo_id;
    if (zona_id) where.zona_id = zona_id;
    if (search) {
      where[Op.or] = [
        { nombre: { [Op.iLike]: `%${search}%` } },
        { nombre_corto: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const clubes = await Club.findAll({
      where,
      include: [{ model: Zona, as: 'zona', attributes: ['id', 'nombre', 'color'] }],
      order: [['nombre', 'ASC']],
    });
    res.json({ success: true, data: clubes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /clubes/:id
export const obtener = async (req, res) => {
  try {
    const club = await Club.findByPk(req.params.id, {
      include: [
        { model: Zona, as: 'zona', attributes: ['id', 'nombre', 'color'] },
        { model: Staff, as: 'staff', where: { activo: true }, required: false },
      ],
    });
    if (!club) return res.status(404).json({ success: false, message: 'Club no encontrado' });
    if (!tieneAccesoAlClub(req, club.id) && !req.isAdminSistema && !req.isAdminTorneo) {
      // Publico y otros roles pueden ver datos basicos
    }
    res.json({ success: true, data: club });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /clubes/:id/jugadores
export const jugadoresPorClub = async (req, res) => {
  try {
    const { categoria_id, estado_fichaje } = req.query;
    const where = { club_id: req.params.id, activo: true };
    if (categoria_id) where.categoria_id = categoria_id;
    if (estado_fichaje) where.estado_fichaje = estado_fichaje;

    const jugadores = await Jugador.findAll({
      where,
      include: [{ model: Categoria, as: 'categoria', attributes: ['id', 'nombre', 'anio_nacimiento'] }],
      order: [['apellido', 'ASC'], ['nombre', 'ASC']],
    });
    res.json({ success: true, data: jugadores });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /clubes
export const crear = async (req, res) => {
  try {
    const { torneo_id, zona_id, nombre, nombre_corto, color_primario, color_secundario, contacto } = req.body;
    if (!torneo_id || !nombre) return res.status(400).json({ success: false, message: 'torneo_id y nombre son requeridos' });

    const club = await Club.create({ torneo_id, zona_id, nombre, nombre_corto, color_primario, color_secundario, contacto });
    registrarAudit({ req, accion: 'CREAR', entidad: 'clubes', entidad_id: club.id, despues: club.toJSON() });
    res.status(201).json({ success: true, data: club });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /clubes/:id
export const actualizar = async (req, res) => {
  try {
    const club = await Club.findByPk(req.params.id);
    if (!club) return res.status(404).json({ success: false, message: 'Club no encontrado' });

    const antes = club.toJSON();
    const campos = ['nombre', 'nombre_corto', 'zona_id', 'color_primario', 'color_secundario', 'contacto', 'activo'];
    const updates = { actualizado_en: new Date() };
    for (const c of campos) {
      if (req.body[c] !== undefined) updates[c] = req.body[c];
    }

    await club.update(updates);
    registrarAudit({ req, accion: 'EDITAR', entidad: 'clubes', entidad_id: club.id, antes, despues: club.toJSON() });
    res.json({ success: true, data: club });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /clubes/:id/escudo
export const subirEscudo = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'Archivo requerido' });
    const escudoUrl = `/uploads/escudos/${req.file.filename}`;
    await Club.update({ escudo_url: escudoUrl, actualizado_en: new Date() }, { where: { id: req.params.id } });
    res.json({ success: true, data: { escudo_url: escudoUrl } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

import { Jugador, Club, Categoria } from '../models/index.js';
import { clubWhere, tieneAccesoAlClub } from '../middleware/authMiddleware.js';
import { registrarAudit } from '../services/auditService.js';
import { Op } from 'sequelize';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname, join, extname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

// Multer para fotos de jugadores
const fotoStorage = multer.diskStorage({
  destination: join(__dirname, '..', '..', 'uploads', 'jugadores'),
  filename: (req, file, cb) => cb(null, `jugador-${Date.now()}${extname(file.originalname)}`),
});
export const uploadFoto = multer({
  storage: fotoStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpeg|png|webp)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Solo imagenes JPG, PNG o WebP'));
  },
}).single('foto');

// GET /jugadores
export const listar = async (req, res) => {
  try {
    const { club_id, categoria_id, estado_fichaje, search, torneo_id } = req.query;
    const where = { activo: true };

    // Club scoping para delegados
    const clubScope = clubWhere(req);
    if (clubScope.club_id) where.club_id = clubScope.club_id;
    else if (club_id) where.club_id = club_id;

    if (categoria_id) where.categoria_id = categoria_id;
    if (estado_fichaje) where.estado_fichaje = estado_fichaje;
    if (search) {
      where[Op.or] = [
        { nombre: { [Op.iLike]: `%${search}%` } },
        { apellido: { [Op.iLike]: `%${search}%` } },
        { dni: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const includeClub = { model: Club, as: 'club', attributes: ['id', 'nombre', 'nombre_corto', 'escudo_url'] };
    if (torneo_id) includeClub.where = { torneo_id };

    const jugadores = await Jugador.findAll({
      where,
      include: [
        includeClub,
        { model: Categoria, as: 'categoria', attributes: ['id', 'nombre', 'anio_nacimiento'] },
      ],
      order: [['apellido', 'ASC'], ['nombre', 'ASC']],
    });
    res.json({ success: true, data: jugadores });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /jugadores/:id
export const obtener = async (req, res) => {
  try {
    const jugador = await Jugador.findByPk(req.params.id, {
      include: [
        { model: Club, as: 'club', attributes: ['id', 'nombre', 'nombre_corto', 'escudo_url'] },
        { model: Categoria, as: 'categoria', attributes: ['id', 'nombre', 'anio_nacimiento'] },
      ],
    });
    if (!jugador) return res.status(404).json({ success: false, message: 'Jugador no encontrado' });
    res.json({ success: true, data: jugador });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /jugadores
export const crear = async (req, res) => {
  try {
    const { club_id, categoria_id, nombre, apellido, dni, fecha_nacimiento, numero_camiseta, ficha_medica, datos_personales, observaciones } = req.body;

    if (!club_id || !categoria_id || !nombre || !apellido || !dni || !fecha_nacimiento) {
      return res.status(400).json({ success: false, message: 'club_id, categoria_id, nombre, apellido, dni y fecha_nacimiento son requeridos' });
    }

    // Verificar que el delegado tiene acceso al club
    if (!tieneAccesoAlClub(req, parseInt(club_id))) {
      return res.status(403).json({ success: false, message: 'No tenes acceso a este club' });
    }

    // Verificar DNI unico en el torneo
    const club = await Club.findByPk(club_id, { attributes: ['torneo_id'] });
    const existente = await Jugador.findOne({
      where: { dni, activo: true },
      include: [{ model: Club, as: 'club', where: { torneo_id: club.torneo_id }, attributes: [] }],
    });
    if (existente) {
      return res.status(409).json({ success: false, message: `Ya existe un jugador con DNI ${dni} en este torneo` });
    }

    // Verificar limite de jugadores por categoria
    const categoria = await Categoria.findByPk(categoria_id);
    const count = await Jugador.count({ where: { club_id, categoria_id, activo: true } });
    if (count >= categoria.max_jugadores) {
      return res.status(400).json({ success: false, message: `Se alcanzo el maximo de ${categoria.max_jugadores} jugadores para esta categoria` });
    }

    // Validar edad vs categoria
    const nacimiento = new Date(fecha_nacimiento);
    if (nacimiento.getFullYear() !== categoria.anio_nacimiento) {
      return res.status(400).json({ success: false, message: `El anio de nacimiento (${nacimiento.getFullYear()}) no coincide con la categoria ${categoria.nombre} (${categoria.anio_nacimiento})` });
    }

    const jugador = await Jugador.create({
      club_id, categoria_id, nombre: nombre.trim(), apellido: apellido.trim(),
      dni: dni.trim(), fecha_nacimiento, numero_camiseta,
      ficha_medica: ficha_medica || {}, datos_personales: datos_personales || {},
      observaciones, estado_fichaje: 'pendiente',
    });

    registrarAudit({ req, accion: 'CREAR', entidad: 'jugadores', entidad_id: jugador.id, despues: jugador.toJSON() });
    res.status(201).json({ success: true, data: jugador });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /jugadores/:id
export const actualizar = async (req, res) => {
  try {
    const jugador = await Jugador.findByPk(req.params.id);
    if (!jugador) return res.status(404).json({ success: false, message: 'Jugador no encontrado' });

    if (!tieneAccesoAlClub(req, jugador.club_id)) {
      return res.status(403).json({ success: false, message: 'No tenes acceso a este jugador' });
    }

    const antes = jugador.toJSON();
    const campos = ['nombre', 'apellido', 'dni', 'fecha_nacimiento', 'numero_camiseta', 'ficha_medica', 'datos_personales', 'observaciones', 'foto_url', 'activo'];
    const updates = { actualizado_en: new Date() };
    for (const c of campos) {
      if (req.body[c] !== undefined) updates[c] = req.body[c];
    }

    await jugador.update(updates);
    registrarAudit({ req, accion: 'EDITAR', entidad: 'jugadores', entidad_id: jugador.id, antes, despues: jugador.toJSON() });
    res.json({ success: true, data: jugador });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /jugadores/:id/fichaje  (aprobar/rechazar)
export const cambiarEstadoFichaje = async (req, res) => {
  try {
    const { estado } = req.body;
    if (!['aprobado', 'rechazado', 'pendiente', 'baja'].includes(estado)) {
      return res.status(400).json({ success: false, message: 'Estado invalido' });
    }

    const jugador = await Jugador.findByPk(req.params.id);
    if (!jugador) return res.status(404).json({ success: false, message: 'Jugador no encontrado' });

    const antes = { estado_fichaje: jugador.estado_fichaje };
    await jugador.update({ estado_fichaje: estado, actualizado_en: new Date() });

    registrarAudit({ req, accion: 'CAMBIO_FICHAJE', entidad: 'jugadores', entidad_id: jugador.id, antes, despues: { estado_fichaje: estado } });
    res.json({ success: true, data: jugador, message: `Fichaje ${estado}` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /jugadores/:id/foto
export const subirFoto = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'Archivo requerido' });
    const fotoUrl = `/uploads/jugadores/${req.file.filename}`;
    await Jugador.update({ foto_url: fotoUrl, actualizado_en: new Date() }, { where: { id: req.params.id } });
    res.json({ success: true, data: { foto_url: fotoUrl } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

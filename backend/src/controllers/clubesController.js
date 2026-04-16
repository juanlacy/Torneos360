import { Club, Zona, Institucion, Persona, PersonaRol, Rol, Categoria } from '../models/index.js';
import { clubWhere, tieneAccesoAlClub } from '../middleware/authMiddleware.js';
import { registrarAudit } from '../services/auditService.js';
import { Op } from 'sequelize';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname, join, extname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

// Multer para escudos (ahora apuntan a la institucion)
const escudoStorage = multer.diskStorage({
  destination: join(__dirname, '..', '..', 'uploads', 'escudos'),
  filename: (req, file, cb) => cb(null, `institucion-${Date.now()}${extname(file.originalname)}`),
});
export const uploadEscudo = multer({
  storage: escudoStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpeg|png|webp|svg\+xml)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Solo imagenes JPG, PNG, WebP o SVG'));
  },
}).single('escudo');

/**
 * Aplana un Club con su Institucion incluida para mantener
 * compatibilidad con el frontend existente (que espera
 * nombre, nombre_corto, escudo_url, etc a nivel club).
 */
const aplanar = (club) => {
  if (!club) return null;
  const plain = club.toJSON ? club.toJSON() : club;
  const inst = plain.institucion;
  return {
    ...plain,
    nombre: plain.nombre_override || inst?.nombre || null,
    nombre_corto: inst?.nombre_corto || null,
    escudo_url: inst?.escudo_url || null,
    color_primario: inst?.color_primario || null,
    color_secundario: inst?.color_secundario || null,
    contacto: inst?.contacto || {},
  };
};

const incInst = { model: Institucion, as: 'institucion' };

// ─── GET /clubes ─────────────────────────────────────────────────────────────
export const listar = async (req, res) => {
  try {
    const { torneo_id, zona_id, search } = req.query;
    // Clubes: lectura abierta (todos los del torneo). El scope por club_id
    // aplica solo a operaciones de escritura, no a listar.
    const where = {};
    if (torneo_id) where.torneo_id = torneo_id;
    if (zona_id) where.zona_id = zona_id;

    // Filtrado por busqueda en el nombre de la institucion
    const instWhere = {};
    if (search) {
      instWhere[Op.or] = [
        { nombre: { [Op.iLike]: `%${search}%` } },
        { nombre_corto: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const clubes = await Club.findAll({
      where,
      include: [
        { model: Zona, as: 'zona', attributes: ['id', 'nombre', 'color'] },
        { model: Institucion, as: 'institucion', where: instWhere, required: true },
      ],
      order: [[{ model: Institucion, as: 'institucion' }, 'nombre', 'ASC']],
    });

    res.json({ success: true, data: clubes.map(aplanar) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET /clubes/:id ────────────────────────────────────────────────────────
export const obtener = async (req, res) => {
  try {
    const club = await Club.findByPk(req.params.id, {
      include: [
        { model: Zona, as: 'zona', attributes: ['id', 'nombre', 'color'] },
        incInst,
        {
          model: PersonaRol, as: 'miembros',
          where: { activo: true },
          required: false,
          include: [
            { model: Persona, as: 'persona', attributes: ['id', 'nombre', 'apellido', 'dni', 'foto_url'] },
            { model: Rol, as: 'rol', where: { categoria_fn: 'staff_club' }, required: true, attributes: ['id', 'codigo', 'nombre', 'icono', 'color'] },
          ],
        },
      ],
    });
    if (!club) return res.status(404).json({ success: false, message: 'Club no encontrado' });
    res.json({ success: true, data: aplanar(club) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET /clubes/:id/jugadores ──────────────────────────────────────────────
export const jugadoresPorClub = async (req, res) => {
  try {
    const { categoria_id, estado_fichaje } = req.query;

    const rolWhere = { club_id: req.params.id, activo: true };
    if (categoria_id) rolWhere.categoria_id = categoria_id;
    if (estado_fichaje) rolWhere.estado_fichaje = estado_fichaje;

    const personas = await Persona.findAll({
      where: { activo: true },
      include: [{
        model: PersonaRol, as: 'roles_asignados',
        where: rolWhere,
        required: true,
        include: [
          { model: Rol, as: 'rol', where: { codigo: 'jugador' }, required: true },
          { model: Categoria, as: 'categoria', attributes: ['id', 'nombre', 'anio_nacimiento'] },
        ],
      }],
      order: [['apellido', 'ASC'], ['nombre', 'ASC']],
    });

    const jugadores = personas.map(p => {
      const ra = p.roles_asignados[0];
      return {
        id: ra.id,
        persona_id: p.id,
        nombre: p.nombre,
        apellido: p.apellido,
        dni: p.dni,
        fecha_nacimiento: p.fecha_nacimiento,
        foto_url: p.foto_url,
        numero_camiseta: ra.numero_camiseta,
        estado_fichaje: ra.estado_fichaje,
        categoria: ra.categoria,
      };
    });
    res.json({ success: true, data: jugadores });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── POST /clubes ──────────────────────────────────────────────────────────
// Acepta: institucion_id directo, O los campos visuales (crea institucion nueva)
export const crear = async (req, res) => {
  try {
    const {
      torneo_id, zona_id, nombre_override, sufijo,
      institucion_id, nombre, nombre_corto, color_primario, color_secundario, escudo_url, contacto,
    } = req.body;

    if (!torneo_id) {
      return res.status(400).json({ success: false, message: 'torneo_id es requerido' });
    }

    let institucion = null;
    if (institucion_id) {
      // Caso 1: viene institucion_id (flow nuevo)
      institucion = await Institucion.findByPk(institucion_id);
      if (!institucion) return res.status(400).json({ success: false, message: 'Institucion no encontrada' });
    } else if (nombre) {
      // Caso 2: viene nombre → buscar institucion existente o crear una
      institucion = await Institucion.findOne({ where: { nombre: nombre.trim() } });
      if (!institucion) {
        institucion = await Institucion.create({
          nombre: nombre.trim(),
          nombre_corto: nombre_corto?.trim() || null,
          color_primario: color_primario || null,
          color_secundario: color_secundario || null,
          escudo_url: escudo_url || null,
          contacto: contacto || {},
          activo: true,
        });
      }
    } else {
      return res.status(400).json({ success: false, message: 'institucion_id o nombre es requerido' });
    }

    // Verificar que no exista ya la participacion con el mismo sufijo
    const sufijoFinal = (sufijo || '').trim();
    const existente = await Club.findOne({
      where: { institucion_id: institucion.id, torneo_id, sufijo: sufijoFinal },
    });
    if (existente) {
      return res.status(400).json({
        success: false,
        message: sufijoFinal
          ? `La institucion "${institucion.nombre}" ya tiene un equipo "${sufijoFinal}" en este torneo`
          : `La institucion "${institucion.nombre}" ya participa en este torneo. Si queres agregar un segundo equipo, indica un sufijo (A, B, Reserva, etc).`,
      });
    }

    const club = await Club.create({
      institucion_id: institucion.id,
      torneo_id,
      zona_id: zona_id || null,
      sufijo: sufijoFinal,
      nombre_override: nombre_override || null,
      activo: true,
    });

    const recargado = await Club.findByPk(club.id, {
      include: [{ model: Zona, as: 'zona' }, incInst],
    });

    registrarAudit({ req, accion: 'CREAR', entidad: 'clubes', entidad_id: club.id, despues: club.toJSON() });
    res.status(201).json({ success: true, data: aplanar(recargado) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── PUT /clubes/:id ─────────────────────────────────────────────────────────
export const actualizar = async (req, res) => {
  try {
    const club = await Club.findByPk(req.params.id, { include: [incInst] });
    if (!club) return res.status(404).json({ success: false, message: 'Club no encontrado' });

    const antes = club.toJSON();

    // Campos del club (participacion)
    const camposClub = ['zona_id', 'nombre_override', 'sufijo', 'activo'];
    const updatesClub = { actualizado_en: new Date() };
    for (const c of camposClub) { if (req.body[c] !== undefined) updatesClub[c] = req.body[c]; }
    await club.update(updatesClub);

    // Campos de la institucion (datos visuales) — se actualizan en la institucion
    const camposInst = ['nombre', 'nombre_corto', 'color_primario', 'color_secundario', 'escudo_url', 'contacto'];
    const updatesInst = {};
    for (const c of camposInst) { if (req.body[c] !== undefined) updatesInst[c] = req.body[c]; }
    if (Object.keys(updatesInst).length > 0 && club.institucion) {
      updatesInst.actualizado_en = new Date();
      await club.institucion.update(updatesInst);
    }

    const recargado = await Club.findByPk(club.id, {
      include: [{ model: Zona, as: 'zona' }, incInst],
    });
    registrarAudit({ req, accion: 'EDITAR', entidad: 'clubes', entidad_id: club.id, antes, despues: recargado.toJSON() });
    res.json({ success: true, data: aplanar(recargado) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── POST /clubes/:id/escudo ────────────────────────────────────────────────
// El escudo se actualiza en la institucion (afecta a todos sus torneos)
export const subirEscudo = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'Archivo requerido' });
    const escudoUrl = `/uploads/escudos/${req.file.filename}`;

    const club = await Club.findByPk(req.params.id);
    if (!club) return res.status(404).json({ success: false, message: 'Club no encontrado' });

    await Institucion.update(
      { escudo_url: escudoUrl, actualizado_en: new Date() },
      { where: { id: club.institucion_id } },
    );
    res.json({ success: true, data: { escudo_url: escudoUrl } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

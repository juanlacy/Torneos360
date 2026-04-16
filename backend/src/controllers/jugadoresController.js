import { Op } from 'sequelize';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname, join, extname } from 'path';
import { Persona, PersonaRol, Rol, Club, Institucion, Categoria } from '../models/index.js';
import { clubWhere, tieneAccesoAlClub } from '../middleware/authMiddleware.js';
import { registrarAudit } from '../services/auditService.js';
import { obtenerOCrearPersona, normalizarDni } from './personasController.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

/**
 * jugadoresController — Vista filtrada de personas con rol 'jugador'.
 *
 * Ya no hay tabla `jugadores`. Los jugadores son filas en `persona_roles`
 * con rol.codigo='jugador', club_id, categoria_id y numero_camiseta.
 *
 * El `id` del API (GET /jugadores/:id, PUT, DELETE) se refiere al `persona_rol.id`,
 * no al `persona.id`. Asi los endpoints existentes del frontend siguen funcionando.
 */

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

// ─── Helpers ─────────────────────────────────────────────────────────────────
const includeJugador = (extraWhere = {}) => ({
  model: PersonaRol,
  as: 'roles_asignados',
  required: true,
  where: { activo: true, ...extraWhere },
  include: [
    { model: Rol, as: 'rol', where: { codigo: 'jugador' }, attributes: ['id', 'codigo', 'nombre', 'color'] },
    { model: Club, as: 'club', attributes: ['id', 'nombre', 'nombre_corto', 'escudo_url', 'color_primario', 'color_secundario'], include: [{ model: Institucion, as: 'institucion' }] },
    { model: Categoria, as: 'categoria', attributes: ['id', 'nombre', 'anio_nacimiento'] },
  ],
});

/** Aplana persona + rol asignado en una fila "jugador" para la UI */
const aplanar = (persona) => {
  if (!persona) return null;
  const ra = persona.roles_asignados?.[0];
  return {
    id: ra?.id,
    persona_id: persona.id,
    dni: persona.dni,
    nombre: persona.nombre,
    apellido: persona.apellido,
    fecha_nacimiento: persona.fecha_nacimiento,
    sexo: persona.sexo,
    telefono: persona.telefono,
    email: persona.email,
    foto_url: persona.foto_url,
    activo: persona.activo && (ra?.activo !== false),
    club_id: ra?.club_id,
    club: ra?.club,
    categoria_id: ra?.categoria_id,
    categoria: ra?.categoria,
    numero_camiseta: ra?.numero_camiseta,
    estado_fichaje: ra?.estado_fichaje,
    observaciones: ra?.observaciones,
  };
};

// ─── GET /jugadores ─────────────────────────────────────────────────────────
export const listar = async (req, res) => {
  try {
    const { club_id, categoria_id, estado_fichaje, search, torneo_id } = req.query;

    const rolWhere = { activo: true };
    // Lectura abierta: todos ven todos los jugadores del torneo.
    // El filtrado por club_id es un FILTRO del usuario, no una restriccion.
    if (club_id) rolWhere.club_id = club_id;
    // La restriccion de edicion se maneja con permisos, no con el listado.
    if (categoria_id) rolWhere.categoria_id = categoria_id;
    if (estado_fichaje) rolWhere.estado_fichaje = estado_fichaje;

    const personaWhere = { activo: true };
    if (search) {
      personaWhere[Op.or] = [
        { nombre: { [Op.iLike]: `%${search}%` } },
        { apellido: { [Op.iLike]: `%${search}%` } },
        { dni: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const includeClub = { model: Club, as: 'club', attributes: ['id', 'nombre', 'nombre_corto', 'escudo_url', 'color_primario', 'color_secundario'], include: [{ model: Institucion, as: 'institucion' }] };
    if (torneo_id) includeClub.where = { torneo_id };

    const personas = await Persona.findAll({
      where: personaWhere,
      include: [{
        model: PersonaRol,
        as: 'roles_asignados',
        required: true,
        where: rolWhere,
        include: [
          { model: Rol, as: 'rol', where: { codigo: 'jugador' }, attributes: ['id', 'codigo', 'nombre', 'color'] },
          { ...includeClub },
          { model: Categoria, as: 'categoria', attributes: ['id', 'nombre', 'anio_nacimiento'] },
        ],
      }],
      order: [['apellido', 'ASC'], ['nombre', 'ASC']],
    });

    res.json({ success: true, data: personas.map(aplanar) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET /jugadores/:id (id = persona_rol.id) ───────────────────────────────
export const obtener = async (req, res) => {
  try {
    const ra = await PersonaRol.findByPk(req.params.id);
    if (!ra) return res.status(404).json({ success: false, message: 'Jugador no encontrado' });

    const persona = await Persona.findByPk(ra.persona_id, {
      include: [includeJugador({ id: ra.id })],
    });
    if (!persona || !persona.roles_asignados?.length) {
      return res.status(404).json({ success: false, message: 'Jugador no encontrado' });
    }
    res.json({ success: true, data: aplanar(persona) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── POST /jugadores ────────────────────────────────────────────────────────
export const crear = async (req, res) => {
  try {
    const { club_id, categoria_id, nombre, apellido, dni, fecha_nacimiento,
            sexo, telefono, email, numero_camiseta, observaciones } = req.body;

    if (!club_id || !categoria_id || !nombre || !apellido || !dni || !fecha_nacimiento) {
      return res.status(400).json({ success: false, message: 'club_id, categoria_id, nombre, apellido, dni y fecha_nacimiento son requeridos' });
    }
    if (!tieneAccesoAlClub(req, parseInt(club_id))) {
      return res.status(403).json({ success: false, message: 'No tenes acceso a este club' });
    }

    // Validar categoria y limite
    const categoria = await Categoria.findByPk(categoria_id);
    if (!categoria) return res.status(400).json({ success: false, message: 'Categoria no encontrada' });

    const nacimiento = new Date(fecha_nacimiento);
    if (nacimiento.getFullYear() !== categoria.anio_nacimiento) {
      return res.status(400).json({ success: false, message: `El anio de nacimiento (${nacimiento.getFullYear()}) no coincide con la categoria ${categoria.nombre} (${categoria.anio_nacimiento})` });
    }

    const rolJugador = await Rol.findOne({ where: { codigo: 'jugador' } });
    if (!rolJugador) return res.status(500).json({ success: false, message: 'Rol "jugador" no existe en el catalogo' });

    const countActual = await PersonaRol.count({
      where: { rol_id: rolJugador.id, club_id, categoria_id, activo: true },
    });
    if (countActual >= categoria.max_jugadores) {
      return res.status(400).json({ success: false, message: `Se alcanzo el maximo de ${categoria.max_jugadores} jugadores para esta categoria` });
    }

    // Obtener o crear persona
    const { persona, creada } = await obtenerOCrearPersona({
      dni, nombre, apellido, fecha_nacimiento, sexo, telefono, email,
    });

    // Verificar que no tenga ya el rol jugador en el mismo club+categoria
    const dup = await PersonaRol.findOne({
      where: { persona_id: persona.id, rol_id: rolJugador.id, club_id, categoria_id, activo: true },
    });
    if (dup) {
      return res.status(400).json({
        success: false,
        message: `${persona.apellido}, ${persona.nombre} ya esta fichado como jugador en este club y categoria`,
      });
    }

    const asignacion = await PersonaRol.create({
      persona_id: persona.id,
      rol_id: rolJugador.id,
      club_id, categoria_id,
      numero_camiseta: numero_camiseta || null,
      estado_fichaje: 'pendiente',
      observaciones: observaciones || null,
      activo: true,
    });

    const recargado = await Persona.findByPk(persona.id, {
      include: [includeJugador({ id: asignacion.id })],
    });

    registrarAudit({ req, accion: 'CREAR', entidad: 'persona_roles', entidad_id: asignacion.id, despues: asignacion.toJSON() });
    res.status(201).json({ success: true, data: aplanar(recargado), persona_creada: creada });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── PUT /jugadores/:id (id = persona_rol.id) ───────────────────────────────
export const actualizar = async (req, res) => {
  try {
    const ra = await PersonaRol.findByPk(req.params.id);
    if (!ra) return res.status(404).json({ success: false, message: 'Jugador no encontrado' });

    if (!tieneAccesoAlClub(req, ra.club_id)) {
      return res.status(403).json({ success: false, message: 'No tenes acceso a este jugador' });
    }

    const persona = await Persona.findByPk(ra.persona_id);

    // Actualizar datos personales
    const camposP = ['nombre', 'apellido', 'dni', 'fecha_nacimiento', 'sexo', 'telefono', 'email', 'foto_url'];
    const updP = { actualizado_en: new Date() };
    for (const c of camposP) { if (req.body[c] !== undefined) updP[c] = req.body[c]; }
    if (updP.dni) updP.dni = normalizarDni(updP.dni);
    if (Object.keys(updP).length > 1) await persona.update(updP);

    // Actualizar datos del rol
    const camposR = ['club_id', 'categoria_id', 'numero_camiseta', 'observaciones'];
    const updR = { actualizado_en: new Date() };
    for (const c of camposR) { if (req.body[c] !== undefined) updR[c] = req.body[c]; }
    if (Object.keys(updR).length > 1) await ra.update(updR);

    const recargado = await Persona.findByPk(persona.id, {
      include: [includeJugador({ id: ra.id })],
    });
    registrarAudit({ req, accion: 'EDITAR', entidad: 'persona_roles', entidad_id: ra.id });
    res.json({ success: true, data: aplanar(recargado) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── PUT /jugadores/:id/fichaje ─────────────────────────────────────────────
export const cambiarEstadoFichaje = async (req, res) => {
  try {
    const { estado } = req.body;
    if (!['aprobado', 'rechazado', 'pendiente', 'baja'].includes(estado)) {
      return res.status(400).json({ success: false, message: 'Estado invalido' });
    }
    const ra = await PersonaRol.findByPk(req.params.id);
    if (!ra) return res.status(404).json({ success: false, message: 'Jugador no encontrado' });

    const antes = { estado_fichaje: ra.estado_fichaje };
    await ra.update({ estado_fichaje: estado, actualizado_en: new Date() });

    registrarAudit({ req, accion: 'CAMBIO_FICHAJE', entidad: 'persona_roles', entidad_id: ra.id, antes, despues: { estado_fichaje: estado } });
    res.json({ success: true, message: `Fichaje ${estado}` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── POST /jugadores/:id/foto ───────────────────────────────────────────────
export const subirFoto = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'Archivo requerido' });
    const ra = await PersonaRol.findByPk(req.params.id);
    if (!ra) return res.status(404).json({ success: false, message: 'Jugador no encontrado' });

    const fotoUrl = `/uploads/jugadores/${req.file.filename}`;
    await Persona.update({ foto_url: fotoUrl, actualizado_en: new Date() }, { where: { id: ra.persona_id } });
    res.json({ success: true, data: { foto_url: fotoUrl } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

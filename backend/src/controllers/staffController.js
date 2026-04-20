import { Op } from 'sequelize';
import { Persona, PersonaRol, Rol, Club, Institucion } from '../models/index.js';
import { tieneAccesoAlClub, tienePermiso, ocultarSensibles } from '../middleware/authMiddleware.js';
import { registrarAudit } from '../services/auditService.js';
import { obtenerOCrearPersona, normalizarDni } from './personasController.js';

/**
 * staffController — Vista filtrada de personas con roles de categoria_fn='staff_club'
 * (delegados, DT, ayudantes, dirigentes, etc). El :id del API es persona_rol.id.
 */

const includeStaffRol = (extraWhere = {}) => ({
  model: PersonaRol,
  as: 'roles_asignados',
  required: true,
  where: { activo: true, ...extraWhere },
  include: [
    { model: Rol, as: 'rol', where: { categoria_fn: 'staff_club' }, attributes: ['id', 'codigo', 'nombre', 'icono', 'color', 'puede_firmar_alineacion'] },
    { model: Club, as: 'club', attributes: ['id', 'sufijo', 'nombre', 'nombre_corto', 'escudo_url', 'color_primario', 'color_secundario'], include: [{ model: Institucion, as: 'institucion' }] },
  ],
});

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
    telefono: persona.telefono,
    email: persona.email,
    foto_url: persona.foto_url,
    activo: persona.activo && (ra?.activo !== false),
    club_id: ra?.club_id,
    club: ra?.club,
    rol_id: ra?.rol_id,
    rol: ra?.rol,
    tipo: ra?.rol?.codigo, // compat legacy
    observaciones: ra?.observaciones,
  };
};

// GET /staff
export const listar = async (req, res) => {
  try {
    const { club_id, rol_id, search, torneo_id } = req.query;

    const rolWhere = { activo: true };
    if (club_id) rolWhere.club_id = club_id;
    if (rol_id) rolWhere.rol_id = rol_id;

    const personaWhere = { activo: true };
    if (search) {
      personaWhere[Op.or] = [
        { nombre: { [Op.iLike]: `%${search}%` } },
        { apellido: { [Op.iLike]: `%${search}%` } },
        { dni: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const includeClub = { model: Club, as: 'club', attributes: ['id', 'sufijo', 'nombre', 'nombre_corto', 'escudo_url', 'color_primario', 'color_secundario'], include: [{ model: Institucion, as: 'institucion' }], required: true };
    if (torneo_id) includeClub.where = { torneo_id };

    const personas = await Persona.findAll({
      where: personaWhere,
      include: [{
        model: PersonaRol,
        as: 'roles_asignados',
        required: true,
        where: rolWhere,
        include: [
          { model: Rol, as: 'rol', where: { categoria_fn: 'staff_club' }, attributes: ['id', 'codigo', 'nombre', 'icono', 'color', 'puede_firmar_alineacion'] },
          includeClub,
        ],
      }],
      order: [['apellido', 'ASC'], ['nombre', 'ASC']],
    });

    const puedeVerSensibles = await tienePermiso(req, 'staff', 'ver_sensibles');
    res.json({ success: true, data: ocultarSensibles(personas.map(aplanar), !puedeVerSensibles) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /staff
export const crear = async (req, res) => {
  try {
    const { club_id, nombre, apellido, dni, rol_id, telefono, email, fecha_nacimiento, observaciones } = req.body;
    if (!club_id || !nombre || !apellido || !dni || !rol_id) {
      return res.status(400).json({ success: false, message: 'club_id, nombre, apellido, dni y rol_id son requeridos' });
    }
    if (!tieneAccesoAlClub(req, parseInt(club_id))) {
      return res.status(403).json({ success: false, message: 'No tenes acceso a este club' });
    }

    const rol = await Rol.findByPk(rol_id);
    if (!rol) return res.status(400).json({ success: false, message: 'Rol no encontrado' });
    if (rol.categoria_fn !== 'staff_club') {
      return res.status(400).json({ success: false, message: 'El rol indicado no es de staff de club' });
    }

    const { persona, creada } = await obtenerOCrearPersona({
      dni, nombre, apellido, fecha_nacimiento, telefono, email,
    });

    const dup = await PersonaRol.findOne({
      where: { persona_id: persona.id, rol_id, club_id, activo: true },
    });
    if (dup) {
      return res.status(400).json({
        success: false,
        message: `${persona.apellido}, ${persona.nombre} ya tiene el rol "${rol.nombre}" en este club`,
      });
    }

    const asignacion = await PersonaRol.create({
      persona_id: persona.id,
      rol_id, club_id,
      observaciones: observaciones || null,
      activo: true,
    });

    const recargado = await Persona.findByPk(persona.id, {
      include: [includeStaffRol({ id: asignacion.id })],
    });
    registrarAudit({ req, accion: 'CREAR', entidad: 'persona_roles', entidad_id: asignacion.id, despues: asignacion.toJSON() });
    res.status(201).json({ success: true, data: aplanar(recargado), persona_creada: creada });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /staff/:id
export const actualizar = async (req, res) => {
  try {
    const ra = await PersonaRol.findByPk(req.params.id);
    if (!ra) return res.status(404).json({ success: false, message: 'Staff no encontrado' });
    if (!tieneAccesoAlClub(req, ra.club_id)) {
      return res.status(403).json({ success: false, message: 'No tenes acceso' });
    }

    const persona = await Persona.findByPk(ra.persona_id);

    const camposP = ['nombre', 'apellido', 'dni', 'fecha_nacimiento', 'telefono', 'email', 'foto_url'];
    const updP = { actualizado_en: new Date() };
    for (const c of camposP) { if (req.body[c] !== undefined) updP[c] = req.body[c]; }
    if (updP.dni) updP.dni = normalizarDni(updP.dni);
    if (Object.keys(updP).length > 1) await persona.update(updP);

    const camposR = ['rol_id', 'club_id', 'observaciones'];
    const updR = { actualizado_en: new Date() };
    for (const c of camposR) { if (req.body[c] !== undefined) updR[c] = req.body[c]; }
    if (Object.keys(updR).length > 1) await ra.update(updR);

    const recargado = await Persona.findByPk(persona.id, {
      include: [includeStaffRol({ id: ra.id })],
    });
    registrarAudit({ req, accion: 'EDITAR', entidad: 'persona_roles', entidad_id: ra.id });
    res.json({ success: true, data: aplanar(recargado) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /staff/:id
export const eliminar = async (req, res) => {
  try {
    const ra = await PersonaRol.findByPk(req.params.id);
    if (!ra) return res.status(404).json({ success: false, message: 'Staff no encontrado' });
    await ra.update({ activo: false, fecha_hasta: new Date(), actualizado_en: new Date() });
    registrarAudit({ req, accion: 'ELIMINAR', entidad: 'persona_roles', entidad_id: ra.id });
    res.json({ success: true, message: 'Staff desactivado' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

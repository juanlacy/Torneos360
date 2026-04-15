import { Op } from 'sequelize';
import { Persona, PersonaRol, Rol, Torneo } from '../models/index.js';
import { registrarAudit } from '../services/auditService.js';
import { obtenerOCrearPersona, normalizarDni } from './personasController.js';

/**
 * veedoresController — Vista filtrada de personas con rol 'veedor'.
 * El :id del API es persona_rol.id.
 */

const aplanar = (persona) => {
  if (!persona) return null;
  const ra = persona.roles_asignados?.[0];
  return {
    id: ra?.id,
    persona_id: persona.id,
    torneo_id: ra?.torneo_id,
    dni: persona.dni,
    nombre: persona.nombre,
    apellido: persona.apellido,
    fecha_nacimiento: persona.fecha_nacimiento,
    telefono: persona.telefono,
    email: persona.email,
    foto_url: persona.foto_url,
    activo: persona.activo && (ra?.activo !== false),
    observaciones: ra?.observaciones,
  };
};

// GET /veedores
export const listar = async (req, res) => {
  try {
    const { torneo_id, search } = req.query;

    const rolWhere = { activo: true };
    if (torneo_id) rolWhere.torneo_id = torneo_id;

    const personaWhere = { activo: true };
    if (search) {
      personaWhere[Op.or] = [
        { nombre: { [Op.iLike]: `%${search}%` } },
        { apellido: { [Op.iLike]: `%${search}%` } },
        { dni: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const personas = await Persona.findAll({
      where: personaWhere,
      include: [{
        model: PersonaRol,
        as: 'roles_asignados',
        required: true,
        where: rolWhere,
        include: [
          { model: Rol, as: 'rol', where: { codigo: 'veedor' }, attributes: ['id', 'codigo', 'nombre', 'color'] },
          { model: Torneo, as: 'torneo', attributes: ['id', 'nombre'] },
        ],
      }],
      order: [['apellido', 'ASC'], ['nombre', 'ASC']],
    });

    res.json({ success: true, data: personas.map(aplanar) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /veedores
export const crear = async (req, res) => {
  try {
    const { torneo_id, nombre, apellido, dni, telefono, email, fecha_nacimiento } = req.body;
    if (!torneo_id || !nombre || !apellido || !dni) {
      return res.status(400).json({ success: false, message: 'torneo_id, nombre, apellido y dni son requeridos' });
    }

    const rolVeedor = await Rol.findOne({ where: { codigo: 'veedor' } });
    if (!rolVeedor) return res.status(500).json({ success: false, message: 'Rol "veedor" no existe en el catalogo' });

    const { persona, creada } = await obtenerOCrearPersona({
      dni, nombre, apellido, fecha_nacimiento, telefono, email,
    });

    const dup = await PersonaRol.findOne({
      where: { persona_id: persona.id, rol_id: rolVeedor.id, torneo_id, activo: true },
    });
    if (dup) {
      return res.status(400).json({
        success: false,
        message: `${persona.apellido}, ${persona.nombre} ya esta registrado como veedor en este torneo`,
      });
    }

    const asignacion = await PersonaRol.create({
      persona_id: persona.id,
      rol_id: rolVeedor.id,
      torneo_id,
      activo: true,
    });

    const recargado = await Persona.findByPk(persona.id, {
      include: [{
        model: PersonaRol, as: 'roles_asignados', required: true, where: { id: asignacion.id },
        include: [{ model: Rol, as: 'rol' }, { model: Torneo, as: 'torneo' }],
      }],
    });

    registrarAudit({ req, accion: 'CREAR', entidad: 'persona_roles', entidad_id: asignacion.id, despues: asignacion.toJSON() });
    res.status(201).json({ success: true, data: aplanar(recargado), persona_creada: creada });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /veedores/:id
export const actualizar = async (req, res) => {
  try {
    const ra = await PersonaRol.findByPk(req.params.id);
    if (!ra) return res.status(404).json({ success: false, message: 'Veedor no encontrado' });

    const persona = await Persona.findByPk(ra.persona_id);

    const camposP = ['nombre', 'apellido', 'dni', 'fecha_nacimiento', 'telefono', 'email', 'foto_url'];
    const updP = { actualizado_en: new Date() };
    for (const c of camposP) { if (req.body[c] !== undefined) updP[c] = req.body[c]; }
    if (updP.dni) updP.dni = normalizarDni(updP.dni);
    if (Object.keys(updP).length > 1) await persona.update(updP);

    registrarAudit({ req, accion: 'EDITAR', entidad: 'persona_roles', entidad_id: ra.id });
    res.json({ success: true, data: aplanar(await Persona.findByPk(persona.id, {
      include: [{
        model: PersonaRol, as: 'roles_asignados', required: true, where: { id: ra.id },
        include: [{ model: Rol, as: 'rol' }, { model: Torneo, as: 'torneo' }],
      }],
    })) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /veedores/:id
export const eliminar = async (req, res) => {
  try {
    const ra = await PersonaRol.findByPk(req.params.id);
    if (!ra) return res.status(404).json({ success: false, message: 'Veedor no encontrado' });
    await ra.update({ activo: false, fecha_hasta: new Date(), actualizado_en: new Date() });
    registrarAudit({ req, accion: 'ELIMINAR', entidad: 'persona_roles', entidad_id: ra.id });
    res.json({ success: true, message: 'Veedor desactivado' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

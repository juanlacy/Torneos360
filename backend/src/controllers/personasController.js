import { Op } from 'sequelize';
import { Persona, PersonaRol, Rol, Club, Institucion, Torneo, Categoria } from '../models/index.js';
import { registrarAudit } from '../services/auditService.js';

/** Normaliza un DNI: sin puntos, espacios ni guiones */
export const normalizarDni = (d) => String(d || '').replace(/[\s.\-]/g, '').trim();

/** Capitaliza palabras: "JUAN CARLOS" -> "Juan Carlos" */
export const capitalizarNombre = (str) => {
  if (!str) return str;
  return String(str).toLowerCase().split(/\s+/).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
};

/**
 * Helper: obtener o crear una persona por DNI.
 * Si la persona ya existe, opcionalmente actualiza datos faltantes sin sobrescribir.
 */
export const obtenerOCrearPersona = async (datos, { actualizarFaltantes = true, transaction = null } = {}) => {
  const dni = normalizarDni(datos.dni);
  if (!dni) throw new Error('DNI es requerido');

  let persona = await Persona.findOne({ where: { dni }, transaction });
  if (persona) {
    if (actualizarFaltantes) {
      const updates = {};
      if (!persona.fecha_nacimiento && datos.fecha_nacimiento) updates.fecha_nacimiento = datos.fecha_nacimiento;
      if (!persona.sexo && datos.sexo) updates.sexo = datos.sexo;
      if (!persona.telefono && datos.telefono) updates.telefono = datos.telefono;
      if (!persona.email && datos.email) updates.email = datos.email;
      if (!persona.foto_url && datos.foto_url) updates.foto_url = datos.foto_url;
      if (Object.keys(updates).length > 0) {
        updates.actualizado_en = new Date();
        await persona.update(updates, { transaction });
      }
    }
    return { persona, creada: false };
  }

  persona = await Persona.create({
    dni,
    nombre: capitalizarNombre(datos.nombre),
    apellido: capitalizarNombre(datos.apellido),
    fecha_nacimiento: datos.fecha_nacimiento || null,
    sexo: datos.sexo || null,
    telefono: datos.telefono || null,
    email: datos.email || null,
    foto_url: datos.foto_url || null,
    observaciones: datos.observaciones || null,
    activo: true,
  }, { transaction });

  return { persona, creada: true };
};

// ────────────────────────────────────────────────────────────────────────────
// GET /personas
// ────────────────────────────────────────────────────────────────────────────
export const listar = async (req, res) => {
  try {
    const { search, activo, rol_codigo, club_id, torneo_id, categoria_id } = req.query;

    const where = {};
    if (activo !== undefined) where.activo = activo === 'true';
    if (search) {
      where[Op.or] = [
        { dni: { [Op.iLike]: `%${search}%` } },
        { nombre: { [Op.iLike]: `%${search}%` } },
        { apellido: { [Op.iLike]: `%${search}%` } },
      ];
    }

    // Filtrado por rol_codigo / club_id / etc usa include con required=true
    const rolWhere = {};
    if (rol_codigo) rolWhere['$roles_asignados.rol.codigo$'] = rol_codigo;
    if (club_id) rolWhere['$roles_asignados.club_id$'] = club_id;
    if (torneo_id) rolWhere['$roles_asignados.torneo_id$'] = torneo_id;
    if (categoria_id) rolWhere['$roles_asignados.categoria_id$'] = categoria_id;

    const hayFiltroRol = Object.keys(rolWhere).length > 0;

    const personas = await Persona.findAll({
      where: { ...where, ...(hayFiltroRol ? rolWhere : {}) },
      include: [
        {
          model: PersonaRol,
          as: 'roles_asignados',
          required: hayFiltroRol,
          where: { activo: true },
          include: [
            { model: Rol, as: 'rol', attributes: ['id', 'codigo', 'nombre', 'icono', 'color', 'categoria_fn', 'ambito'] },
            { model: Club, as: 'club', attributes: ['id', 'nombre', 'nombre_corto', 'escudo_url', 'color_primario', 'color_secundario'], include: [{ model: Institucion, as: 'institucion' }] },
            { model: Torneo, as: 'torneo', attributes: ['id', 'nombre'] },
            { model: Categoria, as: 'categoria', attributes: ['id', 'nombre', 'anio_nacimiento'] },
          ],
          separate: false,
        },
      ],
      order: [['apellido', 'ASC'], ['nombre', 'ASC']],
    });

    res.json({ success: true, data: personas });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// GET /personas/by-dni/:dni — para el flow "ya existe este DNI?"
// ────────────────────────────────────────────────────────────────────────────
export const buscarPorDni = async (req, res) => {
  try {
    const dni = normalizarDni(req.params.dni);
    if (!dni) return res.status(400).json({ success: false, message: 'DNI invalido' });

    const persona = await Persona.findOne({
      where: { dni },
      include: [
        {
          model: PersonaRol,
          as: 'roles_asignados',
          where: { activo: true },
          required: false,
          include: [
            { model: Rol, as: 'rol', attributes: ['id', 'codigo', 'nombre', 'icono', 'color', 'categoria_fn'] },
            { model: Club, as: 'club', attributes: ['id', 'nombre', 'nombre_corto'] },
            { model: Torneo, as: 'torneo', attributes: ['id', 'nombre'] },
            { model: Categoria, as: 'categoria', attributes: ['id', 'nombre'] },
          ],
        },
      ],
    });

    if (!persona) {
      return res.json({ success: true, data: null });
    }
    res.json({ success: true, data: persona });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// GET /personas/:id
// ────────────────────────────────────────────────────────────────────────────
export const obtener = async (req, res) => {
  try {
    const persona = await Persona.findByPk(req.params.id, {
      include: [
        {
          model: PersonaRol,
          as: 'roles_asignados',
          include: [
            { model: Rol, as: 'rol' },
            { model: Club, as: 'club', attributes: ['id', 'nombre', 'nombre_corto', 'escudo_url', 'color_primario', 'color_secundario'], include: [{ model: Institucion, as: 'institucion' }] },
            { model: Torneo, as: 'torneo', attributes: ['id', 'nombre'] },
            { model: Categoria, as: 'categoria', attributes: ['id', 'nombre', 'anio_nacimiento'] },
          ],
        },
      ],
    });
    if (!persona) return res.status(404).json({ success: false, message: 'Persona no encontrada' });
    res.json({ success: true, data: persona });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// POST /personas — crear persona sin roles (uso admin)
// ────────────────────────────────────────────────────────────────────────────
export const crear = async (req, res) => {
  try {
    const { persona, creada } = await obtenerOCrearPersona(req.body);
    registrarAudit({ req, accion: creada ? 'CREAR' : 'ACTUALIZAR', entidad: 'personas', entidad_id: persona.id, despues: persona.toJSON() });
    res.status(creada ? 201 : 200).json({ success: true, data: persona, creada });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// PUT /personas/:id — actualizar datos personales
// ────────────────────────────────────────────────────────────────────────────
export const actualizar = async (req, res) => {
  try {
    const persona = await Persona.findByPk(req.params.id);
    if (!persona) return res.status(404).json({ success: false, message: 'Persona no encontrada' });

    const antes = persona.toJSON();
    const campos = ['nombre', 'apellido', 'fecha_nacimiento', 'sexo', 'telefono', 'email', 'foto_url', 'observaciones', 'activo'];
    const updates = { actualizado_en: new Date() };
    for (const c of campos) { if (req.body[c] !== undefined) updates[c] = req.body[c]; }

    await persona.update(updates);
    registrarAudit({ req, accion: 'EDITAR', entidad: 'personas', entidad_id: persona.id, antes, despues: persona.toJSON() });
    res.json({ success: true, data: persona });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// POST /personas/:id/roles — asignar un rol a la persona
// ────────────────────────────────────────────────────────────────────────────
export const asignarRol = async (req, res) => {
  try {
    const persona = await Persona.findByPk(req.params.id);
    if (!persona) return res.status(404).json({ success: false, message: 'Persona no encontrada' });

    const { rol_id, club_id, torneo_id, categoria_id, numero_camiseta, estado_fichaje, observaciones } = req.body;
    if (!rol_id) return res.status(400).json({ success: false, message: 'rol_id es requerido' });

    const rol = await Rol.findByPk(rol_id);
    if (!rol || !rol.activo) return res.status(400).json({ success: false, message: 'Rol no encontrado o inactivo' });

    // Validaciones segun rol.ambito
    if (rol.ambito === 'club' && !club_id) {
      return res.status(400).json({ success: false, message: `El rol "${rol.nombre}" requiere un club` });
    }
    if (rol.ambito === 'torneo' && !torneo_id) {
      return res.status(400).json({ success: false, message: `El rol "${rol.nombre}" requiere un torneo` });
    }
    if (rol.requiere_categoria && !categoria_id) {
      return res.status(400).json({ success: false, message: `El rol "${rol.nombre}" requiere una categoria` });
    }

    // Evitar duplicados activos: mismo persona + rol + club/torneo
    const dup = await PersonaRol.findOne({
      where: {
        persona_id: persona.id,
        rol_id,
        ...(club_id ? { club_id } : {}),
        ...(torneo_id ? { torneo_id } : {}),
        activo: true,
      },
    });
    if (dup) {
      return res.status(400).json({
        success: false,
        message: `Esta persona ya tiene el rol "${rol.nombre}" asignado en el mismo contexto`,
      });
    }

    const asignacion = await PersonaRol.create({
      persona_id: persona.id,
      rol_id,
      club_id: club_id || null,
      torneo_id: torneo_id || null,
      categoria_id: categoria_id || null,
      numero_camiseta: numero_camiseta || null,
      estado_fichaje: rol.codigo === 'jugador' ? (estado_fichaje || 'pendiente') : null,
      observaciones: observaciones || null,
      activo: true,
    });

    const completa = await PersonaRol.findByPk(asignacion.id, {
      include: [
        { model: Rol, as: 'rol' },
        { model: Club, as: 'club', attributes: ['id', 'nombre', 'nombre_corto', 'escudo_url'] },
        { model: Torneo, as: 'torneo', attributes: ['id', 'nombre'] },
        { model: Categoria, as: 'categoria', attributes: ['id', 'nombre'] },
      ],
    });

    registrarAudit({ req, accion: 'CREAR', entidad: 'persona_roles', entidad_id: asignacion.id, despues: asignacion.toJSON() });
    res.status(201).json({ success: true, data: completa });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// PUT /personas/:id/roles/:rolId — actualizar asignacion de rol
// ────────────────────────────────────────────────────────────────────────────
export const actualizarRolAsignado = async (req, res) => {
  try {
    const asignacion = await PersonaRol.findOne({
      where: { id: req.params.rolId, persona_id: req.params.id },
    });
    if (!asignacion) return res.status(404).json({ success: false, message: 'Asignacion no encontrada' });

    const antes = asignacion.toJSON();
    const campos = ['club_id', 'torneo_id', 'categoria_id', 'numero_camiseta', 'estado_fichaje', 'observaciones', 'activo', 'fecha_hasta'];
    const updates = { actualizado_en: new Date() };
    for (const c of campos) { if (req.body[c] !== undefined) updates[c] = req.body[c]; }

    await asignacion.update(updates);
    registrarAudit({ req, accion: 'EDITAR', entidad: 'persona_roles', entidad_id: asignacion.id, antes, despues: asignacion.toJSON() });
    res.json({ success: true, data: asignacion });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// DELETE /personas/:id/roles/:rolId — dar de baja rol (soft delete)
// ────────────────────────────────────────────────────────────────────────────
export const eliminarRolAsignado = async (req, res) => {
  try {
    const asignacion = await PersonaRol.findOne({
      where: { id: req.params.rolId, persona_id: req.params.id },
    });
    if (!asignacion) return res.status(404).json({ success: false, message: 'Asignacion no encontrada' });

    await asignacion.update({
      activo: false,
      fecha_hasta: new Date(),
      actualizado_en: new Date(),
    });
    registrarAudit({ req, accion: 'ELIMINAR', entidad: 'persona_roles', entidad_id: asignacion.id });
    res.json({ success: true, message: 'Rol dado de baja' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

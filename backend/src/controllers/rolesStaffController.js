import { Rol } from '../models/index.js';
import { registrarAudit } from '../services/auditService.js';

/**
 * rolesController — ABM del catalogo de roles unificado.
 * Incluye tanto roles del staff del club como oficiales del torneo (arbitro, veedor),
 * jugadores, etc. El filtro por categoria_fn agrupa en la UI.
 *
 * Se mantiene el nombre de archivo `rolesStaffController` por compat del import,
 * pero la tabla ahora se llama `roles`.
 */

// GET /roles-staff  (se mantiene el path para compat — deberiamos migrar a /roles)
export const listar = async (req, res) => {
  try {
    const { activo, categoria_fn, ambito } = req.query;
    const where = {};
    if (activo !== undefined) where.activo = activo === 'true';
    if (categoria_fn) where.categoria_fn = categoria_fn;
    if (ambito) where.ambito = ambito;

    const roles = await Rol.findAll({
      where,
      order: [['orden', 'ASC'], ['nombre', 'ASC']],
    });
    res.json({ success: true, data: roles });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /roles-staff
export const crear = async (req, res) => {
  try {
    const {
      codigo, nombre, descripcion, icono, color,
      ambito, categoria_fn,
      puede_firmar_alineacion, puede_dirigir_partido,
      requiere_categoria, requiere_numero_camiseta,
      orden,
    } = req.body;

    if (!nombre) {
      return res.status(400).json({ success: false, message: 'El nombre es requerido' });
    }

    const codigoFinal = (codigo || nombre)
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');

    const existente = await Rol.findOne({ where: { codigo: codigoFinal } });
    if (existente) {
      return res.status(400).json({ success: false, message: `Ya existe un rol con codigo "${codigoFinal}"` });
    }

    const rol = await Rol.create({
      codigo: codigoFinal,
      nombre: nombre.trim(),
      descripcion: descripcion?.trim() || null,
      icono: icono || null,
      color: color || null,
      ambito: ambito || 'club',
      categoria_fn: categoria_fn || 'staff_club',
      puede_firmar_alineacion: puede_firmar_alineacion === true,
      puede_dirigir_partido: puede_dirigir_partido === true,
      requiere_categoria: requiere_categoria === true,
      requiere_numero_camiseta: requiere_numero_camiseta === true,
      orden: orden || 100,
      es_sistema: false,
      activo: true,
    });

    registrarAudit({ req, accion: 'CREAR', entidad: 'roles', entidad_id: rol.id, despues: rol.toJSON() });
    res.status(201).json({ success: true, data: rol });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /roles-staff/:id
export const actualizar = async (req, res) => {
  try {
    const rol = await Rol.findByPk(req.params.id);
    if (!rol) return res.status(404).json({ success: false, message: 'Rol no encontrado' });

    const antes = rol.toJSON();
    const campos = [
      'nombre', 'descripcion', 'icono', 'color',
      'ambito', 'categoria_fn',
      'puede_firmar_alineacion', 'puede_dirigir_partido',
      'requiere_categoria', 'requiere_numero_camiseta',
      'orden', 'activo',
    ];
    const updates = { actualizado_en: new Date() };
    for (const c of campos) { if (req.body[c] !== undefined) updates[c] = req.body[c]; }

    if (rol.es_sistema) {
      delete updates.codigo;
      delete updates.ambito;
      delete updates.categoria_fn;
      if (updates.activo === false) {
        return res.status(400).json({ success: false, message: 'Los roles del sistema no se pueden desactivar' });
      }
    }

    await rol.update(updates);
    registrarAudit({ req, accion: 'EDITAR', entidad: 'roles', entidad_id: rol.id, antes, despues: rol.toJSON() });
    res.json({ success: true, data: rol });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /roles-staff/:id  (soft delete)
export const eliminar = async (req, res) => {
  try {
    const rol = await Rol.findByPk(req.params.id);
    if (!rol) return res.status(404).json({ success: false, message: 'Rol no encontrado' });

    if (rol.es_sistema) {
      return res.status(400).json({ success: false, message: 'Los roles del sistema no se pueden eliminar' });
    }

    await rol.update({ activo: false, actualizado_en: new Date() });
    registrarAudit({ req, accion: 'ELIMINAR', entidad: 'roles', entidad_id: rol.id });
    res.json({ success: true, message: 'Rol desactivado' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

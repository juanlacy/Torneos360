import { Op } from 'sequelize';
import { Institucion, Club, Torneo } from '../models/index.js';
import { registrarAudit } from '../services/auditService.js';

/**
 * institucionesController — CRUD de instituciones (clubes "platonicos").
 *
 * Las instituciones son globales: no pertenecen a un torneo. Cada fila
 * en la tabla `clubes` es una participacion de la institucion en un torneo.
 */

// GET /instituciones
export const listar = async (req, res) => {
  try {
    const { search, activo, con_participaciones } = req.query;

    const where = {};
    if (activo !== undefined) where.activo = activo === 'true';
    if (search) {
      where[Op.or] = [
        { nombre: { [Op.iLike]: `%${search}%` } },
        { nombre_corto: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const include = [];
    if (con_participaciones === 'true') {
      include.push({
        model: Club,
        as: 'participaciones',
        attributes: ['id', 'torneo_id', 'zona_id', 'activo'],
        include: [{ model: Torneo, as: 'torneo', attributes: ['id', 'nombre', 'anio'] }],
      });
    }

    const instituciones = await Institucion.findAll({
      where,
      include,
      order: [['nombre', 'ASC']],
    });
    res.json({ success: true, data: instituciones });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /instituciones/:id
export const obtener = async (req, res) => {
  try {
    const institucion = await Institucion.findByPk(req.params.id, {
      include: [{
        model: Club, as: 'participaciones',
        include: [{ model: Torneo, as: 'torneo', attributes: ['id', 'nombre', 'anio'] }],
      }],
    });
    if (!institucion) return res.status(404).json({ success: false, message: 'Institucion no encontrada' });
    res.json({ success: true, data: institucion });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /instituciones
export const crear = async (req, res) => {
  try {
    const {
      nombre, nombre_corto, escudo_url, color_primario, color_secundario,
      cuit, direccion, contacto, fundacion, observaciones,
    } = req.body;

    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ success: false, message: 'El nombre es requerido' });
    }

    const existente = await Institucion.findOne({ where: { nombre: nombre.trim() } });
    if (existente) {
      return res.status(400).json({
        success: false,
        message: `Ya existe una institucion con el nombre "${nombre}"`,
        data: existente,
      });
    }

    const institucion = await Institucion.create({
      nombre: nombre.trim(),
      nombre_corto: nombre_corto?.trim() || null,
      escudo_url: escudo_url || null,
      color_primario: color_primario || null,
      color_secundario: color_secundario || null,
      cuit: cuit || null,
      direccion: direccion || null,
      contacto: contacto || {},
      fundacion: fundacion || null,
      observaciones: observaciones || null,
      activo: true,
    });

    registrarAudit({ req, accion: 'CREAR', entidad: 'instituciones', entidad_id: institucion.id, despues: institucion.toJSON() });
    res.status(201).json({ success: true, data: institucion });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /instituciones/:id
export const actualizar = async (req, res) => {
  try {
    const institucion = await Institucion.findByPk(req.params.id);
    if (!institucion) return res.status(404).json({ success: false, message: 'Institucion no encontrada' });

    const antes = institucion.toJSON();
    const campos = [
      'nombre', 'nombre_corto', 'escudo_url', 'color_primario', 'color_secundario',
      'cuit', 'direccion', 'contacto', 'fundacion', 'observaciones', 'activo',
    ];
    const updates = { actualizado_en: new Date() };
    for (const c of campos) { if (req.body[c] !== undefined) updates[c] = req.body[c]; }

    await institucion.update(updates);
    registrarAudit({ req, accion: 'EDITAR', entidad: 'instituciones', entidad_id: institucion.id, antes, despues: institucion.toJSON() });
    res.json({ success: true, data: institucion });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /instituciones/:id
export const eliminar = async (req, res) => {
  try {
    const institucion = await Institucion.findByPk(req.params.id);
    if (!institucion) return res.status(404).json({ success: false, message: 'Institucion no encontrada' });

    // Verificar si tiene participaciones activas
    const participaciones = await Club.count({ where: { institucion_id: institucion.id, activo: true } });
    if (participaciones > 0) {
      return res.status(400).json({
        success: false,
        message: `No se puede eliminar: la institucion tiene ${participaciones} participacion(es) activa(s) en torneos`,
      });
    }

    await institucion.update({ activo: false, actualizado_en: new Date() });
    registrarAudit({ req, accion: 'ELIMINAR', entidad: 'instituciones', entidad_id: institucion.id });
    res.json({ success: true, message: 'Institucion desactivada' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

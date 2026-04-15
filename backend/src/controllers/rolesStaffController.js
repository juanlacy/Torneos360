import { RolStaff } from '../models/index.js';
import { registrarAudit } from '../services/auditService.js';

// GET /roles-staff
export const listar = async (req, res) => {
  try {
    const { activo } = req.query;
    const where = {};
    if (activo !== undefined) where.activo = activo === 'true';

    const roles = await RolStaff.findAll({
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
    const { codigo, nombre, descripcion, icono, color, puede_firmar_alineacion, orden } = req.body;
    if (!nombre) {
      return res.status(400).json({ success: false, message: 'El nombre es requerido' });
    }

    // Generar codigo automaticamente desde el nombre si no se provee
    const codigoFinal = (codigo || nombre)
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');

    // Verificar unicidad
    const existente = await RolStaff.findOne({ where: { codigo: codigoFinal } });
    if (existente) {
      return res.status(400).json({ success: false, message: `Ya existe un rol con codigo "${codigoFinal}"` });
    }

    const rol = await RolStaff.create({
      codigo: codigoFinal,
      nombre: nombre.trim(),
      descripcion: descripcion?.trim() || null,
      icono: icono || null,
      color: color || null,
      puede_firmar_alineacion: puede_firmar_alineacion === true,
      orden: orden || 100,
      es_sistema: false,
      activo: true,
    });

    registrarAudit({ req, accion: 'CREAR', entidad: 'roles_staff', entidad_id: rol.id, despues: rol.toJSON() });
    res.status(201).json({ success: true, data: rol });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /roles-staff/:id
export const actualizar = async (req, res) => {
  try {
    const rol = await RolStaff.findByPk(req.params.id);
    if (!rol) return res.status(404).json({ success: false, message: 'Rol no encontrado' });

    const antes = rol.toJSON();
    const campos = ['nombre', 'descripcion', 'icono', 'color', 'puede_firmar_alineacion', 'orden', 'activo'];
    const updates = { actualizado_en: new Date() };
    for (const c of campos) { if (req.body[c] !== undefined) updates[c] = req.body[c]; }

    // Roles del sistema: no permitir cambiar codigo ni desactivar
    if (rol.es_sistema) {
      delete updates.codigo;
      if (updates.activo === false) {
        return res.status(400).json({ success: false, message: 'Los roles del sistema no se pueden desactivar' });
      }
    }

    await rol.update(updates);
    registrarAudit({ req, accion: 'EDITAR', entidad: 'roles_staff', entidad_id: rol.id, antes, despues: rol.toJSON() });
    res.json({ success: true, data: rol });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /roles-staff/:id  (soft delete)
export const eliminar = async (req, res) => {
  try {
    const rol = await RolStaff.findByPk(req.params.id);
    if (!rol) return res.status(404).json({ success: false, message: 'Rol no encontrado' });

    if (rol.es_sistema) {
      return res.status(400).json({ success: false, message: 'Los roles del sistema no se pueden eliminar' });
    }

    await rol.update({ activo: false, actualizado_en: new Date() });
    registrarAudit({ req, accion: 'ELIMINAR', entidad: 'roles_staff', entidad_id: rol.id });
    res.json({ success: true, message: 'Rol desactivado' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

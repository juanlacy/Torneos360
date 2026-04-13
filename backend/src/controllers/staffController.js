import { Staff, Club } from '../models/index.js';
import { tieneAccesoAlClub } from '../middleware/authMiddleware.js';
import { registrarAudit } from '../services/auditService.js';

// GET /staff
export const listar = async (req, res) => {
  try {
    const { club_id, tipo } = req.query;
    const where = { activo: true };
    if (club_id) where.club_id = club_id;
    if (tipo) where.tipo = tipo;

    const staff = await Staff.findAll({
      where,
      include: [{ model: Club, as: 'club', attributes: ['id', 'nombre', 'nombre_corto'] }],
      order: [['tipo', 'ASC'], ['apellido', 'ASC']],
    });
    res.json({ success: true, data: staff });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /staff
export const crear = async (req, res) => {
  try {
    const { club_id, nombre, apellido, dni, tipo, telefono, email } = req.body;
    if (!club_id || !nombre || !apellido || !dni || !tipo) {
      return res.status(400).json({ success: false, message: 'club_id, nombre, apellido, dni y tipo son requeridos' });
    }
    if (!tieneAccesoAlClub(req, parseInt(club_id))) {
      return res.status(403).json({ success: false, message: 'No tenes acceso a este club' });
    }

    const miembro = await Staff.create({ club_id, nombre: nombre.trim(), apellido: apellido.trim(), dni: dni.trim(), tipo, telefono, email });
    registrarAudit({ req, accion: 'CREAR', entidad: 'staff', entidad_id: miembro.id, despues: miembro.toJSON() });
    res.status(201).json({ success: true, data: miembro });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /staff/:id
export const actualizar = async (req, res) => {
  try {
    const miembro = await Staff.findByPk(req.params.id);
    if (!miembro) return res.status(404).json({ success: false, message: 'Staff no encontrado' });
    if (!tieneAccesoAlClub(req, miembro.club_id)) {
      return res.status(403).json({ success: false, message: 'No tenes acceso' });
    }

    const antes = miembro.toJSON();
    const campos = ['nombre', 'apellido', 'dni', 'tipo', 'telefono', 'email', 'activo'];
    const updates = { actualizado_en: new Date() };
    for (const c of campos) { if (req.body[c] !== undefined) updates[c] = req.body[c]; }

    await miembro.update(updates);
    registrarAudit({ req, accion: 'EDITAR', entidad: 'staff', entidad_id: miembro.id, antes, despues: miembro.toJSON() });
    res.json({ success: true, data: miembro });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /staff/:id
export const eliminar = async (req, res) => {
  try {
    const miembro = await Staff.findByPk(req.params.id);
    if (!miembro) return res.status(404).json({ success: false, message: 'Staff no encontrado' });
    await miembro.update({ activo: false, actualizado_en: new Date() });
    registrarAudit({ req, accion: 'ELIMINAR', entidad: 'staff', entidad_id: miembro.id });
    res.json({ success: true, message: 'Staff desactivado' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

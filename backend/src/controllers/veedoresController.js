import { Veedor } from '../models/index.js';
import { registrarAudit } from '../services/auditService.js';

// GET /veedores
export const listar = async (req, res) => {
  try {
    const { torneo_id } = req.query;
    const where = { activo: true };
    if (torneo_id) where.torneo_id = torneo_id;

    const veedores = await Veedor.findAll({ where, order: [['apellido', 'ASC']] });
    res.json({ success: true, data: veedores });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /veedores
export const crear = async (req, res) => {
  try {
    const { torneo_id, nombre, apellido, dni, telefono, email } = req.body;
    if (!torneo_id || !nombre || !apellido || !dni) {
      return res.status(400).json({ success: false, message: 'torneo_id, nombre, apellido y dni son requeridos' });
    }
    const veedor = await Veedor.create({ torneo_id, nombre: nombre.trim(), apellido: apellido.trim(), dni: dni.trim(), telefono, email });
    registrarAudit({ req, accion: 'CREAR', entidad: 'veedores', entidad_id: veedor.id, despues: veedor.toJSON() });
    res.status(201).json({ success: true, data: veedor });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /veedores/:id
export const actualizar = async (req, res) => {
  try {
    const veedor = await Veedor.findByPk(req.params.id);
    if (!veedor) return res.status(404).json({ success: false, message: 'Veedor no encontrado' });

    const antes = veedor.toJSON();
    const campos = ['nombre', 'apellido', 'dni', 'telefono', 'email', 'activo'];
    const updates = { actualizado_en: new Date() };
    for (const c of campos) { if (req.body[c] !== undefined) updates[c] = req.body[c]; }

    await veedor.update(updates);
    registrarAudit({ req, accion: 'EDITAR', entidad: 'veedores', entidad_id: veedor.id, antes, despues: veedor.toJSON() });
    res.json({ success: true, data: veedor });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /veedores/:id
export const eliminar = async (req, res) => {
  try {
    const veedor = await Veedor.findByPk(req.params.id);
    if (!veedor) return res.status(404).json({ success: false, message: 'Veedor no encontrado' });
    await veedor.update({ activo: false, actualizado_en: new Date() });
    registrarAudit({ req, accion: 'ELIMINAR', entidad: 'veedores', entidad_id: veedor.id });
    res.json({ success: true, message: 'Veedor desactivado' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

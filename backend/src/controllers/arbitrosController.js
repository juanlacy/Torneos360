import { Arbitro } from '../models/index.js';
import { registrarAudit } from '../services/auditService.js';

// GET /arbitros
export const listar = async (req, res) => {
  try {
    const { torneo_id } = req.query;
    const where = { activo: true };
    if (torneo_id) where.torneo_id = torneo_id;

    const arbitros = await Arbitro.findAll({ where, order: [['apellido', 'ASC']] });
    res.json({ success: true, data: arbitros });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /arbitros
export const crear = async (req, res) => {
  try {
    const { torneo_id, nombre, apellido, dni, telefono, email, fecha_nacimiento } = req.body;
    if (!torneo_id || !nombre || !apellido || !dni) {
      return res.status(400).json({ success: false, message: 'torneo_id, nombre, apellido y dni son requeridos' });
    }
    const arbitro = await Arbitro.create({ torneo_id, nombre: nombre.trim(), apellido: apellido.trim(), dni: dni.trim(), telefono, email, fecha_nacimiento: fecha_nacimiento || null });
    registrarAudit({ req, accion: 'CREAR', entidad: 'arbitros', entidad_id: arbitro.id, despues: arbitro.toJSON() });
    res.status(201).json({ success: true, data: arbitro });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /arbitros/:id
export const actualizar = async (req, res) => {
  try {
    const arbitro = await Arbitro.findByPk(req.params.id);
    if (!arbitro) return res.status(404).json({ success: false, message: 'Arbitro no encontrado' });

    const antes = arbitro.toJSON();
    const campos = ['nombre', 'apellido', 'dni', 'telefono', 'email', 'fecha_nacimiento', 'activo'];
    const updates = { actualizado_en: new Date() };
    for (const c of campos) { if (req.body[c] !== undefined) updates[c] = req.body[c]; }

    await arbitro.update(updates);
    registrarAudit({ req, accion: 'EDITAR', entidad: 'arbitros', entidad_id: arbitro.id, antes, despues: arbitro.toJSON() });
    res.json({ success: true, data: arbitro });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /arbitros/:id
export const eliminar = async (req, res) => {
  try {
    const arbitro = await Arbitro.findByPk(req.params.id);
    if (!arbitro) return res.status(404).json({ success: false, message: 'Arbitro no encontrado' });
    await arbitro.update({ activo: false, actualizado_en: new Date() });
    registrarAudit({ req, accion: 'ELIMINAR', entidad: 'arbitros', entidad_id: arbitro.id });
    res.json({ success: true, message: 'Arbitro desactivado' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

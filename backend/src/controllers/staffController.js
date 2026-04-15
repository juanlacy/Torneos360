import { Staff, Club, RolStaff } from '../models/index.js';
import { tieneAccesoAlClub } from '../middleware/authMiddleware.js';
import { registrarAudit } from '../services/auditService.js';

// GET /staff
export const listar = async (req, res) => {
  try {
    const { club_id, tipo, rol_id } = req.query;
    const where = { activo: true };
    if (club_id) where.club_id = club_id;
    if (tipo) where.tipo = tipo;
    if (rol_id) where.rol_id = rol_id;

    const staff = await Staff.findAll({
      where,
      include: [
        { model: Club, as: 'club', attributes: ['id', 'nombre', 'nombre_corto', 'escudo_url', 'color_primario', 'color_secundario'] },
        { model: RolStaff, as: 'rol', attributes: ['id', 'codigo', 'nombre', 'icono', 'color', 'puede_firmar_alineacion'] },
      ],
      order: [['apellido', 'ASC'], ['nombre', 'ASC']],
    });
    res.json({ success: true, data: staff });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /staff
export const crear = async (req, res) => {
  try {
    const { club_id, nombre, apellido, dni, rol_id, tipo, telefono, email, fecha_nacimiento } = req.body;
    if (!club_id || !nombre || !apellido || !dni) {
      return res.status(400).json({ success: false, message: 'club_id, nombre, apellido y dni son requeridos' });
    }
    if (!rol_id && !tipo) {
      return res.status(400).json({ success: false, message: 'Debes indicar un rol_id (o tipo legacy)' });
    }
    if (!tieneAccesoAlClub(req, parseInt(club_id))) {
      return res.status(403).json({ success: false, message: 'No tenes acceso a este club' });
    }

    // Si viene rol_id, sincronizar tipo desde el codigo del rol para mantener compat
    let tipoFinal = tipo;
    if (rol_id) {
      const rol = await RolStaff.findByPk(rol_id);
      if (!rol) return res.status(400).json({ success: false, message: 'Rol no encontrado' });
      tipoFinal = rol.codigo;
    }

    const miembro = await Staff.create({
      club_id,
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      dni: dni.trim(),
      rol_id: rol_id || null,
      tipo: tipoFinal,
      telefono,
      email,
      fecha_nacimiento: fecha_nacimiento || null,
    });

    // Recargar con includes
    const creado = await Staff.findByPk(miembro.id, {
      include: [
        { model: Club, as: 'club', attributes: ['id', 'nombre', 'nombre_corto'] },
        { model: RolStaff, as: 'rol', attributes: ['id', 'codigo', 'nombre', 'icono', 'color'] },
      ],
    });
    registrarAudit({ req, accion: 'CREAR', entidad: 'staff', entidad_id: miembro.id, despues: miembro.toJSON() });
    res.status(201).json({ success: true, data: creado });
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
    const campos = ['nombre', 'apellido', 'dni', 'rol_id', 'telefono', 'email', 'fecha_nacimiento', 'activo'];
    const updates = { actualizado_en: new Date() };
    for (const c of campos) { if (req.body[c] !== undefined) updates[c] = req.body[c]; }

    // Sincronizar tipo con el codigo del nuevo rol
    if (updates.rol_id !== undefined && updates.rol_id !== null) {
      const rol = await RolStaff.findByPk(updates.rol_id);
      if (!rol) return res.status(400).json({ success: false, message: 'Rol no encontrado' });
      updates.tipo = rol.codigo;
    }

    await miembro.update(updates);
    const actualizado = await Staff.findByPk(miembro.id, {
      include: [
        { model: Club, as: 'club', attributes: ['id', 'nombre', 'nombre_corto'] },
        { model: RolStaff, as: 'rol', attributes: ['id', 'codigo', 'nombre', 'icono', 'color'] },
      ],
    });
    registrarAudit({ req, accion: 'EDITAR', entidad: 'staff', entidad_id: miembro.id, antes, despues: miembro.toJSON() });
    res.json({ success: true, data: actualizado });
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

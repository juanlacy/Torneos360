import { Documento } from '../models/index.js';
import { uploadDocumento, processImage, deleteOldFile } from '../services/uploadService.js';

// GET /documentos?entidad_tipo=jugadores&entidad_id=1
export const listar = async (req, res) => {
  try {
    const { entidad_tipo, entidad_id, tipo } = req.query;
    const where = {};
    if (entidad_tipo) where.entidad_tipo = entidad_tipo;
    if (entidad_id) where.entidad_id = entidad_id;
    if (tipo) where.tipo = tipo;

    const docs = await Documento.findAll({ where, order: [['creado_en', 'DESC']] });
    res.json({ success: true, data: docs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /documentos
export const subir = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'Archivo requerido' });

    const { entidad_tipo, entidad_id, tipo, descripcion } = req.body;
    if (!entidad_tipo || !entidad_id || !tipo) {
      return res.status(400).json({ success: false, message: 'entidad_tipo, entidad_id y tipo son requeridos' });
    }

    // Si es imagen, procesar con sharp
    let archivoUrl = `/uploads/documentos/${req.file.filename}`;
    if (req.file.mimetype.startsWith('image/')) {
      archivoUrl = '/uploads' + await processImage(req.file.path, { width: 1200, quality: 85 });
    }

    const doc = await Documento.create({
      entidad_tipo, entidad_id: parseInt(entidad_id), tipo,
      archivo_url: archivoUrl,
      nombre_original: req.file.originalname,
      mime_type: req.file.mimetype,
      tamano: req.file.size,
      descripcion: descripcion || null,
      subido_por: req.user?.id,
    });

    res.status(201).json({ success: true, data: doc });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /documentos/:id
export const eliminar = async (req, res) => {
  try {
    const doc = await Documento.findByPk(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Documento no encontrado' });

    deleteOldFile(doc.archivo_url);
    await doc.destroy();

    res.json({ success: true, message: 'Documento eliminado' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

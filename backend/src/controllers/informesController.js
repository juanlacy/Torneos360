import { InformeArbitro, Partido, Arbitro, Usuario } from '../models/index.js';
import { procesarAudioInforme, resumirTexto } from '../services/iaService.js';
import { registrarAudit } from '../services/auditService.js';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname, join, extname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

// Multer para audios
const audioStorage = multer.diskStorage({
  destination: join(__dirname, '..', '..', 'uploads', 'informes'),
  filename: (req, file, cb) => cb(null, `informe-${Date.now()}${extname(file.originalname)}`),
});
export const uploadAudio = multer({
  storage: audioStorage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
  fileFilter: (req, file, cb) => {
    if (/^audio\/(webm|mp3|mpeg|mp4|wav|ogg|m4a|x-m4a)$/.test(file.mimetype) || file.mimetype === 'video/webm') {
      cb(null, true);
    } else {
      cb(new Error('Solo archivos de audio (webm, mp3, wav, m4a, ogg)'));
    }
  },
}).single('audio');

// GET /informes?partido_id=X
export const listar = async (req, res) => {
  try {
    const { partido_id } = req.query;
    const where = {};
    if (partido_id) where.partido_id = partido_id;

    const informes = await InformeArbitro.findAll({
      where,
      include: [
        { model: Arbitro, as: 'arbitro', attributes: ['id', 'nombre', 'apellido'] },
        { model: Usuario, as: 'usuario', attributes: ['id', 'nombre', 'apellido'] },
      ],
      order: [['creado_en', 'DESC']],
    });
    res.json({ success: true, data: informes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /informes/:id
export const obtener = async (req, res) => {
  try {
    const informe = await InformeArbitro.findByPk(req.params.id, {
      include: [
        { model: Partido, as: 'partido', attributes: ['id', 'goles_local', 'goles_visitante', 'estado'] },
        { model: Arbitro, as: 'arbitro', attributes: ['id', 'nombre', 'apellido'] },
        { model: Usuario, as: 'usuario', attributes: ['id', 'nombre', 'apellido'] },
      ],
    });
    if (!informe) return res.status(404).json({ success: false, message: 'Informe no encontrado' });
    res.json({ success: true, data: informe });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /informes  (crear informe con texto manual)
export const crear = async (req, res) => {
  try {
    const { partido_id, tipo, texto_manual } = req.body;
    if (!partido_id) return res.status(400).json({ success: false, message: 'partido_id es requerido' });

    const partido = await Partido.findByPk(partido_id);
    if (!partido) return res.status(404).json({ success: false, message: 'Partido no encontrado' });

    const informe = await InformeArbitro.create({
      partido_id,
      arbitro_id: partido.arbitro_id,
      usuario_id: req.user.id,
      tipo: tipo || 'general',
      texto_manual,
    });

    registrarAudit({ req, accion: 'CREAR_INFORME', entidad: 'informes_arbitro', entidad_id: informe.id });
    res.status(201).json({ success: true, data: informe });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /informes/:id/audio  (subir audio y transcribir con IA)
export const subirYTranscribir = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'Archivo de audio requerido' });

    const informe = await InformeArbitro.findByPk(req.params.id);
    if (!informe) return res.status(404).json({ success: false, message: 'Informe no encontrado' });

    const audioUrl = `/uploads/informes/${req.file.filename}`;
    const audioPath = req.file.path;

    // Procesar con IA
    try {
      const resultado = await procesarAudioInforme(audioPath);

      await informe.update({
        audio_url: audioUrl,
        transcripcion: resultado.transcripcion,
        resumen: resultado.resumen,
        metadata: { ...informe.metadata, modelo_ia: resultado.modelo, duracion_procesamiento: Date.now() },
        actualizado_en: new Date(),
      });

      res.json({ success: true, data: informe, message: 'Audio transcrito y resumido exitosamente' });
    } catch (iaError) {
      // Guardar el audio aunque falle la IA
      await informe.update({ audio_url: audioUrl, actualizado_en: new Date() });
      res.status(207).json({
        success: true,
        data: informe,
        message: `Audio guardado pero no se pudo transcribir: ${iaError.message}`,
        warning: iaError.message,
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /informes/:id/resumir  (generar resumen de texto existente)
export const generarResumen = async (req, res) => {
  try {
    const informe = await InformeArbitro.findByPk(req.params.id);
    if (!informe) return res.status(404).json({ success: false, message: 'Informe no encontrado' });

    const texto = informe.transcripcion || informe.texto_manual;
    if (!texto) return res.status(400).json({ success: false, message: 'No hay texto para resumir' });

    const resultado = await resumirTexto(texto);
    await informe.update({
      resumen: resultado.resumen,
      metadata: { ...informe.metadata, modelo_resumen: resultado.modelo },
      actualizado_en: new Date(),
    });

    res.json({ success: true, data: informe });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /informes/:id  (actualizar texto, confirmar)
export const actualizar = async (req, res) => {
  try {
    const informe = await InformeArbitro.findByPk(req.params.id);
    if (!informe) return res.status(404).json({ success: false, message: 'Informe no encontrado' });

    const { texto_manual, transcripcion, resumen, tipo, estado } = req.body;
    const updates = { actualizado_en: new Date() };
    if (texto_manual !== undefined) updates.texto_manual = texto_manual;
    if (transcripcion !== undefined) updates.transcripcion = transcripcion;
    if (resumen !== undefined) updates.resumen = resumen;
    if (tipo !== undefined) updates.tipo = tipo;
    if (estado !== undefined) updates.estado = estado;

    await informe.update(updates);
    registrarAudit({ req, accion: 'EDITAR_INFORME', entidad: 'informes_arbitro', entidad_id: informe.id });
    res.json({ success: true, data: informe });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

import multer from 'multer';
import sharp from 'sharp';
import { mkdirSync, existsSync, unlinkSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const UPLOADS_DIR = join(__dirname, '..', '..', 'uploads');

// ─── Multer configs ─────────────────────────────────────────────────────────

const makeStorage = (subdir) => multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = join(UPLOADS_DIR, subdir);
    mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${subdir.replace(/\//g, '-')}-${Date.now()}${extname(file.originalname)}`);
  },
});

const imageFilter = (req, file, cb) => {
  if (/^image\/(jpeg|png|webp|svg\+xml|gif)$/.test(file.mimetype)) cb(null, true);
  else cb(new Error('Solo imagenes JPG, PNG, WebP, SVG o GIF'));
};

const docFilter = (req, file, cb) => {
  if (/^(image|application\/pdf|application\/msword|application\/vnd)/.test(file.mimetype)) cb(null, true);
  else cb(new Error('Solo imagenes, PDF o documentos Word'));
};

// Multer instances
export const uploadEscudo = multer({ storage: makeStorage('escudos'), limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: imageFilter }).single('escudo');
export const uploadFotoJugador = multer({ storage: makeStorage('jugadores'), limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: imageFilter }).single('foto');
export const uploadLogoTorneo = multer({ storage: makeStorage('torneos'), limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: imageFilter }).single('logo');
export const uploadDocumento = multer({ storage: makeStorage('documentos'), limits: { fileSize: 10 * 1024 * 1024 }, fileFilter: docFilter }).single('archivo');
export const uploadAvatar = multer({ storage: makeStorage('avatars'), limits: { fileSize: 2 * 1024 * 1024 }, fileFilter: imageFilter }).single('avatar');

// ─── Procesamiento de imagenes con Sharp ────────────────────────────────────

/**
 * Procesa una imagen: resize, optimizar y convertir a WebP.
 * Guarda junto al original con sufijo .webp.
 * Retorna la URL del archivo procesado.
 *
 * @param {string} filePath - Ruta al archivo original
 * @param {Object} options - { width, height, quality }
 * @returns {string} Ruta relativa del archivo procesado
 */
export const processImage = async (filePath, options = {}) => {
  const { width = 400, height, quality = 80 } = options;

  // No procesar SVGs
  if (filePath.endsWith('.svg')) {
    return filePath.replace(UPLOADS_DIR, '').replace(/\\/g, '/');
  }

  const outputPath = filePath.replace(/\.[^.]+$/, '.webp');

  try {
    let pipeline = sharp(filePath).rotate(); // Auto-rotate basado en EXIF

    if (width || height) {
      pipeline = pipeline.resize(width, height, { fit: 'inside', withoutEnlargement: true });
    }

    await pipeline.webp({ quality }).toFile(outputPath);

    // Borrar original si es diferente
    if (outputPath !== filePath) {
      try { unlinkSync(filePath); } catch {}
    }

    return outputPath.replace(UPLOADS_DIR, '').replace(/\\/g, '/');
  } catch (error) {
    console.error('Error procesando imagen:', error.message);
    // Fallback: devolver original sin procesar
    return filePath.replace(UPLOADS_DIR, '').replace(/\\/g, '/');
  }
};

/**
 * Procesa escudo de club: resize a 200x200 max, webp.
 */
export const processEscudo = (filePath) => processImage(filePath, { width: 200, height: 200, quality: 85 });

/**
 * Procesa foto de jugador: resize a 300x400 max, webp.
 */
export const processFotoJugador = (filePath) => processImage(filePath, { width: 300, height: 400, quality: 80 });

/**
 * Procesa logo de torneo: resize a 400x400 max, webp.
 */
export const processLogoTorneo = (filePath) => processImage(filePath, { width: 400, height: 400, quality: 85 });

/**
 * Procesa avatar de usuario: resize a 150x150, webp.
 */
export const processAvatar = (filePath) => processImage(filePath, { width: 150, height: 150, quality: 80 });

/**
 * Elimina un archivo viejo si existe.
 */
export const deleteOldFile = (relativeUrl) => {
  if (!relativeUrl) return;
  const fullPath = join(UPLOADS_DIR, relativeUrl);
  if (existsSync(fullPath)) {
    try { unlinkSync(fullPath); } catch {}
  }
};

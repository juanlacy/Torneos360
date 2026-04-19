#!/usr/bin/env node
/**
 * Genera los iconos PWA + favicon desde el logo de Torneo360.
 * Usa Sharp para resize.
 *
 * Uso: node generate-icons.js
 */

// Correr desde el directorio backend: cd backend && node ../generate-icons.js
import sharp from 'sharp';
import { mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SOURCE = join(__dirname, 'frontend', 'public', 'Torneos360_Logo_Trans.png');
const ICONS_DIR = join(__dirname, 'frontend', 'public', 'icons');
const FAVICON_DIR = join(__dirname, 'frontend', 'public');

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

(async () => {
  try {
    mkdirSync(ICONS_DIR, { recursive: true });

    console.log('Generando iconos PWA desde Torneos360_Logo_Trans.png...');

    for (const size of SIZES) {
      const output = join(ICONS_DIR, `icon-${size}x${size}.png`);
      await sharp(SOURCE)
        .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toFile(output);
      console.log(`  ✓ icon-${size}x${size}.png`);
    }

    // Favicon (32x32 PNG, luego lo renombramos a .ico — los browsers modernos aceptan PNG como favicon)
    const faviconPng = join(FAVICON_DIR, 'favicon.ico');
    await sharp(SOURCE)
      .resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(faviconPng);
    console.log(`  ✓ favicon.ico (32x32 PNG)`);

    // Apple touch icon (180x180)
    const appleIcon = join(FAVICON_DIR, 'apple-touch-icon.png');
    await sharp(SOURCE)
      .resize(180, 180, { fit: 'contain', background: { r: 118, g: 44, b: 126, alpha: 1 } })
      .png()
      .toFile(appleIcon);
    console.log(`  ✓ apple-touch-icon.png (180x180)`);

    console.log('\n✓ Todos los iconos generados. Hacer build + deploy.');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();

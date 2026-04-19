#!/usr/bin/env node
/**
 * Genera iconos PWA + favicon desde el logo de Torneo360.
 *
 * Para tamaños chicos (<=152) recorta el top del PNG (isotipo: pelota + orbita)
 * porque el texto "TORNEOS360" y el tagline se vuelven ilegibles.
 * Para tamaños grandes (>=192) usa el logo completo.
 *
 * Uso: cd backend && node scripts/generate-icons.js
 */

import sharp from 'sharp';
import { mkdirSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');

const SOURCE = join(ROOT, 'frontend', 'public', 'Torneos360_Logo_Trans.png');
const ICONS_DIR = join(ROOT, 'frontend', 'public', 'icons');
const PUBLIC_DIR = join(ROOT, 'frontend', 'public');

// Fracción superior del PNG a conservar como isotipo (pelota + órbita).
const ISOTIPO_TOP_RATIO = 0.55;

const SIZES_SMALL = [72, 96, 128, 144, 152];  // usan isotipo
const SIZES_LARGE = [192, 384, 512];          // usan logo completo

const PURPLE = { r: 118, g: 44, b: 126, alpha: 1 };

(async () => {
  try {
    mkdirSync(ICONS_DIR, { recursive: true });

    console.log('Generando iconos PWA desde Torneos360_Logo_Trans.png...');

    const meta = await sharp(SOURCE).metadata();
    const cropHeight = Math.floor(meta.height * ISOTIPO_TOP_RATIO);
    const isotipoBuffer = await sharp(SOURCE)
      .extract({ left: 0, top: 0, width: meta.width, height: cropHeight })
      .toBuffer();
    console.log(`  Isotipo cropped: ${meta.width}x${cropHeight} (top ${Math.round(ISOTIPO_TOP_RATIO * 100)}%)`);

    for (const size of SIZES_SMALL) {
      const output = join(ICONS_DIR, `icon-${size}x${size}.png`);
      const inner = Math.floor(size * 0.75);
      const isotipoResized = await sharp(isotipoBuffer)
        .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer();
      await sharp({
        create: { width: size, height: size, channels: 4, background: PURPLE },
      })
        .composite([{ input: isotipoResized, gravity: 'center' }])
        .png()
        .toFile(output);
      console.log(`  ✓ icon-${size}x${size}.png (isotipo)`);
    }

    for (const size of SIZES_LARGE) {
      const output = join(ICONS_DIR, `icon-${size}x${size}.png`);
      const inner = Math.floor(size * 0.85);
      const logoResized = await sharp(SOURCE)
        .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer();
      await sharp({
        create: { width: size, height: size, channels: 4, background: PURPLE },
      })
        .composite([{ input: logoResized, gravity: 'center' }])
        .png()
        .toFile(output);
      console.log(`  ✓ icon-${size}x${size}.png (logo completo)`);
    }

    // Favicon: 32x32 isotipo sobre fondo púrpura
    const faviconOutput = join(PUBLIC_DIR, 'favicon.ico');
    const faviconInner = await sharp(isotipoBuffer)
      .resize(28, 28, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
    await sharp({
      create: { width: 32, height: 32, channels: 4, background: PURPLE },
    })
      .composite([{ input: faviconInner, gravity: 'center' }])
      .png()
      .toFile(faviconOutput);
    console.log(`  ✓ favicon.ico (32x32 isotipo)`);

    // Apple touch icon
    const appleOutput = join(PUBLIC_DIR, 'apple-touch-icon.png');
    const appleInner = await sharp(isotipoBuffer)
      .resize(140, 140, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
    await sharp({
      create: { width: 180, height: 180, channels: 4, background: PURPLE },
    })
      .composite([{ input: appleInner, gravity: 'center' }])
      .png()
      .toFile(appleOutput);
    console.log(`  ✓ apple-touch-icon.png (180x180)`);

    console.log('\n✓ Todos los iconos generados. Hacer build + deploy.');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();

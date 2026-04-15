#!/usr/bin/env node
/**
 * IMPORT — Restaura un torneo completo desde un backup JSON.
 *
 * Toma el archivo `backend/src/seeders/data/torneo-backup-latest.json`
 * (o uno pasado por --file=...) y re-inserta todo en la DB, remapeando
 * los IDs originales a los nuevos para mantener las relaciones intactas.
 *
 * Uso:
 *   cd backend && node src/seeders/import-torneo-backup.js
 *   cd backend && node src/seeders/import-torneo-backup.js --file=torneo-backup-2026-04-15.json
 *   cd backend && node src/seeders/import-torneo-backup.js --force-duplicate   (permite crear torneo duplicado)
 *
 * Por defecto chequea que NO exista un torneo con el mismo nombre+anio y falla si existe.
 * Con --force-duplicate crea igual un torneo nuevo (util para clonar a DEMO).
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  sequelize, Torneo, Zona, Categoria, Club, FixtureJornada, Partido,
} from '../models/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const fileArg = args.find(a => a.startsWith('--file='))?.split('=')[1];
const forceDup = args.includes('--force-duplicate');
const renameArg = args.find(a => a.startsWith('--rename='))?.split('=')[1];

(async () => {
  const t = await sequelize.transaction();
  try {
    console.log('════════════════════════════════════════════════');
    console.log('  IMPORT — Restaurar backup de torneo');
    console.log('════════════════════════════════════════════════\n');

    await sequelize.authenticate();

    // Leer archivo
    const filename = fileArg || 'torneo-backup-latest.json';
    const filepath = path.join(__dirname, 'data', filename);
    if (!fs.existsSync(filepath)) {
      console.error(`✗ Archivo no encontrado: ${filepath}`);
      process.exit(1);
    }
    const backup = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
    console.log(`▶ Archivo: ${filename}`);
    console.log(`▶ Torneo del backup: ${backup.torneo.nombre} ${backup.torneo.anio}`);
    console.log(`▶ Exportado: ${backup.exportado_en}\n`);

    // Verificar si ya existe ese torneo
    const nombreFinal = renameArg || backup.torneo.nombre;
    const existente = await Torneo.findOne({
      where: { nombre: nombreFinal, anio: backup.torneo.anio },
    });
    if (existente && !forceDup) {
      console.error(`✗ Ya existe un torneo "${nombreFinal}" ${backup.torneo.anio}`);
      console.error('  Usa --rename=NUEVO_NOMBRE o --force-duplicate para continuar.');
      process.exit(1);
    }

    // 1) Crear torneo
    const torneo = await Torneo.create({
      nombre: nombreFinal,
      anio: backup.torneo.anio,
      fecha_inicio: backup.torneo.fecha_inicio,
      fecha_fin: backup.torneo.fecha_fin,
      estado: backup.torneo.estado,
      logo_url: backup.torneo.logo_url,
      favicon_url: backup.torneo.favicon_url,
      color_primario: backup.torneo.color_primario,
      color_secundario: backup.torneo.color_secundario,
      color_acento: backup.torneo.color_acento,
      config: backup.torneo.config || {},
    }, { transaction: t });
    console.log(`✓ Torneo creado (id=${torneo.id})`);

    // Mapa de remapeo: id_viejo → id_nuevo
    const mapZonas      = new Map();
    const mapCategorias = new Map();
    const mapClubes     = new Map();
    const mapJornadas   = new Map();

    // 2) Zonas
    for (const z of backup.zonas) {
      const creado = await Zona.create({
        torneo_id: torneo.id,
        nombre: z.nombre,
        color: z.color,
        orden: z.orden,
      }, { transaction: t });
      mapZonas.set(z._id_original, creado.id);
    }
    console.log(`✓ Zonas: ${backup.zonas.length}`);

    // 3) Categorias
    for (const c of backup.categorias) {
      const creado = await Categoria.create({
        torneo_id: torneo.id,
        nombre: c.nombre,
        anio_nacimiento: c.anio_nacimiento,
        es_preliminar: c.es_preliminar,
        max_jugadores: c.max_jugadores,
        orden: c.orden,
      }, { transaction: t });
      mapCategorias.set(c._id_original, creado.id);
    }
    console.log(`✓ Categorias: ${backup.categorias.length}`);

    // 4) Clubes
    for (const c of backup.clubes) {
      const creado = await Club.create({
        torneo_id: torneo.id,
        zona_id: c._zona_id_original ? mapZonas.get(c._zona_id_original) : null,
        nombre: c.nombre,
        nombre_corto: c.nombre_corto,
        color_primario: c.color_primario,
        color_secundario: c.color_secundario,
        escudo_url: c.escudo_url,
        contacto: c.contacto,
        activo: c.activo,
      }, { transaction: t });
      mapClubes.set(c._id_original, creado.id);
    }
    console.log(`✓ Clubes: ${backup.clubes.length}`);

    // 5) Jornadas
    for (const j of backup.jornadas) {
      const creado = await FixtureJornada.create({
        torneo_id: torneo.id,
        zona_id: j._zona_id_original ? mapZonas.get(j._zona_id_original) : null,
        numero_jornada: j.numero_jornada,
        fase: j.fase,
        fecha: j.fecha,
        estado: j.estado,
      }, { transaction: t });
      mapJornadas.set(j._id_original, creado.id);
    }
    console.log(`✓ Jornadas: ${backup.jornadas.length}`);

    // 6) Partidos (remapear todas las FKs)
    let partidosOk = 0;
    for (const p of backup.partidos) {
      const jornadaId = mapJornadas.get(p._jornada_id_original);
      const categoriaId = mapCategorias.get(p._categoria_id_original);
      const localId = mapClubes.get(p._club_local_id_original);
      const visitanteId = mapClubes.get(p._club_visitante_id_original);

      if (!jornadaId || !categoriaId || !localId || !visitanteId) {
        console.warn(`  ⚠ Partido omitido (FK faltante): ${JSON.stringify(p)}`);
        continue;
      }

      await Partido.create({
        jornada_id: jornadaId,
        categoria_id: categoriaId,
        club_local_id: localId,
        club_visitante_id: visitanteId,
        estado: 'programado', // siempre se importa como programado
        cancha: p.cancha,
      }, { transaction: t });
      partidosOk++;
    }
    console.log(`✓ Partidos: ${partidosOk}`);

    await t.commit();

    console.log('\n════════════════════════════════════════════════');
    console.log('  Backup restaurado correctamente');
    console.log('════════════════════════════════════════════════');
    console.log(`  Nuevo torneo id: ${torneo.id}`);
    console.log('  Los partidos se importaron en estado "programado".');
    console.log('  Para poblar personas: node src/seeders/cafi-2026-personas.js');
    console.log('════════════════════════════════════════════════\n');

    process.exit(0);
  } catch (err) {
    await t.rollback();
    console.error('\n✗ Error (transaccion rollback):', err.message);
    console.error(err.stack);
    process.exit(1);
  }
})();

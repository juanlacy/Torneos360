#!/usr/bin/env node
/**
 * EXPORT — Lee el torneo actual de la DB y genera un JSON con:
 *   torneo + zonas + categorias + clubes + fixture_jornadas + partidos
 *
 * El JSON se guarda en `backend/src/seeders/data/torneo-backup-<timestamp>.json`
 * Ese archivo se commitea al repo como backup restaurable.
 *
 * No incluye personas, eventos ni alineaciones (se asume que son transaccionales
 * y se regeneran con el seeder de personas de demo).
 *
 * Uso:
 *   cd backend && node src/seeders/export-torneo-backup.js
 *   cd backend && node src/seeders/export-torneo-backup.js --torneo-id=1
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  sequelize, Torneo, Zona, Categoria, Club, Institucion, FixtureJornada, Partido,
} from '../models/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const torneoIdArg = args.find(a => a.startsWith('--torneo-id='))?.split('=')[1];

(async () => {
  try {
    console.log('════════════════════════════════════════════════');
    console.log('  EXPORT — Backup del torneo (clubes + fixture)');
    console.log('════════════════════════════════════════════════\n');

    await sequelize.authenticate();

    // Obtener torneo
    const torneo = torneoIdArg
      ? await Torneo.findByPk(parseInt(torneoIdArg))
      : await Torneo.findOne({ order: [['creado_en', 'DESC']] });

    if (!torneo) {
      console.error('✗ No se encontro el torneo');
      process.exit(1);
    }
    console.log(`▶ Torneo: ${torneo.nombre} (id=${torneo.id}, anio=${torneo.anio})`);

    // Traer todo lo relacionado
    const zonas       = await Zona.findAll({ where: { torneo_id: torneo.id }, order: [['id', 'ASC']] });
    const categorias  = await Categoria.findAll({ where: { torneo_id: torneo.id }, order: [['id', 'ASC']] });
    const clubes      = await Club.findAll({
      where: { torneo_id: torneo.id },
      include: [{ model: Institucion, as: 'institucion' }],
      order: [['id', 'ASC']],
    });

    // Instituciones que participan en este torneo (se exportan aparte para permitir
    // crearlas o reutilizarlas en otros torneos al importar)
    const institucionIds = [...new Set(clubes.map(c => c.institucion_id))];
    const instituciones = await Institucion.findAll({
      where: { id: institucionIds },
      order: [['id', 'ASC']],
    });
    const jornadas    = await FixtureJornada.findAll({ where: { torneo_id: torneo.id }, order: [['id', 'ASC']] });

    const jornadaIds = jornadas.map(j => j.id);
    const partidos = jornadaIds.length
      ? await Partido.findAll({
          where: { jornada_id: jornadaIds },
          order: [['id', 'ASC']],
        })
      : [];

    console.log(`▶ Zonas: ${zonas.length}`);
    console.log(`▶ Categorias: ${categorias.length}`);
    console.log(`▶ Instituciones: ${instituciones.length}`);
    console.log(`▶ Clubes (participaciones): ${clubes.length}`);
    console.log(`▶ Jornadas: ${jornadas.length}`);
    console.log(`▶ Partidos: ${partidos.length}`);

    // Armar el backup (sin timestamps ni IDs auto — se regeneran en import por nombre)
    const backup = {
      version: 1,
      exportado_en: new Date().toISOString(),
      torneo: {
        nombre: torneo.nombre,
        anio: torneo.anio,
        fecha_inicio: torneo.fecha_inicio,
        fecha_fin: torneo.fecha_fin,
        estado: torneo.estado,
        logo_url: torneo.logo_url,
        favicon_url: torneo.favicon_url,
        color_primario: torneo.color_primario,
        color_secundario: torneo.color_secundario,
        color_acento: torneo.color_acento,
        config: torneo.config,
      },
      zonas: zonas.map(z => ({
        _id_original: z.id,
        nombre: z.nombre,
        color: z.color,
        orden: z.orden,
      })),
      categorias: categorias.map(c => ({
        _id_original: c.id,
        nombre: c.nombre,
        anio_nacimiento: c.anio_nacimiento,
        es_preliminar: c.es_preliminar,
        max_jugadores: c.max_jugadores,
        orden: c.orden,
      })),
      instituciones: instituciones.map(i => ({
        _id_original: i.id,
        nombre: i.nombre,
        nombre_corto: i.nombre_corto,
        escudo_url: i.escudo_url,
        color_primario: i.color_primario,
        color_secundario: i.color_secundario,
        cuit: i.cuit,
        direccion: i.direccion,
        contacto: i.contacto,
        fundacion: i.fundacion,
        observaciones: i.observaciones,
        activo: i.activo,
      })),
      clubes: clubes.map(c => ({
        _id_original: c.id,
        _institucion_id_original: c.institucion_id,
        _zona_id_original: c.zona_id,
        nombre_override: c.nombre_override,
        activo: c.activo,
      })),
      jornadas: jornadas.map(j => ({
        _id_original: j.id,
        _zona_id_original: j.zona_id,
        numero_jornada: j.numero_jornada,
        fase: j.fase,
        fecha: j.fecha,
        estado: j.estado,
      })),
      partidos: partidos.map(p => ({
        _id_original: p.id,
        _jornada_id_original: p.jornada_id,
        _categoria_id_original: p.categoria_id,
        _club_local_id_original: p.club_local_id,
        _club_visitante_id_original: p.club_visitante_id,
        estado: p.estado,
        cancha: p.cancha,
      })),
    };

    // Guardar a archivo
    const dataDir = path.join(__dirname, 'data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `torneo-backup-${torneo.anio}-${timestamp}.json`;
    const filepath = path.join(dataDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(backup, null, 2), 'utf-8');

    // Tambien un "latest" para referencia
    const latestPath = path.join(dataDir, `torneo-backup-latest.json`);
    fs.writeFileSync(latestPath, JSON.stringify(backup, null, 2), 'utf-8');

    const sizeKB = (fs.statSync(filepath).size / 1024).toFixed(1);

    console.log('\n════════════════════════════════════════════════');
    console.log('  Backup exportado');
    console.log('════════════════════════════════════════════════');
    console.log(`  Archivo: src/seeders/data/${filename}`);
    console.log(`  Tamano:  ${sizeKB} KB`);
    console.log(`  (tambien copiado a torneo-backup-latest.json)`);
    console.log('\n  Siguiente paso:');
    console.log('    git add backend/src/seeders/data/');
    console.log('    git commit -m "chore: backup de torneo + fixture"');
    console.log('    git push');
    console.log('════════════════════════════════════════════════\n');

    process.exit(0);
  } catch (err) {
    console.error('\n✗ Error:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
})();

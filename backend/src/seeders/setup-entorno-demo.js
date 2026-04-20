#!/usr/bin/env node
/**
 * SETUP COMPLETO DEL ENTORNO — idempotente a nivel de ejecucion.
 *
 * Deja la DB con:
 *   1. CAFI 2026      → fixture completo + fechas calendario, SIN personas
 *   2. CAFI 2026 DEMO → mismo fixture + personas + 6 IDA simuladas
 *
 * Pasos:
 *   1. Asegura usuario admin (por email) para que sobreviva al reset
 *   2. Reset de datos
 *   3. Import backup → 'CAFI 2026'
 *   4. Import backup → 'CAFI 2026 DEMO' (force-duplicate)
 *   5. Asigna fechas calendario (sabados consecutivos) a ambos
 *   6. Carga personas en DEMO
 *   7. Simula 6 primeras fechas IDA en DEMO
 *
 * Uso:
 *   cd backend && node src/seeders/setup-entorno-demo.js --start=2026-04-04 --apply
 *
 * Flags:
 *   --start=YYYY-MM-DD    primer sabado del torneo (default 2026-04-04)
 *   --intervalo=7         dias entre jornadas (default 7)
 *   --backup=FILE         archivo backup (default torneo-backup-latest.json)
 *   --admin-email=EMAIL   email del admin a crear (default juan.lacy@gmail.com)
 *   --admin-pass=PASS     password del admin (default admin123)
 *   --apply               sin esto es dry-run (no cambia nada)
 */

import 'dotenv/config';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcrypt';
import { fileURLToPath } from 'url';
import {
  sequelize, Usuario, Torneo, FixtureJornada,
} from '../models/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKEND_DIR = path.resolve(__dirname, '..', '..');

const args = process.argv.slice(2);
const getArg = (name, def) => {
  const found = args.find(a => a.startsWith(`--${name}=`));
  return found ? found.split('=')[1] : def;
};
const APPLY = args.includes('--apply');
const START = getArg('start', '2026-04-04');
const INTERVALO = parseInt(getArg('intervalo', '7'));
const BACKUP_FILE = getArg('backup', 'torneo-backup-latest.json');
const ADMIN_EMAIL = getArg('admin-email', 'juan.lacy@gmail.com');
const ADMIN_PASS = getArg('admin-pass', 'admin123');

const banner = (title) => {
  const line = '═'.repeat(Math.max(50, title.length + 4));
  console.log(`\n${line}\n  ${title}\n${line}`);
};

const run = (cmd) => {
  console.log(`$ ${cmd}`);
  if (!APPLY) return;
  execSync(cmd, { cwd: BACKEND_DIR, stdio: 'inherit' });
};

// Devuelve fecha ISO (YYYY-MM-DD) sumando N dias a una fecha base
const addDays = (isoDate, days) => {
  const d = new Date(isoDate + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

(async () => {
  banner('SETUP ENTORNO DEMO' + (APPLY ? '' : ' (DRY RUN)'));
  console.log(`  Admin:     ${ADMIN_EMAIL}`);
  console.log(`  Start:     ${START}`);
  console.log(`  Intervalo: ${INTERVALO} dias`);
  console.log(`  Backup:    ${BACKUP_FILE}`);
  if (!APPLY) console.log(`\n  [DRY RUN] — agregar --apply para ejecutar\n`);

  try {
    await sequelize.authenticate();

    // ══ Paso 1: asegurar admin ═══════════════════════════════════════════
    banner('1/7 — Asegurar usuario admin');
    if (APPLY) {
      const existing = await Usuario.findOne({ where: { email: ADMIN_EMAIL } });
      if (existing) {
        console.log(`  ✓ Admin ya existe: id=${existing.id} email=${existing.email}`);
      } else {
        const u = await Usuario.create({
          nombre: 'Admin', apellido: 'Sistema',
          email: ADMIN_EMAIL,
          password_hash: await bcrypt.hash(ADMIN_PASS, 12),
          rol: 'admin_sistema', activo: true, email_verificado: true,
        });
        console.log(`  ✓ Admin creado id=${u.id} email=${u.email}`);
        console.log(`    Password inicial: ${ADMIN_PASS}`);
      }
    } else {
      console.log('  [dry] crearia admin si no existe');
    }

    // ══ Paso 2: reset ════════════════════════════════════════════════════
    banner('2/7 — Reset de datos');
    run('node src/seeders/reset-datos.js --apply --i-know-what-im-doing');

    // ══ Paso 3: import CAFI 2026 ════════════════════════════════════════
    banner('3/7 — Import CAFI 2026 (limpio)');
    run(`node src/seeders/import-torneo-backup.js --file="${BACKUP_FILE}" --rename="CAFI 2026"`);

    // ══ Paso 4: import CAFI 2026 DEMO ═══════════════════════════════════
    banner('4/7 — Import CAFI 2026 DEMO');
    run(`node src/seeders/import-torneo-backup.js --file="${BACKUP_FILE}" --rename="CAFI 2026 DEMO" --force-duplicate`);

    // ══ Paso 5: asignar fechas calendario ═══════════════════════════════
    banner('5/7 — Asignar fechas calendario a ambos torneos');
    if (APPLY) {
      const torneos = await Torneo.findAll({ where: { nombre: ['CAFI 2026', 'CAFI 2026 DEMO'] }, raw: true });
      for (const t of torneos) {
        const jornadas = await FixtureJornada.findAll({
          where: { torneo_id: t.id },
          order: [['fase', 'ASC'], ['numero_jornada', 'ASC']],
        });
        // Mapear (fase, numero) -> idx para asignar la misma fecha a todas las jornadas de la misma "fecha" (ambas zonas)
        const fechaByKey = new Map();
        let idx = 0;
        for (const j of jornadas) {
          const key = `${j.fase}-${j.numero_jornada}`;
          if (!fechaByKey.has(key)) {
            fechaByKey.set(key, addDays(START, idx * INTERVALO));
            idx++;
          }
        }
        for (const j of jornadas) {
          const key = `${j.fase}-${j.numero_jornada}`;
          await j.update({ fecha: fechaByKey.get(key) });
        }
        console.log(`  ✓ Torneo "${t.nombre}" (id=${t.id}): ${jornadas.length} jornadas, ${fechaByKey.size} fechas asignadas`);
      }
    } else {
      console.log('  [dry] asignaria sabados consecutivos desde ' + START);
    }

    // ══ Paso 6: personas en DEMO ════════════════════════════════════════
    banner('6/7 — Cargar personas en CAFI 2026 DEMO');
    let demoId = null;
    if (APPLY) {
      const demo = await Torneo.findOne({ where: { nombre: 'CAFI 2026 DEMO' } });
      if (!demo) throw new Error('No se encontro CAFI 2026 DEMO');
      demoId = demo.id;
      console.log(`  DEMO torneo_id=${demoId}`);
    }
    run(`node src/seeders/cafi-2026-personas.js --torneo-id=${demoId || '<DEMO_ID>'}`);

    // ══ Paso 7: simular 6 IDA en DEMO ════════════════════════════════════
    banner('7/7 — Simular 6 fechas IDA en CAFI 2026 DEMO');
    run(`node src/seeders/simular-fechas-demo.js --torneo-id=${demoId || '<DEMO_ID>'} --fase=ida --hasta-fecha=6`);

    banner('✓ SETUP COMPLETO');
    if (APPLY) {
      console.log('\n  Login: ' + ADMIN_EMAIL + '  /  ' + ADMIN_PASS);
      console.log('  Cambia la password despues desde /perfil\n');
    }
    process.exit(0);
  } catch (err) {
    console.error('\n✗ ERROR:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
})();

#!/usr/bin/env node
/**
 * CONSOLIDACION — Detecta instituciones con el patron "NOMBRE X" (donde X es
 * un sufijo corto como "A", "B", "C", "Reserva") y las fusiona en una sola
 * institucion base + clubes con sufijos.
 *
 * Ejemplo:
 *   Antes:
 *     institucion "12 de Octubre "A"" → club id=5 en CAFI 2026
 *     institucion "12 de Octubre "B"" → club id=6 en CAFI 2026
 *
 *   Despues:
 *     institucion "12 de Octubre" (base)
 *       → club id=5 en CAFI 2026, sufijo='A'
 *       → club id=6 en CAFI 2026, sufijo='B'
 *     (las instituciones "A" y "B" quedan desactivadas o se eliminan)
 *
 * Patron detectado (regex): /^(.+?)\s*"?([A-Z]|Reserva|Juvenil|Senior)"?$/
 *
 * Modo dry-run: por defecto NO ejecuta cambios, solo muestra que haria.
 * Pasar --apply para aplicar los cambios.
 *
 * Uso:
 *   cd backend && node src/seeders/consolidar-instituciones-sufijo.js
 *   cd backend && node src/seeders/consolidar-instituciones-sufijo.js --apply
 */

import 'dotenv/config';
import { sequelize, Institucion, Club, PersonaRol } from '../models/index.js';

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');

// Patron: captura la "base" y el "sufijo" de nombres como:
//   12 de Octubre "A"
//   12 de Octubre A
//   CALE Reserva
//   Atletico Juvenil
const SUFIJOS_VALIDOS = ['A', 'B', 'C', 'D', 'E', 'F', 'Reserva', 'Juvenil', 'Senior', 'Infantil'];
const PATRON = new RegExp(`^(.+?)\\s+"?(${SUFIJOS_VALIDOS.join('|')})"?\\s*$`, 'i');

const parseNombre = (nombre) => {
  const match = nombre.trim().match(PATRON);
  if (!match) return null;
  return {
    base: match[1].trim(),
    sufijo: match[2].trim().charAt(0).toUpperCase() + match[2].trim().slice(1).toLowerCase(),
  };
};

(async () => {
  try {
    console.log('════════════════════════════════════════════════');
    console.log(`  CONSOLIDACION de instituciones con sufijo ${APPLY ? '(APPLY)' : '(DRY RUN)'}`);
    console.log('════════════════════════════════════════════════\n');

    await sequelize.authenticate();

    // 1) Buscar todas las instituciones que matcheen el patron
    const todas = await Institucion.findAll({ order: [['nombre', 'ASC']] });
    const candidatas = [];

    for (const inst of todas) {
      const parsed = parseNombre(inst.nombre);
      if (parsed) candidatas.push({ institucion: inst, ...parsed });
    }

    if (candidatas.length === 0) {
      console.log('✓ No hay instituciones con sufijo detectable. Nada para hacer.');
      process.exit(0);
    }

    console.log(`▶ Candidatas detectadas: ${candidatas.length}\n`);

    // 2) Agrupar por base
    const grupos = new Map();
    for (const c of candidatas) {
      if (!grupos.has(c.base)) grupos.set(c.base, []);
      grupos.get(c.base).push(c);
    }

    // 3) Mostrar plan
    console.log('─── Plan de consolidacion ───────────────────────');
    for (const [base, items] of grupos.entries()) {
      console.log(`\n▶ "${base}"`);
      for (const it of items) {
        console.log(`    - "${it.institucion.nombre}" (id=${it.institucion.id}) → sufijo="${it.sufijo}"`);
      }
    }
    console.log('\n─────────────────────────────────────────────────\n');

    if (!APPLY) {
      console.log('⚠  Modo DRY RUN. No se aplicaron cambios.');
      console.log('   Para ejecutar los cambios, corre:');
      console.log('   node src/seeders/consolidar-instituciones-sufijo.js --apply\n');
      process.exit(0);
    }

    // 4) Aplicar cambios
    const t = await sequelize.transaction();
    try {
      let consolidadas = 0;
      let clubesActualizados = 0;
      let personasActualizadas = 0;

      for (const [base, items] of grupos.entries()) {
        // Buscar o crear la institucion base
        let baseInst = await Institucion.findOne({ where: { nombre: base }, transaction: t });

        if (!baseInst) {
          // Usar los datos visuales de la primera candidata como plantilla para la base
          const primera = items[0].institucion;
          baseInst = await Institucion.create({
            nombre: base,
            nombre_corto: primera.nombre_corto,
            escudo_url: primera.escudo_url,
            color_primario: primera.color_primario,
            color_secundario: primera.color_secundario,
            cuit: primera.cuit,
            direccion: primera.direccion,
            contacto: primera.contacto || {},
            fundacion: primera.fundacion,
            observaciones: primera.observaciones,
            activo: true,
          }, { transaction: t });
          console.log(`  + Creada institucion base: "${base}" (id=${baseInst.id})`);
        } else {
          console.log(`  ✓ Institucion base ya existe: "${base}" (id=${baseInst.id})`);
        }

        // Migrar cada candidata a la base
        for (const it of items) {
          const oldId = it.institucion.id;
          if (oldId === baseInst.id) continue;

          // Mover los clubes: apuntarlos a baseInst.id con sufijo={it.sufijo}
          const clubesDelOld = await Club.findAll({
            where: { institucion_id: oldId },
            transaction: t,
          });

          for (const club of clubesDelOld) {
            // Verificar si ya existe un club (baseInst, torneo, sufijo) — seria un choque
            const conflicto = await Club.findOne({
              where: {
                institucion_id: baseInst.id,
                torneo_id: club.torneo_id,
                sufijo: it.sufijo,
              },
              transaction: t,
            });

            if (conflicto && conflicto.id !== club.id) {
              console.warn(`    ⚠ Conflicto: ya existe un club (base=${baseInst.id}, torneo=${club.torneo_id}, sufijo=${it.sufijo}). Saltando club id=${club.id}.`);
              continue;
            }

            await club.update({
              institucion_id: baseInst.id,
              sufijo: it.sufijo,
            }, { transaction: t });
            clubesActualizados++;
          }

          // PersonaRoles ya apuntan al club_id, no al institucion_id — no hay que tocarlos
          // (pero los contamos informativamente via los clubes)
          const pCount = await PersonaRol.count({
            where: { club_id: clubesDelOld.map(c => c.id) },
            transaction: t,
          });
          personasActualizadas += pCount;

          // Desactivar la institucion vieja
          await it.institucion.update({
            activo: false,
            nombre: `${it.institucion.nombre} [CONSOLIDADA en id=${baseInst.id}]`,
            actualizado_en: new Date(),
          }, { transaction: t });
          consolidadas++;
        }
      }

      await t.commit();

      console.log('\n════════════════════════════════════════════════');
      console.log('  Consolidacion aplicada');
      console.log('════════════════════════════════════════════════');
      console.log(`  Instituciones consolidadas:  ${consolidadas}`);
      console.log(`  Clubes actualizados:         ${clubesActualizados}`);
      console.log(`  PersonaRoles afectados:      ${personasActualizadas} (no requieren cambios)`);
      console.log('════════════════════════════════════════════════\n');

      process.exit(0);
    } catch (err) {
      await t.rollback();
      throw err;
    }
  } catch (err) {
    console.error('\n✗ Error:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
})();

/**
 * Script de generacion de fixture: Torneo CAFI 2026
 *
 * Genera el fixture usando el algoritmo round-robin (Berger)
 * para los 28 clubes reales del torneo (14 Blanca + 14 Celeste).
 *
 * Resultado por zona (14 equipos):
 *   - 13 jornadas de IDA (7 partidos por jornada)
 *   - 13 jornadas de VUELTA (7 partidos, local/visitante invertidos)
 *   - Total por zona: 26 jornadas x 7 categorias = 1.274 partidos
 *   - Total del torneo: 2.548 partidos
 *
 * Uso: cd backend && node src/seeders/cafi-2026-fixture.js
 */

import 'dotenv/config';
import { sequelize } from '../config/db.js';
import { Torneo } from '../models/Torneo.js';
import { FixtureJornada } from '../models/FixtureJornada.js';
import { Partido } from '../models/Partido.js';
import { Club } from '../models/Club.js';
import { Categoria } from '../models/Categoria.js';
import { Zona } from '../models/Zona.js';

// Fechas reales del fixture CAFI 2026 (sabados)
const FECHAS_IDA = [
  '2026-04-25', '2026-05-02', '2026-05-09', '2026-05-16', '2026-05-23',
  '2026-05-30', '2026-06-06', '2026-06-13', '2026-06-27', '2026-07-04',
  '2026-07-11', '2026-07-18', '2026-07-25',
];
const FECHAS_VUELTA = [
  '2026-08-01', '2026-08-08', '2026-08-15', '2026-08-22', '2026-08-29',
  '2026-09-05', '2026-09-12', '2026-09-19', '2026-09-26', '2026-10-03',
  '2026-10-10', '2026-10-17', '2026-10-24',
];

/**
 * Algoritmo de Berger para round-robin con N equipos.
 * Retorna array de rondas, cada una con pares [localId, visitanteId].
 */
function generarRoundRobin(ids) {
  const teams = [...ids];
  if (teams.length % 2 !== 0) teams.push(null);

  const n = teams.length;
  const rounds = [];
  const fixed = teams[0];
  const rotating = teams.slice(1);

  for (let round = 0; round < n - 1; round++) {
    const pairs = [];

    // Equipo fijo vs primero del array rotante
    if (fixed !== null && rotating[0] !== null) {
      if (round % 2 === 0) pairs.push([fixed, rotating[0]]);
      else pairs.push([rotating[0], fixed]);
    }

    // Los demas se emparejan de los extremos hacia el centro
    for (let i = 1; i < n / 2; i++) {
      const home = rotating[i];
      const away = rotating[n - 2 - i];
      if (home !== null && away !== null) pairs.push([home, away]);
    }

    rounds.push(pairs);
    rotating.unshift(rotating.pop());
  }

  return rounds;
}

// ─── Main ───────────────────────────────────────────────────────────────────

(async () => {
  try {
    await sequelize.authenticate();
    console.log('Conectado a la base de datos');

    // Buscar torneo
    const torneo = await Torneo.findOne({ where: { nombre: 'CAFI 2026' } });
    if (!torneo) { console.error('Torneo CAFI 2026 no encontrado. Correr primero cafi-2026-data.js'); process.exit(1); }

    // Verificar que no exista fixture
    const existente = await FixtureJornada.count({ where: { torneo_id: torneo.id } });
    if (existente > 0) {
      console.log(`Ya existe fixture (${existente} jornadas). Eliminar primero si desea regenerar.`);
      console.log('Para eliminar: DELETE FROM partidos WHERE jornada_id IN (SELECT id FROM fixture_jornadas WHERE torneo_id = ' + torneo.id + '); DELETE FROM fixture_jornadas WHERE torneo_id = ' + torneo.id + ';');
      process.exit(0);
    }

    const zonas = await Zona.findAll({ where: { torneo_id: torneo.id } });
    const categorias = await Categoria.findAll({ where: { torneo_id: torneo.id }, order: [['orden', 'ASC']] });

    if (!categorias.length) { console.error('No hay categorias. Correr primero cafi-2026-data.js'); process.exit(1); }

    let totalJornadas = 0;
    let totalPartidos = 0;

    for (const zona of zonas) {
      const clubes = await Club.findAll({
        where: { torneo_id: torneo.id, zona_id: zona.id, activo: true },
        order: [['id', 'ASC']],
      });

      console.log(`\nZona ${zona.nombre}: ${clubes.length} clubes`);
      clubes.forEach((c, i) => console.log(`  ${i + 1}. ${c.nombre}`));

      if (clubes.length < 2) continue;

      const rounds = generarRoundRobin(clubes.map(c => c.id));

      // ─── IDA ────────────────────────────────────────────────────
      console.log(`\n  Generando IDA (${rounds.length} jornadas)...`);
      for (let i = 0; i < rounds.length; i++) {
        const jornada = await FixtureJornada.create({
          torneo_id: torneo.id,
          zona_id: zona.id,
          numero_jornada: i + 1,
          fase: 'ida',
          fecha: FECHAS_IDA[i] || null,
        });
        totalJornadas++;

        for (const [localId, visitanteId] of rounds[i]) {
          for (const cat of categorias) {
            await Partido.create({
              jornada_id: jornada.id,
              categoria_id: cat.id,
              club_local_id: localId,
              club_visitante_id: visitanteId,
            });
            totalPartidos++;
          }
        }

        const matchups = rounds[i].map(([l, v]) => {
          const local = clubes.find(c => c.id === l);
          const visit = clubes.find(c => c.id === v);
          return `${local?.nombre_corto} vs ${visit?.nombre_corto}`;
        }).join(', ');
        console.log(`    Fecha ${i + 1} (${FECHAS_IDA[i] || 'sin fecha'}): ${matchups}`);
      }

      // ─── VUELTA ─────────────────────────────────────────────────
      console.log(`\n  Generando VUELTA (${rounds.length} jornadas)...`);
      for (let i = 0; i < rounds.length; i++) {
        const jornada = await FixtureJornada.create({
          torneo_id: torneo.id,
          zona_id: zona.id,
          numero_jornada: i + 1,
          fase: 'vuelta',
          fecha: FECHAS_VUELTA[i] || null,
        });
        totalJornadas++;

        for (const [localId, visitanteId] of rounds[i]) {
          for (const cat of categorias) {
            await Partido.create({
              jornada_id: jornada.id,
              categoria_id: cat.id,
              club_local_id: visitanteId,    // invertido
              club_visitante_id: localId,    // invertido
            });
            totalPartidos++;
          }
        }
        console.log(`    Fecha ${i + 1} vuelta (${FECHAS_VUELTA[i] || 'sin fecha'})`);
      }
    }

    console.log('\n════════════════════════════════════════════════');
    console.log('   FIXTURE GENERADO');
    console.log('════════════════════════════════════════════════');
    console.log(`   Torneo:    ${torneo.nombre}`);
    console.log(`   Zonas:     ${zonas.length}`);
    console.log(`   Jornadas:  ${totalJornadas} (${totalJornadas / 2} ida + ${totalJornadas / 2} vuelta)`);
    console.log(`   Partidos:  ${totalPartidos}`);
    console.log(`   Por jornada: ${categorias.length} partidos (1 por categoria)`);
    console.log('════════════════════════════════════════════════\n');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();

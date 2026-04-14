/**
 * Script de carga del fixture REAL del torneo CAFI 2026
 * Extraido de las imagenes de fixture en Doc/
 *
 * IMPORTANTE: Primero elimina el fixture existente si lo hay.
 *
 * La VUELTA se genera automaticamente invirtiendo local/visitante.
 *
 * Uso: cd backend && node src/seeders/cafi-2026-fixture-real.js
 */

import 'dotenv/config';
import { sequelize } from '../config/db.js';
import { Torneo } from '../models/Torneo.js';
import { FixtureJornada } from '../models/FixtureJornada.js';
import { Partido } from '../models/Partido.js';
import { Club } from '../models/Club.js';
import { Categoria } from '../models/Categoria.js';
import { Zona } from '../models/Zona.js';

// Horarios fijos por categoria
const HORARIOS = {
  2013: '14:00', 2019: '15:00', 2014: '16:00', 2018: '17:00',
  2017: '18:00', 2016: '19:00', 2015: '20:00',
};

// ═══════════════════════════════════════════════════════════════════════════
// FIXTURE ZONA BLANCA — IDA
// Cada fecha: array de cruces [local_corto, visitante_corto]
// ═══════════════════════════════════════════════════════════════════════════
const IDA_BLANCA = {
  fechas_inicio: '2026-04-25', // Primer sabado
  cruces: [
    // Fecha 1 — 25/04
    [
      ['IND', 'HAB'], ['UVVA', 'ADV'], ['25M', 'SAR'], ['SOC', 'CALE'],
      ['FLO', 'UVAFO'], ['PAD', 'CAS'], ['12A', 'DRY'],
    ],
    // Fecha 2 — 02/05
    [
      ['HAB', 'DRY'], ['IND', 'ADV'], ['UVVA', 'SAR'], ['25M', 'CALE'],
      ['SOC', 'UVAFO'], ['FLO', 'CAS'], ['PAD', '12A'],
    ],
    // Fecha 3 — 09/05
    [
      ['ADV', 'HAB'], ['SAR', 'IND'], ['CALE', 'UVVA'], ['UVAFO', '25M'],
      ['CAS', 'SOC'], ['12A', 'FLO'], ['DRY', 'PAD'],
    ],
    // Fecha 4 — 16/05
    [
      ['HAB', 'PAD'], ['IND', 'CALE'], ['UVVA', 'UVAFO'], ['25M', 'CAS'],
      ['SAR', 'ADV'], ['SOC', '12A'], ['FLO', 'DRY'],
    ],
    // Fecha 5 — 23/05
    [
      ['CALE', 'HAB'], ['UVAFO', 'IND'], ['CAS', 'UVVA'], ['12A', '25M'],
      ['DRY', 'SAR'], ['ADV', 'SOC'], ['PAD', 'FLO'],
    ],
    // Fecha 6 — 30/05
    [
      ['HAB', 'FLO'], ['IND', 'CAS'], ['UVVA', '12A'], ['25M', 'DRY'],
      ['SAR', 'CALE'], ['SOC', 'PAD'], ['UVAFO', 'ADV'],
    ],
    // Fecha 7 — 06/06
    [
      ['CAS', 'HAB'], ['12A', 'IND'], ['DRY', 'UVVA'], ['CALE', 'UVAFO'],
      ['ADV', '25M'], ['PAD', 'SAR'], ['FLO', 'SOC'],
    ],
    // Fecha 8 — 13/06
    [
      ['HAB', 'SOC'], ['IND', 'DRY'], ['UVVA', 'ADV'], ['25M', 'PAD'],
      ['SAR', 'UVAFO'], ['CALE', 'CAS'], ['12A', 'FLO'],
    ],
    // Fecha 9 — 27/06
    [
      ['DRY', 'HAB'], ['UVAFO', 'CALE'], ['CAS', 'SAR'], ['12A', 'ADV'],
      ['FLO', 'IND'], ['SOC', '25M'], ['PAD', 'UVVA'],
    ],
    // Fecha 10 — 04/07
    [
      ['HAB', 'UVVA'], ['IND', 'PAD'], ['25M', 'FLO'], ['SAR', '12A'],
      ['CALE', 'DRY'], ['ADV', 'CAS'], ['UVAFO', 'SOC'],
    ],
    // Fecha 11 — 11/07
    [
      ['12A', 'HAB'], ['FLO', 'UVVA'], ['SOC', 'IND'], ['DRY', 'UVAFO'],
      ['PAD', 'CALE'], ['CAS', '25M'], ['ADV', 'SAR'],
    ],
    // Fecha 12 — 18/07
    [
      ['HAB', '25M'], ['IND', 'UVAFO'], ['UVVA', 'SOC'], ['SAR', 'FLO'],
      ['CALE', '12A'], ['ADV', 'DRY'], ['CAS', 'PAD'],
    ],
    // Fecha 13 — 25/07
    [
      ['UVAFO', 'HAB'], ['CAS', 'UVVA'], ['12A', 'IND'], ['DRY', '25M'],
      ['PAD', 'ADV'], ['FLO', 'CALE'], ['SOC', 'SAR'],
    ],
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// FIXTURE ZONA CELESTE — IDA
// ═══════════════════════════════════════════════════════════════════════════
const IDA_CELESTE = {
  fechas_inicio: '2026-04-25',
  cruces: [
    // Fecha 1 — 25/04
    [
      ['CIR', 'GAY'], ['HOR', 'PLA'], ['DEF', 'COL'], ['UFL', 'VMA'],
      ['JHE', 'CUM'], ['CIC', '12B'], ['GRO', 'EFE'],
    ],
    // Fecha 2 — 02/05
    [
      ['GAY', 'EFE'], ['CIR', 'PLA'], ['HOR', 'COL'], ['DEF', 'VMA'],
      ['UFL', 'CUM'], ['JHE', '12B'], ['CIC', 'GRO'],
    ],
    // Fecha 3 — 09/05
    [
      ['PLA', 'GAY'], ['COL', 'CIR'], ['VMA', 'HOR'], ['CUM', 'DEF'],
      ['12B', 'UFL'], ['GRO', 'JHE'], ['EFE', 'CIC'],
    ],
    // Fecha 4 — 16/05
    [
      ['GAY', 'CIC'], ['CIR', 'VMA'], ['HOR', 'CUM'], ['DEF', '12B'],
      ['COL', 'PLA'], ['UFL', 'GRO'], ['JHE', 'EFE'],
    ],
    // Fecha 5 — 23/05
    [
      ['VMA', 'GAY'], ['CUM', 'CIR'], ['12B', 'HOR'], ['GRO', 'DEF'],
      ['EFE', 'COL'], ['PLA', 'UFL'], ['CIC', 'JHE'],
    ],
    // Fecha 6 — 30/05
    [
      ['GAY', 'JHE'], ['CIR', '12B'], ['HOR', 'GRO'], ['DEF', 'EFE'],
      ['COL', 'VMA'], ['UFL', 'CIC'], ['CUM', 'PLA'],
    ],
    // Fecha 7 — 06/06
    [
      ['12B', 'GAY'], ['GRO', 'CIR'], ['EFE', 'HOR'], ['VMA', 'CUM'],
      ['PLA', 'DEF'], ['CIC', 'COL'], ['JHE', 'UFL'],
    ],
    // Fecha 8 — 13/06
    [
      ['GAY', 'UFL'], ['CIR', 'EFE'], ['HOR', 'PLA'], ['DEF', 'CIC'],
      ['COL', '12B'], ['VMA', 'GRO'], ['CUM', 'JHE'],
    ],
    // Fecha 9 — 27/06
    [
      ['EFE', 'GAY'], ['CUM', 'VMA'], ['12B', 'COL'], ['GRO', 'PLA'],
      ['JHE', 'CIR'], ['UFL', 'DEF'], ['CIC', 'HOR'],
    ],
    // Fecha 10 — 04/07
    [
      ['GAY', 'HOR'], ['CIR', 'CIC'], ['DEF', 'JHE'], ['COL', 'GRO'],
      ['VMA', 'EFE'], ['PLA', '12B'], ['CUM', 'UFL'],
    ],
    // Fecha 11 — 11/07
    [
      ['GRO', 'GAY'], ['JHE', 'HOR'], ['UFL', 'CIR'], ['EFE', 'CUM'],
      ['CIC', 'VMA'], ['12B', 'PLA'], ['DEF', 'COL'],
    ],
    // Fecha 12 — 18/07
    [
      ['GAY', 'DEF'], ['CIR', 'CUM'], ['HOR', 'UFL'], ['COL', 'JHE'],
      ['VMA', '12B'], ['PLA', 'EFE'], ['GRO', 'CIC'],
    ],
    // Fecha 13 — 25/07
    [
      ['CUM', 'GAY'], ['12B', 'CIR'], ['GRO', 'HOR'], ['EFE', 'DEF'],
      ['CIC', 'PLA'], ['JHE', 'COL'], ['UFL', 'VMA'],
    ],
  ],
};

// Fechas reales (sabados)
const FECHAS = [
  '2026-04-25', '2026-05-02', '2026-05-09', '2026-05-16', '2026-05-23',
  '2026-05-30', '2026-06-06', '2026-06-13', '2026-06-27', '2026-07-04',
  '2026-07-11', '2026-07-18', '2026-07-25',
];
const FECHAS_VUELTA = [
  '2026-08-01', '2026-08-08', '2026-08-15', '2026-08-22', '2026-08-29',
  '2026-09-05', '2026-09-12', '2026-09-19', '2026-09-26', '2026-10-03',
  '2026-10-10', '2026-10-17', '2026-10-24',
];

// ─── Main ───────────────────────────────────────────────────────────────────
(async () => {
  try {
    await sequelize.authenticate();
    console.log('Conectado a la base de datos\n');

    const torneo = await Torneo.findOne({ where: { nombre: 'CAFI 2026' } });
    if (!torneo) { console.error('Torneo CAFI 2026 no encontrado'); process.exit(1); }

    // Limpiar fixture existente
    const jornadasPrevias = await FixtureJornada.findAll({ where: { torneo_id: torneo.id }, attributes: ['id'] });
    if (jornadasPrevias.length) {
      console.log(`Limpiando fixture existente (${jornadasPrevias.length} jornadas)...`);
      await Partido.destroy({ where: { jornada_id: jornadasPrevias.map(j => j.id) } });
      await FixtureJornada.destroy({ where: { torneo_id: torneo.id } });
      console.log('Fixture anterior eliminado.\n');
    }

    // Cargar datos
    const zonas = await Zona.findAll({ where: { torneo_id: torneo.id } });
    const zonaBlanca = zonas.find(z => z.nombre === 'Blanca');
    const zonaCeleste = zonas.find(z => z.nombre === 'Celeste');
    if (!zonaBlanca || !zonaCeleste) { console.error('No se encontraron las zonas Blanca/Celeste'); process.exit(1); }

    const clubes = await Club.findAll({ where: { torneo_id: torneo.id } });
    const categorias = await Categoria.findAll({ where: { torneo_id: torneo.id }, order: [['orden', 'ASC']] });

    // Mapa nombre_corto -> club_id
    const clubMap = {};
    for (const c of clubes) clubMap[c.nombre_corto] = c.id;

    let totalJornadas = 0;
    let totalPartidos = 0;

    // Funcion para crear una zona (ida + vuelta)
    const crearZona = async (nombreZona, zona, idaCruces) => {
      console.log(`═══ ZONA ${nombreZona.toUpperCase()} ═══`);

      // IDA
      for (let i = 0; i < idaCruces.length; i++) {
        const jornada = await FixtureJornada.create({
          torneo_id: torneo.id, zona_id: zona.id,
          numero_jornada: i + 1, fase: 'ida', fecha: FECHAS[i] || null,
        });
        totalJornadas++;

        const cruces = idaCruces[i];
        const crucesTexto = [];

        for (const [localCorto, visitCorto] of cruces) {
          const localId = clubMap[localCorto];
          const visitId = clubMap[visitCorto];

          if (!localId) { console.error(`  Club no encontrado: ${localCorto}`); continue; }
          if (!visitId) { console.error(`  Club no encontrado: ${visitCorto}`); continue; }

          for (const cat of categorias) {
            const hora = HORARIOS[cat.anio_nacimiento];
            let horaInicio = null;
            if (hora && FECHAS[i]) horaInicio = new Date(`${FECHAS[i]}T${hora}:00`);

            await Partido.create({
              jornada_id: jornada.id, categoria_id: cat.id,
              club_local_id: localId, club_visitante_id: visitId,
              hora_inicio: horaInicio,
            });
            totalPartidos++;
          }
          crucesTexto.push(`${localCorto} vs ${visitCorto}`);
        }
        console.log(`  Fecha ${i + 1} IDA (${FECHAS[i] || '?'}): ${crucesTexto.join(' | ')}`);
      }

      // VUELTA (invertir local/visitante)
      for (let i = 0; i < idaCruces.length; i++) {
        const jornada = await FixtureJornada.create({
          torneo_id: torneo.id, zona_id: zona.id,
          numero_jornada: i + 1, fase: 'vuelta', fecha: FECHAS_VUELTA[i] || null,
        });
        totalJornadas++;

        const cruces = idaCruces[i];
        for (const [localCorto, visitCorto] of cruces) {
          const localId = clubMap[localCorto];
          const visitId = clubMap[visitCorto];
          if (!localId || !visitId) continue;

          for (const cat of categorias) {
            const hora = HORARIOS[cat.anio_nacimiento];
            let horaInicio = null;
            if (hora && FECHAS_VUELTA[i]) horaInicio = new Date(`${FECHAS_VUELTA[i]}T${hora}:00`);

            await Partido.create({
              jornada_id: jornada.id, categoria_id: cat.id,
              club_local_id: visitId,   // INVERTIDO
              club_visitante_id: localId, // INVERTIDO
              hora_inicio: horaInicio,
            });
            totalPartidos++;
          }
        }
        console.log(`  Fecha ${i + 1} VUELTA (${FECHAS_VUELTA[i] || '?'})`);
      }
      console.log('');
    };

    await crearZona('Blanca', zonaBlanca, IDA_BLANCA.cruces);
    await crearZona('Celeste', zonaCeleste, IDA_CELESTE.cruces);

    console.log('════════════════════════════════════════════════');
    console.log('   FIXTURE REAL CARGADO');
    console.log('════════════════════════════════════════════════');
    console.log(`   Jornadas: ${totalJornadas}`);
    console.log(`   Partidos: ${totalPartidos}`);
    console.log('════════════════════════════════════════════════\n');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();

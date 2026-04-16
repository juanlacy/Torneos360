#!/usr/bin/env node
/**
 * SIMULADOR de fechas para el torneo DEMO.
 *
 * Para cada partido de las primeras N jornadas del torneo:
 *   1. Asigna un arbitro random de los 40 disponibles
 *   2. Genera alineacion (15 titulares por club de la lista de fichados)
 *   3. Simula el partido:
 *      - Marcador realista: Poisson con lambda=1.5 por equipo
 *      - Eventos: inicio_periodo, goles, tarjetas, fin_periodo x2 tiempos
 *      - Goles atribuidos a jugadores random de la alineacion
 *      - 0-3 amarillas por equipo (mayor probabilidad), 0-1 roja (rara)
 *   4. Confirma alineaciones (PartidoConfirmacion)
 *   5. Cierra el partido (confirmado_arbitro=true)
 *   6. Recalcula tabla de posiciones al final
 *
 * Idempotente a nivel partido: si un partido ya tiene estado 'finalizado',
 * se saltea. Corre solo los 'programado'.
 *
 * Uso:
 *   node src/seeders/simular-fechas-demo.js --torneo-id=2
 *   node src/seeders/simular-fechas-demo.js --torneo-id=2 --cantidad=7
 */

import 'dotenv/config';
import { Op } from 'sequelize';
import {
  sequelize,
  Torneo, Club, Categoria,
  FixtureJornada, Partido, PartidoEvento, PartidoAlineacion, PartidoConfirmacion,
  Persona, PersonaRol, Rol,
} from '../models/index.js';
import { recalcularDespuesDePartido } from '../services/standingsCalculatorService.js';

const args = process.argv.slice(2);
const getArg = (name, def) => {
  const found = args.find(a => a.startsWith(`--${name}=`));
  return found ? found.split('=')[1] : def;
};

const TORNEO_ID = parseInt(getArg('torneo-id', '0'));
const CANTIDAD = parseInt(getArg('cantidad', '7'));

if (!TORNEO_ID) {
  console.error('✗ --torneo-id es requerido');
  process.exit(1);
}

// ─── Helpers ────────────────────────────────────────────────────────────────
const randomEl = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

/** Poisson para generar goles realistas (futbol infantil: lambda ~1.5-2.5) */
const poisson = (lambda) => {
  const L = Math.exp(-lambda);
  let k = 0, p = 1;
  do { k++; p *= Math.random(); } while (p > L);
  return k - 1;
};

/** Genera un array random de minutos ordenados dentro del rango [min, max] */
const generarMinutos = (cantidad, min, max) => {
  return Array.from({ length: cantidad }, () => randomInt(min, max)).sort((a, b) => a - b);
};

// ─── Main ───────────────────────────────────────────────────────────────────
(async () => {
  try {
    console.log('════════════════════════════════════════════════');
    console.log(`  SIMULADOR DE FECHAS — Torneo id=${TORNEO_ID}`);
    console.log('════════════════════════════════════════════════\n');

    await sequelize.authenticate();

    const torneo = await Torneo.findByPk(TORNEO_ID);
    if (!torneo) {
      console.error(`✗ Torneo id=${TORNEO_ID} no encontrado`);
      process.exit(1);
    }
    console.log(`▶ Torneo: ${torneo.nombre}\n`);

    // Cargar roles
    const rolJugador = await Rol.findOne({ where: { codigo: 'jugador' } });
    const rolArbitro = await Rol.findOne({ where: { codigo: 'arbitro' } });
    if (!rolJugador || !rolArbitro) {
      console.error('✗ Faltan los roles jugador/arbitro en el catalogo');
      process.exit(1);
    }

    // Cargar arbitros disponibles del torneo
    const arbitrosRoles = await PersonaRol.findAll({
      where: { rol_id: rolArbitro.id, torneo_id: TORNEO_ID, activo: true },
    });
    if (arbitrosRoles.length === 0) {
      console.error('✗ El torneo no tiene arbitros cargados. Corre primero cafi-2026-personas.js');
      process.exit(1);
    }
    const arbitroIds = arbitrosRoles.map(a => a.persona_id);
    console.log(`▶ Arbitros disponibles: ${arbitroIds.length}`);

    // Traer las primeras N jornadas
    const jornadas = await FixtureJornada.findAll({
      where: { torneo_id: TORNEO_ID },
      order: [['numero_jornada', 'ASC'], ['fase', 'ASC'], ['id', 'ASC']],
      limit: CANTIDAD,
    });
    console.log(`▶ Jornadas a simular: ${jornadas.length}\n`);

    if (jornadas.length === 0) {
      console.error('✗ El torneo no tiene jornadas cargadas');
      process.exit(1);
    }

    const jornadaIds = jornadas.map(j => j.id);
    const partidos = await Partido.findAll({
      where: { jornada_id: jornadaIds, estado: 'programado' },
      order: [['jornada_id', 'ASC'], ['id', 'ASC']],
    });
    console.log(`▶ Partidos programados a simular: ${partidos.length}\n`);

    // Cache de jugadores por (club_id, categoria_id)
    const jugadoresCache = new Map();
    const getJugadores = async (clubId, categoriaId) => {
      const key = `${clubId}-${categoriaId}`;
      if (!jugadoresCache.has(key)) {
        const prs = await PersonaRol.findAll({
          where: {
            rol_id: rolJugador.id,
            club_id: clubId,
            categoria_id: categoriaId,
            activo: true,
          },
          order: [['numero_camiseta', 'ASC']],
        });
        jugadoresCache.set(key, prs);
      }
      return jugadoresCache.get(key);
    };

    let simulados = 0;
    let saltados = 0;
    const torneosAfectadosPosiciones = new Set();

    // ═══════════════════════════════════════════════════════════════════
    // Procesar cada partido en una transaccion individual
    // ═══════════════════════════════════════════════════════════════════
    for (const partido of partidos) {
      const t = await sequelize.transaction();
      try {
        // Validar que haya jugadores en ambos clubes
        const jugadoresLocal = await getJugadores(partido.club_local_id, partido.categoria_id);
        const jugadoresVisitante = await getJugadores(partido.club_visitante_id, partido.categoria_id);

        if (jugadoresLocal.length < 5 || jugadoresVisitante.length < 5) {
          console.warn(`  ⚠ Partido ${partido.id}: faltan jugadores (${jugadoresLocal.length} vs ${jugadoresVisitante.length}). Salteado.`);
          saltados++;
          await t.rollback();
          continue;
        }

        // 1) Asignar arbitro random
        const arbitroId = randomEl(arbitroIds);

        // 2) Generar alineacion (hasta 15 titulares de cada club)
        const titularesLocal = jugadoresLocal.slice(0, Math.min(15, jugadoresLocal.length));
        const titularesVisitante = jugadoresVisitante.slice(0, Math.min(15, jugadoresVisitante.length));

        // Crear PartidoAlineacion para cada titular
        for (const pr of titularesLocal) {
          await PartidoAlineacion.create({
            partido_id: partido.id,
            persona_id: pr.persona_id,
            club_id: partido.club_local_id,
            numero_camiseta: pr.numero_camiseta,
            titular: true,
            confirmado: true,
          }, { transaction: t });
        }
        for (const pr of titularesVisitante) {
          await PartidoAlineacion.create({
            partido_id: partido.id,
            persona_id: pr.persona_id,
            club_id: partido.club_visitante_id,
            numero_camiseta: pr.numero_camiseta,
            titular: true,
            confirmado: true,
          }, { transaction: t });
        }

        // 3) Confirmaciones de alineacion (fake DNI + firma)
        await PartidoConfirmacion.create({
          partido_id: partido.id,
          tipo: 'alineacion_local',
          dni_ingresado: '500000000',
          firma_data_url: 'data:image/png;base64,FAKE',
          nombre_firmante: 'Simulado',
        }, { transaction: t });
        await PartidoConfirmacion.create({
          partido_id: partido.id,
          tipo: 'alineacion_visitante',
          dni_ingresado: '500000000',
          firma_data_url: 'data:image/png;base64,FAKE',
          nombre_firmante: 'Simulado',
        }, { transaction: t });

        // 4) Simular marcador con Poisson (lambda=1.5, futbol infantil realista)
        const golesLocal = poisson(1.5);
        const golesVisitante = poisson(1.5);

        // 5) Eventos del partido
        const totalMinutos = 40; // 2 tiempos de 20 min cada uno (baby futbol)
        const horaInicio = partido.fecha || new Date();

        // Inicio 1er tiempo
        await PartidoEvento.create({
          partido_id: partido.id, tipo: 'inicio_periodo',
          periodo: 1, minuto: 0,
          detalle: 'Inicio primer tiempo',
        }, { transaction: t });

        // Armar lista de eventos (goles + tarjetas) mezclados en orden cronologico
        const eventos = [];

        // Goles local
        for (let i = 0; i < golesLocal; i++) {
          const autor = randomEl(titularesLocal);
          eventos.push({
            tipo: 'gol',
            minuto: randomInt(1, totalMinutos),
            persona_id: autor.persona_id,
            club_id: partido.club_local_id,
            detalle: `Gol de #${autor.numero_camiseta}`,
          });
        }
        // Goles visitante
        for (let i = 0; i < golesVisitante; i++) {
          const autor = randomEl(titularesVisitante);
          eventos.push({
            tipo: 'gol',
            minuto: randomInt(1, totalMinutos),
            persona_id: autor.persona_id,
            club_id: partido.club_visitante_id,
            detalle: `Gol de #${autor.numero_camiseta}`,
          });
        }

        // Tarjetas (80% chance de tener al menos 1 amarilla por partido)
        if (Math.random() < 0.8) {
          const amarillasLocal = randomInt(0, 3);
          const amarillasVisitante = randomInt(0, 3);
          for (let i = 0; i < amarillasLocal; i++) {
            const p = randomEl(titularesLocal);
            eventos.push({
              tipo: 'amarilla',
              minuto: randomInt(5, totalMinutos),
              persona_id: p.persona_id,
              club_id: partido.club_local_id,
              detalle: `Amarilla a #${p.numero_camiseta}`,
            });
          }
          for (let i = 0; i < amarillasVisitante; i++) {
            const p = randomEl(titularesVisitante);
            eventos.push({
              tipo: 'amarilla',
              minuto: randomInt(5, totalMinutos),
              persona_id: p.persona_id,
              club_id: partido.club_visitante_id,
              detalle: `Amarilla a #${p.numero_camiseta}`,
            });
          }
        }

        // Roja ocasional (10% chance)
        if (Math.random() < 0.1) {
          const esLocal = Math.random() < 0.5;
          const p = esLocal ? randomEl(titularesLocal) : randomEl(titularesVisitante);
          eventos.push({
            tipo: 'roja',
            minuto: randomInt(15, totalMinutos),
            persona_id: p.persona_id,
            club_id: esLocal ? partido.club_local_id : partido.club_visitante_id,
            detalle: `Expulsion #${p.numero_camiseta}`,
          });
        }

        // Ordenar eventos por minuto y setear periodo
        eventos.sort((a, b) => a.minuto - b.minuto);
        for (const ev of eventos) {
          ev.periodo = ev.minuto <= 20 ? 1 : 2;
          await PartidoEvento.create({
            partido_id: partido.id,
            ...ev,
          }, { transaction: t });
        }

        // Fin primer tiempo
        await PartidoEvento.create({
          partido_id: partido.id, tipo: 'fin_periodo',
          periodo: 1, minuto: 20,
          detalle: 'Fin primer tiempo',
        }, { transaction: t });

        // Inicio segundo tiempo
        await PartidoEvento.create({
          partido_id: partido.id, tipo: 'inicio_periodo',
          periodo: 2, minuto: 20,
          detalle: 'Inicio segundo tiempo',
        }, { transaction: t });

        // Fin segundo tiempo
        await PartidoEvento.create({
          partido_id: partido.id, tipo: 'fin_periodo',
          periodo: 2, minuto: totalMinutos,
          detalle: 'Fin segundo tiempo',
        }, { transaction: t });

        // 6) Cierre del partido (confirmacion del arbitro)
        await PartidoConfirmacion.create({
          partido_id: partido.id,
          tipo: 'cierre_arbitro',
          dni_ingresado: '500000000',
          firma_data_url: 'data:image/png;base64,FAKE',
          nombre_firmante: 'Arbitro simulado',
        }, { transaction: t });

        // 7) Actualizar el partido
        await partido.update({
          estado: 'finalizado',
          periodo_actual: 2,
          goles_local: golesLocal,
          goles_visitante: golesVisitante,
          arbitro_id: arbitroId,
          confirmado_arbitro: true,
          hora_inicio: horaInicio,
          hora_fin: new Date(new Date(horaInicio).getTime() + 45 * 60000),
          actualizado_en: new Date(),
        }, { transaction: t });

        await t.commit();
        simulados++;

        // Marcar torneo para recalcular posiciones
        const jornada = jornadas.find(j => j.id === partido.jornada_id);
        if (jornada) torneosAfectadosPosiciones.add(jornada.torneo_id);

        if (simulados % 20 === 0) {
          console.log(`  → ${simulados} partidos simulados`);
        }
      } catch (err) {
        await t.rollback();
        console.warn(`  ⚠ Partido ${partido.id}: error - ${err.message}`);
        saltados++;
      }
    }

    console.log(`\n▶ Partidos simulados: ${simulados}`);
    console.log(`▶ Partidos salteados: ${saltados}`);

    // Recalcular posiciones al final
    console.log('\n▶ Recalculando tabla de posiciones...');
    try {
      // Recalcular a partir de cualquier partido finalizado del torneo
      const muestra = await Partido.findOne({
        where: { estado: 'finalizado' },
        include: [{ model: FixtureJornada, as: 'jornada', where: { torneo_id: TORNEO_ID } }],
      });
      if (muestra) {
        await recalcularDespuesDePartido(muestra.id);
        console.log('  ✓ Tabla de posiciones actualizada');
      }
    } catch (e) {
      console.warn(`  ⚠ Error al recalcular: ${e.message}`);
    }

    console.log('\n════════════════════════════════════════════════');
    console.log('  Simulacion completada');
    console.log('════════════════════════════════════════════════\n');

    process.exit(0);
  } catch (err) {
    console.error('\n✗ Error:', err.message);
    console.error(err.stack?.split('\n').slice(0, 8).join('\n'));
    process.exit(1);
  }
})();

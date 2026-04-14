import { FixtureJornada, Partido, Club, Categoria, Zona } from '../models/index.js';

/**
 * Genera el fixture completo de un torneo usando el algoritmo de Berger (round-robin).
 *
 * Para cada zona:
 *   1. Genera las jornadas de IDA (cada club juega contra todos los demas de su zona)
 *   2. Genera las jornadas de VUELTA (mismos cruces, local/visitante invertidos)
 *   3. Para cada jornada, crea N partidos (uno por categoria)
 *
 * Si el numero de clubes en la zona es impar, se agrega un "bye" (descansa 1 club por fecha).
 */
export const generarFixture = async (torneoId) => {
  const zonas = await Zona.findAll({ where: { torneo_id: torneoId } });
  const categorias = await Categoria.findAll({ where: { torneo_id: torneoId }, order: [['orden', 'ASC']] });

  if (!categorias.length) throw new Error('El torneo no tiene categorias. Genera las categorias primero.');

  let totalJornadas = 0;
  let totalPartidos = 0;

  for (const zona of zonas) {
    const clubes = await Club.findAll({
      where: { torneo_id: torneoId, zona_id: zona.id, activo: true },
      order: [['id', 'ASC']],
    });

    if (clubes.length < 2) continue;

    const parejas = generarRoundRobin(clubes.map(c => c.id));

    // ─── IDA ──────────────────────────────────────────────────────
    for (let i = 0; i < parejas.length; i++) {
      const jornada = await FixtureJornada.create({
        torneo_id: torneoId,
        zona_id: zona.id,
        numero_jornada: i + 1,
        fase: 'ida',
      });
      totalJornadas++;

      for (const [localId, visitanteId] of parejas[i]) {
        // Un partido por cada categoria
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
    }

    // ─── VUELTA (mismos cruces, invertidos) ──────────────────────
    for (let i = 0; i < parejas.length; i++) {
      const jornada = await FixtureJornada.create({
        torneo_id: torneoId,
        zona_id: zona.id,
        numero_jornada: i + 1,
        fase: 'vuelta',
      });
      totalJornadas++;

      for (const [localId, visitanteId] of parejas[i]) {
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
    }
  }

  // Si hay clubes sin zona, generar fixture general
  const clubesSinZona = await Club.findAll({
    where: { torneo_id: torneoId, zona_id: null, activo: true },
    order: [['id', 'ASC']],
  });

  if (clubesSinZona.length >= 2) {
    const parejas = generarRoundRobin(clubesSinZona.map(c => c.id));

    for (let i = 0; i < parejas.length; i++) {
      const jornada = await FixtureJornada.create({
        torneo_id: torneoId,
        zona_id: null,
        numero_jornada: i + 1,
        fase: 'ida',
      });
      totalJornadas++;

      for (const [localId, visitanteId] of parejas[i]) {
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
    }

    // Vuelta
    for (let i = 0; i < parejas.length; i++) {
      const jornada = await FixtureJornada.create({
        torneo_id: torneoId,
        zona_id: null,
        numero_jornada: i + 1,
        fase: 'vuelta',
      });
      totalJornadas++;

      for (const [localId, visitanteId] of parejas[i]) {
        for (const cat of categorias) {
          await Partido.create({
            jornada_id: jornada.id,
            categoria_id: cat.id,
            club_local_id: visitanteId,
            club_visitante_id: localId,
          });
          totalPartidos++;
        }
      }
    }
  }

  return { jornadas: totalJornadas, partidos: totalPartidos };
};

/**
 * Algoritmo de Berger para generar pares round-robin.
 * Retorna un array de rondas, donde cada ronda es un array de pares [local, visitante].
 *
 * @param {number[]} ids - Array de IDs de clubes
 * @returns {Array<Array<[number, number]>>} Rondas con pares
 */
function generarRoundRobin(ids) {
  const teams = [...ids];

  // Si es impar, agregar un "bye" (null)
  if (teams.length % 2 !== 0) {
    teams.push(null);
  }

  const n = teams.length;
  const rounds = [];
  const half = n / 2;

  // El primer equipo se fija, los demas rotan
  const fixed = teams[0];
  const rotating = teams.slice(1);

  for (let round = 0; round < n - 1; round++) {
    const pairs = [];

    // El equipo fijo juega contra el primero del array rotante
    if (fixed !== null && rotating[0] !== null) {
      // Alternar local/visitante para el equipo fijo
      if (round % 2 === 0) {
        pairs.push([fixed, rotating[0]]);
      } else {
        pairs.push([rotating[0], fixed]);
      }
    }

    // Los demas se emparejan de los extremos hacia el centro
    for (let i = 1; i < half; i++) {
      const home = rotating[i];
      const away = rotating[n - 2 - i]; // n-2 porque rotating tiene n-1 elementos
      if (home !== null && away !== null) {
        pairs.push([home, away]);
      }
    }

    rounds.push(pairs);

    // Rotar: el ultimo pasa a ser el primero
    rotating.unshift(rotating.pop());
  }

  return rounds;
}

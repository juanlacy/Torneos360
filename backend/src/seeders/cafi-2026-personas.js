#!/usr/bin/env node
/**
 * Seeder de personas para la demo CAFI 2026.
 *
 * Pobla la base con datos realistas para una demo funcional completa:
 *
 *  Por cada club del torneo:
 *    - 1 Delegado General
 *    - 5 Delegados Auxiliares
 *    - 1 Director Tecnico por categoria
 *    - 15 Jugadores por categoria
 *
 *  A nivel torneo:
 *    - 40 Arbitros
 *    - 30 Veedores
 *
 * Uso:
 *   cd backend && node src/seeders/cafi-2026-personas.js
 *
 * Idempotente: al correrlo de nuevo no duplica — salta personas/roles ya creados.
 */

import 'dotenv/config';
import { sequelize, Torneo, Club, Institucion, Categoria, Persona, PersonaRol, Rol } from '../models/index.js';

// Soporta --torneo-id=X para poblar un torneo especifico (ej: el DEMO clonado)
const args = process.argv.slice(2);
const torneoIdArg = args.find(a => a.startsWith('--torneo-id='))?.split('=')[1];

// ─── Data de nombres ficticios argentinos ──────────────────────────────────
const NOMBRES_M = [
  'Mateo', 'Santiago', 'Thiago', 'Joaquin', 'Lautaro', 'Benjamin', 'Bautista', 'Tomas',
  'Valentino', 'Santino', 'Felipe', 'Agustin', 'Lorenzo', 'Nicolas', 'Facundo', 'Bruno',
  'Gonzalo', 'Franco', 'Lucas', 'Martin', 'Ignacio', 'Manuel', 'Ramiro', 'Emiliano',
  'Ivan', 'Tobias', 'Maximo', 'Dante', 'Luciano', 'Ezequiel', 'Sebastian', 'Patricio',
  'Alejandro', 'Matias', 'Federico', 'Rafael', 'Gabriel', 'Cristian', 'Pablo', 'Marcos',
  'Julian', 'Hugo', 'Rodrigo', 'Damian', 'Andres', 'Fernando', 'Leandro', 'Alan',
  'Gaspar', 'Elias', 'Ciro', 'Benicio', 'Genaro', 'Valentin', 'Lisandro', 'Tadeo',
];

const NOMBRES_F = [
  'Sofia', 'Martina', 'Emma', 'Valentina', 'Mia', 'Catalina', 'Isabella', 'Olivia',
  'Luciana', 'Julieta', 'Milagros', 'Camila', 'Renata', 'Agustina', 'Delfina', 'Lucia',
  'Victoria', 'Zoe', 'Juana', 'Maite', 'Antonella', 'Abril', 'Bianca', 'Clara',
];

const APELLIDOS = [
  'Gonzalez', 'Rodriguez', 'Lopez', 'Martinez', 'Garcia', 'Fernandez', 'Perez', 'Diaz',
  'Romero', 'Sanchez', 'Torres', 'Alvarez', 'Ruiz', 'Ramirez', 'Flores', 'Acosta',
  'Benitez', 'Medina', 'Herrera', 'Castro', 'Vargas', 'Rios', 'Moreno', 'Gutierrez',
  'Suarez', 'Ortiz', 'Silva', 'Nunez', 'Luna', 'Juarez', 'Cabrera', 'Rojas',
  'Molina', 'Dominguez', 'Sosa', 'Pereyra', 'Gimenez', 'Aguirre', 'Cardozo', 'Villalba',
  'Ledesma', 'Ojeda', 'Vera', 'Colombo', 'Ferreyra', 'Paz', 'Arias', 'Correa',
  'Figueroa', 'Mendez', 'Ponce', 'Ayala', 'Barrios', 'Vega', 'Campos', 'Bravo',
];

// ─── Helpers ────────────────────────────────────────────────────────────────
/**
 * Genera un DNI ficticio DETERMINISTICO a partir del contexto, asi el seeder
 * es realmente idempotente: si ya existe una persona con ese DNI, la reutiliza.
 *
 * Estructura del DNI (9 digitos, arranca en 5 para no chocar con DNIs reales):
 *   5 T CC KK NN
 *   T  = tipo rol (1=jugador, 2=DG, 3=DA, 4=DT, 5=arbitro, 6=veedor)
 *   CC = club_id o torneo_id (2 digitos)
 *   KK = categoria_id o slot (2 digitos)
 *   NN = slot/posicion (2 digitos)
 *
 * Ejemplos:
 *   Jugador slot 3 del club 5 categoria 7    → 5 1 05 07 03 → 510050703
 *   Delegado General del club 5              → 5 2 05 00 01 → 520050001
 *   DT slot 1 del club 5 categoria 7         → 5 4 05 07 01 → 540050701
 *   Arbitro slot 12 del torneo 2             → 5 5 02 00 12 → 550020012
 */
const dniDeterminista = (tipo, contexto, subcontexto, slot) => {
  const tipoNum = { jugador: 1, dg: 2, da: 3, dt: 4, arbitro: 5, veedor: 6 }[tipo];
  return String(500000000 + tipoNum * 10000000 + (contexto % 100) * 100000 + (subcontexto % 100) * 100 + slot);
};

const randomEl = (arr) => arr[Math.floor(Math.random() * arr.length)];

const generarFechaNacimiento = (anio) => {
  const mes = Math.floor(Math.random() * 12) + 1;
  const dia = Math.floor(Math.random() * 28) + 1;
  return `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
};

const generarFechaAdulto = (edadMin = 25, edadMax = 55) => {
  const anioActual = new Date().getFullYear();
  const anio = anioActual - (edadMin + Math.floor(Math.random() * (edadMax - edadMin)));
  return generarFechaNacimiento(anio);
};

/**
 * Crea una persona con un rol si no existe ya (idempotente por DNI).
 * Si la persona existe pero el rol no, agrega el rol.
 */
const crearPersonaConRol = async ({
  nombre, apellido, fechaNac, dni,
  rolId, clubId = null, torneoId = null, categoriaId = null,
  numeroCamiseta = null, estadoFichaje = null,
}) => {
  // Buscar o crear la persona
  let persona = await Persona.findOne({ where: { dni } });
  if (!persona) {
    persona = await Persona.create({
      dni, nombre, apellido,
      fecha_nacimiento: fechaNac,
      activo: true,
    });
  }

  // Verificar si ya tiene el rol en el mismo contexto
  const whereRol = {
    persona_id: persona.id,
    rol_id: rolId,
    activo: true,
    ...(clubId ? { club_id: clubId } : {}),
    ...(torneoId ? { torneo_id: torneoId } : {}),
    ...(categoriaId ? { categoria_id: categoriaId } : {}),
  };

  const existente = await PersonaRol.findOne({ where: whereRol });
  if (existente) return { persona, asignacion: existente, creada: false };

  const asignacion = await PersonaRol.create({
    persona_id: persona.id,
    rol_id: rolId,
    club_id: clubId,
    torneo_id: torneoId,
    categoria_id: categoriaId,
    numero_camiseta: numeroCamiseta,
    estado_fichaje: estadoFichaje,
    activo: true,
  });
  return { persona, asignacion, creada: true };
};

// ─── Main ───────────────────────────────────────────────────────────────────
(async () => {
  try {
    console.log('════════════════════════════════════════════════');
    console.log('  Seeder CAFI 2026 — Personas y roles de demo');
    console.log('════════════════════════════════════════════════\n');

    await sequelize.authenticate();
    console.log('✓ Conectado a la base de datos\n');

    // 1) Obtener el torneo (por --torneo-id o el mas reciente)
    const torneo = torneoIdArg
      ? await Torneo.findByPk(parseInt(torneoIdArg))
      : await Torneo.findOne({ order: [['creado_en', 'DESC']] });

    if (!torneo) {
      console.error(torneoIdArg
        ? `✗ Torneo id=${torneoIdArg} no encontrado.`
        : '✗ No hay torneos en la base. Cre\u00e1 un torneo primero.');
      process.exit(1);
    }
    console.log(`▶ Torneo: ${torneo.nombre} (id=${torneo.id})`);

    // 2) Obtener clubes y categorias del torneo
    const clubes = await Club.findAll({
      where: { torneo_id: torneo.id, activo: true },
      include: [{ model: Institucion, as: 'institucion' }],
    });
    const categorias = await Categoria.findAll({ where: { torneo_id: torneo.id } });

    if (!clubes.length) {
      console.error('✗ No hay clubes en el torneo. Cargá clubes primero.');
      process.exit(1);
    }
    if (!categorias.length) {
      console.error('✗ No hay categorias en el torneo. Cargá categorias primero.');
      process.exit(1);
    }
    console.log(`▶ Clubes: ${clubes.length}`);
    console.log(`▶ Categorias: ${categorias.length} (${categorias.map(c => c.nombre).join(', ')})\n`);

    // 3) Obtener los roles del sistema
    const roles = await Rol.findAll({ where: { activo: true } });
    const rolPorCodigo = Object.fromEntries(roles.map(r => [r.codigo, r]));

    const requiredRoles = ['jugador', 'delegado_general', 'delegado_auxiliar', 'entrenador', 'arbitro', 'veedor'];
    for (const code of requiredRoles) {
      if (!rolPorCodigo[code]) {
        console.error(`✗ Rol "${code}" no existe en la base. Corré las migraciones.`);
        process.exit(1);
      }
    }

    console.log(`▶ Usando DNIs deterministicos (idempotente)\n`);

    let stats = {
      jugadores: 0, delegadosGenerales: 0, delegadosAux: 0,
      entrenadores: 0, arbitros: 0, veedores: 0,
      personasCreadas: 0,
    };

    // ═══════════════════════════════════════════════════════════════════
    // Por cada club: staff + jugadores
    // ═══════════════════════════════════════════════════════════════════
    for (const club of clubes) {
      const nombreClub = club.nombre_corto || club.nombre || `Club #${club.id}`;
      console.log(`\n── Club: ${nombreClub} ${'─'.repeat(Math.max(0, 50 - nombreClub.length))}`);

      // 1 Delegado General
      {
        const res = await crearPersonaConRol({
          nombre: randomEl(NOMBRES_M),
          apellido: randomEl(APELLIDOS),
          fechaNac: generarFechaAdulto(35, 60),
          dni: dniDeterminista('dg', club.id, 0, 1),
          rolId: rolPorCodigo.delegado_general.id,
          clubId: club.id,
        });
        if (res.creada) {
          stats.delegadosGenerales++;
          if (res.persona.id) stats.personasCreadas++;
        }
      }

      // 5 Delegados Auxiliares
      for (let i = 0; i < 5; i++) {
        const res = await crearPersonaConRol({
          nombre: randomEl(NOMBRES_M),
          apellido: randomEl(APELLIDOS),
          fechaNac: generarFechaAdulto(25, 55),
          dni: dniDeterminista('da', club.id, 0, i + 1),
          rolId: rolPorCodigo.delegado_auxiliar.id,
          clubId: club.id,
        });
        if (res.creada) stats.delegadosAux++;
      }

      // Por cada categoria: 1 DT + 15 Jugadores
      for (const cat of categorias) {
        // 1 DT
        const resDT = await crearPersonaConRol({
          nombre: randomEl(NOMBRES_M),
          apellido: randomEl(APELLIDOS),
          fechaNac: generarFechaAdulto(30, 60),
          dni: dniDeterminista('dt', club.id, cat.id, 1),
          rolId: rolPorCodigo.entrenador.id,
          clubId: club.id,
        });
        if (resDT.creada) stats.entrenadores++;

        // 15 jugadores
        const nombresUsados = new Set();
        for (let i = 0; i < 15; i++) {
          let nombre, apellido, key;
          do {
            nombre = randomEl(NOMBRES_M);
            apellido = randomEl(APELLIDOS);
            key = `${nombre}-${apellido}`;
          } while (nombresUsados.has(key));
          nombresUsados.add(key);

          const res = await crearPersonaConRol({
            nombre, apellido,
            fechaNac: generarFechaNacimiento(cat.anio_nacimiento),
            dni: dniDeterminista('jugador', club.id, cat.id, i + 1),
            rolId: rolPorCodigo.jugador.id,
            clubId: club.id,
            categoriaId: cat.id,
            numeroCamiseta: i + 1,
            estadoFichaje: 'aprobado',
          });
          if (res.creada) stats.jugadores++;
        }
      }

      console.log(`   → DT + 15 jugadores x ${categorias.length} cat + 1 DG + 5 DA cargados`);
    }

    // ═══════════════════════════════════════════════════════════════════
    // A nivel torneo: 40 arbitros + 30 veedores
    // ═══════════════════════════════════════════════════════════════════
    console.log(`\n── Torneo: ${torneo.nombre} ${'─'.repeat(Math.max(0, 50 - torneo.nombre.length))}`);

    for (let i = 0; i < 40; i++) {
      const esF = Math.random() < 0.2; // 20% arbitros mujeres
      const res = await crearPersonaConRol({
        nombre: randomEl(esF ? NOMBRES_F : NOMBRES_M),
        apellido: randomEl(APELLIDOS),
        fechaNac: generarFechaAdulto(25, 60),
        dni: dniDeterminista('arbitro', torneo.id, 0, i + 1),
        rolId: rolPorCodigo.arbitro.id,
        torneoId: torneo.id,
      });
      if (res.creada) stats.arbitros++;
    }

    for (let i = 0; i < 30; i++) {
      const esF = Math.random() < 0.25; // 25% veedoras mujeres
      const res = await crearPersonaConRol({
        nombre: randomEl(esF ? NOMBRES_F : NOMBRES_M),
        apellido: randomEl(APELLIDOS),
        fechaNac: generarFechaAdulto(30, 70),
        dni: dniDeterminista('veedor', torneo.id, 0, i + 1),
        rolId: rolPorCodigo.veedor.id,
        torneoId: torneo.id,
      });
      if (res.creada) stats.veedores++;
    }
    console.log(`   → 40 arbitros + 30 veedores cargados`);

    // ─── Resumen final ───────────────────────────────────────────────
    const totalPersonas = await Persona.count();
    const totalPersonaRoles = await PersonaRol.count({ where: { activo: true } });

    console.log('\n════════════════════════════════════════════════');
    console.log('  Resumen');
    console.log('════════════════════════════════════════════════');
    console.log(`  Jugadores creados:         ${stats.jugadores}`);
    console.log(`  Delegados Generales:       ${stats.delegadosGenerales}`);
    console.log(`  Delegados Auxiliares:      ${stats.delegadosAux}`);
    console.log(`  Entrenadores (DT):         ${stats.entrenadores}`);
    console.log(`  Arbitros:                  ${stats.arbitros}`);
    console.log(`  Veedores:                  ${stats.veedores}`);
    console.log('  ──────────────────────────────────');
    console.log(`  Total personas (DB):       ${totalPersonas}`);
    console.log(`  Total asignaciones rol:    ${totalPersonaRoles}`);
    console.log('════════════════════════════════════════════════\n');

    process.exit(0);
  } catch (err) {
    console.error('\n✗ Error:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
})();

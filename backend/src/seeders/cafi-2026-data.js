/**
 * Script de carga de datos: Torneo CAFI 2026
 *
 * Crea:
 *  - 1 Torneo (CAFI 2026)
 *  - 2 Zonas (Blanca, Celeste)
 *  - 7 Categorias (2013-2019)
 *  - 20 Clubes (10 por zona)
 *  - 20 jugadores ficticios por club por categoria (2.800 jugadores total)
 *
 * Uso: cd backend && node src/seeders/cafi-2026-data.js
 *
 * Luego generar el fixture desde la UI o via:
 *   curl -X POST http://localhost:7300/fixture/generar/TORNEO_ID -H "Authorization: Bearer TOKEN"
 */

import 'dotenv/config';
import { sequelize } from '../config/db.js';
import { Torneo } from '../models/Torneo.js';
import { Zona } from '../models/Zona.js';
import { Categoria } from '../models/Categoria.js';
import { Club } from '../models/Club.js';
import { Jugador } from '../models/Jugador.js';

// ─── Datos ──────────────────────────────────────────────────────────────────

const CLUBES_BLANCA = [
  { nombre: 'Industrial',     nombre_corto: 'IND', color_primario: '#1e40af', color_secundario: '#ffffff' },
  { nombre: 'Defensores',     nombre_corto: 'DEF', color_primario: '#dc2626', color_secundario: '#ffffff' },
  { nombre: 'Alt. Botania',   nombre_corto: 'BOT', color_primario: '#16a34a', color_secundario: '#ffffff' },
  { nombre: 'Deportivo',      nombre_corto: 'DEP', color_primario: '#7c3aed', color_secundario: '#ffffff' },
  { nombre: '12 de Octubre',  nombre_corto: '12O', color_primario: '#ea580c', color_secundario: '#ffffff' },
  { nombre: 'Sarmiento',      nombre_corto: 'SAR', color_primario: '#0891b2', color_secundario: '#ffffff' },
  { nombre: 'Florida Club',   nombre_corto: 'FLO', color_primario: '#4f46e5', color_secundario: '#ffffff' },
  { nombre: 'Puebla',         nombre_corto: 'PUE', color_primario: '#be185d', color_secundario: '#ffffff' },
  { nombre: 'Platense',       nombre_corto: 'PLA', color_primario: '#854d0e', color_secundario: '#ffffff' },
  { nombre: 'C.A.F.I.',       nombre_corto: 'CAFI', color_primario: '#762c7e', color_secundario: '#8cb24d' },
];

const CLUBES_CELESTE = [
  { nombre: 'C.V. Norte',       nombre_corto: 'CVN', color_primario: '#0d9488', color_secundario: '#ffffff' },
  { nombre: 'Estrella Federal', nombre_corto: 'EFE', color_primario: '#eab308', color_secundario: '#1e293b' },
  { nombre: 'Halcon',           nombre_corto: 'HAL', color_primario: '#ef4444', color_secundario: '#000000' },
  { nombre: 'Rio de Florida',   nombre_corto: 'RFL', color_primario: '#2563eb', color_secundario: '#ffffff' },
  { nombre: 'Villa Martelli',   nombre_corto: 'VMA', color_primario: '#059669', color_secundario: '#ffffff' },
  { nombre: '3° Deportivo',     nombre_corto: '3DE', color_primario: '#f97316', color_secundario: '#ffffff' },
  { nombre: 'Cipolletti',       nombre_corto: 'CIP', color_primario: '#6366f1', color_secundario: '#ffffff' },
  { nombre: 'Gral. Las Heras',  nombre_corto: 'GLH', color_primario: '#0284c7', color_secundario: '#ffffff' },
  { nombre: 'El Talar',         nombre_corto: 'TAL', color_primario: '#65a30d', color_secundario: '#ffffff' },
  { nombre: 'Chipoletti',       nombre_corto: 'CHI', color_primario: '#a21caf', color_secundario: '#ffffff' },
];

// Nombres ficticios argentinos para generar jugadores
const NOMBRES = [
  'Mateo', 'Santiago', 'Thiago', 'Joaquin', 'Lautaro', 'Benjamin', 'Bautista', 'Tomas',
  'Valentino', 'Santino', 'Felipe', 'Agustin', 'Lorenzo', 'Nicolas', 'Facundo', 'Bruno',
  'Gonzalo', 'Franco', 'Lucas', 'Martin', 'Ignacio', 'Manuel', 'Ramiro', 'Emiliano',
  'Ivan', 'Tobias', 'Maximo', 'Dante', 'Luciano', 'Ezequiel', 'Sebastian', 'Patricio',
  'Alejandro', 'Matias', 'Federico', 'Rafael', 'Gabriel', 'Cristian', 'Pablo', 'Marcos',
  'Julian', 'Hugo', 'Rodrigo', 'Damian', 'Andres', 'Fernando', 'Leandro', 'Alan',
  'Gaspar', 'Elias', 'Ciro', 'Benicio', 'Genaro', 'Valentin', 'Lisandro', 'Tadeo',
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

let dniCounter = 50000000;
const nextDni = () => String(dniCounter++);

const randomEl = (arr) => arr[Math.floor(Math.random() * arr.length)];

const generarFechaNacimiento = (anio) => {
  const mes = Math.floor(Math.random() * 12) + 1;
  const dia = Math.floor(Math.random() * 28) + 1;
  return `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
};

const generarJugadores = (clubId, categoriaId, anioNacimiento, cantidad = 20) => {
  const jugadores = [];
  const nombresUsados = new Set();

  for (let i = 0; i < cantidad; i++) {
    let nombre, apellido, key;
    do {
      nombre = randomEl(NOMBRES);
      apellido = randomEl(APELLIDOS);
      key = `${nombre}-${apellido}`;
    } while (nombresUsados.has(key));
    nombresUsados.add(key);

    jugadores.push({
      club_id: clubId,
      categoria_id: categoriaId,
      nombre,
      apellido,
      dni: nextDni(),
      fecha_nacimiento: generarFechaNacimiento(anioNacimiento),
      numero_camiseta: i + 1,
      estado_fichaje: 'aprobado',
      ficha_medica: {
        apto_fisico: true,
        fecha_apto: '2026-03-01',
        grupo_sanguineo: randomEl(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']),
        observaciones: '',
      },
      datos_personales: {
        nombre_tutor: `${randomEl(NOMBRES)} ${apellido}`,
        telefono_tutor: `11${Math.floor(10000000 + Math.random() * 90000000)}`,
      },
      activo: true,
    });
  }

  return jugadores;
};

// ─── Main ───────────────────────────────────────────────────────────────────

(async () => {
  try {
    await sequelize.authenticate();
    console.log('Conectado a la base de datos');

    // 1. Crear torneo
    console.log('\n1. Creando torneo CAFI 2026...');
    const [torneo] = await Torneo.findOrCreate({
      where: { nombre: 'CAFI 2026', anio: 2026 },
      defaults: {
        nombre: 'CAFI 2026',
        anio: 2026,
        fecha_inicio: '2026-04-25',
        estado: 'inscripcion',
        color_primario: '#762c7e',
        color_secundario: '#4f2f7d',
        color_acento: '#8cb24d',
        config: { puntos_victoria: 2, puntos_empate: 1 },
      },
    });
    console.log(`   Torneo ID: ${torneo.id}`);

    // 2. Crear zonas
    console.log('\n2. Creando zonas...');
    const [zonaBlanca] = await Zona.findOrCreate({
      where: { torneo_id: torneo.id, nombre: 'Blanca' },
      defaults: { torneo_id: torneo.id, nombre: 'Blanca', color: '#f8fafc' },
    });
    const [zonaCeleste] = await Zona.findOrCreate({
      where: { torneo_id: torneo.id, nombre: 'Celeste' },
      defaults: { torneo_id: torneo.id, nombre: 'Celeste', color: '#bae6fd' },
    });
    console.log(`   Zona Blanca ID: ${zonaBlanca.id}, Zona Celeste ID: ${zonaCeleste.id}`);

    // 3. Crear categorias
    console.log('\n3. Creando categorias...');
    const categoriasData = [
      { nombre: '2013', anio_nacimiento: 2013, es_preliminar: false, orden: 1 },
      { nombre: '2014', anio_nacimiento: 2014, es_preliminar: false, orden: 2 },
      { nombre: '2015', anio_nacimiento: 2015, es_preliminar: false, orden: 3 },
      { nombre: '2016', anio_nacimiento: 2016, es_preliminar: false, orden: 4 },
      { nombre: '2017', anio_nacimiento: 2017, es_preliminar: false, orden: 5 },
      { nombre: '2018', anio_nacimiento: 2018, es_preliminar: false, orden: 6 },
      { nombre: 'Preliminar 2019', anio_nacimiento: 2019, es_preliminar: true, orden: 7 },
    ];

    const categorias = [];
    for (const cat of categoriasData) {
      const [categoria] = await Categoria.findOrCreate({
        where: { torneo_id: torneo.id, anio_nacimiento: cat.anio_nacimiento },
        defaults: { ...cat, torneo_id: torneo.id },
      });
      categorias.push(categoria);
      console.log(`   Categoria: ${categoria.nombre} (ID: ${categoria.id})`);
    }

    // 4. Crear clubes
    console.log('\n4. Creando clubes...');
    const todosLosClubes = [];

    for (const data of CLUBES_BLANCA) {
      const [club] = await Club.findOrCreate({
        where: { torneo_id: torneo.id, nombre: data.nombre },
        defaults: { ...data, torneo_id: torneo.id, zona_id: zonaBlanca.id },
      });
      todosLosClubes.push(club);
      console.log(`   [Blanca] ${club.nombre} (ID: ${club.id})`);
    }

    for (const data of CLUBES_CELESTE) {
      const [club] = await Club.findOrCreate({
        where: { torneo_id: torneo.id, nombre: data.nombre },
        defaults: { ...data, torneo_id: torneo.id, zona_id: zonaCeleste.id },
      });
      todosLosClubes.push(club);
      console.log(`   [Celeste] ${club.nombre} (ID: ${club.id})`);
    }

    // 5. Generar jugadores (20 por club por categoria)
    console.log('\n5. Generando jugadores...');
    let totalJugadores = 0;

    for (const club of todosLosClubes) {
      // Verificar si ya tiene jugadores
      const existentes = await Jugador.count({ where: { club_id: club.id } });
      if (existentes > 0) {
        console.log(`   ${club.nombre}: ya tiene ${existentes} jugadores, saltando...`);
        totalJugadores += existentes;
        continue;
      }

      for (const cat of categorias) {
        const jugadores = generarJugadores(club.id, cat.id, cat.anio_nacimiento, 20);
        await Jugador.bulkCreate(jugadores);
        totalJugadores += jugadores.length;
      }
      console.log(`   ${club.nombre}: 140 jugadores creados (20 x 7 categorias)`);
    }

    // ─── Resumen ────────────────────────────────────────────────
    console.log('\n════════════════════════════════════════════════');
    console.log('   CARGA COMPLETADA');
    console.log('════════════════════════════════════════════════');
    console.log(`   Torneo:     ${torneo.nombre} (ID: ${torneo.id})`);
    console.log(`   Zonas:      2 (Blanca, Celeste)`);
    console.log(`   Categorias: ${categorias.length}`);
    console.log(`   Clubes:     ${todosLosClubes.length} (${CLUBES_BLANCA.length} Blanca + ${CLUBES_CELESTE.length} Celeste)`);
    console.log(`   Jugadores:  ${totalJugadores}`);
    console.log('');
    console.log('   SIGUIENTE PASO:');
    console.log('   Generar el fixture desde la UI:');
    console.log('   Torneos > CAFI 2026 > Generar Fixture');
    console.log('   O desde el menu Fixture > Generar Fixture');
    console.log('════════════════════════════════════════════════\n');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();

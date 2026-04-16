#!/usr/bin/env node
/**
 * RESET — Limpieza completa de datos de torneo para arrancar de cero.
 *
 * BORRA (en orden correcto para respetar FKs):
 *   - partido_eventos, partido_alineaciones, partido_confirmaciones
 *   - informes_arbitro
 *   - persona_roles, personas (TODAS, incluido DNIs reales)
 *   - partidos, fixture_jornadas
 *   - tabla_posiciones, tabla_posiciones_club
 *   - clubes (participaciones)
 *   - categorias, zonas
 *   - torneos
 *
 * PRESERVA:
 *   - usuarios, permisos_default_rol, permisos_usuario, audit_logs
 *   - roles (catalogo)
 *   - instituciones (clubes "platonicos")
 *   - configuracion del sistema
 *
 * Modo dry-run por default. Pasar --apply para ejecutar.
 * Pide doble confirmacion con --i-know-what-im-doing para proceder.
 *
 * Uso:
 *   node src/seeders/reset-datos.js                               # dry-run, muestra que haria
 *   node src/seeders/reset-datos.js --apply --i-know-what-im-doing  # ejecutar
 */

import 'dotenv/config';
import {
  sequelize,
  Torneo, Zona, Categoria, Club, Institucion,
  FixtureJornada, Partido, PartidoEvento, PartidoAlineacion, PartidoConfirmacion,
  Persona, PersonaRol, Rol,
  TablaPosiciones, TablaPosicionesClub,
  InformeArbitro,
  Usuario,
} from '../models/index.js';

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const CONFIRMED = args.includes('--i-know-what-im-doing');

(async () => {
  try {
    console.log('════════════════════════════════════════════════');
    console.log(`  RESET DE DATOS ${APPLY ? '(APPLY)' : '(DRY RUN)'}`);
    console.log('════════════════════════════════════════════════\n');

    await sequelize.authenticate();

    // Contar lo que hay
    const [
      torneos, zonas, categorias, clubes, personas, personaRoles,
      jornadas, partidos, eventos, alineaciones, confirmaciones, informes,
      posiciones, posicionesClub,
      instituciones, roles, usuarios,
    ] = await Promise.all([
      Torneo.count(), Zona.count(), Categoria.count(), Club.count(),
      Persona.count(), PersonaRol.count(),
      FixtureJornada.count(), Partido.count(), PartidoEvento.count(),
      PartidoAlineacion.count(), PartidoConfirmacion.count(), InformeArbitro.count(),
      TablaPosiciones.count(), TablaPosicionesClub.count(),
      Institucion.count(), Rol.count(), Usuario.count(),
    ]);

    console.log('▶ Estado actual:');
    console.log('─── Se borraria ─────────────────────────');
    console.log(`   torneos                 ${String(torneos).padStart(6)}`);
    console.log(`   zonas                   ${String(zonas).padStart(6)}`);
    console.log(`   categorias              ${String(categorias).padStart(6)}`);
    console.log(`   clubes (participacion)  ${String(clubes).padStart(6)}`);
    console.log(`   fixture_jornadas        ${String(jornadas).padStart(6)}`);
    console.log(`   partidos                ${String(partidos).padStart(6)}`);
    console.log(`   partido_eventos         ${String(eventos).padStart(6)}`);
    console.log(`   partido_alineaciones    ${String(alineaciones).padStart(6)}`);
    console.log(`   partido_confirmaciones  ${String(confirmaciones).padStart(6)}`);
    console.log(`   informes_arbitro        ${String(informes).padStart(6)}`);
    console.log(`   personas                ${String(personas).padStart(6)}`);
    console.log(`   persona_roles           ${String(personaRoles).padStart(6)}`);
    console.log(`   tabla_posiciones        ${String(posiciones).padStart(6)}`);
    console.log(`   tabla_posiciones_club   ${String(posicionesClub).padStart(6)}`);
    console.log('─── Se preservaria ──────────────────────');
    console.log(`   usuarios                ${String(usuarios).padStart(6)}`);
    console.log(`   roles (catalogo)        ${String(roles).padStart(6)}`);
    console.log(`   instituciones           ${String(instituciones).padStart(6)}`);
    console.log('');

    if (!APPLY) {
      console.log('⚠  Modo DRY RUN. No se borro nada.');
      console.log('   Para ejecutar (destructivo, pero preserva auth e instituciones):');
      console.log('   node src/seeders/reset-datos.js --apply --i-know-what-im-doing\n');
      process.exit(0);
    }

    if (!CONFIRMED) {
      console.error('\n✗ Para ejecutar el reset necesitas pasar --i-know-what-im-doing');
      console.error('  Es destructivo. Asegurate de tener backup primero.\n');
      process.exit(1);
    }

    console.log('⚠  EJECUTANDO RESET en 3 segundos... Ctrl+C para cancelar\n');
    await new Promise(r => setTimeout(r, 3000));

    // TRUNCATE CASCADE en orden (el orden no importa tanto con CASCADE pero igual)
    const t = await sequelize.transaction();
    try {
      // Las tablas mas dependientes primero
      const tablas = [
        'partido_eventos',
        'partido_alineaciones',
        'partido_confirmaciones',
        'informes_arbitro',
        'persona_roles',
        'personas',
        'partidos',
        'fixture_jornadas',
        'tabla_posiciones',
        'tabla_posiciones_club',
        'clubes',
        'categorias',
        'zonas',
        'torneos',
      ];

      for (const tabla of tablas) {
        await sequelize.query(`TRUNCATE TABLE "${tabla}" RESTART IDENTITY CASCADE`, { transaction: t });
        console.log(`  ✓ ${tabla} truncada`);
      }

      await t.commit();

      console.log('\n════════════════════════════════════════════════');
      console.log('  Reset completado');
      console.log('════════════════════════════════════════════════');
      console.log('  Lo que sigue:');
      console.log('    1. node src/seeders/import-torneo-backup.js        # restaurar CAFI 2026');
      console.log('    2. Desde la UI: duplicar torneo a "CAFI 2026 DEMO"');
      console.log('    3. node src/seeders/cafi-2026-personas.js --torneo-id=2');
      console.log('    4. node src/seeders/simular-fechas-demo.js --torneo-id=2');
      console.log('════════════════════════════════════════════════\n');

      process.exit(0);
    } catch (err) {
      await t.rollback();
      throw err;
    }
  } catch (err) {
    console.error('\n✗ Error:', err.message);
    console.error(err.stack?.split('\n').slice(0, 5).join('\n'));
    process.exit(1);
  }
})();

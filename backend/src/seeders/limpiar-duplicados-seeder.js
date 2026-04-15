#!/usr/bin/env node
/**
 * Limpieza de duplicados creados por ejecuciones repetidas del seeder.
 *
 * El seeder cafi-2026-personas.js no era realmente idempotente: cada
 * ejecucion generaba DNIs nuevos desde el ultimo libre, asi que si se
 * corrio 3 veces hay 3x los jugadores/delegados/DTs/arbitros/veedores.
 *
 * Este script corrige eso manteniendo los N primeros registros por
 * (club, rol, categoria) y eliminando el exceso. Solo afecta personas
 * con DNI ficticio (>= 50000000) para no tocar datos reales.
 *
 * Modo dry-run por defecto. Pasar --apply para ejecutar.
 *
 * Uso:
 *   node src/seeders/limpiar-duplicados-seeder.js --torneo-id=2
 *   node src/seeders/limpiar-duplicados-seeder.js --torneo-id=2 --apply
 *
 * Cupos por defecto (matchean el seeder original):
 *   - 15 jugadores por (club, categoria)
 *   - 1 delegado_general por club
 *   - 5 delegados_auxiliares por club
 *   - 1 entrenador por (club, categoria)
 *   - 40 arbitros por torneo
 *   - 30 veedores por torneo
 *
 * Personalizables con flags: --max-jugadores=X, --max-delegados-aux=X, etc.
 */

import 'dotenv/config';
import { Op } from 'sequelize';
import { sequelize, Torneo, Club, PersonaRol, Rol, Persona } from '../models/index.js';

// ─── Parseo de args ─────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const getArg = (name, defaultValue) => {
  const found = args.find(a => a.startsWith(`--${name}=`));
  return found ? found.split('=')[1] : defaultValue;
};

const APPLY = args.includes('--apply');
const TORNEO_ID = parseInt(getArg('torneo-id', '0'));
const MAX_JUGADORES = parseInt(getArg('max-jugadores', '15'));
const MAX_DELEGADO_GENERAL = parseInt(getArg('max-delegado-general', '1'));
const MAX_DELEGADOS_AUX = parseInt(getArg('max-delegados-aux', '5'));
const MAX_DTS = parseInt(getArg('max-dts', '1'));
const MAX_ARBITROS = parseInt(getArg('max-arbitros', '40'));
const MAX_VEEDORES = parseInt(getArg('max-veedores', '30'));
const FAKE_DNI_MIN = 50000000;

if (!TORNEO_ID) {
  console.error('✗ --torneo-id es requerido');
  console.error('  Uso: node src/seeders/limpiar-duplicados-seeder.js --torneo-id=X [--apply]');
  process.exit(1);
}

// ─── Helper para determinar qué persona_rol_ids conservar ──────────────────
const overflowIds = async (where, max, label, t) => {
  const filas = await PersonaRol.findAll({
    where: { ...where, activo: true },
    include: [{ model: Persona, as: 'persona', attributes: ['dni'], where: { dni: { [Op.gte]: String(FAKE_DNI_MIN) } }, required: true }],
    order: [['id', 'ASC']],
    attributes: ['id', 'persona_id'],
    transaction: t,
  });
  if (filas.length <= max) return { toDelete: [], keep: filas.length, label };
  const toDelete = filas.slice(max).map(f => ({ id: f.id, persona_id: f.persona_id }));
  return { toDelete, keep: max, label };
};

// ─── Main ───────────────────────────────────────────────────────────────────
(async () => {
  const t = APPLY ? await sequelize.transaction() : null;
  try {
    console.log('════════════════════════════════════════════════');
    console.log(`  Limpieza de duplicados ${APPLY ? '(APPLY)' : '(DRY RUN)'}`);
    console.log('════════════════════════════════════════════════\n');

    await sequelize.authenticate();

    // Validar torneo
    const torneo = await Torneo.findByPk(TORNEO_ID);
    if (!torneo) {
      console.error(`✗ Torneo id=${TORNEO_ID} no encontrado`);
      process.exit(1);
    }
    console.log(`▶ Torneo: ${torneo.nombre} (id=${torneo.id})\n`);

    // Cargar roles
    const roles = await Rol.findAll();
    const rolByCodigo = Object.fromEntries(roles.map(r => [r.codigo, r]));
    const requiredCodes = ['jugador', 'delegado_general', 'delegado_auxiliar', 'entrenador', 'arbitro', 'veedor'];
    for (const c of requiredCodes) {
      if (!rolByCodigo[c]) {
        console.error(`✗ Rol "${c}" no existe`);
        process.exit(1);
      }
    }

    // Cargar clubes del torneo
    const clubes = await Club.findAll({ where: { torneo_id: TORNEO_ID }, attributes: ['id'] });
    console.log(`▶ Clubes en el torneo: ${clubes.length}`);

    // Cargar categorias
    const categorias = await sequelize.models.Categoria.findAll({ where: { torneo_id: TORNEO_ID }, attributes: ['id'] });
    console.log(`▶ Categorias: ${categorias.length}`);
    console.log('');

    // ─── Detectar excedentes ────────────────────────────────────────────
    const todoExceso = [];

    // 1) Jugadores: por cada (club, categoria), mantener MAX_JUGADORES
    for (const club of clubes) {
      for (const cat of categorias) {
        const res = await overflowIds(
          { rol_id: rolByCodigo.jugador.id, club_id: club.id, categoria_id: cat.id },
          MAX_JUGADORES,
          `jugadores club=${club.id} cat=${cat.id}`,
          t,
        );
        if (res.toDelete.length > 0) todoExceso.push(res);
      }
    }

    // 2) Delegado general: por club
    for (const club of clubes) {
      const res = await overflowIds(
        { rol_id: rolByCodigo.delegado_general.id, club_id: club.id },
        MAX_DELEGADO_GENERAL,
        `delegado_general club=${club.id}`,
        t,
      );
      if (res.toDelete.length > 0) todoExceso.push(res);
    }

    // 3) Delegados auxiliares: por club
    for (const club of clubes) {
      const res = await overflowIds(
        { rol_id: rolByCodigo.delegado_auxiliar.id, club_id: club.id },
        MAX_DELEGADOS_AUX,
        `delegados_aux club=${club.id}`,
        t,
      );
      if (res.toDelete.length > 0) todoExceso.push(res);
    }

    // 4) Entrenadores: por (club, categoria)
    // Nota: el seeder creaba 1 DT por (club, cat) pero el modelo no lo amarra a categoria,
    // se amarra solo a club. Asi que contamos por club (con MAX_DTS * cantidad de categorias).
    for (const club of clubes) {
      const maxDT = MAX_DTS * categorias.length;
      const res = await overflowIds(
        { rol_id: rolByCodigo.entrenador.id, club_id: club.id },
        maxDT,
        `entrenador club=${club.id}`,
        t,
      );
      if (res.toDelete.length > 0) todoExceso.push(res);
    }

    // 5) Arbitros del torneo
    {
      const res = await overflowIds(
        { rol_id: rolByCodigo.arbitro.id, torneo_id: TORNEO_ID },
        MAX_ARBITROS,
        `arbitros torneo=${TORNEO_ID}`,
        t,
      );
      if (res.toDelete.length > 0) todoExceso.push(res);
    }

    // 6) Veedores del torneo
    {
      const res = await overflowIds(
        { rol_id: rolByCodigo.veedor.id, torneo_id: TORNEO_ID },
        MAX_VEEDORES,
        `veedores torneo=${TORNEO_ID}`,
        t,
      );
      if (res.toDelete.length > 0) todoExceso.push(res);
    }

    // ─── Resumen ────────────────────────────────────────────────────────
    const totalExceso = todoExceso.reduce((sum, e) => sum + e.toDelete.length, 0);
    console.log(`▶ Total persona_roles excedentes: ${totalExceso}`);

    if (totalExceso === 0) {
      console.log('\n✓ No hay duplicados para limpiar. Todo OK.');
      if (t) await t.rollback();
      process.exit(0);
    }

    // Mostrar breakdown
    const breakdown = {};
    for (const e of todoExceso) {
      const tipo = e.label.split(' ')[0];
      breakdown[tipo] = (breakdown[tipo] || 0) + e.toDelete.length;
    }
    console.log('\n─── Breakdown ────────────');
    for (const [tipo, count] of Object.entries(breakdown)) {
      console.log(`  ${tipo.padEnd(20)} ${count}`);
    }
    console.log('');

    // IDs a borrar
    const personaRolIds = todoExceso.flatMap(e => e.toDelete.map(d => d.id));
    const personaIds = [...new Set(todoExceso.flatMap(e => e.toDelete.map(d => d.persona_id)))];

    if (!APPLY) {
      console.log('⚠  Modo DRY RUN. No se aplicaron cambios.');
      console.log('   Para ejecutar:');
      console.log(`   node src/seeders/limpiar-duplicados-seeder.js --torneo-id=${TORNEO_ID} --apply\n`);
      process.exit(0);
    }

    // ─── APPLY: borrar persona_roles + personas huerfanas ───────────────
    console.log('\n▶ Borrando persona_roles excedentes...');
    const deletedRoles = await PersonaRol.destroy({
      where: { id: personaRolIds },
      transaction: t,
    });
    console.log(`  ✓ ${deletedRoles} persona_roles eliminados`);

    // Borrar personas que quedaron huerfanas (sin roles activos) y tengan DNI ficticio
    console.log('\n▶ Buscando personas huerfanas con DNI ficticio (>= 50000000)...');
    const personasHuerfanas = await Persona.findAll({
      where: {
        id: personaIds,
        dni: { [Op.gte]: String(FAKE_DNI_MIN) },
      },
      include: [{
        model: PersonaRol,
        as: 'roles_asignados',
        required: false,
      }],
      transaction: t,
    });

    const idsHuerfanos = personasHuerfanas
      .filter(p => !p.roles_asignados || p.roles_asignados.length === 0)
      .map(p => p.id);

    if (idsHuerfanos.length > 0) {
      const deletedPersonas = await Persona.destroy({
        where: { id: idsHuerfanos },
        transaction: t,
      });
      console.log(`  ✓ ${deletedPersonas} personas huerfanas eliminadas`);
    } else {
      console.log(`  ✓ No hay personas huerfanas con DNI ficticio`);
    }

    await t.commit();

    console.log('\n════════════════════════════════════════════════');
    console.log('  Limpieza aplicada');
    console.log('════════════════════════════════════════════════\n');

    process.exit(0);
  } catch (err) {
    if (t) await t.rollback();
    console.error('\n✗ Error (rollback):', err.message);
    console.error(err.stack);
    process.exit(1);
  }
})();

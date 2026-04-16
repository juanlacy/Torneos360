'use strict';

/**
 * Seed de la nueva accion 'ver_sensibles' en PermisoDefaultRol.
 *
 * Reglas:
 * - admin_torneo: ver_sensibles en todos los modulos
 * - delegado: ver_sensibles en jugadores y staff (sus personas)
 * - arbitro, veedor, entrenador, publico: sin ver_sensibles
 */
module.exports = {
  async up(queryInterface) {
    const modulos = ['torneos', 'clubes', 'jugadores', 'fixture', 'partidos', 'posiciones', 'arbitros', 'veedores', 'staff', 'configuracion', 'reportes'];

    const registros = [];

    // admin_torneo: ver_sensibles en todo
    for (const m of modulos) {
      registros.push({ rol: 'admin_torneo', modulo: m, accion: 'ver_sensibles', permite: true });
    }

    // delegado: ver_sensibles en jugadores y staff
    registros.push({ rol: 'delegado', modulo: 'jugadores', accion: 'ver_sensibles', permite: true });
    registros.push({ rol: 'delegado', modulo: 'staff', accion: 'ver_sensibles', permite: true });

    // Los demas roles: no agregar (false por defecto al no existir)

    await queryInterface.bulkInsert('permisos_default_rol', registros);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('permisos_default_rol', { accion: 'ver_sensibles' });
  },
};

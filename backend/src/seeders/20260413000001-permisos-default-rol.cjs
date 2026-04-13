'use strict';

module.exports = {
  async up(queryInterface) {
    // Modulos del sistema Torneo360
    const modulos = ['torneos', 'clubes', 'jugadores', 'fixture', 'partidos', 'posiciones', 'arbitros', 'veedores', 'staff', 'configuracion', 'reportes'];
    const acciones = ['ver', 'crear', 'editar', 'eliminar'];

    // Definir permisos por rol
    const permisosPorRol = {
      // admin_torneo: acceso completo excepto configuracion del sistema
      admin_torneo: {
        torneos:       ['ver', 'crear', 'editar'],
        clubes:        ['ver', 'crear', 'editar', 'eliminar'],
        jugadores:     ['ver', 'crear', 'editar', 'eliminar'],
        fixture:       ['ver', 'crear', 'editar', 'eliminar'],
        partidos:      ['ver', 'crear', 'editar', 'eliminar'],
        posiciones:    ['ver', 'editar'],
        arbitros:      ['ver', 'crear', 'editar', 'eliminar'],
        veedores:      ['ver', 'crear', 'editar', 'eliminar'],
        staff:         ['ver', 'crear', 'editar', 'eliminar'],
        configuracion: ['ver', 'editar'],
        reportes:      ['ver'],
      },
      // delegado: gestiona su club, ve lo demas
      delegado: {
        torneos:    ['ver'],
        clubes:     ['ver'],
        jugadores:  ['ver', 'crear', 'editar'],
        fixture:    ['ver'],
        partidos:   ['ver', 'editar'],
        posiciones: ['ver'],
        arbitros:   ['ver'],
        veedores:   ['ver'],
        staff:      ['ver', 'crear', 'editar'],
        reportes:   ['ver'],
      },
      // arbitro: valida y cierra partidos
      arbitro: {
        torneos:    ['ver'],
        clubes:     ['ver'],
        jugadores:  ['ver'],
        fixture:    ['ver'],
        partidos:   ['ver', 'editar'],
        posiciones: ['ver'],
        arbitros:   ['ver'],
        reportes:   ['ver'],
      },
      // veedor: solo lectura + reportes
      veedor: {
        torneos:    ['ver'],
        clubes:     ['ver'],
        jugadores:  ['ver'],
        fixture:    ['ver'],
        partidos:   ['ver'],
        posiciones: ['ver'],
        reportes:   ['ver'],
      },
      // entrenador: ve datos de su equipo
      entrenador: {
        torneos:    ['ver'],
        clubes:     ['ver'],
        jugadores:  ['ver'],
        fixture:    ['ver'],
        partidos:   ['ver'],
        posiciones: ['ver'],
      },
      // publico: solo ve resultados y posiciones
      publico: {
        torneos:    ['ver'],
        clubes:     ['ver'],
        fixture:    ['ver'],
        partidos:   ['ver'],
        posiciones: ['ver'],
      },
    };

    const registros = [];

    for (const [rol, moduloPermisos] of Object.entries(permisosPorRol)) {
      for (const [modulo, accionesPermitidas] of Object.entries(moduloPermisos)) {
        for (const accion of acciones) {
          registros.push({
            rol,
            modulo,
            accion,
            permite: accionesPermitidas.includes(accion),
          });
        }
      }
    }

    await queryInterface.bulkInsert('permisos_default_rol', registros, {
      ignoreDuplicates: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('permisos_default_rol', null, {});
  },
};

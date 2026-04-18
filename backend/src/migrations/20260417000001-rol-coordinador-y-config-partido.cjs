'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1) Insertar rol Coordinador
    await queryInterface.bulkInsert('roles', [{
      codigo: 'coordinador',
      nombre: 'Coordinador',
      descripcion: 'Coordinador del torneo. Asigna arbitros, veedores, gestiona fechas y canchas.',
      ambito: 'torneo',
      categoria_fn: 'oficial_torneo',
      icono: 'supervisor_account',
      color: '#6366f1',
      puede_firmar_alineacion: false,
      puede_dirigir_partido: false,
      requiere_categoria: false,
      requiere_numero_camiseta: false,
      orden: 55,
      es_sistema: true,
      activo: true,
    }]);

    // 2) Permisos default del coordinador (similar a admin_torneo pero sin configuracion)
    const modulos = ['torneos', 'clubes', 'jugadores', 'fixture', 'partidos', 'posiciones', 'arbitros', 'veedores', 'staff', 'reportes'];
    const permisos = [];
    for (const m of modulos) {
      permisos.push({ rol: 'coordinador', modulo: m, accion: 'ver', permite: true });
      if (['fixture', 'partidos', 'arbitros', 'veedores'].includes(m)) {
        permisos.push({ rol: 'coordinador', modulo: m, accion: 'crear', permite: true });
        permisos.push({ rol: 'coordinador', modulo: m, accion: 'editar', permite: true });
      }
    }
    permisos.push({ rol: 'coordinador', modulo: 'jugadores', accion: 'ver_sensibles', permite: true });
    permisos.push({ rol: 'coordinador', modulo: 'staff', accion: 'ver_sensibles', permite: true });
    await queryInterface.bulkInsert('permisos_default_rol', permisos);

    // 3) Agregar rol 'coordinador' al enum de usuarios (si no existe ya)
    // No se necesita ALTER — el campo es STRING(30) sin validate en DB

    // 4) Agregar campos de config de partido a la tabla de torneos.config
    // (JSONB — no requiere migracion, se agregan al vuelo)
    // Claves nuevas en torneo.config:
    //   elegir_mejor_jugador: boolean (default false)
    //   calificar_arbitro: boolean (default false)

    // 5) Agregar columna mejor_jugador_id y calificacion_arbitro al partido
    await queryInterface.addColumn('partidos', 'mejor_jugador_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'personas', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
    await queryInterface.addColumn('partidos', 'calificacion_arbitro', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Calificacion del arbitro (1-5 estrellas)',
    });
    await queryInterface.addColumn('partidos', 'comentario_arbitro', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Comentario opcional sobre el arbitraje',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('partidos', 'mejor_jugador_id').catch(() => {});
    await queryInterface.removeColumn('partidos', 'calificacion_arbitro').catch(() => {});
    await queryInterface.removeColumn('partidos', 'comentario_arbitro').catch(() => {});
    await queryInterface.bulkDelete('permisos_default_rol', { rol: 'coordinador' });
    await queryInterface.bulkDelete('roles', { codigo: 'coordinador' });
  },
};

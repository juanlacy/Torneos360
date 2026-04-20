'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // ─── 1) Tabla sanciones_disciplinarias ─────────────────────────────────
    await queryInterface.createTable('sanciones_disciplinarias', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      torneo_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'torneos', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      persona_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'personas', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      tipo_persona: {
        type: Sequelize.STRING(20), allowNull: false, defaultValue: 'jugador',
        comment: 'jugador | arbitro | delegado | entrenador | club',
      },
      motivo: {
        type: Sequelize.STRING(40), allowNull: false,
        comment: 'acumulacion_amarillas | roja_directa | doble_amarilla | informe_arbitro | otro',
      },
      partido_id: {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: 'partidos', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL',
        comment: 'Partido origen de la sancion si aplica',
      },
      fechas_suspension: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      multa:             { type: Sequelize.DECIMAL(10, 2), allowNull: true },
      detalle:           { type: Sequelize.TEXT, allowNull: true },
      estado: {
        type: Sequelize.STRING(20), allowNull: false, defaultValue: 'propuesta',
        comment: 'propuesta | aplicada | cumplida | apelada | revocada',
      },
      creada_por: {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: 'usuarios', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL',
      },
      apelacion_texto:       { type: Sequelize.TEXT, allowNull: true },
      resolucion_apelacion: {
        type: Sequelize.STRING(20), allowNull: true,
        comment: 'confirmada | reducida | revocada',
      },
      resuelta_en:  { type: Sequelize.DATE, allowNull: true },
      resuelta_por: {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: 'usuarios', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL',
      },
      creado_en:      { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
      actualizado_en: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
    });

    await queryInterface.addIndex('sanciones_disciplinarias', ['torneo_id'],      { name: 'idx_sanciones_torneo' });
    await queryInterface.addIndex('sanciones_disciplinarias', ['persona_id'],     { name: 'idx_sanciones_persona' });
    await queryInterface.addIndex('sanciones_disciplinarias', ['partido_id'],     { name: 'idx_sanciones_partido' });
    await queryInterface.addIndex('sanciones_disciplinarias', ['estado'],         { name: 'idx_sanciones_estado' });

    // ─── 2) Rol tribunal ──────────────────────────────────────────────────
    await queryInterface.bulkInsert('roles', [{
      codigo: 'tribunal',
      nombre: 'Tribunal de Disciplina',
      descripcion: 'Miembro del tribunal. Revisa tarjetas, aplica sanciones y resuelve apelaciones.',
      ambito: 'torneo',
      categoria_fn: 'oficial_torneo',
      icono: 'gavel',
      color: '#b91c1c',
      puede_firmar_alineacion: false,
      puede_dirigir_partido: false,
      requiere_categoria: false,
      requiere_numero_camiseta: false,
      orden: 58,
      es_sistema: true,
      activo: true,
    }]);

    // ─── 3) Modulo tribunal en permisos_default_rol ───────────────────────
    // admin_sistema y admin_torneo ya son bypass, pero agregamos registros por consistencia
    const permisos = [];
    const accionesTribunal = ['ver', 'crear', 'editar'];

    // Rol tribunal: todos los permisos del modulo
    for (const a of accionesTribunal) {
      permisos.push({ rol: 'tribunal', modulo: 'tribunal', accion: a, permite: true });
    }
    // Tribunal tambien necesita ver partidos, fixture, jugadores, staff (para contexto)
    for (const m of ['partidos', 'fixture', 'jugadores', 'staff', 'posiciones']) {
      permisos.push({ rol: 'tribunal', modulo: m, accion: 'ver', permite: true });
    }
    permisos.push({ rol: 'tribunal', modulo: 'jugadores', accion: 'ver_sensibles', permite: true });
    permisos.push({ rol: 'tribunal', modulo: 'staff',     accion: 'ver_sensibles', permite: true });

    // admin_torneo: acceso total al modulo tribunal
    for (const a of accionesTribunal) {
      permisos.push({ rol: 'admin_torneo', modulo: 'tribunal', accion: a, permite: true });
    }

    // Otros roles: solo ver (transparencia)
    for (const r of ['coordinador', 'delegado', 'arbitro', 'veedor', 'entrenador']) {
      permisos.push({ rol: r, modulo: 'tribunal', accion: 'ver', permite: true });
    }

    await queryInterface.bulkInsert('permisos_default_rol', permisos);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('permisos_default_rol', { modulo: 'tribunal' });
    await queryInterface.bulkDelete('roles', { codigo: 'tribunal' });
    await queryInterface.dropTable('sanciones_disciplinarias').catch(() => {});
  },
};

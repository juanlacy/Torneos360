'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1) Crear tabla roles_staff
    await queryInterface.createTable('roles_staff', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      codigo: { type: Sequelize.STRING(40), allowNull: false, unique: true },
      nombre: { type: Sequelize.STRING(80), allowNull: false },
      descripcion: { type: Sequelize.TEXT, allowNull: true },
      icono: { type: Sequelize.STRING(40), allowNull: true },
      color: { type: Sequelize.STRING(20), allowNull: true },
      puede_firmar_alineacion: { type: Sequelize.BOOLEAN, defaultValue: false },
      orden: { type: Sequelize.INTEGER, defaultValue: 0 },
      activo: { type: Sequelize.BOOLEAN, defaultValue: true },
      es_sistema: { type: Sequelize.BOOLEAN, defaultValue: false },
      creado_en: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
      actualizado_en: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('roles_staff', ['codigo'], { unique: true, name: 'idx_roles_staff_codigo' });
    await queryInterface.addIndex('roles_staff', ['activo'], { name: 'idx_roles_staff_activo' });

    // 2) Seed con los roles que ya existen en staff.tipo + algunos sugeridos
    await queryInterface.bulkInsert('roles_staff', [
      {
        codigo: 'delegado_general',
        nombre: 'Delegado General',
        descripcion: 'Responsable principal del club frente al torneo. Firma alineaciones y actua como representante oficial.',
        icono: 'admin_panel_settings',
        color: '#7c3aed',
        puede_firmar_alineacion: true,
        orden: 10,
        es_sistema: true,
        activo: true,
      },
      {
        codigo: 'delegado_auxiliar',
        nombre: 'Delegado Auxiliar',
        descripcion: 'Delegado suplente. Puede firmar alineaciones cuando el titular no esta presente.',
        icono: 'assignment_ind',
        color: '#8b5cf6',
        puede_firmar_alineacion: true,
        orden: 20,
        es_sistema: true,
        activo: true,
      },
      {
        codigo: 'entrenador',
        nombre: 'Director Tecnico',
        descripcion: 'Entrenador principal del equipo. A cargo de las decisiones tecnicas en cancha.',
        icono: 'sports',
        color: '#0ea5e9',
        puede_firmar_alineacion: false,
        orden: 30,
        es_sistema: true,
        activo: true,
      },
      {
        codigo: 'ayudante',
        nombre: 'Ayudante de Campo',
        descripcion: 'Asistente tecnico del entrenador principal.',
        icono: 'sports_handball',
        color: '#06b6d4',
        puede_firmar_alineacion: false,
        orden: 40,
        es_sistema: true,
        activo: true,
      },
      {
        codigo: 'dirigente',
        nombre: 'Dirigente',
        descripcion: 'Miembro de la comision directiva del club (presidente, secretario, tesorero, vocal, etc).',
        icono: 'business_center',
        color: '#f59e0b',
        puede_firmar_alineacion: false,
        orden: 50,
        es_sistema: false,
        activo: true,
      },
    ]);

    // 3) Agregar rol_id a staff (nullable para backward-compat)
    await queryInterface.addColumn('staff', 'rol_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'roles_staff', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
    await queryInterface.addIndex('staff', ['rol_id'], { name: 'idx_staff_rol_id' });

    // 4) Migrar datos: para cada staff, setear rol_id segun el codigo que coincida con staff.tipo
    await queryInterface.sequelize.query(`
      UPDATE staff s
      SET rol_id = r.id
      FROM roles_staff r
      WHERE s.tipo = r.codigo AND s.rol_id IS NULL;
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('staff', 'idx_staff_rol_id').catch(() => {});
    await queryInterface.removeColumn('staff', 'rol_id');
    await queryInterface.dropTable('roles_staff');
  },
};

'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('permisos_default_rol', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      rol: { type: Sequelize.STRING(50), allowNull: false },
      modulo: { type: Sequelize.STRING(50), allowNull: false },
      accion: { type: Sequelize.STRING(20), allowNull: false },
      permite: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
    });

    await queryInterface.addIndex('permisos_default_rol', ['rol', 'modulo', 'accion'], {
      name: 'idx_permisos_default_rol_unique',
      unique: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('permisos_default_rol');
  },
};

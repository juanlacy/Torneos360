'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('torneos', 'logo_url', { type: Sequelize.STRING(500), allowNull: true });
    await queryInterface.addColumn('torneos', 'favicon_url', { type: Sequelize.STRING(500), allowNull: true });
    await queryInterface.addColumn('torneos', 'color_primario', { type: Sequelize.STRING(7), defaultValue: '#762c7e' });
    await queryInterface.addColumn('torneos', 'color_secundario', { type: Sequelize.STRING(7), defaultValue: '#4f2f7d' });
    await queryInterface.addColumn('torneos', 'color_acento', { type: Sequelize.STRING(7), defaultValue: '#8cb24d' });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('torneos', 'logo_url');
    await queryInterface.removeColumn('torneos', 'favicon_url');
    await queryInterface.removeColumn('torneos', 'color_primario');
    await queryInterface.removeColumn('torneos', 'color_secundario');
    await queryInterface.removeColumn('torneos', 'color_acento');
  },
};

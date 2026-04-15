'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('partidos', 'periodo_actual', {
      type: Sequelize.INTEGER,
      defaultValue: 0,
    });
    await queryInterface.addColumn('partidos', 'config_override', {
      type: Sequelize.JSONB,
      defaultValue: {},
    });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('partidos', 'periodo_actual');
    await queryInterface.removeColumn('partidos', 'config_override');
  },
};

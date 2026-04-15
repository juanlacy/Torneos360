'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('partido_eventos', 'periodo', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('partido_eventos', 'periodo');
  },
};

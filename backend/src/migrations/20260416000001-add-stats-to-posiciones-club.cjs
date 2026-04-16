'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const cols = ['pj', 'pg', 'pe', 'pp', 'gf', 'gc', 'dg'];
    for (const col of cols) {
      await queryInterface.addColumn('tabla_posiciones_club', col, {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      });
    }
  },

  async down(queryInterface) {
    const cols = ['pj', 'pg', 'pe', 'pp', 'gf', 'gc', 'dg'];
    for (const col of cols) {
      await queryInterface.removeColumn('tabla_posiciones_club', col);
    }
  },
};

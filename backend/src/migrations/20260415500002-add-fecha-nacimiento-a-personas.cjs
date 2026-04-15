'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('staff', 'fecha_nacimiento', { type: Sequelize.DATEONLY, allowNull: true });
    await queryInterface.addColumn('arbitros', 'fecha_nacimiento', { type: Sequelize.DATEONLY, allowNull: true });
    await queryInterface.addColumn('veedores', 'fecha_nacimiento', { type: Sequelize.DATEONLY, allowNull: true });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('staff', 'fecha_nacimiento');
    await queryInterface.removeColumn('arbitros', 'fecha_nacimiento');
    await queryInterface.removeColumn('veedores', 'fecha_nacimiento');
  },
};

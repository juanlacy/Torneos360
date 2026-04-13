'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('torneos', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      nombre: { type: Sequelize.STRING(100), allowNull: false },
      anio: { type: Sequelize.INTEGER, allowNull: false },
      fecha_inicio: { type: Sequelize.DATEONLY, allowNull: true },
      fecha_fin: { type: Sequelize.DATEONLY, allowNull: true },
      estado: { type: Sequelize.STRING(20), defaultValue: 'planificacion' },
      config: { type: Sequelize.JSONB, defaultValue: {} },
      creado_en: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
      actualizado_en: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('torneos');
  },
};

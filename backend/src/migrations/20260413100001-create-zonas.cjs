'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('zonas', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      torneo_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'torneos', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      nombre: { type: Sequelize.STRING(50), allowNull: false },
      color: { type: Sequelize.STRING(7), allowNull: true },
      creado_en: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
    });
  },
  async down(queryInterface) { await queryInterface.dropTable('zonas'); },
};

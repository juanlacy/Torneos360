'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('arbitros', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      torneo_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'torneos', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      nombre: { type: Sequelize.STRING(100), allowNull: false },
      apellido: { type: Sequelize.STRING(100), allowNull: false },
      dni: { type: Sequelize.STRING(20), allowNull: false },
      telefono: { type: Sequelize.STRING(30), allowNull: true },
      email: { type: Sequelize.STRING(150), allowNull: true },
      foto_url: { type: Sequelize.STRING(500), allowNull: true },
      activo: { type: Sequelize.BOOLEAN, defaultValue: true },
      creado_en: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
      actualizado_en: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
    });

    await queryInterface.addIndex('arbitros', ['torneo_id'], { name: 'idx_arbitros_torneo' });
  },
  async down(queryInterface) { await queryInterface.dropTable('arbitros'); },
};

'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('categorias', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      torneo_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'torneos', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      nombre: { type: Sequelize.STRING(50), allowNull: false },
      anio_nacimiento: { type: Sequelize.INTEGER, allowNull: false },
      es_preliminar: { type: Sequelize.BOOLEAN, defaultValue: false },
      max_jugadores: { type: Sequelize.INTEGER, defaultValue: 25 },
      orden: { type: Sequelize.INTEGER, defaultValue: 0 },
      config: { type: Sequelize.JSONB, defaultValue: {} },
      creado_en: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
      actualizado_en: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
    });

    await queryInterface.addIndex('categorias', ['torneo_id'], { name: 'idx_categorias_torneo' });
  },
  async down(queryInterface) { await queryInterface.dropTable('categorias'); },
};

'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('fixture_jornadas', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      torneo_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'torneos', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      zona_id: {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: 'zonas', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL',
      },
      numero_jornada: { type: Sequelize.INTEGER, allowNull: false },
      fase: { type: Sequelize.STRING(10), defaultValue: 'ida' },
      fecha: { type: Sequelize.DATEONLY, allowNull: true },
      estado: { type: Sequelize.STRING(20), defaultValue: 'programada' },
      creado_en: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
      actualizado_en: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('fixture_jornadas', ['torneo_id'], { name: 'idx_jornadas_torneo' });
    await queryInterface.addIndex('fixture_jornadas', ['zona_id'], { name: 'idx_jornadas_zona' });
  },
  async down(queryInterface) { await queryInterface.dropTable('fixture_jornadas'); },
};

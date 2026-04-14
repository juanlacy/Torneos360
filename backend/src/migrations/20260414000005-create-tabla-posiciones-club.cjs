'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('tabla_posiciones_club', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      torneo_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'torneos', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      zona_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'zonas', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      club_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'clubes', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      puntos_totales: { type: Sequelize.INTEGER, defaultValue: 0 },
      detalle: { type: Sequelize.JSONB, defaultValue: {} },
      actualizado_en: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('tabla_posiciones_club', ['torneo_id', 'club_id'], { name: 'idx_posiciones_club_torneo', unique: true });
  },
  async down(queryInterface) { await queryInterface.dropTable('tabla_posiciones_club'); },
};

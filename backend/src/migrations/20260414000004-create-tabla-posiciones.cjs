'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('tabla_posiciones', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      torneo_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'torneos', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      categoria_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'categorias', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      zona_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'zonas', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      club_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'clubes', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      pj: { type: Sequelize.INTEGER, defaultValue: 0 },
      pg: { type: Sequelize.INTEGER, defaultValue: 0 },
      pe: { type: Sequelize.INTEGER, defaultValue: 0 },
      pp: { type: Sequelize.INTEGER, defaultValue: 0 },
      gf: { type: Sequelize.INTEGER, defaultValue: 0 },
      gc: { type: Sequelize.INTEGER, defaultValue: 0 },
      dg: { type: Sequelize.INTEGER, defaultValue: 0 },
      puntos: { type: Sequelize.INTEGER, defaultValue: 0 },
      actualizado_en: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('tabla_posiciones', ['torneo_id', 'categoria_id', 'club_id'], { name: 'idx_posiciones_torneo_cat_club', unique: true });
  },
  async down(queryInterface) { await queryInterface.dropTable('tabla_posiciones'); },
};

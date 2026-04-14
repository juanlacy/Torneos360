'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('partido_eventos', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      partido_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'partidos', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      tipo: { type: Sequelize.STRING(30), allowNull: false },
      jugador_id: {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: 'jugadores', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL',
      },
      jugador_reemplaza_id: {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: 'jugadores', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL',
      },
      club_id: {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: 'clubes', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL',
      },
      minuto: { type: Sequelize.INTEGER, allowNull: true },
      detalle: { type: Sequelize.TEXT, allowNull: true },
      registrado_por: {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: 'usuarios', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL',
      },
      creado_en: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('partido_eventos', ['partido_id'], { name: 'idx_eventos_partido' });
    await queryInterface.addIndex('partido_eventos', ['tipo'], { name: 'idx_eventos_tipo' });
  },
  async down(queryInterface) { await queryInterface.dropTable('partido_eventos'); },
};

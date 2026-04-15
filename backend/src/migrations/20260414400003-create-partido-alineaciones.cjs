'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('partido_alineaciones', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      partido_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'partidos', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      jugador_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'jugadores', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      club_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'clubes', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      numero_camiseta: { type: Sequelize.INTEGER, allowNull: true },
      titular: { type: Sequelize.BOOLEAN, defaultValue: true },
      confirmado: { type: Sequelize.BOOLEAN, defaultValue: false },
      creado_en: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('partido_alineaciones', ['partido_id'], { name: 'idx_alineacion_partido' });
    await queryInterface.addIndex('partido_alineaciones', ['jugador_id'], { name: 'idx_alineacion_jugador' });
    await queryInterface.addIndex('partido_alineaciones', ['partido_id', 'jugador_id'], {
      name: 'idx_alineacion_unique', unique: true,
    });
  },
  async down(queryInterface) { await queryInterface.dropTable('partido_alineaciones'); },
};

'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('partido_confirmaciones', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      partido_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'partidos', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      tipo: { type: Sequelize.STRING(30), allowNull: false },
      dni_ingresado: { type: Sequelize.STRING(20), allowNull: false },
      firma_data_url: { type: Sequelize.TEXT, allowNull: true },
      usuario_id: {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: 'usuarios', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL',
      },
      nombre_firmante: { type: Sequelize.STRING(200), allowNull: true },
      creado_en: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('partido_confirmaciones', ['partido_id'], { name: 'idx_confirm_partido' });
    await queryInterface.addIndex('partido_confirmaciones', ['tipo'], { name: 'idx_confirm_tipo' });
  },
  async down(queryInterface) { await queryInterface.dropTable('partido_confirmaciones'); },
};

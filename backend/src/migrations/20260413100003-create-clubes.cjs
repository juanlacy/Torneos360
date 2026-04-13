'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('clubes', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      torneo_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'torneos', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      zona_id: {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: 'zonas', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL',
      },
      nombre: { type: Sequelize.STRING(100), allowNull: false },
      nombre_corto: { type: Sequelize.STRING(30), allowNull: true },
      escudo_url: { type: Sequelize.STRING(500), allowNull: true },
      color_primario: { type: Sequelize.STRING(7), allowNull: true },
      color_secundario: { type: Sequelize.STRING(7), allowNull: true },
      contacto: { type: Sequelize.JSONB, defaultValue: {} },
      activo: { type: Sequelize.BOOLEAN, defaultValue: true },
      creado_en: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
      actualizado_en: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
    });

    await queryInterface.addIndex('clubes', ['torneo_id'], { name: 'idx_clubes_torneo' });
    await queryInterface.addIndex('clubes', ['zona_id'], { name: 'idx_clubes_zona' });
  },
  async down(queryInterface) { await queryInterface.dropTable('clubes'); },
};

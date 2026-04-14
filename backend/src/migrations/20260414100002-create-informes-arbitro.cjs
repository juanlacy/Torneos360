'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('informes_arbitro', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      partido_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'partidos', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      arbitro_id: {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: 'arbitros', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL',
      },
      usuario_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'usuarios', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      audio_url: { type: Sequelize.STRING(500), allowNull: true },
      transcripcion: { type: Sequelize.TEXT, allowNull: true },
      resumen: { type: Sequelize.TEXT, allowNull: true },
      texto_manual: { type: Sequelize.TEXT, allowNull: true },
      tipo: { type: Sequelize.STRING(30), defaultValue: 'general' },
      estado: { type: Sequelize.STRING(20), defaultValue: 'borrador' },
      metadata: { type: Sequelize.JSONB, defaultValue: {} },
      creado_en: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
      actualizado_en: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('informes_arbitro', ['partido_id'], { name: 'idx_informes_partido' });
    await queryInterface.addIndex('informes_arbitro', ['arbitro_id'], { name: 'idx_informes_arbitro' });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('informes_arbitro');
  },
};

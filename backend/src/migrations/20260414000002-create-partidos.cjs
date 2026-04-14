'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('partidos', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      jornada_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'fixture_jornadas', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      categoria_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'categorias', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      club_local_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'clubes', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      club_visitante_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'clubes', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      estado: { type: Sequelize.STRING(20), defaultValue: 'programado' },
      goles_local: { type: Sequelize.INTEGER, defaultValue: 0 },
      goles_visitante: { type: Sequelize.INTEGER, defaultValue: 0 },
      arbitro_id: {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: 'arbitros', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL',
      },
      veedor_id: {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: 'veedores', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL',
      },
      cancha: { type: Sequelize.STRING(50), allowNull: true },
      hora_inicio: { type: Sequelize.DATE, allowNull: true },
      hora_fin: { type: Sequelize.DATE, allowNull: true },
      confirmado_arbitro: { type: Sequelize.BOOLEAN, defaultValue: false },
      observaciones: { type: Sequelize.TEXT, allowNull: true },
      creado_en: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
      actualizado_en: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('partidos', ['jornada_id'], { name: 'idx_partidos_jornada' });
    await queryInterface.addIndex('partidos', ['categoria_id'], { name: 'idx_partidos_categoria' });
    await queryInterface.addIndex('partidos', ['estado'], { name: 'idx_partidos_estado' });
  },
  async down(queryInterface) { await queryInterface.dropTable('partidos'); },
};

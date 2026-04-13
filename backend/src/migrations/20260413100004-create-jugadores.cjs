'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('jugadores', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      club_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'clubes', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      categoria_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'categorias', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      nombre: { type: Sequelize.STRING(100), allowNull: false },
      apellido: { type: Sequelize.STRING(100), allowNull: false },
      dni: { type: Sequelize.STRING(20), allowNull: false },
      fecha_nacimiento: { type: Sequelize.DATEONLY, allowNull: false },
      foto_url: { type: Sequelize.STRING(500), allowNull: true },
      numero_camiseta: { type: Sequelize.INTEGER, allowNull: true },
      estado_fichaje: { type: Sequelize.STRING(20), defaultValue: 'pendiente' },
      ficha_medica: { type: Sequelize.JSONB, defaultValue: {} },
      datos_personales: { type: Sequelize.JSONB, defaultValue: {} },
      observaciones: { type: Sequelize.TEXT, allowNull: true },
      activo: { type: Sequelize.BOOLEAN, defaultValue: true },
      creado_en: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
      actualizado_en: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
    });

    await queryInterface.addIndex('jugadores', ['club_id'], { name: 'idx_jugadores_club' });
    await queryInterface.addIndex('jugadores', ['categoria_id'], { name: 'idx_jugadores_categoria' });
    await queryInterface.addIndex('jugadores', ['dni'], { name: 'idx_jugadores_dni' });
    await queryInterface.addIndex('jugadores', ['estado_fichaje'], { name: 'idx_jugadores_estado' });
  },
  async down(queryInterface) { await queryInterface.dropTable('jugadores'); },
};

'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('documentos', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      entidad_tipo: { type: Sequelize.STRING(30), allowNull: false },
      entidad_id: { type: Sequelize.INTEGER, allowNull: false },
      tipo: { type: Sequelize.STRING(30), allowNull: false },
      archivo_url: { type: Sequelize.STRING(500), allowNull: false },
      nombre_original: { type: Sequelize.STRING(255), allowNull: true },
      mime_type: { type: Sequelize.STRING(100), allowNull: true },
      tamano: { type: Sequelize.INTEGER, allowNull: true },
      descripcion: { type: Sequelize.STRING(255), allowNull: true },
      subido_por: { type: Sequelize.INTEGER, allowNull: true,
        references: { model: 'usuarios', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      creado_en: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('documentos', ['entidad_tipo', 'entidad_id'], { name: 'idx_documentos_entidad' });
    await queryInterface.addIndex('documentos', ['tipo'], { name: 'idx_documentos_tipo' });
  },
  async down(queryInterface) { await queryInterface.dropTable('documentos'); },
};

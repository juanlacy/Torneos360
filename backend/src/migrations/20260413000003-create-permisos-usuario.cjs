'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('permisos_usuario', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      usuario_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'usuarios', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      modulo: { type: Sequelize.STRING(50), allowNull: false },
      accion: { type: Sequelize.STRING(20), allowNull: false },
      permite: { type: Sequelize.BOOLEAN, allowNull: false },
      creado_en: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
    });

    await queryInterface.addIndex('permisos_usuario', ['usuario_id', 'modulo', 'accion'], {
      name: 'idx_permisos_usuario_unique',
      unique: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('permisos_usuario');
  },
};

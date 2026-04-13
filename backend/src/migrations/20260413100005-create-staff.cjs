'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('staff', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      club_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'clubes', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      nombre: { type: Sequelize.STRING(100), allowNull: false },
      apellido: { type: Sequelize.STRING(100), allowNull: false },
      dni: { type: Sequelize.STRING(20), allowNull: false },
      tipo: { type: Sequelize.STRING(30), allowNull: false },
      telefono: { type: Sequelize.STRING(30), allowNull: true },
      email: { type: Sequelize.STRING(150), allowNull: true },
      foto_url: { type: Sequelize.STRING(500), allowNull: true },
      activo: { type: Sequelize.BOOLEAN, defaultValue: true },
      creado_en: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
      actualizado_en: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
    });

    await queryInterface.addIndex('staff', ['club_id'], { name: 'idx_staff_club' });
    await queryInterface.addIndex('staff', ['tipo'], { name: 'idx_staff_tipo' });
  },
  async down(queryInterface) { await queryInterface.dropTable('staff'); },
};

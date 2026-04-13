'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('audit_logs', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      usuario_id: { type: Sequelize.INTEGER, allowNull: true },
      accion: { type: Sequelize.STRING(100), allowNull: false },
      entidad: { type: Sequelize.STRING(50), allowNull: true },
      entidad_id: { type: Sequelize.INTEGER, allowNull: true },
      datos_anteriores: { type: Sequelize.JSONB, allowNull: true },
      datos_nuevos: { type: Sequelize.JSONB, allowNull: true },
      ip: { type: Sequelize.STRING(45), allowNull: true },
      user_agent: { type: Sequelize.STRING(500), allowNull: true },
      creado_en: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
    });

    await queryInterface.addIndex('audit_logs', ['usuario_id'], { name: 'idx_audit_usuario' });
    await queryInterface.addIndex('audit_logs', ['entidad', 'entidad_id'], { name: 'idx_audit_entidad' });
    await queryInterface.addIndex('audit_logs', ['creado_en'], { name: 'idx_audit_fecha' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('audit_logs');
  },
};

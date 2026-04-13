'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('usuarios', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      nombre: { type: Sequelize.STRING(100), allowNull: false },
      apellido: { type: Sequelize.STRING(100), allowNull: false },
      email: { type: Sequelize.STRING(150), allowNull: false, unique: true },
      password_hash: { type: Sequelize.STRING(255), allowNull: true },
      rol: { type: Sequelize.STRING(30), allowNull: false, defaultValue: 'publico' },
      oauth_provider: { type: Sequelize.STRING(20), defaultValue: 'local' },
      google_id: { type: Sequelize.STRING(255), allowNull: true, unique: true },
      microsoft_id: { type: Sequelize.STRING(255), allowNull: true, unique: true },
      avatar_url: { type: Sequelize.STRING(500), allowNull: true },
      entidad_tipo: { type: Sequelize.STRING(30), allowNull: true },
      entidad_id: { type: Sequelize.INTEGER, allowNull: true },
      club_id: { type: Sequelize.INTEGER, allowNull: true },
      email_verificado: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      activo: { type: Sequelize.BOOLEAN, defaultValue: true },
      ultimo_acceso: { type: Sequelize.DATE, allowNull: true },
      reset_token: { type: Sequelize.STRING(255), allowNull: true },
      reset_token_expira: { type: Sequelize.DATE, allowNull: true },
      verification_token: { type: Sequelize.STRING(255), allowNull: true },
      verification_token_expira: { type: Sequelize.DATE, allowNull: true },
      intentos_fallidos: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      bloqueado_hasta: { type: Sequelize.DATE, allowNull: true },
      refresh_token: { type: Sequelize.STRING(255), allowNull: true },
      refresh_token_expires: { type: Sequelize.DATE, allowNull: true },
      creado_en: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
      actualizado_en: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
    });

    await queryInterface.addIndex('usuarios', ['email'], { name: 'idx_usuarios_email' });
    await queryInterface.addIndex('usuarios', ['rol'], { name: 'idx_usuarios_rol' });
    await queryInterface.addIndex('usuarios', ['club_id'], { name: 'idx_usuarios_club' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('usuarios');
  },
};

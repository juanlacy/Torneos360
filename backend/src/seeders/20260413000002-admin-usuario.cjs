'use strict';
const bcrypt = require('bcrypt');

module.exports = {
  async up(queryInterface) {
    const passwordHash = await bcrypt.hash('admin123', 12);

    await queryInterface.bulkInsert('usuarios', [
      {
        nombre: 'Admin',
        apellido: 'Sistema',
        email: 'admin@torneo360.com',
        password_hash: passwordHash,
        rol: 'admin_sistema',
        oauth_provider: 'local',
        email_verificado: true,
        activo: true,
        creado_en: new Date(),
        actualizado_en: new Date(),
      },
    ], {
      ignoreDuplicates: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('usuarios', { email: 'admin@torneo360.com' }, {});
  },
};

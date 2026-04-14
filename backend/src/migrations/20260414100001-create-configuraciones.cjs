'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('configuraciones', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      clave: { type: Sequelize.STRING(100), allowNull: false, unique: true },
      valor: { type: Sequelize.JSONB, defaultValue: {} },
      descripcion: { type: Sequelize.STRING(255), allowNull: true },
      actualizado_en: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
    });

    // Seed: configuracion de IA por defecto
    await queryInterface.bulkInsert('configuraciones', [
      {
        clave: 'integracion_ia',
        valor: JSON.stringify({
          ia_principal: 'openai',
          openai_api_key: '',
          openai_modelo_transcripcion: 'whisper-1',
          openai_modelo_resumen: 'gpt-4o-mini',
          gemini_api_key: '',
          gemini_modelo: 'gemini-2.5-flash',
        }),
        descripcion: 'Configuracion de integraciones de IA (OpenAI / Gemini)',
        actualizado_en: new Date(),
      },
    ]);
  },
  async down(queryInterface) {
    await queryInterface.dropTable('configuraciones');
  },
};

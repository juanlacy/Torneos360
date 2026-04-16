'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('usuarios', 'persona_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'personas', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
    await queryInterface.addIndex('usuarios', ['persona_id'], { name: 'idx_usuarios_persona_id' });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('usuarios', 'idx_usuarios_persona_id').catch(() => {});
    await queryInterface.removeColumn('usuarios', 'persona_id');
  },
};

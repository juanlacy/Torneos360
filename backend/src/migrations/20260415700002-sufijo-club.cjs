'use strict';

/**
 * Agrega el campo `sufijo` a clubes para soportar que una misma institucion
 * tenga multiples equipos en el mismo torneo (ej: "12 de Octubre A" y "12 de Octubre B").
 *
 * Cambios:
 *  1. Drop del UNIQUE(institucion_id, torneo_id) existente
 *  2. Agregar columna sufijo VARCHAR(20) NOT NULL DEFAULT ''
 *  3. Crear nuevo UNIQUE(institucion_id, torneo_id, sufijo)
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // 1) Drop del indice unique viejo
      await queryInterface.removeIndex('clubes', 'idx_clubes_unique', { transaction });

      // 2) Agregar columna sufijo
      await queryInterface.addColumn('clubes', 'sufijo', {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: '',
      }, { transaction });

      // 3) Nuevo unique compuesto
      await queryInterface.addIndex('clubes', ['institucion_id', 'torneo_id', 'sufijo'], {
        unique: true,
        name: 'idx_clubes_unique',
        transaction,
      });

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.removeIndex('clubes', 'idx_clubes_unique', { transaction });
      await queryInterface.removeColumn('clubes', 'sufijo', { transaction });
      await queryInterface.addIndex('clubes', ['institucion_id', 'torneo_id'], {
        unique: true,
        name: 'idx_clubes_unique',
        transaction,
      });
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },
};

'use strict';

/**
 * Migracion: separar Institucion de Club.
 *
 * Antes: `clubes` tenia nombre, escudo, colores, contacto (datos visuales)
 * y ademas torneo_id/zona_id (datos de participacion). Esto obligaba a
 * duplicar clubes si participaban en mas de un torneo.
 *
 * Despues: `instituciones` guarda los datos visuales una sola vez.
 * `clubes` pasa a ser solo participacion (institucion + torneo + zona).
 *
 * Pasos:
 *  1. Crear tabla `instituciones`
 *  2. Poblar instituciones con DISTINCT nombres de clubes existentes
 *     (si hay "CALE" en 2 torneos, se crea 1 sola institucion)
 *  3. Agregar columna institucion_id a clubes (nullable al inicio)
 *  4. Setear institucion_id por match de nombre
 *  5. Marcar institucion_id NOT NULL
 *  6. Drop de columnas duplicadas en clubes (nombre, nombre_corto,
 *     color_primario, color_secundario, escudo_url, contacto)
 *  7. Agregar columna nombre_override (opcional, para overrides por torneo)
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // 1) Crear tabla instituciones
      await queryInterface.createTable('instituciones', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        nombre: { type: Sequelize.STRING(150), allowNull: false, unique: true },
        nombre_corto: { type: Sequelize.STRING(30), allowNull: true },
        escudo_url: { type: Sequelize.STRING(500), allowNull: true },
        color_primario: { type: Sequelize.STRING(7), allowNull: true },
        color_secundario: { type: Sequelize.STRING(7), allowNull: true },
        cuit: { type: Sequelize.STRING(20), allowNull: true },
        direccion: { type: Sequelize.STRING(250), allowNull: true },
        contacto: { type: Sequelize.JSONB, defaultValue: {} },
        fundacion: { type: Sequelize.DATEONLY, allowNull: true },
        observaciones: { type: Sequelize.TEXT, allowNull: true },
        activo: { type: Sequelize.BOOLEAN, defaultValue: true },
        creado_en: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
        actualizado_en: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
      }, { transaction });
      await queryInterface.addIndex('instituciones', ['nombre'], { unique: true, name: 'idx_instituciones_nombre', transaction });
      await queryInterface.addIndex('instituciones', ['activo'], { name: 'idx_instituciones_activo', transaction });

      // 2) Poblar instituciones desde clubes unicos por nombre
      //    Si existe "CALE" en 2 torneos, se consolida en 1 institucion.
      //    Preferimos los datos del club mas reciente (ORDER BY creado_en DESC).
      await queryInterface.sequelize.query(`
        INSERT INTO instituciones (nombre, nombre_corto, escudo_url, color_primario, color_secundario, contacto, activo, creado_en, actualizado_en)
        SELECT DISTINCT ON (nombre)
          nombre,
          nombre_corto,
          escudo_url,
          color_primario,
          color_secundario,
          contacto,
          true,
          NOW(),
          NOW()
        FROM clubes
        ORDER BY nombre, creado_en DESC
      `, { transaction });

      // 3) Agregar columna institucion_id a clubes (nullable)
      await queryInterface.addColumn('clubes', 'institucion_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'instituciones', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      }, { transaction });

      // 4) Setear institucion_id por match de nombre
      await queryInterface.sequelize.query(`
        UPDATE clubes c
        SET institucion_id = i.id
        FROM instituciones i
        WHERE c.nombre = i.nombre
      `, { transaction });

      // 5) Marcar institucion_id NOT NULL
      await queryInterface.changeColumn('clubes', 'institucion_id', {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'instituciones', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      }, { transaction });

      await queryInterface.addIndex('clubes', ['institucion_id'], { name: 'idx_clubes_institucion', transaction });
      await queryInterface.addIndex('clubes', ['institucion_id', 'torneo_id'], {
        unique: true,
        name: 'idx_clubes_unique',
        transaction,
      });

      // 6) Agregar columna nombre_override
      await queryInterface.addColumn('clubes', 'nombre_override', {
        type: Sequelize.STRING(100),
        allowNull: true,
      }, { transaction });

      // 7) Drop columnas duplicadas en clubes
      //    (los datos ya estan en instituciones)
      await queryInterface.removeColumn('clubes', 'nombre', { transaction });
      await queryInterface.removeColumn('clubes', 'nombre_corto', { transaction });
      await queryInterface.removeColumn('clubes', 'escudo_url', { transaction });
      await queryInterface.removeColumn('clubes', 'color_primario', { transaction });
      await queryInterface.removeColumn('clubes', 'color_secundario', { transaction });
      await queryInterface.removeColumn('clubes', 'contacto', { transaction });

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  async down() {
    throw new Error('Migracion no reversible (drop de columnas con datos migrados). Restaurar desde backup.');
  },
};

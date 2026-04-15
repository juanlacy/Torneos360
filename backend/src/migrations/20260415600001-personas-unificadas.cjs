'use strict';

/**
 * Migracion maestra: arquitectura unificada de personas + roles N:M.
 *
 * Pasos (en orden, todo en una transaccion):
 *
 *  1. Truncar datos transaccionales de partidos que referencian a las tablas viejas
 *     (partido_eventos, partido_alineaciones, partido_confirmaciones, informes_arbitro).
 *     Los partidos en si se PRESERVAN pero arbitro_id y veedor_id se setean a NULL.
 *
 *  2. Crear tabla `personas` con los datos personales comunes.
 *
 *  3. Renombrar tabla `roles_staff` a `roles` y ampliarla con los campos nuevos
 *     (ambito, categoria_fn, puede_dirigir_partido, requiere_categoria, requiere_numero_camiseta).
 *
 *  4. Insertar los roles nuevos que antes no existian: 'jugador', 'arbitro', 'veedor'.
 *     (los del staff del club — delegado_general, delegado_auxiliar, entrenador, ayudante,
 *     dirigente — ya estaban en roles_staff y se preservan por el RENAME).
 *
 *  5. Crear tabla `persona_roles` (N:M con contexto).
 *
 *  6. Drop de tablas viejas: jugadores, staff, arbitros, veedores. CASCADE para que se
 *     lleven las FKs dependientes (que ya eliminamos en el paso 1).
 *
 *  7. Cambiar las columnas jugador_id de partido_eventos y partido_alineaciones a persona_id,
 *     y las columnas arbitro_id/veedor_id de partidos e informes_arbitro para que apunten a personas.
 *     Como las tablas de partidos ya se truncaron de sus FKs, simplemente se renombran las columnas
 *     y se crean las nuevas FK constraints apuntando a personas.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // ─────────────────────────────────────────────────────────────────────────
      // PASO 1: limpiar datos transaccionales de partidos
      // ─────────────────────────────────────────────────────────────────────────
      await queryInterface.sequelize.query('TRUNCATE TABLE partido_eventos RESTART IDENTITY CASCADE', { transaction });
      await queryInterface.sequelize.query('TRUNCATE TABLE partido_alineaciones RESTART IDENTITY CASCADE', { transaction });
      await queryInterface.sequelize.query('TRUNCATE TABLE partido_confirmaciones RESTART IDENTITY CASCADE', { transaction });
      await queryInterface.sequelize.query('TRUNCATE TABLE informes_arbitro RESTART IDENTITY CASCADE', { transaction });

      // Resetear referencias en partidos (los partidos se preservan — son del fixture)
      await queryInterface.sequelize.query('UPDATE partidos SET arbitro_id = NULL, veedor_id = NULL', { transaction });

      // ─────────────────────────────────────────────────────────────────────────
      // PASO 2: crear tabla personas
      // ─────────────────────────────────────────────────────────────────────────
      await queryInterface.createTable('personas', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        dni: { type: Sequelize.STRING(20), allowNull: false, unique: true },
        nombre: { type: Sequelize.STRING(100), allowNull: false },
        apellido: { type: Sequelize.STRING(100), allowNull: false },
        fecha_nacimiento: { type: Sequelize.DATEONLY, allowNull: true },
        sexo: { type: Sequelize.STRING(1), allowNull: true },
        telefono: { type: Sequelize.STRING(30), allowNull: true },
        email: { type: Sequelize.STRING(150), allowNull: true },
        foto_url: { type: Sequelize.STRING(500), allowNull: true },
        observaciones: { type: Sequelize.TEXT, allowNull: true },
        activo: { type: Sequelize.BOOLEAN, defaultValue: true },
        creado_en: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
        actualizado_en: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
      }, { transaction });
      await queryInterface.addIndex('personas', ['dni'], { name: 'idx_personas_dni', unique: true, transaction });
      await queryInterface.addIndex('personas', ['apellido'], { name: 'idx_personas_apellido', transaction });
      await queryInterface.addIndex('personas', ['activo'], { name: 'idx_personas_activo', transaction });

      // ─────────────────────────────────────────────────────────────────────────
      // PASO 3: renombrar roles_staff -> roles + agregar columnas nuevas
      // ─────────────────────────────────────────────────────────────────────────
      await queryInterface.renameTable('roles_staff', 'roles', { transaction });

      await queryInterface.addColumn('roles', 'ambito', {
        type: Sequelize.STRING(20), allowNull: false, defaultValue: 'club',
      }, { transaction });
      await queryInterface.addColumn('roles', 'categoria_fn', {
        type: Sequelize.STRING(30), allowNull: false, defaultValue: 'staff_club',
      }, { transaction });
      await queryInterface.addColumn('roles', 'puede_dirigir_partido', {
        type: Sequelize.BOOLEAN, defaultValue: false,
      }, { transaction });
      await queryInterface.addColumn('roles', 'requiere_categoria', {
        type: Sequelize.BOOLEAN, defaultValue: false,
      }, { transaction });
      await queryInterface.addColumn('roles', 'requiere_numero_camiseta', {
        type: Sequelize.BOOLEAN, defaultValue: false,
      }, { transaction });

      // Renombrar indices viejos (de roles_staff a roles)
      await queryInterface.sequelize.query('ALTER INDEX IF EXISTS idx_roles_staff_codigo RENAME TO idx_roles_codigo', { transaction });
      await queryInterface.sequelize.query('ALTER INDEX IF EXISTS idx_roles_staff_activo RENAME TO idx_roles_activo', { transaction });

      // Nuevos indices
      await queryInterface.addIndex('roles', ['ambito'], { name: 'idx_roles_ambito', transaction });
      await queryInterface.addIndex('roles', ['categoria_fn'], { name: 'idx_roles_categoria_fn', transaction });

      // ─────────────────────────────────────────────────────────────────────────
      // PASO 4: insertar roles nuevos (jugador, arbitro, veedor)
      //           + actualizar ambito/categoria_fn de los existentes
      // ─────────────────────────────────────────────────────────────────────────
      await queryInterface.sequelize.query(`
        UPDATE roles SET ambito='club', categoria_fn='staff_club'
        WHERE codigo IN ('delegado_general','delegado_auxiliar','entrenador','ayudante','dirigente')
      `, { transaction });

      await queryInterface.bulkInsert('roles', [
        {
          codigo: 'jugador',
          nombre: 'Jugador',
          descripcion: 'Deportista inscripto en una categoria del torneo.',
          ambito: 'club',
          categoria_fn: 'jugador',
          icono: 'sports_soccer',
          color: '#10b981',
          puede_firmar_alineacion: false,
          puede_dirigir_partido: false,
          requiere_categoria: true,
          requiere_numero_camiseta: true,
          orden: 1,
          es_sistema: true,
          activo: true,
        },
        {
          codigo: 'arbitro',
          nombre: 'Arbitro',
          descripcion: 'Oficial designado por la organizacion para dirigir partidos del torneo.',
          ambito: 'torneo',
          categoria_fn: 'oficial_torneo',
          icono: 'sports',
          color: '#0ea5e9',
          puede_firmar_alineacion: false,
          puede_dirigir_partido: true,
          requiere_categoria: false,
          requiere_numero_camiseta: false,
          orden: 60,
          es_sistema: true,
          activo: true,
        },
        {
          codigo: 'veedor',
          nombre: 'Veedor',
          descripcion: 'Observador del torneo designado por la organizacion.',
          ambito: 'torneo',
          categoria_fn: 'oficial_torneo',
          icono: 'visibility',
          color: '#f59e0b',
          puede_firmar_alineacion: false,
          puede_dirigir_partido: false,
          requiere_categoria: false,
          requiere_numero_camiseta: false,
          orden: 70,
          es_sistema: true,
          activo: true,
        },
      ], { transaction });

      // ─────────────────────────────────────────────────────────────────────────
      // PASO 5: crear tabla persona_roles
      // ─────────────────────────────────────────────────────────────────────────
      await queryInterface.createTable('persona_roles', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        persona_id: {
          type: Sequelize.INTEGER, allowNull: false,
          references: { model: 'personas', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE',
        },
        rol_id: {
          type: Sequelize.INTEGER, allowNull: false,
          references: { model: 'roles', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT',
        },
        club_id: {
          type: Sequelize.INTEGER, allowNull: true,
          references: { model: 'clubes', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL',
        },
        torneo_id: {
          type: Sequelize.INTEGER, allowNull: true,
          references: { model: 'torneos', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL',
        },
        categoria_id: {
          type: Sequelize.INTEGER, allowNull: true,
          references: { model: 'categorias', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL',
        },
        numero_camiseta: { type: Sequelize.INTEGER, allowNull: true },
        estado_fichaje: { type: Sequelize.STRING(20), allowNull: true },
        fecha_desde: { type: Sequelize.DATEONLY, allowNull: true, defaultValue: Sequelize.fn('NOW') },
        fecha_hasta: { type: Sequelize.DATEONLY, allowNull: true },
        observaciones: { type: Sequelize.TEXT, allowNull: true },
        activo: { type: Sequelize.BOOLEAN, defaultValue: true },
        creado_en: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
        actualizado_en: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
      }, { transaction });

      await queryInterface.addIndex('persona_roles', ['persona_id'], { name: 'idx_persona_roles_persona', transaction });
      await queryInterface.addIndex('persona_roles', ['rol_id'], { name: 'idx_persona_roles_rol', transaction });
      await queryInterface.addIndex('persona_roles', ['club_id'], { name: 'idx_persona_roles_club', transaction });
      await queryInterface.addIndex('persona_roles', ['torneo_id'], { name: 'idx_persona_roles_torneo', transaction });
      await queryInterface.addIndex('persona_roles', ['categoria_id'], { name: 'idx_persona_roles_categoria', transaction });
      await queryInterface.addIndex('persona_roles', ['activo'], { name: 'idx_persona_roles_activo', transaction });

      // ─────────────────────────────────────────────────────────────────────────
      // PASO 6: drop tablas viejas (jugadores/staff/arbitros/veedores)
      //           Como truncamos lo transaccional en paso 1, y las FKs de
      //           partido_* apuntan a jugadores/arbitros/veedores, usamos CASCADE.
      // ─────────────────────────────────────────────────────────────────────────
      await queryInterface.sequelize.query('DROP TABLE IF EXISTS jugadores CASCADE', { transaction });
      await queryInterface.sequelize.query('DROP TABLE IF EXISTS staff CASCADE', { transaction });
      await queryInterface.sequelize.query('DROP TABLE IF EXISTS arbitros CASCADE', { transaction });
      await queryInterface.sequelize.query('DROP TABLE IF EXISTS veedores CASCADE', { transaction });

      // ─────────────────────────────────────────────────────────────────────────
      // PASO 7: ajustar columnas en partido_eventos, partido_alineaciones,
      //          partidos, informes_arbitro → apuntan a personas
      // ─────────────────────────────────────────────────────────────────────────

      // partido_eventos
      //   jugador_id → persona_id
      //   jugador_reemplaza_id → persona_reemplaza_id
      await queryInterface.renameColumn('partido_eventos', 'jugador_id', 'persona_id', { transaction });
      await queryInterface.renameColumn('partido_eventos', 'jugador_reemplaza_id', 'persona_reemplaza_id', { transaction });
      await queryInterface.addConstraint('partido_eventos', {
        fields: ['persona_id'],
        type: 'foreign key',
        name: 'fk_partido_eventos_persona',
        references: { table: 'personas', field: 'id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL',
        transaction,
      });
      await queryInterface.addConstraint('partido_eventos', {
        fields: ['persona_reemplaza_id'],
        type: 'foreign key',
        name: 'fk_partido_eventos_persona_reemplaza',
        references: { table: 'personas', field: 'id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL',
        transaction,
      });

      // partido_alineaciones: jugador_id → persona_id
      await queryInterface.renameColumn('partido_alineaciones', 'jugador_id', 'persona_id', { transaction });
      await queryInterface.addConstraint('partido_alineaciones', {
        fields: ['persona_id'],
        type: 'foreign key',
        name: 'fk_partido_alineaciones_persona',
        references: { table: 'personas', field: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
        transaction,
      });

      // partidos: arbitro_id y veedor_id -> FKs a personas (los nombres de columna se mantienen)
      await queryInterface.addConstraint('partidos', {
        fields: ['arbitro_id'],
        type: 'foreign key',
        name: 'fk_partidos_arbitro_persona',
        references: { table: 'personas', field: 'id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL',
        transaction,
      });
      await queryInterface.addConstraint('partidos', {
        fields: ['veedor_id'],
        type: 'foreign key',
        name: 'fk_partidos_veedor_persona',
        references: { table: 'personas', field: 'id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL',
        transaction,
      });

      // informes_arbitro: arbitro_id -> FK a personas
      await queryInterface.addConstraint('informes_arbitro', {
        fields: ['arbitro_id'],
        type: 'foreign key',
        name: 'fk_informes_arbitro_persona',
        references: { table: 'personas', field: 'id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL',
        transaction,
      });

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  async down() {
    throw new Error('Migracion no reversible (drop de tablas jugadores/staff/arbitros/veedores). Restaurar desde backup.');
  },
};

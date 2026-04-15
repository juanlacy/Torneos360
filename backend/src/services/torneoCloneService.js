import {
  sequelize, Torneo, Zona, Categoria, Club, Institucion, PersonaRol, Rol,
  FixtureJornada, Partido,
} from '../models/index.js';

/**
 * Clona un torneo completo reusando las instituciones existentes.
 *
 * Se clonan:
 *   - torneo (con nuevo nombre/anio)
 *   - zonas
 *   - categorias
 *   - clubes (reusando institucion_id — no se duplican instituciones)
 *   - fixture_jornadas
 *   - partidos (en estado 'programado', sin resultados ni arbitros asignados)
 *   - opcionalmente: roles de arbitros/veedores del torneo origen
 *
 * NO se clonan:
 *   - personas (son globales)
 *   - persona_roles de jugadores/staff (atados al club viejo; el nuevo torneo
 *     arranca sin inscripciones y el usuario carga las que correspondan)
 *   - eventos, alineaciones, confirmaciones, informes (son transaccionales)
 *
 * @param {number} srcTorneoId - id del torneo a clonar
 * @param {object} opts
 * @param {string} opts.nombre - nombre del nuevo torneo
 * @param {number} opts.anio - anio del nuevo torneo
 * @param {boolean} [opts.conArbitrosVeedores=false] - si clonar tambien los
 *   persona_roles de arbitros/veedores del torneo origen
 * @param {boolean} [opts.resetFixtureDates=true] - si true, las fechas de las
 *   jornadas y partidos se copian a null (para que el usuario las reprograme)
 * @returns {Promise<Torneo>}
 */
export const clonarTorneo = async (srcTorneoId, opts = {}) => {
  const {
    nombre,
    anio,
    conArbitrosVeedores = false,
    resetFixtureDates = true,
  } = opts;

  if (!nombre) throw new Error('Se requiere un nombre para el nuevo torneo');
  if (!anio) throw new Error('Se requiere el anio del nuevo torneo');

  const t = await sequelize.transaction();
  try {
    // 1) Torneo origen
    const src = await Torneo.findByPk(srcTorneoId, { transaction: t });
    if (!src) throw new Error(`Torneo origen id=${srcTorneoId} no encontrado`);

    // Verificar que no exista uno con el mismo nombre+anio
    const dup = await Torneo.findOne({
      where: { nombre, anio },
      transaction: t,
    });
    if (dup) throw new Error(`Ya existe un torneo "${nombre}" ${anio}`);

    // 2) Crear torneo nuevo (copiando branding y config del origen)
    const nuevo = await Torneo.create({
      nombre,
      anio,
      fecha_inicio: null,
      fecha_fin: null,
      estado: 'planificacion',
      logo_url: src.logo_url,
      favicon_url: src.favicon_url,
      color_primario: src.color_primario,
      color_secundario: src.color_secundario,
      color_acento: src.color_acento,
      config: src.config || {},
    }, { transaction: t });

    // 3) Clonar zonas
    const srcZonas = await Zona.findAll({ where: { torneo_id: src.id }, transaction: t });
    const mapZonas = new Map();
    for (const z of srcZonas) {
      const nz = await Zona.create({
        torneo_id: nuevo.id,
        nombre: z.nombre,
        color: z.color,
        orden: z.orden,
      }, { transaction: t });
      mapZonas.set(z.id, nz.id);
    }

    // 4) Clonar categorias
    const srcCategorias = await Categoria.findAll({ where: { torneo_id: src.id }, transaction: t });
    const mapCategorias = new Map();
    for (const c of srcCategorias) {
      const nc = await Categoria.create({
        torneo_id: nuevo.id,
        nombre: c.nombre,
        anio_nacimiento: c.anio_nacimiento,
        es_preliminar: c.es_preliminar,
        max_jugadores: c.max_jugadores,
        orden: c.orden,
      }, { transaction: t });
      mapCategorias.set(c.id, nc.id);
    }

    // 5) Clonar clubes (reutilizando institucion_id — no se duplican instituciones)
    const srcClubes = await Club.findAll({ where: { torneo_id: src.id }, transaction: t });
    const mapClubes = new Map();
    for (const club of srcClubes) {
      const nc = await Club.create({
        institucion_id: club.institucion_id,
        torneo_id: nuevo.id,
        zona_id: club.zona_id ? mapZonas.get(club.zona_id) : null,
        sufijo: club.sufijo || '',
        nombre_override: club.nombre_override,
        activo: club.activo,
      }, { transaction: t });
      mapClubes.set(club.id, nc.id);
    }

    // 6) Clonar fixture_jornadas
    const srcJornadas = await FixtureJornada.findAll({
      where: { torneo_id: src.id },
      transaction: t,
    });
    const mapJornadas = new Map();
    for (const j of srcJornadas) {
      const nj = await FixtureJornada.create({
        torneo_id: nuevo.id,
        zona_id: j.zona_id ? mapZonas.get(j.zona_id) : null,
        numero_jornada: j.numero_jornada,
        fase: j.fase,
        fecha: resetFixtureDates ? null : j.fecha,
        estado: 'programada',
      }, { transaction: t });
      mapJornadas.set(j.id, nj.id);
    }

    // 7) Clonar partidos (estado 'programado', sin arbitros/resultados)
    let partidosClonados = 0;
    const srcPartidos = srcJornadas.length
      ? await Partido.findAll({
          where: { jornada_id: srcJornadas.map(j => j.id) },
          transaction: t,
        })
      : [];
    for (const p of srcPartidos) {
      const jornadaId = mapJornadas.get(p.jornada_id);
      const categoriaId = mapCategorias.get(p.categoria_id);
      const localId = mapClubes.get(p.club_local_id);
      const visitanteId = mapClubes.get(p.club_visitante_id);
      if (!jornadaId || !categoriaId || !localId || !visitanteId) continue;

      await Partido.create({
        jornada_id: jornadaId,
        categoria_id: categoriaId,
        club_local_id: localId,
        club_visitante_id: visitanteId,
        estado: 'programado',
        cancha: p.cancha,
      }, { transaction: t });
      partidosClonados++;
    }

    // 8) Opcional: clonar arbitros/veedores (persona_roles con torneo_id nuevo)
    let arbitrosClonados = 0;
    if (conArbitrosVeedores) {
      const rolesOficiales = await Rol.findAll({
        where: { codigo: ['arbitro', 'veedor'] },
        transaction: t,
      });
      const rolIds = rolesOficiales.map(r => r.id);

      const srcPR = await PersonaRol.findAll({
        where: { torneo_id: src.id, rol_id: rolIds, activo: true },
        transaction: t,
      });
      for (const pr of srcPR) {
        // Verificar si ya existe (idempotencia)
        const existe = await PersonaRol.findOne({
          where: { persona_id: pr.persona_id, rol_id: pr.rol_id, torneo_id: nuevo.id, activo: true },
          transaction: t,
        });
        if (existe) continue;

        await PersonaRol.create({
          persona_id: pr.persona_id,
          rol_id: pr.rol_id,
          torneo_id: nuevo.id,
          club_id: null,
          categoria_id: null,
          activo: true,
        }, { transaction: t });
        arbitrosClonados++;
      }
    }

    await t.commit();

    return {
      torneo: nuevo,
      stats: {
        zonas: srcZonas.length,
        categorias: srcCategorias.length,
        clubes: srcClubes.length,
        jornadas: srcJornadas.length,
        partidos: partidosClonados,
        arbitros_veedores: arbitrosClonados,
      },
    };
  } catch (err) {
    await t.rollback();
    throw err;
  }
};

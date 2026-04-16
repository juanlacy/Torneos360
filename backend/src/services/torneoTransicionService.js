import {
  sequelize, Torneo, Zona, Categoria, Club, Institucion,
  FixtureJornada, Partido, Persona, PersonaRol, Rol,
} from '../models/index.js';

/**
 * Genera un preview de la transicion (sin ejecutar cambios).
 * Devuelve las categorias nuevas, conteo de jugadores por categoria,
 * y listas de staff/arbitros/veedores para que el wizard muestre al usuario.
 */
export const previewTransicion = async (srcTorneoId) => {
  const src = await Torneo.findByPk(srcTorneoId, {
    include: [
      { model: Categoria, as: 'categorias' },
      {
        model: Club, as: 'clubes',
        include: [{ model: Institucion, as: 'institucion' }],
      },
    ],
  });
  if (!src) throw new Error(`Torneo id=${srcTorneoId} no encontrado`);

  const anioNuevo = src.anio + 1;
  const catMin = anioNuevo - 13; // mas vieja (graduable)
  const catMax = anioNuevo - 7;  // preliminar nueva

  // Categorias del origen con conteo de jugadores
  const rolJugador = await Rol.findOne({ where: { codigo: 'jugador' } });
  const srcClubes = await Club.findAll({ where: { torneo_id: src.id } });
  const srcClubIds = srcClubes.map(c => c.id);

  const categoriasOrigen = [];
  for (const cat of src.categorias || []) {
    const jugadores = await PersonaRol.count({
      where: { rol_id: rolJugador.id, club_id: srcClubIds, categoria_id: cat.id, activo: true },
    });
    const seGradua = cat.anio_nacimiento < catMin;
    categoriasOrigen.push({
      id: cat.id,
      nombre: cat.nombre,
      anio_nacimiento: cat.anio_nacimiento,
      es_preliminar: cat.es_preliminar,
      jugadores,
      destino: seGradua ? 'graduada' : (cat.anio_nacimiento === anioNuevo - 7 ? 'preliminar_a_regular' : 'continua'),
    });
  }

  // Categorias destino (auto-calculadas)
  const categoriasDestino = [];
  for (let i = 13; i >= 8; i--) {
    const anioNac = anioNuevo - i;
    const srcCat = categoriasOrigen.find(c => c.anio_nacimiento === anioNac);
    categoriasDestino.push({
      nombre: `${anioNac}`,
      anio_nacimiento: anioNac,
      es_preliminar: false,
      jugadores_trasladados: srcCat ? srcCat.jugadores : 0,
      origen: srcCat ? (srcCat.es_preliminar ? 'era_preliminar' : 'continua') : 'sin_origen',
    });
  }
  categoriasDestino.push({
    nombre: `Preliminar ${anioNuevo - 7}`,
    anio_nacimiento: anioNuevo - 7,
    es_preliminar: true,
    jugadores_trasladados: 0,
    origen: 'nueva',
  });

  // Staff por club (para checkboxes del paso 3)
  const rolesStaff = await Rol.findAll({ where: { categoria_fn: 'staff_club' } });
  const rolStaffIds = rolesStaff.map(r => r.id);

  const staff = await PersonaRol.findAll({
    where: { rol_id: rolStaffIds, club_id: srcClubIds, activo: true },
    include: [
      { model: Persona, as: 'persona', attributes: ['id', 'nombre', 'apellido', 'dni'] },
      { model: Rol, as: 'rol', attributes: ['id', 'codigo', 'nombre', 'icono', 'color'] },
      { model: Club, as: 'club', attributes: ['id'], include: [{ model: Institucion, as: 'institucion', attributes: ['nombre', 'nombre_corto'] }] },
    ],
    order: [['club_id', 'ASC'], ['rol_id', 'ASC']],
  });

  // Arbitros y veedores
  const rolArbitro = await Rol.findOne({ where: { codigo: 'arbitro' } });
  const rolVeedor = await Rol.findOne({ where: { codigo: 'veedor' } });

  const arbitros = await PersonaRol.findAll({
    where: { rol_id: rolArbitro.id, torneo_id: src.id, activo: true },
    include: [{ model: Persona, as: 'persona', attributes: ['id', 'nombre', 'apellido', 'dni'] }],
    order: [['id', 'ASC']],
  });

  const veedores = await PersonaRol.findAll({
    where: { rol_id: rolVeedor.id, torneo_id: src.id, activo: true },
    include: [{ model: Persona, as: 'persona', attributes: ['id', 'nombre', 'apellido', 'dni'] }],
    order: [['id', 'ASC']],
  });

  return {
    torneo_origen: { id: src.id, nombre: src.nombre, anio: src.anio },
    anio_nuevo: anioNuevo,
    nombre_sugerido: src.nombre.replace(String(src.anio), String(anioNuevo)),
    categorias_origen: categoriasOrigen,
    categorias_destino: categoriasDestino,
    clubes: srcClubes.length,
    staff: staff.map(s => ({
      persona_rol_id: s.id,
      persona_id: s.persona?.id,
      nombre: `${s.persona?.apellido}, ${s.persona?.nombre}`,
      dni: s.persona?.dni,
      rol: s.rol?.nombre,
      rol_icono: s.rol?.icono,
      club: s.club?.institucion?.nombre_corto || s.club?.institucion?.nombre,
      club_id: s.club_id,
    })),
    arbitros: arbitros.map(a => ({
      persona_rol_id: a.id,
      persona_id: a.persona?.id,
      nombre: `${a.persona?.apellido}, ${a.persona?.nombre}`,
      dni: a.persona?.dni,
    })),
    veedores: veedores.map(v => ({
      persona_rol_id: v.id,
      persona_id: v.persona?.id,
      nombre: `${v.persona?.apellido}, ${v.persona?.nombre}`,
      dni: v.persona?.dni,
    })),
  };
};

/**
 * Ejecuta la transicion de un torneo al año siguiente.
 *
 * En una sola transaccion:
 * 1. Crear torneo nuevo (branding + config copiados)
 * 2. Clonar zonas
 * 3. Generar categorias nuevas (rotadas +1 año)
 * 4. Clonar clubes (mismas instituciones)
 * 5. Clonar fixture (opcional)
 * 6. Trasladar jugadores automaticamente (por año de nacimiento)
 * 7. Trasladar staff seleccionado
 * 8. Trasladar arbitros/veedores seleccionados
 */
export const ejecutarTransicion = async (srcTorneoId, opts) => {
  const {
    nombre, anio,
    copiar_fixture = true,
    copiar_config = true,
    staff_ids = [],       // persona_rol IDs de staff a trasladar
    arbitro_ids = [],     // persona_rol IDs de arbitros a trasladar
    veedor_ids = [],      // persona_rol IDs de veedores a trasladar
  } = opts;

  if (!nombre || !anio) throw new Error('nombre y anio son requeridos');

  const t = await sequelize.transaction();
  try {
    const src = await Torneo.findByPk(srcTorneoId, { transaction: t });
    if (!src) throw new Error(`Torneo origen id=${srcTorneoId} no encontrado`);

    // Verificar que no exista
    const dup = await Torneo.findOne({ where: { nombre, anio }, transaction: t });
    if (dup) throw new Error(`Ya existe un torneo "${nombre}" ${anio}`);

    const stats = {
      jugadores_trasladados: 0,
      jugadores_graduados: 0,
      staff_trasladados: 0,
      arbitros_trasladados: 0,
      veedores_trasladados: 0,
    };

    // 1) Crear torneo nuevo
    const nuevo = await Torneo.create({
      nombre, anio,
      estado: 'planificacion',
      logo_url: src.logo_url,
      favicon_url: src.favicon_url,
      color_primario: src.color_primario,
      color_secundario: src.color_secundario,
      color_acento: src.color_acento,
      config: copiar_config ? (src.config || {}) : {},
    }, { transaction: t });

    // 2) Clonar zonas
    const srcZonas = await Zona.findAll({ where: { torneo_id: src.id }, transaction: t });
    const mapZonas = new Map();
    for (const z of srcZonas) {
      const nz = await Zona.create({
        torneo_id: nuevo.id, nombre: z.nombre, color: z.color, orden: z.orden,
      }, { transaction: t });
      mapZonas.set(z.id, nz.id);
    }

    // 3) Generar categorias nuevas (rotadas al año nuevo)
    const catMin = anio - 13;
    const catPrelim = anio - 7;

    const categoriasData = [];
    for (let i = 13; i >= 8; i--) {
      categoriasData.push({
        torneo_id: nuevo.id,
        nombre: `${anio - i}`,
        anio_nacimiento: anio - i,
        es_preliminar: false,
        max_jugadores: 25,
        orden: 14 - i,
      });
    }
    categoriasData.push({
      torneo_id: nuevo.id,
      nombre: `Preliminar ${catPrelim}`,
      anio_nacimiento: catPrelim,
      es_preliminar: true,
      max_jugadores: 25,
      orden: 7,
    });

    const nuevasCats = await Categoria.bulkCreate(categoriasData, { transaction: t });
    const mapCatByAnio = new Map(nuevasCats.map(c => [c.anio_nacimiento, c.id]));

    // 4) Clonar clubes
    const srcClubes = await Club.findAll({ where: { torneo_id: src.id }, transaction: t });
    const mapClubes = new Map();
    for (const club of srcClubes) {
      const nc = await Club.create({
        institucion_id: club.institucion_id,
        torneo_id: nuevo.id,
        zona_id: club.zona_id ? mapZonas.get(club.zona_id) : null,
        sufijo: club.sufijo || '',
        nombre_override: club.nombre_override,
        activo: true,
      }, { transaction: t, validate: false });
      mapClubes.set(club.id, nc.id);
    }

    // 5) Clonar fixture (opcional)
    if (copiar_fixture) {
      const srcJornadas = await FixtureJornada.findAll({
        where: { torneo_id: src.id }, transaction: t,
      });
      const mapJornadas = new Map();
      for (const j of srcJornadas) {
        const nj = await FixtureJornada.create({
          torneo_id: nuevo.id,
          zona_id: j.zona_id ? mapZonas.get(j.zona_id) : null,
          numero_jornada: j.numero_jornada,
          fase: j.fase,
          fecha: null, // resetear fechas
          estado: 'programada',
        }, { transaction: t });
        mapJornadas.set(j.id, nj.id);
      }

      const srcPartidos = srcJornadas.length
        ? await Partido.findAll({
            where: { jornada_id: srcJornadas.map(j => j.id) },
            transaction: t,
          })
        : [];
      for (const p of srcPartidos) {
        const jId = mapJornadas.get(p.jornada_id);
        const catId = mapCatByAnio.get(
          // Buscar el anio_nacimiento de la categoria origen para remapear
          (await Categoria.findByPk(p.categoria_id, { attributes: ['anio_nacimiento'], transaction: t }))?.anio_nacimiento
        );
        const lId = mapClubes.get(p.club_local_id);
        const vId = mapClubes.get(p.club_visitante_id);
        if (!jId || !catId || !lId || !vId) continue;

        await Partido.create({
          jornada_id: jId,
          categoria_id: catId,
          club_local_id: lId,
          club_visitante_id: vId,
          estado: 'programado',
          cancha: p.cancha,
        }, { transaction: t });
      }
      stats.partidos = srcPartidos.length;
      stats.jornadas = srcJornadas.length;
    }

    // 6) Trasladar jugadores automaticamente
    const rolJugador = await Rol.findOne({ where: { codigo: 'jugador' }, transaction: t });
    const srcClubIds = srcClubes.map(c => c.id);

    const jugadoresActivos = await PersonaRol.findAll({
      where: { rol_id: rolJugador.id, club_id: srcClubIds, activo: true },
      include: [{ model: Persona, as: 'persona', attributes: ['id', 'fecha_nacimiento'] }],
      transaction: t,
    });

    for (const pr of jugadoresActivos) {
      const anioNac = pr.persona?.fecha_nacimiento
        ? new Date(pr.persona.fecha_nacimiento).getFullYear()
        : null;

      const nuevaCatId = anioNac ? mapCatByAnio.get(anioNac) : null;
      const nuevoClubId = mapClubes.get(pr.club_id);

      if (!nuevaCatId || !nuevoClubId) {
        // Jugador graduado — su año ya no está en el rango del torneo nuevo
        stats.jugadores_graduados++;
        continue;
      }

      // Crear nuevo persona_rol en el torneo nuevo
      await PersonaRol.create({
        persona_id: pr.persona_id,
        rol_id: pr.rol_id,
        club_id: nuevoClubId,
        categoria_id: nuevaCatId,
        numero_camiseta: pr.numero_camiseta,
        estado_fichaje: 'aprobado',
        activo: true,
      }, { transaction: t });
      stats.jugadores_trasladados++;
    }

    // 7) Trasladar staff seleccionado
    for (const prId of staff_ids) {
      const pr = await PersonaRol.findByPk(prId, { transaction: t });
      if (!pr || !pr.activo) continue;
      const nuevoClubId = mapClubes.get(pr.club_id);
      if (!nuevoClubId) continue;

      await PersonaRol.create({
        persona_id: pr.persona_id,
        rol_id: pr.rol_id,
        club_id: nuevoClubId,
        activo: true,
      }, { transaction: t });
      stats.staff_trasladados++;
    }

    // 8) Trasladar arbitros/veedores seleccionados
    for (const prId of [...arbitro_ids, ...veedor_ids]) {
      const pr = await PersonaRol.findByPk(prId, { transaction: t });
      if (!pr || !pr.activo) continue;

      await PersonaRol.create({
        persona_id: pr.persona_id,
        rol_id: pr.rol_id,
        torneo_id: nuevo.id,
        activo: true,
      }, { transaction: t });
      if (arbitro_ids.includes(prId)) stats.arbitros_trasladados++;
      else stats.veedores_trasladados++;
    }

    await t.commit();
    return { torneo: nuevo, stats };
  } catch (err) {
    await t.rollback();
    throw err;
  }
};

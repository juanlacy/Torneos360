import { Partido, PartidoEvento, PartidoAlineacion, PartidoConfirmacion, Club, Categoria, Arbitro, Veedor, Jugador, FixtureJornada, Staff } from '../models/index.js';
import { recalcularDespuesDePartido } from '../services/standingsCalculatorService.js';
import { registrarAudit } from '../services/auditService.js';
import { emitMatchStart, emitMatchEventNew, emitMatchScore, emitMatchEnd, emitMatchConfirm, emitStandingsUpdate } from '../sockets/matchSocket.js';

// GET /partidos/:id
export const obtener = async (req, res) => {
  try {
    const partido = await Partido.findByPk(req.params.id, {
      include: [
        { model: Club, as: 'clubLocal', attributes: ['id', 'nombre', 'nombre_corto', 'escudo_url', 'color_primario', 'color_secundario'] },
        { model: Club, as: 'clubVisitante', attributes: ['id', 'nombre', 'nombre_corto', 'escudo_url', 'color_primario', 'color_secundario'] },
        { model: Categoria, as: 'categoria', attributes: ['id', 'nombre', 'anio_nacimiento'] },
        { model: Arbitro, as: 'arbitro', attributes: ['id', 'nombre', 'apellido'] },
        { model: Veedor, as: 'veedor', attributes: ['id', 'nombre', 'apellido'] },
        { model: FixtureJornada, as: 'jornada', attributes: ['id', 'numero_jornada', 'fase', 'fecha'] },
        {
          model: PartidoEvento, as: 'eventos',
          include: [
            { model: Jugador, as: 'jugador', attributes: ['id', 'nombre', 'apellido', 'numero_camiseta'] },
            { model: Club, as: 'club', attributes: ['id', 'nombre_corto'] },
          ],
          order: [['minuto', 'ASC'], ['creado_en', 'ASC']],
        },
      ],
    });
    if (!partido) return res.status(404).json({ success: false, message: 'Partido no encontrado' });
    res.json({ success: true, data: partido });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /partidos/:id/jugadores-disponibles
// Devuelve los jugadores aprobados de ambos clubes en la categoria del partido
export const jugadoresDisponibles = async (req, res) => {
  try {
    const partido = await Partido.findByPk(req.params.id);
    if (!partido) return res.status(404).json({ success: false, message: 'Partido no encontrado' });

    const local = await Jugador.findAll({
      where: {
        club_id: partido.club_local_id,
        categoria_id: partido.categoria_id,
        activo: true,
        estado_fichaje: 'aprobado',
      },
      attributes: ['id', 'nombre', 'apellido', 'dni', 'numero_camiseta', 'foto_url', 'club_id'],
      order: [['numero_camiseta', 'ASC'], ['apellido', 'ASC']],
    });
    const visitante = await Jugador.findAll({
      where: {
        club_id: partido.club_visitante_id,
        categoria_id: partido.categoria_id,
        activo: true,
        estado_fichaje: 'aprobado',
      },
      attributes: ['id', 'nombre', 'apellido', 'dni', 'numero_camiseta', 'foto_url', 'club_id'],
      order: [['numero_camiseta', 'ASC'], ['apellido', 'ASC']],
    });

    res.json({ success: true, data: { local, visitante } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /partidos/:id  (actualizar datos basicos: arbitro, cancha, etc.)
export const actualizar = async (req, res) => {
  try {
    const partido = await Partido.findByPk(req.params.id);
    if (!partido) return res.status(404).json({ success: false, message: 'Partido no encontrado' });

    const campos = ['arbitro_id', 'veedor_id', 'cancha', 'observaciones'];
    const updates = { actualizado_en: new Date() };
    for (const c of campos) {
      if (req.body[c] !== undefined) updates[c] = req.body[c];
    }

    await partido.update(updates);
    res.json({ success: true, data: partido });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /partidos/:id/iniciar
export const iniciar = async (req, res) => {
  try {
    const partido = await Partido.findByPk(req.params.id);
    if (!partido) return res.status(404).json({ success: false, message: 'Partido no encontrado' });
    if (partido.estado !== 'programado') {
      return res.status(400).json({ success: false, message: 'El partido no esta en estado programado' });
    }

    await partido.update({ estado: 'en_curso', hora_inicio: new Date(), actualizado_en: new Date() });

    // Registrar evento de inicio
    await PartidoEvento.create({
      partido_id: partido.id, tipo: 'inicio', minuto: 0,
      detalle: 'Inicio del partido', registrado_por: req.user.id,
    });

    registrarAudit({ req, accion: 'INICIAR_PARTIDO', entidad: 'partidos', entidad_id: partido.id });
    emitMatchStart(partido);
    res.json({ success: true, data: partido, message: 'Partido iniciado' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /partidos/:id/evento
export const registrarEvento = async (req, res) => {
  try {
    const partido = await Partido.findByPk(req.params.id);
    if (!partido) return res.status(404).json({ success: false, message: 'Partido no encontrado' });
    if (partido.estado !== 'en_curso') {
      return res.status(400).json({ success: false, message: 'El partido no esta en curso' });
    }

    const { tipo, jugador_id, jugador_reemplaza_id, club_id, minuto, detalle } = req.body;
    if (!tipo) return res.status(400).json({ success: false, message: 'tipo es requerido' });

    const evento = await PartidoEvento.create({
      partido_id: partido.id, tipo, jugador_id, jugador_reemplaza_id,
      club_id, minuto, detalle, registrado_por: req.user.id,
    });

    // Si es gol, actualizar marcador
    if (tipo === 'gol' && club_id) {
      if (club_id === partido.club_local_id) {
        await partido.update({ goles_local: partido.goles_local + 1, actualizado_en: new Date() });
      } else if (club_id === partido.club_visitante_id) {
        await partido.update({ goles_visitante: partido.goles_visitante + 1, actualizado_en: new Date() });
      }
    }

    // Recargar evento con includes
    const eventoCompleto = await PartidoEvento.findByPk(evento.id, {
      include: [
        { model: Jugador, as: 'jugador', attributes: ['id', 'nombre', 'apellido', 'numero_camiseta'] },
        { model: Club, as: 'club', attributes: ['id', 'nombre_corto'] },
      ],
    });

    // Emitir via Socket.io
    await partido.reload();
    emitMatchEventNew(partido, eventoCompleto.toJSON());

    res.status(201).json({ success: true, data: eventoCompleto });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /partidos/:id/finalizar
export const finalizar = async (req, res) => {
  try {
    const partido = await Partido.findByPk(req.params.id);
    if (!partido) return res.status(404).json({ success: false, message: 'Partido no encontrado' });
    if (partido.estado !== 'en_curso') {
      return res.status(400).json({ success: false, message: 'El partido no esta en curso' });
    }

    const { goles_local, goles_visitante } = req.body;

    await partido.update({
      estado: 'finalizado',
      hora_fin: new Date(),
      ...(goles_local !== undefined && { goles_local }),
      ...(goles_visitante !== undefined && { goles_visitante }),
      actualizado_en: new Date(),
    });

    // Registrar evento de fin
    await PartidoEvento.create({
      partido_id: partido.id, tipo: 'fin', detalle: `Final: ${partido.goles_local} - ${partido.goles_visitante}`,
      registrado_por: req.user.id,
    });

    // Recalcular posiciones
    try {
      await recalcularDespuesDePartido(partido.id);
    } catch (e) {
      console.error('Error al recalcular posiciones:', e.message);
    }

    registrarAudit({ req, accion: 'FINALIZAR_PARTIDO', entidad: 'partidos', entidad_id: partido.id, despues: { goles_local: partido.goles_local, goles_visitante: partido.goles_visitante } });
    emitMatchEnd(partido);

    // Emitir actualizacion de posiciones
    const jornada = await FixtureJornada.findByPk(partido.jornada_id, { attributes: ['torneo_id'] });
    if (jornada) emitStandingsUpdate(jornada.torneo_id);

    res.json({ success: true, data: partido, message: 'Partido finalizado' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /partidos/:id/confirmar  (arbitro confirma resultado)
export const confirmar = async (req, res) => {
  try {
    const partido = await Partido.findByPk(req.params.id);
    if (!partido) return res.status(404).json({ success: false, message: 'Partido no encontrado' });
    if (partido.estado !== 'finalizado') {
      return res.status(400).json({ success: false, message: 'El partido debe estar finalizado para confirmar' });
    }

    await partido.update({ confirmado_arbitro: true, actualizado_en: new Date() });

    registrarAudit({ req, accion: 'CONFIRMAR_PARTIDO', entidad: 'partidos', entidad_id: partido.id });
    emitMatchConfirm(partido);
    res.json({ success: true, data: partido, message: 'Partido confirmado por el arbitro' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /partidos/:id/suspender
export const suspender = async (req, res) => {
  try {
    const partido = await Partido.findByPk(req.params.id);
    if (!partido) return res.status(404).json({ success: false, message: 'Partido no encontrado' });

    await partido.update({ estado: 'suspendido', observaciones: req.body.motivo || null, actualizado_en: new Date() });

    registrarAudit({ req, accion: 'SUSPENDER_PARTIDO', entidad: 'partidos', entidad_id: partido.id, despues: { motivo: req.body.motivo } });
    res.json({ success: true, data: partido, message: 'Partido suspendido' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// Alineaciones por partido
// ═══════════════════════════════════════════════════════════════════════════

// GET /partidos/:id/alineacion
export const getAlineacion = async (req, res) => {
  try {
    const partido = await Partido.findByPk(req.params.id);
    if (!partido) return res.status(404).json({ success: false, message: 'Partido no encontrado' });

    const alineaciones = await PartidoAlineacion.findAll({
      where: { partido_id: partido.id },
      include: [
        { model: Jugador, as: 'jugador', attributes: ['id', 'nombre', 'apellido', 'dni', 'foto_url', 'numero_camiseta'] },
      ],
      order: [['numero_camiseta', 'ASC']],
    });

    const local = alineaciones.filter(a => a.club_id === partido.club_local_id);
    const visitante = alineaciones.filter(a => a.club_id === partido.club_visitante_id);
    const confLocal = local.some(a => a.confirmado);
    const confVisitante = visitante.some(a => a.confirmado);

    res.json({
      success: true,
      data: {
        local,
        visitante,
        confirmado_local: confLocal,
        confirmado_visitante: confVisitante,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /partidos/:id/alineacion
// Body: { jugador_id, numero_camiseta, titular, club_id }
// Agrega o actualiza un jugador en la alineacion del partido
export const upsertAlineacion = async (req, res) => {
  try {
    const partido = await Partido.findByPk(req.params.id);
    if (!partido) return res.status(404).json({ success: false, message: 'Partido no encontrado' });

    const { jugador_id, numero_camiseta, titular, club_id } = req.body;
    if (!jugador_id || !club_id) {
      return res.status(400).json({ success: false, message: 'jugador_id y club_id son requeridos' });
    }

    // Validar que el club sea local o visitante
    if (club_id !== partido.club_local_id && club_id !== partido.club_visitante_id) {
      return res.status(400).json({ success: false, message: 'El club no participa en este partido' });
    }

    // Validar que el jugador pertenezca al club
    const jugador = await Jugador.findByPk(jugador_id);
    if (!jugador || jugador.club_id !== club_id) {
      return res.status(400).json({ success: false, message: 'El jugador no pertenece a este club' });
    }

    // Validar que el jugador sea de la categoria del partido
    if (jugador.categoria_id !== partido.categoria_id) {
      return res.status(400).json({ success: false, message: 'El jugador no es de la categoria del partido' });
    }

    const [aline] = await PartidoAlineacion.findOrCreate({
      where: { partido_id: partido.id, jugador_id },
      defaults: { partido_id: partido.id, jugador_id, club_id, numero_camiseta, titular: titular ?? true },
    });
    await aline.update({
      numero_camiseta: numero_camiseta ?? aline.numero_camiseta,
      titular: titular ?? aline.titular,
    });

    res.json({ success: true, data: aline });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /partidos/:id/alineacion/:jugadorId
export const eliminarAlineacion = async (req, res) => {
  try {
    const deleted = await PartidoAlineacion.destroy({
      where: { partido_id: req.params.id, jugador_id: req.params.jugadorId },
    });
    if (!deleted) return res.status(404).json({ success: false, message: 'Alineacion no encontrada' });
    res.json({ success: true, message: 'Jugador removido de la alineacion' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// Confirmaciones DNI + firma
// ═══════════════════════════════════════════════════════════════════════════

/** Normaliza un DNI quitando puntos y espacios */
const normalizarDni = (d) => String(d || '').replace(/[\s.]/g, '').trim();

// POST /partidos/:id/confirmar-alineacion
// Body: { tipo: 'local'|'visitante', dni, firma }
export const confirmarAlineacion = async (req, res) => {
  try {
    const partido = await Partido.findByPk(req.params.id);
    if (!partido) return res.status(404).json({ success: false, message: 'Partido no encontrado' });
    if (partido.estado !== 'programado') {
      return res.status(400).json({ success: false, message: 'El partido ya no se puede modificar' });
    }

    const { tipo, dni, firma } = req.body;
    if (!['local', 'visitante'].includes(tipo) || !dni || !firma) {
      return res.status(400).json({ success: false, message: 'tipo, dni y firma son requeridos' });
    }

    const clubId = tipo === 'local' ? partido.club_local_id : partido.club_visitante_id;
    const dniNorm = normalizarDni(dni);

    // Validar que el DNI corresponda a un delegado del club
    const staff = await Staff.findOne({
      where: {
        club_id: clubId,
        dni: dniNorm,
        activo: true,
        tipo: ['delegado_general', 'delegado_auxiliar'],
      },
    });

    if (!staff) {
      return res.status(403).json({
        success: false,
        message: 'El DNI no corresponde a un delegado registrado del club',
      });
    }

    // Guardar la confirmacion
    const conf = await PartidoConfirmacion.create({
      partido_id: partido.id,
      tipo: tipo === 'local' ? 'alineacion_local' : 'alineacion_visitante',
      dni_ingresado: dniNorm,
      firma_data_url: firma,
      usuario_id: req.user?.id,
      nombre_firmante: `${staff.apellido}, ${staff.nombre}`,
    });

    // Marcar las alineaciones del club como confirmadas
    await PartidoAlineacion.update(
      { confirmado: true },
      { where: { partido_id: partido.id, club_id: clubId } },
    );

    registrarAudit({
      req,
      accion: 'CONFIRMAR_ALINEACION',
      entidad: 'partidos',
      entidad_id: partido.id,
      despues: { tipo, delegado: staff.dni },
    });

    res.status(201).json({
      success: true,
      data: conf,
      message: `Alineacion ${tipo} confirmada por ${staff.apellido}`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /partidos/:id/cerrar
// Body: { dni, firma }
// Reemplaza al endpoint confirmar() con validacion completa
export const cerrarPartido = async (req, res) => {
  try {
    const partido = await Partido.findByPk(req.params.id);
    if (!partido) return res.status(404).json({ success: false, message: 'Partido no encontrado' });
    if (partido.estado !== 'finalizado') {
      return res.status(400).json({ success: false, message: 'El partido debe estar finalizado para cerrarlo' });
    }
    if (partido.confirmado_arbitro) {
      return res.status(400).json({ success: false, message: 'El partido ya fue confirmado' });
    }

    const { dni, firma } = req.body;
    if (!dni || !firma) {
      return res.status(400).json({ success: false, message: 'dni y firma son requeridos' });
    }

    const dniNorm = normalizarDni(dni);

    // Validar que el DNI corresponda al arbitro asignado al partido
    if (!partido.arbitro_id) {
      return res.status(400).json({ success: false, message: 'El partido no tiene arbitro asignado' });
    }

    const arbitro = await Arbitro.findByPk(partido.arbitro_id);
    if (!arbitro || normalizarDni(arbitro.dni) !== dniNorm) {
      return res.status(403).json({
        success: false,
        message: 'El DNI no corresponde al arbitro asignado al partido',
      });
    }

    await PartidoConfirmacion.create({
      partido_id: partido.id,
      tipo: 'cierre_arbitro',
      dni_ingresado: dniNorm,
      firma_data_url: firma,
      usuario_id: req.user?.id,
      nombre_firmante: `${arbitro.apellido}, ${arbitro.nombre}`,
    });

    await partido.update({
      confirmado_arbitro: true,
      actualizado_en: new Date(),
    });

    emitMatchConfirm(partido);
    registrarAudit({ req, accion: 'CERRAR_PARTIDO', entidad: 'partidos', entidad_id: partido.id });

    res.json({ success: true, data: partido, message: 'Partido cerrado y confirmado por el arbitro' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// Control de periodos
// ═══════════════════════════════════════════════════════════════════════════

// POST /partidos/:id/periodo/iniciar
// Inicia un periodo (1, 2, etc)
export const iniciarPeriodo = async (req, res) => {
  try {
    const partido = await Partido.findByPk(req.params.id);
    if (!partido) return res.status(404).json({ success: false, message: 'Partido no encontrado' });

    const periodo = parseInt(req.body.periodo) || (partido.periodo_actual || 0) + 1;

    // Si es el primer periodo, cambiar estado a en_curso
    const updates = { periodo_actual: periodo, actualizado_en: new Date() };
    if (periodo === 1 && partido.estado === 'programado') {
      updates.estado = 'en_curso';
      updates.hora_inicio = new Date();
    }

    await partido.update(updates);

    // Registrar evento
    await PartidoEvento.create({
      partido_id: partido.id,
      tipo: 'inicio_periodo',
      periodo,
      minuto: 0,
      detalle: `Inicio periodo ${periodo}`,
      registrado_por: req.user?.id,
    });

    if (periodo === 1) emitMatchStart(partido);

    res.json({ success: true, data: partido, message: `Periodo ${periodo} iniciado` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /partidos/:id/periodo/finalizar
// Finaliza el periodo actual
export const finalizarPeriodo = async (req, res) => {
  try {
    const partido = await Partido.findByPk(req.params.id);
    if (!partido) return res.status(404).json({ success: false, message: 'Partido no encontrado' });

    const periodo = partido.periodo_actual;

    // Registrar evento
    await PartidoEvento.create({
      partido_id: partido.id,
      tipo: 'fin_periodo',
      periodo,
      detalle: `Fin periodo ${periodo}`,
      registrado_por: req.user?.id,
    });

    // Si es el ultimo periodo, finalizar el partido
    // La cantidad total sale del torneo.config via el include
    const jornada = await FixtureJornada.findByPk(partido.jornada_id, {
      attributes: ['torneo_id'],
    });
    const torneo = jornada ? await (await import('../models/index.js')).Torneo.findByPk(jornada.torneo_id, { attributes: ['config'] }) : null;
    const totalTiempos = (torneo?.config?.cantidad_tiempos) || (partido.config_override?.cantidad_tiempos) || 2;

    if (periodo >= totalTiempos) {
      await partido.update({
        estado: 'finalizado',
        hora_fin: new Date(),
        actualizado_en: new Date(),
      });

      // Recalcular posiciones
      try {
        await recalcularDespuesDePartido(partido.id);
      } catch (e) {
        console.error('Error recalculando:', e.message);
      }

      emitMatchEnd(partido);
      if (jornada) emitStandingsUpdate(jornada.torneo_id);
    }

    res.json({ success: true, data: partido, message: `Periodo ${periodo} finalizado` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

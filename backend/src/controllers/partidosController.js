import { Partido, PartidoEvento, Club, Categoria, Arbitro, Veedor, Jugador, FixtureJornada } from '../models/index.js';
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

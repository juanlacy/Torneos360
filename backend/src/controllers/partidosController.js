import { Op } from 'sequelize';
import {
  Partido, PartidoEvento, PartidoAlineacion, PartidoConfirmacion,
  Club, Institucion, Categoria, Persona, PersonaRol, Rol, FixtureJornada, Torneo,
} from '../models/index.js';
import { recalcularDespuesDePartido } from '../services/standingsCalculatorService.js';
import { registrarAudit } from '../services/auditService.js';
import { emitMatchStart, emitMatchEventNew, emitMatchEnd, emitMatchConfirm, emitStandingsUpdate } from '../sockets/matchSocket.js';
import { normalizarDni } from './personasController.js';

// ─── Helper: include de "persona como arbitro/veedor" ───────────────────────
const incArbitro      = { model: Persona, as: 'arbitro', attributes: ['id', 'nombre', 'apellido', 'dni'] };
const incVeedor       = { model: Persona, as: 'veedor',  attributes: ['id', 'nombre', 'apellido', 'dni'] };
const incMejorJugador = { model: Persona, as: 'mejorJugador', attributes: ['id', 'nombre', 'apellido'] };

// GET /partidos/:id
export const obtener = async (req, res) => {
  try {
    const partido = await Partido.findByPk(req.params.id, {
      include: [
        { model: Club, as: 'clubLocal', attributes: ['id', 'sufijo', 'nombre', 'nombre_corto', 'escudo_url', 'color_primario', 'color_secundario'], include: [{ model: Institucion, as: 'institucion' }] },
        { model: Club, as: 'clubVisitante', attributes: ['id', 'sufijo', 'nombre', 'nombre_corto', 'escudo_url', 'color_primario', 'color_secundario'], include: [{ model: Institucion, as: 'institucion' }] },
        { model: Categoria, as: 'categoria', attributes: ['id', 'nombre', 'anio_nacimiento'] },
        incArbitro,
        incVeedor,
        incMejorJugador,
        { model: FixtureJornada, as: 'jornada', attributes: ['id', 'numero_jornada', 'fase', 'fecha', 'torneo_id'] },
        {
          model: PartidoEvento, as: 'eventos',
          include: [
            { model: Persona, as: 'jugador', attributes: ['id', 'nombre', 'apellido'] },
            { model: Club, as: 'club', attributes: ['id', 'sufijo', 'nombre_corto'] },
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
// Devuelve personas con rol=jugador, estado=aprobado, de la categoria de ambos clubes
export const jugadoresDisponibles = async (req, res) => {
  try {
    const partido = await Partido.findByPk(req.params.id);
    if (!partido) return res.status(404).json({ success: false, message: 'Partido no encontrado' });

    const rolJugador = await Rol.findOne({ where: { codigo: 'jugador' } });
    if (!rolJugador) return res.status(500).json({ success: false, message: 'Rol jugador no configurado' });

    const obtenerJugadoresClub = async (clubId) => {
      const personas = await Persona.findAll({
        where: { activo: true },
        include: [{
          model: PersonaRol,
          as: 'roles_asignados',
          required: true,
          where: {
            rol_id: rolJugador.id,
            club_id: clubId,
            categoria_id: partido.categoria_id,
            estado_fichaje: 'aprobado',
            activo: true,
          },
        }],
        order: [['apellido', 'ASC']],
      });
      return personas.map(p => {
        const ra = p.roles_asignados[0];
        return {
          id: p.id,                            // persona_id
          persona_rol_id: ra.id,
          nombre: p.nombre,
          apellido: p.apellido,
          dni: p.dni,
          foto_url: p.foto_url,
          club_id: ra.club_id,
          numero_camiseta: ra.numero_camiseta,
        };
      });
    };

    const local = await obtenerJugadoresClub(partido.club_local_id);
    const visitante = await obtenerJugadoresClub(partido.club_visitante_id);

    res.json({ success: true, data: { local, visitante } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /partidos/:id
export const actualizar = async (req, res) => {
  try {
    const partido = await Partido.findByPk(req.params.id);
    if (!partido) return res.status(404).json({ success: false, message: 'Partido no encontrado' });

    const campos = ['arbitro_id', 'veedor_id', 'cancha', 'observaciones', 'mejor_jugador_id', 'calificacion_arbitro', 'comentario_arbitro'];
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

// POST /partidos/:id/iniciar  (legacy; preferir /periodo/iniciar)
export const iniciar = async (req, res) => {
  try {
    const partido = await Partido.findByPk(req.params.id);
    if (!partido) return res.status(404).json({ success: false, message: 'Partido no encontrado' });
    if (partido.estado !== 'programado') {
      return res.status(400).json({ success: false, message: 'El partido no esta en estado programado' });
    }

    await partido.update({ estado: 'en_curso', hora_inicio: new Date(), actualizado_en: new Date() });

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

    // Aceptar tanto persona_id (nuevo) como jugador_id (legacy por compat)
    const {
      tipo, persona_id, persona_reemplaza_id,
      jugador_id, jugador_reemplaza_id,
      club_id, minuto, periodo, detalle,
    } = req.body;
    if (!tipo) return res.status(400).json({ success: false, message: 'tipo es requerido' });

    const personaIdFinal = persona_id || jugador_id || null;

    const evento = await PartidoEvento.create({
      partido_id: partido.id,
      tipo,
      persona_id: personaIdFinal,
      persona_reemplaza_id: persona_reemplaza_id || jugador_reemplaza_id || null,
      club_id, minuto, periodo, detalle,
      registrado_por: req.user.id,
    });

    // ─── Regla de doble amarilla ──────────────────────────────────
    if (tipo === 'amarilla' && personaIdFinal) {
      // Contar amarillas del jugador en este partido
      const amarillasEnPartido = await PartidoEvento.count({
        where: { partido_id: partido.id, tipo: 'amarilla', persona_id: personaIdFinal },
      });

      if (amarillasEnPartido >= 2) {
        // Obtener config del torneo
        const jornada = await FixtureJornada.findByPk(partido.jornada_id, { attributes: ['torneo_id'] });
        const torneo = jornada ? await Torneo.findByPk(jornada.torneo_id, { attributes: ['config'] }) : null;
        const regla = torneo?.config?.doble_amarilla_genera || 'roja';

        if (regla !== 'nada') {
          // Crear evento automatico (roja o azul segun config)
          await PartidoEvento.create({
            partido_id: partido.id,
            tipo: regla,
            persona_id: personaIdFinal,
            club_id, minuto, periodo,
            detalle: `${regla.toUpperCase()} automatica por doble amarilla`,
            registrado_por: req.user.id,
          });
        }
      }
    }

    // Actualizar marcador si es gol
    if (tipo === 'gol' && club_id) {
      if (club_id === partido.club_local_id) {
        await partido.update({ goles_local: partido.goles_local + 1, actualizado_en: new Date() });
      } else if (club_id === partido.club_visitante_id) {
        await partido.update({ goles_visitante: partido.goles_visitante + 1, actualizado_en: new Date() });
      }
    }

    const eventoCompleto = await PartidoEvento.findByPk(evento.id, {
      include: [
        { model: Persona, as: 'jugador', attributes: ['id', 'nombre', 'apellido'] },
        { model: Club, as: 'club', attributes: ['id', 'sufijo', 'nombre_corto'] },
      ],
    });

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

    await PartidoEvento.create({
      partido_id: partido.id, tipo: 'fin',
      detalle: `Final: ${partido.goles_local} - ${partido.goles_visitante}`,
      registrado_por: req.user.id,
    });

    try { await recalcularDespuesDePartido(partido.id); }
    catch (e) { console.error('Error al recalcular posiciones:', e.message); }

    registrarAudit({ req, accion: 'FINALIZAR_PARTIDO', entidad: 'partidos', entidad_id: partido.id });
    emitMatchEnd(partido);

    const jornada = await FixtureJornada.findByPk(partido.jornada_id, { attributes: ['torneo_id'] });
    if (jornada) emitStandingsUpdate(jornada.torneo_id);

    res.json({ success: true, data: partido, message: 'Partido finalizado' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /partidos/:id/confirmar  (legacy — reemplazado por cerrar)
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
        { model: Persona, as: 'jugador', attributes: ['id', 'nombre', 'apellido', 'dni', 'foto_url'] },
      ],
      order: [['numero_camiseta', 'ASC']],
    });

    const local = alineaciones.filter(a => a.club_id === partido.club_local_id);
    const visitante = alineaciones.filter(a => a.club_id === partido.club_visitante_id);
    const confLocal = local.some(a => a.confirmado);
    const confVisitante = visitante.some(a => a.confirmado);

    res.json({
      success: true,
      data: { local, visitante, confirmado_local: confLocal, confirmado_visitante: confVisitante },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /partidos/:id/alineacion
// Body: { persona_id | jugador_id (legacy), numero_camiseta, titular, club_id }
export const upsertAlineacion = async (req, res) => {
  try {
    const partido = await Partido.findByPk(req.params.id);
    if (!partido) return res.status(404).json({ success: false, message: 'Partido no encontrado' });

    const personaId = req.body.persona_id || req.body.jugador_id;
    const { numero_camiseta, titular, club_id } = req.body;

    if (!personaId || !club_id) {
      return res.status(400).json({ success: false, message: 'persona_id y club_id son requeridos' });
    }
    if (club_id !== partido.club_local_id && club_id !== partido.club_visitante_id) {
      return res.status(400).json({ success: false, message: 'El club no participa en este partido' });
    }

    // Validar que la persona tenga rol 'jugador' en este club + categoria
    const rolJugador = await Rol.findOne({ where: { codigo: 'jugador' } });
    const fichaje = await PersonaRol.findOne({
      where: {
        persona_id: personaId,
        rol_id: rolJugador.id,
        club_id,
        categoria_id: partido.categoria_id,
        activo: true,
      },
    });
    if (!fichaje) {
      return res.status(400).json({ success: false, message: 'La persona no esta fichada como jugador en este club y categoria' });
    }

    const [aline] = await PartidoAlineacion.findOrCreate({
      where: { partido_id: partido.id, persona_id: personaId },
      defaults: {
        partido_id: partido.id,
        persona_id: personaId,
        club_id,
        numero_camiseta: numero_camiseta ?? fichaje.numero_camiseta,
        titular: titular ?? true,
      },
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

// DELETE /partidos/:id/alineacion/:personaId
export const eliminarAlineacion = async (req, res) => {
  try {
    const deleted = await PartidoAlineacion.destroy({
      where: { partido_id: req.params.id, persona_id: req.params.jugadorId || req.params.personaId },
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

    // Admin bypass: admin_sistema puede confirmar con su propio DNI sin ser delegado
    const isAdmin = req.user?.rol === 'admin_sistema' || req.user?.rol === 'admin_torneo';

    let persona = null;
    if (isAdmin) {
      // Para admin, buscar la persona por DNI sin validar rol
      persona = await Persona.findOne({ where: { dni: dniNorm, activo: true } });
      if (!persona) {
        // Si el admin no tiene persona, crearla al vuelo
        persona = await Persona.findOne({ where: { dni: dniNorm } });
        if (!persona) {
          const usuario = await (await import('../models/index.js')).Usuario.findByPk(req.user.id);
          persona = await Persona.create({
            dni: dniNorm,
            nombre: usuario?.nombre || 'Admin',
            apellido: usuario?.apellido || 'Sistema',
            activo: true,
          });
        }
      }
    } else {
      // Validar: buscar persona por DNI y verificar que tenga un rol con
      // puede_firmar_alineacion=true en este club O en otro club de la misma institucion
      const clubDelPartido = await Club.findByPk(clubId, { attributes: ['institucion_id'] });
      const clubsInstitucion = clubDelPartido
        ? (await Club.findAll({
            where: { institucion_id: clubDelPartido.institucion_id },
            attributes: ['id'],
          })).map(c => c.id)
        : [clubId];

      persona = await Persona.findOne({
        where: { dni: dniNorm, activo: true },
        include: [{
          model: PersonaRol, as: 'roles_asignados',
          where: { club_id: clubsInstitucion, activo: true },
          required: true,
          include: [{
            model: Rol, as: 'rol',
            where: { puede_firmar_alineacion: true },
            required: true,
          }],
        }],
      });
    }

    if (!persona) {
      return res.status(403).json({
        success: false,
        message: 'El DNI no corresponde a una persona habilitada para firmar alineaciones de este club',
      });
    }

    const conf = await PartidoConfirmacion.create({
      partido_id: partido.id,
      tipo: tipo === 'local' ? 'alineacion_local' : 'alineacion_visitante',
      dni_ingresado: dniNorm,
      firma_data_url: firma,
      usuario_id: req.user?.id,
      nombre_firmante: `${persona.apellido}, ${persona.nombre}`,
    });

    await PartidoAlineacion.update(
      { confirmado: true },
      { where: { partido_id: partido.id, club_id: clubId } },
    );

    registrarAudit({
      req, accion: 'CONFIRMAR_ALINEACION', entidad: 'partidos', entidad_id: partido.id,
      despues: { tipo, firmante: persona.dni },
    });

    res.status(201).json({
      success: true, data: conf,
      message: `Alineacion ${tipo} confirmada por ${persona.apellido}`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /partidos/:id/cerrar
// Body: { dni, firma }
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
    const isAdmin = req.user?.rol === 'admin_sistema' || req.user?.rol === 'admin_torneo';

    let nombreFirmante = 'Admin';

    if (isAdmin) {
      // Admin bypass: puede cerrar el partido con su propio DNI
      const persona = await Persona.findOne({ where: { dni: dniNorm } });
      nombreFirmante = persona ? `${persona.apellido}, ${persona.nombre}` : `Admin (${dniNorm})`;
    } else {
      if (!partido.arbitro_id) {
        return res.status(400).json({ success: false, message: 'El partido no tiene arbitro asignado' });
      }
      const arbitro = await Persona.findByPk(partido.arbitro_id);
      if (!arbitro || normalizarDni(arbitro.dni) !== dniNorm) {
        return res.status(403).json({
          success: false,
          message: 'El DNI no corresponde al arbitro asignado al partido',
        });
      }
      nombreFirmante = `${arbitro.apellido}, ${arbitro.nombre}`;
    }

    await PartidoConfirmacion.create({
      partido_id: partido.id,
      tipo: 'cierre_arbitro',
      dni_ingresado: dniNorm,
      firma_data_url: firma,
      usuario_id: req.user?.id,
      nombre_firmante: nombreFirmante,
    });

    await partido.update({ confirmado_arbitro: true, actualizado_en: new Date() });

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

export const iniciarPeriodo = async (req, res) => {
  try {
    const partido = await Partido.findByPk(req.params.id);
    if (!partido) return res.status(404).json({ success: false, message: 'Partido no encontrado' });

    const periodo = parseInt(req.body.periodo) || (partido.periodo_actual || 0) + 1;
    const updates = { periodo_actual: periodo, actualizado_en: new Date() };
    if (periodo === 1 && partido.estado === 'programado') {
      updates.estado = 'en_curso';
      updates.hora_inicio = new Date();
    }

    await partido.update(updates);

    await PartidoEvento.create({
      partido_id: partido.id, tipo: 'inicio_periodo',
      periodo, minuto: 0, detalle: `Inicio periodo ${periodo}`,
      registrado_por: req.user?.id,
    });

    if (periodo === 1) emitMatchStart(partido);
    res.json({ success: true, data: partido, message: `Periodo ${periodo} iniciado` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const finalizarPeriodo = async (req, res) => {
  try {
    const partido = await Partido.findByPk(req.params.id);
    if (!partido) return res.status(404).json({ success: false, message: 'Partido no encontrado' });

    const periodo = partido.periodo_actual;
    await PartidoEvento.create({
      partido_id: partido.id, tipo: 'fin_periodo',
      periodo, detalle: `Fin periodo ${periodo}`,
      registrado_por: req.user?.id,
    });

    const jornada = await FixtureJornada.findByPk(partido.jornada_id, { attributes: ['torneo_id'] });
    const torneo = jornada ? await Torneo.findByPk(jornada.torneo_id, { attributes: ['config'] }) : null;
    const totalTiempos = (torneo?.config?.cantidad_tiempos) || (partido.config_override?.cantidad_tiempos) || 2;

    if (periodo >= totalTiempos) {
      await partido.update({ estado: 'finalizado', hora_fin: new Date(), actualizado_en: new Date() });

      try { await recalcularDespuesDePartido(partido.id); }
      catch (e) { console.error('Error recalculando:', e.message); }

      emitMatchEnd(partido);
      if (jornada) emitStandingsUpdate(jornada.torneo_id);
    }

    res.json({ success: true, data: partido, message: `Periodo ${periodo} finalizado` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

import { Router } from 'express';
import { authenticateToken, requirePermiso, requireAdminTorneo, requireArbitro, requireDelegado } from '../middleware/authMiddleware.js';
import {
  obtener, jugadoresDisponibles, actualizar,
  iniciar, registrarEvento, finalizar, confirmar, suspender,
  getAlineacion, upsertAlineacion, eliminarAlineacion,
  confirmarAlineacion, cerrarPartido,
  iniciarPeriodo, finalizarPeriodo, resultadoRapido,
} from '../controllers/partidosController.js';

const router = Router();

router.use(authenticateToken);

// Consultar partido
router.get('/:id', requirePermiso('partidos', 'ver'), obtener);
router.get('/:id/jugadores-disponibles', requirePermiso('partidos', 'ver'), jugadoresDisponibles);
router.get('/:id/alineacion', requirePermiso('partidos', 'ver'), getAlineacion);

// Actualizar datos (arbitro, cancha)
router.put('/:id', requirePermiso('partidos', 'editar'), actualizar);

// Alineaciones
router.post('/:id/alineacion', requireDelegado, upsertAlineacion);
router.delete('/:id/alineacion/:jugadorId', requireDelegado, eliminarAlineacion);
router.post('/:id/confirmar-alineacion', requireDelegado, confirmarAlineacion);

// Flujo del partido (legacy + nuevos)
router.post('/:id/iniciar', requireDelegado, iniciar);
router.post('/:id/evento', requireDelegado, registrarEvento);
router.post('/:id/finalizar', requireDelegado, finalizar);
router.post('/:id/resultado-rapido', requirePermiso('partidos', 'editar'), resultadoRapido);
router.post('/:id/confirmar', requireArbitro, confirmar);
router.post('/:id/suspender', requireAdminTorneo, suspender);

// Nuevos: periodos y cierre con DNI+firma
router.post('/:id/periodo/iniciar', requireDelegado, iniciarPeriodo);
router.post('/:id/periodo/finalizar', requireDelegado, finalizarPeriodo);
router.post('/:id/cerrar', requireArbitro, cerrarPartido);

export default router;

import { Router } from 'express';
import { authenticateToken, requirePermiso, requireAdminTorneo, requireArbitro, requireDelegado } from '../middleware/authMiddleware.js';
import { obtener, jugadoresDisponibles, actualizar, iniciar, registrarEvento, finalizar, confirmar, suspender } from '../controllers/partidosController.js';

const router = Router();

router.use(authenticateToken);

// Consultar partido
router.get('/:id', requirePermiso('partidos', 'ver'), obtener);
router.get('/:id/jugadores-disponibles', requirePermiso('partidos', 'ver'), jugadoresDisponibles);

// Actualizar datos (arbitro, cancha)
router.put('/:id', requirePermiso('partidos', 'editar'), actualizar);

// Flujo del partido
router.post('/:id/iniciar', requireDelegado, iniciar);
router.post('/:id/evento', requireDelegado, registrarEvento);
router.post('/:id/finalizar', requireDelegado, finalizar);
router.post('/:id/confirmar', requireArbitro, confirmar);
router.post('/:id/suspender', requireAdminTorneo, suspender);

export default router;

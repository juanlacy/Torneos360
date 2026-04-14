import { Router } from 'express';
import { authenticateToken, requireAdminTorneo, requirePermiso } from '../middleware/authMiddleware.js';
import { generar, eliminar, listarJornadas, partidosPorJornada, actualizarJornada } from '../controllers/fixtureController.js';

const router = Router();

router.use(authenticateToken);

// Generar/eliminar fixture (solo admin)
router.post('/generar/:torneoId', requireAdminTorneo, generar);
router.delete('/:torneoId', requireAdminTorneo, eliminar);

// Consultar fixture
router.get('/:torneoId/jornadas', requirePermiso('fixture', 'ver'), listarJornadas);
router.get('/jornada/:jornadaId/partidos', requirePermiso('fixture', 'ver'), partidosPorJornada);

// Actualizar jornada (fecha, estado)
router.put('/jornada/:jornadaId', requireAdminTorneo, actualizarJornada);

export default router;

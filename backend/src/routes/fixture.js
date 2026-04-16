import { Router } from 'express';
import { authenticateToken, requireAdminTorneo, requirePermiso } from '../middleware/authMiddleware.js';
import {
  generar, eliminar, listarJornadas, partidosPorJornada, partidosPorTorneo, actualizarJornada,
  crearJornada, eliminarJornada, agregarEnfrentamiento, eliminarEnfrentamiento, getHorarios,
} from '../controllers/fixtureController.js';

const router = Router();

router.use(authenticateToken);

// Generar automatico / eliminar fixture completo
router.post('/generar/:torneoId', requireAdminTorneo, generar);
router.delete('/:torneoId', requireAdminTorneo, eliminar);

// Consultar
router.get('/:torneoId/jornadas', requirePermiso('fixture', 'ver'), listarJornadas);
router.get('/:torneoId/partidos', requirePermiso('fixture', 'ver'), partidosPorTorneo);
router.get('/jornada/:jornadaId/partidos', requirePermiso('fixture', 'ver'), partidosPorJornada);
router.get('/horarios', requirePermiso('fixture', 'ver'), getHorarios);

// Gestion manual de jornadas
router.post('/jornada', requireAdminTorneo, crearJornada);
router.put('/jornada/:jornadaId', requireAdminTorneo, actualizarJornada);
router.delete('/jornada/:jornadaId', requireAdminTorneo, eliminarJornada);

// Enfrentamientos manuales dentro de una jornada
router.post('/jornada/:jornadaId/enfrentamiento', requireAdminTorneo, agregarEnfrentamiento);
router.delete('/jornada/:jornadaId/enfrentamiento', requireAdminTorneo, eliminarEnfrentamiento);

export default router;

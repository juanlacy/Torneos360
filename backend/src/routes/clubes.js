import { Router } from 'express';
import { authenticateToken, requirePermiso, requireAdminTorneo } from '../middleware/authMiddleware.js';
import { listar, obtener, jugadoresPorClub, crear, actualizar, uploadEscudo, subirEscudo } from '../controllers/clubesController.js';

const router = Router();

router.use(authenticateToken);

router.get('/',    requirePermiso('clubes', 'ver'), listar);
router.get('/:id', requirePermiso('clubes', 'ver'), obtener);
router.get('/:id/jugadores', requirePermiso('jugadores', 'ver'), jugadoresPorClub);
router.post('/',   requirePermiso('clubes', 'crear'), crear);
router.put('/:id', requirePermiso('clubes', 'editar'), actualizar);
router.post('/:id/escudo', requireAdminTorneo, uploadEscudo, subirEscudo);

export default router;

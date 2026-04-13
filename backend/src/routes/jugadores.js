import { Router } from 'express';
import { authenticateToken, requirePermiso, requireAdminTorneo } from '../middleware/authMiddleware.js';
import { listar, obtener, crear, actualizar, cambiarEstadoFichaje, uploadFoto, subirFoto } from '../controllers/jugadoresController.js';

const router = Router();

router.use(authenticateToken);

router.get('/',    requirePermiso('jugadores', 'ver'), listar);
router.get('/:id', requirePermiso('jugadores', 'ver'), obtener);
router.post('/',   requirePermiso('jugadores', 'crear'), crear);
router.put('/:id', requirePermiso('jugadores', 'editar'), actualizar);
router.put('/:id/fichaje', requireAdminTorneo, cambiarEstadoFichaje);
router.post('/:id/foto', requirePermiso('jugadores', 'editar'), uploadFoto, subirFoto);

export default router;

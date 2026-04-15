import { Router } from 'express';
import { authenticateToken, requirePermiso } from '../middleware/authMiddleware.js';
import { listar, obtener, crear, actualizar, eliminar } from '../controllers/institucionesController.js';

const router = Router();

router.use(authenticateToken);

router.get('/',       requirePermiso('clubes', 'ver'), listar);
router.get('/:id',    requirePermiso('clubes', 'ver'), obtener);
router.post('/',      requirePermiso('clubes', 'crear'), crear);
router.put('/:id',    requirePermiso('clubes', 'editar'), actualizar);
router.delete('/:id', requirePermiso('clubes', 'eliminar'), eliminar);

export default router;

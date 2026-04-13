import { Router } from 'express';
import { authenticateToken, requirePermiso } from '../middleware/authMiddleware.js';
import { listar, crear, actualizar, eliminar } from '../controllers/arbitrosController.js';

const router = Router();

router.use(authenticateToken);

router.get('/',    requirePermiso('arbitros', 'ver'), listar);
router.post('/',   requirePermiso('arbitros', 'crear'), crear);
router.put('/:id', requirePermiso('arbitros', 'editar'), actualizar);
router.delete('/:id', requirePermiso('arbitros', 'eliminar'), eliminar);

export default router;

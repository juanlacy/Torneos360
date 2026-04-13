import { Router } from 'express';
import { authenticateToken, requirePermiso } from '../middleware/authMiddleware.js';
import { listar, crear, actualizar, eliminar } from '../controllers/staffController.js';

const router = Router();

router.use(authenticateToken);

router.get('/',    requirePermiso('staff', 'ver'), listar);
router.post('/',   requirePermiso('staff', 'crear'), crear);
router.put('/:id', requirePermiso('staff', 'editar'), actualizar);
router.delete('/:id', requirePermiso('staff', 'eliminar'), eliminar);

export default router;

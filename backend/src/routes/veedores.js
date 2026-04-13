import { Router } from 'express';
import { authenticateToken, requirePermiso } from '../middleware/authMiddleware.js';
import { listar, crear, actualizar, eliminar } from '../controllers/veedoresController.js';

const router = Router();

router.use(authenticateToken);

router.get('/',    requirePermiso('veedores', 'ver'), listar);
router.post('/',   requirePermiso('veedores', 'crear'), crear);
router.put('/:id', requirePermiso('veedores', 'editar'), actualizar);
router.delete('/:id', requirePermiso('veedores', 'eliminar'), eliminar);

export default router;

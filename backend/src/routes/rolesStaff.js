import { Router } from 'express';
import { authenticateToken, requirePermiso } from '../middleware/authMiddleware.js';
import { listar, crear, actualizar, eliminar } from '../controllers/rolesStaffController.js';

const router = Router();

router.use(authenticateToken);

// Listar roles: cualquier usuario con permiso staff.ver (para usarlos en selects)
router.get('/',    requirePermiso('staff', 'ver'), listar);
// ABM: solo admin (staff.crear/editar/eliminar)
router.post('/',   requirePermiso('staff', 'crear'), crear);
router.put('/:id', requirePermiso('staff', 'editar'), actualizar);
router.delete('/:id', requirePermiso('staff', 'eliminar'), eliminar);

export default router;

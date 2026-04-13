import { Router } from 'express';
import { authenticateToken, requireAdmin } from '../middleware/authMiddleware.js';
import {
  getDefaults, updateDefault,
  getUsuarioOverrides, updateUsuarioOverride, deleteUsuarioOverride,
} from '../controllers/permisosController.js';

const router = Router();

// Todos requieren auth + admin_sistema
router.use(authenticateToken, requireAdmin);

router.get('/defaults', getDefaults);
router.put('/defaults', updateDefault);
router.get('/usuario/:id', getUsuarioOverrides);
router.put('/usuario/:id', updateUsuarioOverride);
router.delete('/usuario/:id/:modulo/:accion', deleteUsuarioOverride);

export default router;

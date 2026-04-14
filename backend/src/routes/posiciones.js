import { Router } from 'express';
import { authenticateToken, requirePermiso, requireAdminTorneo } from '../middleware/authMiddleware.js';
import { porCategoria, general, recalcular } from '../controllers/posicionesController.js';

const router = Router();

router.use(authenticateToken);

router.get('/:torneoId/categorias', requirePermiso('posiciones', 'ver'), porCategoria);
router.get('/:torneoId/general', requirePermiso('posiciones', 'ver'), general);
router.post('/:torneoId/recalcular', requireAdminTorneo, recalcular);

export default router;

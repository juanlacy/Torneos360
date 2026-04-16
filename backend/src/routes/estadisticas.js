import { Router } from 'express';
import { authenticateToken, requirePermiso } from '../middleware/authMiddleware.js';
import { goleadores, tarjetas } from '../controllers/estadisticasController.js';

const router = Router();

router.use(authenticateToken);

router.get('/:torneoId/goleadores', requirePermiso('posiciones', 'ver'), goleadores);
router.get('/:torneoId/tarjetas',   requirePermiso('posiciones', 'ver'), tarjetas);

export default router;

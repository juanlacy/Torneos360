import { Router } from 'express';
import { authenticateToken, requirePermiso } from '../middleware/authMiddleware.js';
import { listar } from '../controllers/notificacionesController.js';

const router = Router();

router.use(authenticateToken);
router.get('/', requirePermiso('fixture', 'ver'), listar);

export default router;

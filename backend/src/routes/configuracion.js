import { Router } from 'express';
import { authenticateToken, requireAdmin } from '../middleware/authMiddleware.js';
import { listar, obtener, actualizar } from '../controllers/configuracionController.js';

const router = Router();

router.use(authenticateToken, requireAdmin);

router.get('/', listar);
router.get('/:clave', obtener);
router.put('/:clave', actualizar);

export default router;

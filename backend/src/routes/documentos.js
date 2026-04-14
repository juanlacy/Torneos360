import { Router } from 'express';
import { authenticateToken, requirePermiso } from '../middleware/authMiddleware.js';
import { listar, subir, eliminar } from '../controllers/documentosController.js';
import { uploadDocumento } from '../services/uploadService.js';

const router = Router();
router.use(authenticateToken);

router.get('/', requirePermiso('jugadores', 'ver'), listar);
router.post('/', requirePermiso('jugadores', 'crear'), uploadDocumento, subir);
router.delete('/:id', requirePermiso('jugadores', 'eliminar'), eliminar);

export default router;

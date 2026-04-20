import { Router } from 'express';
import { authenticateToken, requirePermiso } from '../middleware/authMiddleware.js';
import {
  pendientes, listar, historialPersona, crearSancion, actualizarSancion,
} from '../controllers/tribunalController.js';

const router = Router();

router.use(authenticateToken);

router.get('/:torneoId/pendientes',           requirePermiso('tribunal', 'ver'),    pendientes);
router.get('/:torneoId/sanciones',            requirePermiso('tribunal', 'ver'),    listar);
router.get('/:torneoId/historial/:personaId', requirePermiso('tribunal', 'ver'),    historialPersona);
router.post('/sanciones',                     requirePermiso('tribunal', 'crear'),  crearSancion);
router.put('/sanciones/:id',                  requirePermiso('tribunal', 'editar'), actualizarSancion);

export default router;

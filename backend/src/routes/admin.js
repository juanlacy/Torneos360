import { Router } from 'express';
import { authenticateToken, requireAdminTorneo } from '../middleware/authMiddleware.js';
import {
  listarUsuarios, getUsuario, crearUsuario, actualizarUsuario, desactivarUsuario,
} from '../controllers/adminController.js';

const router = Router();

// Todos requieren auth + admin_sistema o admin_torneo
router.use(authenticateToken, requireAdminTorneo);

router.get('/usuarios', listarUsuarios);
router.get('/usuarios/:id', getUsuario);
router.post('/usuarios', crearUsuario);
router.put('/usuarios/:id', actualizarUsuario);
router.delete('/usuarios/:id', desactivarUsuario);

export default router;

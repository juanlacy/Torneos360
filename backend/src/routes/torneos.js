import { Router } from 'express';
import { authenticateToken, requireAdminTorneo, requirePermiso } from '../middleware/authMiddleware.js';
import { listar, obtener, crear, actualizar, generarCategorias, crearZona, eliminarZona } from '../controllers/torneosController.js';

const router = Router();

router.use(authenticateToken);

router.get('/',    requirePermiso('torneos', 'ver'), listar);
router.get('/:id', requirePermiso('torneos', 'ver'), obtener);
router.post('/',   requireAdminTorneo, crear);
router.put('/:id', requireAdminTorneo, actualizar);

// Categorias y zonas del torneo
router.post('/:id/generar-categorias', requireAdminTorneo, generarCategorias);
router.post('/:id/zonas', requireAdminTorneo, crearZona);
router.delete('/:torneoId/zonas/:id', requireAdminTorneo, eliminarZona);

export default router;

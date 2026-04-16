import { Router } from 'express';
import { authenticateToken, requireAdminTorneo, requirePermiso } from '../middleware/authMiddleware.js';
import {
  listar, obtener, crear, actualizar, generarCategorias, crearZona, eliminarZona,
  getBranding, updateBranding, uploadLogo, subirLogo, getStats, duplicar,
  transicionPreview, transicionEjecutar,
} from '../controllers/torneosController.js';

const router = Router();

router.use(authenticateToken);

router.get('/',    requirePermiso('torneos', 'ver'), listar);
router.get('/:id', requirePermiso('torneos', 'ver'), obtener);
router.post('/',   requireAdminTorneo, crear);
router.put('/:id', requireAdminTorneo, actualizar);
router.post('/:id/duplicar', requireAdminTorneo, duplicar);
router.get('/:id/transicion/preview', requireAdminTorneo, transicionPreview);
router.post('/:id/transicion', requireAdminTorneo, transicionEjecutar);

// Categorias y zonas
router.post('/:id/generar-categorias', requireAdminTorneo, generarCategorias);
router.post('/:id/zonas', requireAdminTorneo, crearZona);
router.delete('/:torneoId/zonas/:id', requireAdminTorneo, eliminarZona);

// Stats (dashboard)
router.get('/:id/stats', requirePermiso('torneos', 'ver'), getStats);

// Branding
router.get('/:id/branding', requirePermiso('torneos', 'ver'), getBranding);
router.put('/:id/branding', requireAdminTorneo, updateBranding);
router.post('/:id/upload-logo', requireAdminTorneo, uploadLogo, subirLogo);

export default router;

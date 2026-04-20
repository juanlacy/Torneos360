import { Router } from 'express';
import {
  listarTorneos, obtenerTorneo, branding,
  posiciones, goleadores, tarjetas, fixture, partidosEnVivo,
} from '../controllers/publicoController.js';
import { sancionesPublicas } from '../controllers/tribunalController.js';

const router = Router();

// Todos estos endpoints son PUBLICOS — sin authenticateToken
router.get('/torneos',                  listarTorneos);
router.get('/torneos/:id',              obtenerTorneo);
router.get('/torneos/:id/branding',     branding);
router.get('/torneos/:id/posiciones',   posiciones);
router.get('/torneos/:id/goleadores',   goleadores);
router.get('/torneos/:id/tarjetas',     tarjetas);
router.get('/torneos/:id/fixture',      fixture);
router.get('/torneos/:id/en-vivo',      partidosEnVivo);
router.get('/torneos/:id/sanciones',    sancionesPublicas);

export default router;

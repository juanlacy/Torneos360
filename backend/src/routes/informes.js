import { Router } from 'express';
import { authenticateToken, requirePermiso, requireArbitro } from '../middleware/authMiddleware.js';
import { listar, obtener, crear, subirYTranscribir, generarResumen, actualizar, uploadAudio } from '../controllers/informesController.js';

const router = Router();

router.use(authenticateToken);

router.get('/',    requirePermiso('partidos', 'ver'), listar);
router.get('/:id', requirePermiso('partidos', 'ver'), obtener);
router.post('/',   requireArbitro, crear);
router.post('/:id/audio', requireArbitro, uploadAudio, subirYTranscribir);
router.post('/:id/resumir', requireArbitro, generarResumen);
router.put('/:id', requireArbitro, actualizar);

export default router;

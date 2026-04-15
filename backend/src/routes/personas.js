import { Router } from 'express';
import { authenticateToken, requirePermiso } from '../middleware/authMiddleware.js';
import {
  listar, buscarPorDni, obtener, crear, actualizar,
  asignarRol, actualizarRolAsignado, eliminarRolAsignado,
} from '../controllers/personasController.js';

const router = Router();

router.use(authenticateToken);

// Todas las rutas de personas requieren permiso 'jugadores.ver' o similar
// ya que personas engloba a todos (jugadores, staff, arbitros, veedores)
router.get('/',              requirePermiso('jugadores', 'ver'), listar);
router.get('/by-dni/:dni',   requirePermiso('jugadores', 'ver'), buscarPorDni);
router.get('/:id',           requirePermiso('jugadores', 'ver'), obtener);
router.post('/',             requirePermiso('jugadores', 'crear'), crear);
router.put('/:id',           requirePermiso('jugadores', 'editar'), actualizar);
router.post('/:id/roles',    requirePermiso('jugadores', 'editar'), asignarRol);
router.put('/:id/roles/:rolId',    requirePermiso('jugadores', 'editar'), actualizarRolAsignado);
router.delete('/:id/roles/:rolId', requirePermiso('jugadores', 'editar'), eliminarRolAsignado);

export default router;

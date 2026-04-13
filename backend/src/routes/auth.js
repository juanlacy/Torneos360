import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import {
  login, loginGoogle, loginMicrosoft,
  register, verifyEmail, resendVerification,
  forgotPassword, resetPassword, refresh,
  me, misPermisos, updatePerfil, cambiarPassword,
  avatar, uploadAvatar, logout,
} from '../controllers/authController.js';

const router = Router();

// Publicos
router.post('/login', login);
router.post('/google', loginGoogle);
router.post('/microsoft', loginMicrosoft);
router.post('/register', register);
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerification);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/refresh', refresh);

// Autenticados
router.get('/me', authenticateToken, me);
router.get('/mis-permisos', authenticateToken, misPermisos);
router.put('/perfil', authenticateToken, updatePerfil);
router.put('/cambiar-password', authenticateToken, cambiarPassword);
router.post('/avatar', authenticateToken, uploadAvatar, avatar);
router.post('/logout', authenticateToken, logout);

export default router;

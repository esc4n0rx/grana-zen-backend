// authRoutes.js 
import express from 'express';
import { AuthController } from '../controllers/authController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Rota para registro de usuário
router.post('/register', AuthController.register);

// Rota para login
router.post('/login', AuthController.login);

// Rota para obter perfil (protegida)
router.get('/profile', authenticateToken, AuthController.getProfile);

// Rota para atualizar perfil (protegida)
router.put('/profile', authenticateToken, AuthController.updateProfile);

export default router;
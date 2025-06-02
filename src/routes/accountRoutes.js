import express from 'express';
import { AccountController } from '../controllers/accountController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Aplica middleware de autenticação em todas as rotas
router.use(authenticateToken);

// Rotas CRUD para contas
router.post('/', AccountController.create);                    // Criar conta
router.get('/', AccountController.list);                       // Listar todas as contas
router.get('/tipo/:tipo', AccountController.listByType);       // Listar por tipo
router.get('/:id', AccountController.getById);                 // Buscar conta por ID
router.put('/:id', AccountController.update);                  // Atualizar conta
router.delete('/:id', AccountController.delete);               // Remover conta (soft delete)
router.delete('/:id/permanent', AccountController.permanentDelete); // Remover permanentemente

export default router;
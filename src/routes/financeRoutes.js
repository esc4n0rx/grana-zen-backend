// financeRoutes.js
import express from 'express';
import { ReceitaController } from '../controllers/receitaController.js';
import { DespesaController } from '../controllers/despesaController.js';
import { OrcamentoController } from '../controllers/orcamentoController.js';
import { FinanceDataController } from '../controllers/financeDataController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Aplica middleware de autenticação em todas as rotas
router.use(authenticateToken);

// === ROTAS DE RECEITAS ===
router.post('/receitas', ReceitaController.create);
router.get('/receitas', ReceitaController.list);
router.get('/receitas/resumo', ReceitaController.getResumoMensal);
router.get('/receitas/:id', ReceitaController.getById);
router.put('/receitas/:id', ReceitaController.update);
router.patch('/receitas/:id/tags', ReceitaController.updateTags);
router.delete('/receitas/:id', ReceitaController.delete);

// === ROTAS DE DESPESAS ===
router.post('/despesas', DespesaController.create);
router.get('/despesas', DespesaController.list);
router.get('/despesas/resumo', DespesaController.getResumoMensal);
router.get('/despesas/:id', DespesaController.getById);
router.put('/despesas/:id', DespesaController.update);
router.patch('/despesas/:id/tags', DespesaController.updateTags);
router.delete('/despesas/:id', DespesaController.delete);

// === ROTAS DE ORÇAMENTO ===
router.get('/orcamento', OrcamentoController.getByPeriod);
router.put('/orcamento', OrcamentoController.update);
router.post('/orcamento/recalcular', OrcamentoController.recalcular);
router.get('/orcamento/historico', OrcamentoController.getHistorico);
router.get('/orcamento/resumo-anual', OrcamentoController.getResumoAnual);
router.get('/orcamento/estatisticas', OrcamentoController.getEstatisticas);
router.get('/dashboard', OrcamentoController.getDashboard);

// === ROTAS DE DADOS AUXILIARES ===
router.get('/categorias', FinanceDataController.getCategories);
router.post('/categorias', FinanceDataController.createCategory);
router.get('/tags', FinanceDataController.getTags);
router.post('/tags', FinanceDataController.createTag);
router.get('/contas', FinanceDataController.getUserAccounts);
router.get('/categorias/estatisticas', FinanceDataController.getCategoryStats);

export default router;
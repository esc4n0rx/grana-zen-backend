// financeDataController.js
import { FinanceData } from '../models/FinanceData.js';
import { z } from 'zod';

export class FinanceDataController {
    /**
     * Busca todas as categorias
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    static async getCategories(req, res) {
        try {
            const { tipo } = req.query;

            if (tipo && !['receita', 'despesa'].includes(tipo)) {
                return res.status(400).json({
                    success: false,
                    message: 'Tipo deve ser "receita" ou "despesa"'
                });
            }

            const categories = await FinanceData.getCategories(tipo);

            return res.status(200).json({
                success: true,
                message: 'Categorias listadas com sucesso',
                data: { 
                    categories,
                    total: categories.length
                }
            });

        } catch (error) {
            console.error('Erro no controller getCategories:', error);
            return res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    }

    /**
     * Busca todas as tags
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    static async getTags(req, res) {
        try {
            const tags = await FinanceData.getTags();

            return res.status(200).json({
                success: true,
                message: 'Tags listadas com sucesso',
                data: { 
                    tags,
                    total: tags.length
                }
            });

        } catch (error) {
            console.error('Erro no controller getTags:', error);
            return res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    }

    /**
     * Cria uma nova categoria personalizada
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    static async createCategory(req, res) {
        try {
            const categorySchema = z.object({
                nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100),
                tipo: z.enum(['receita', 'despesa']),
                cor: z.string().regex(/^#[0-9A-F]{6}$/i, 'Cor deve ser um hex válido').optional(),
                icone: z.string().max(50).optional()
            });

            const validatedData = categorySchema.parse(req.body);

            const { category, error } = await FinanceData.createCategory(validatedData);

            if (error) {
                return res.status(400).json({
                    success: false,
                    message: error
                });
            }

            return res.status(201).json({
                success: true,
                message: 'Categoria criada com sucesso',
                data: { category }
            });

        } catch (error) {
            if (error.name === 'ZodError') {
                return res.status(400).json({
                    success: false,
                    message: 'Dados inválidos',
                    errors: error.errors
                });
            }

            console.error('Erro no controller createCategory:', error);
            return res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    }

    /**
     * Cria uma nova tag personalizada
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    static async createTag(req, res) {
        try {
            const tagSchema = z.object({
                nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(50),
                cor: z.string().regex(/^#[0-9A-F]{6}$/i, 'Cor deve ser um hex válido').optional()
            });

            const validatedData = tagSchema.parse(req.body);

            const { tag, error } = await FinanceData.createTag(validatedData);

            if (error) {
                return res.status(400).json({
                    success: false,
                    message: error
                });
            }

            return res.status(201).json({
                success: true,
                message: 'Tag criada com sucesso',
                data: { tag }
            });

        } catch (error) {
            if (error.name === 'ZodError') {
                return res.status(400).json({
                    success: false,
                    message: 'Dados inválidos',
                    errors: error.errors
                });
            }

            console.error('Erro no controller createTag:', error);
            return res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    }

    /**
     * Busca contas do usuário
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    static async getUserAccounts(req, res) {
        try {
            const { tipo } = req.query;

            if (tipo && !['conta_corrente', 'cartao_credito', 'dinheiro_vivo'].includes(tipo)) {
                return res.status(400).json({
                    success: false,
                    message: 'Tipo deve ser "conta_corrente", "cartao_credito" ou "dinheiro_vivo"'
                });
            }

            const accounts = await FinanceData.getUserAccounts(req.user.id, tipo);

            return res.status(200).json({
                success: true,
                message: 'Contas listadas com sucesso',
                data: { 
                    accounts,
                    total: accounts.length
                }
            });

        } catch (error) {
            console.error('Erro no controller getUserAccounts:', error);
            return res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    }

    /**
     * Busca estatísticas de categorias
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    static async getCategoryStats(req, res) {
        try {
            const { tipo, mes, ano } = req.query;

            if (!tipo || !['receita', 'despesa'].includes(tipo)) {
                return res.status(400).json({
                    success: false,
                    message: 'Tipo é obrigatório e deve ser "receita" ou "despesa"'
                });
            }

            const stats = await FinanceData.getCategoryStats(
                req.user.id,
                tipo,
                mes ? parseInt(mes) : null,
                ano ? parseInt(ano) : null
            );

            return res.status(200).json({
                success: true,
                message: 'Estatísticas de categorias obtidas com sucesso',
                data: { 
                    stats,
                    tipo,
                    periodo: {
                        mes: mes ? parseInt(mes) : null,
                        ano: ano ? parseInt(ano) : null
                    }
                }
            });

        } catch (error) {
            console.error('Erro no controller getCategoryStats:', error);
            return res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    }
}
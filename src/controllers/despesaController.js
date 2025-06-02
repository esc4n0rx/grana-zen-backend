// despesaController.js
import { Despesa } from '../models/Despesa.js';
import { FinanceData } from '../models/FinanceData.js';
import { 
    despesaSchema, 
    updateDespesaSchema, 
    financeFiltersSchema 
} from '../utils/financeValidators.js';

export class DespesaController {
    /**
     * Cria uma nova despesa
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    static async create(req, res) {
        try {
            // Valida os dados de entrada
            const validatedData = despesaSchema.parse(req.body);

            // Verifica se a conta existe e pertence ao usuário
            const userAccounts = await FinanceData.getUserAccounts(req.user.id);
            const accountExists = userAccounts.find(acc => acc.id === validatedData.account_id);
            
            if (!accountExists) {
                return res.status(400).json({
                    success: false,
                    message: 'Conta não encontrada ou não pertence ao usuário'
                });
            }

            // Validação específica para pagamento de fatura
            if (validatedData.eh_pagamento_fatura) {
                if (!validatedData.cartao_origem_id) {
                    return res.status(400).json({
                        success: false,
                        message: 'Para pagamento de fatura, informe o cartão de origem'
                    });
                }

                // Verifica se o cartão existe e pertence ao usuário
                const cartaoExists = userAccounts.find(acc => 
                    acc.id === validatedData.cartao_origem_id && 
                    acc.tipo_conta === 'cartao_credito'
                );
                
                if (!cartaoExists) {
                    return res.status(400).json({
                        success: false,
                        message: 'Cartão de origem não encontrado ou não é um cartão de crédito'
                    });
                }

                // Não permite que conta de destino seja cartão de crédito
                if (accountExists.tipo_conta === 'cartao_credito') {
                    return res.status(400).json({
                        success: false,
                        message: 'Não é possível pagar fatura usando outro cartão de crédito'
                    });
                }
            }

            // Cria a despesa
            const { despesa, error } = await Despesa.create(req.user.id, validatedData);

            if (error) {
                return res.status(400).json({
                    success: false,
                    message: error
                });
            }

            return res.status(201).json({
                success: true,
                message: 'Despesa criada com sucesso',
                data: { despesa }
            });

        } catch (error) {
            if (error.name === 'ZodError') {
                return res.status(400).json({
                    success: false,
                    message: 'Dados inválidos',
                    errors: error.errors
                });
            }

            console.error('Erro no controller create despesa:', error);
            return res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    }

    /**
     * Lista despesas do usuário com filtros
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    static async list(req, res) {
        try {
            // Valida filtros
            const filters = financeFiltersSchema.parse(req.query);

            // Busca despesas
            const despesas = await Despesa.findByUserId(req.user.id, filters);

            return res.status(200).json({
                success: true,
                message: 'Despesas listadas com sucesso',
                data: { 
                    despesas,
                    total: despesas.length,
                    filtros: filters
                }
            });

        } catch (error) {
            if (error.name === 'ZodError') {
                return res.status(400).json({
                    success: false,
                    message: 'Filtros inválidos',
                    errors: error.errors
                });
            }

            console.error('Erro no controller list despesas:', error);
            return res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    }

    /**
     * Busca uma despesa específica
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    static async getById(req, res) {
        try {
            const { id } = req.params;
            const despesa = await Despesa.findById(id, req.user.id);

            if (!despesa) {
                return res.status(404).json({
                    success: false,
                    message: 'Despesa não encontrada'
                });
            }

            return res.status(200).json({
                success: true,
                message: 'Despesa encontrada com sucesso',
                data: { despesa }
            });

        } catch (error) {
            console.error('Erro no controller getById despesa:', error);
            return res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    }

    /**
     * Atualiza uma despesa
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    static async update(req, res) {
        try {
            const { id } = req.params;

            // Verifica se despesa existe
            const despesaExistente = await Despesa.findById(id, req.user.id);
            if (!despesaExistente) {
                return res.status(404).json({
                    success: false,
                    message: 'Despesa não encontrada'
                });
            }

            // Valida dados de atualização
            const validatedData = updateDespesaSchema.parse(req.body);

            // Se mudou a conta, verifica se a nova conta existe
            if (validatedData.account_id && validatedData.account_id !== despesaExistente.account_id) {
                const userAccounts = await FinanceData.getUserAccounts(req.user.id);
                const accountExists = userAccounts.find(acc => acc.id === validatedData.account_id);
                
                if (!accountExists) {
                    return res.status(400).json({
                        success: false,
                        message: 'Nova conta não encontrada ou não pertence ao usuário'
                    });
                }
            }

            // Atualiza a despesa
            const { despesa, error } = await Despesa.update(id, req.user.id, validatedData);

            if (error) {
                return res.status(400).json({
                    success: false,
                    message: error
                });
            }

            return res.status(200).json({
                success: true,
                message: 'Despesa atualizada com sucesso',
                data: { despesa }
            });

        } catch (error) {
            if (error.name === 'ZodError') {
                return res.status(400).json({
                    success: false,
                    message: 'Dados inválidos',
                    errors: error.errors
                });
            }

            console.error('Erro no controller update despesa:', error);
            return res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    }

    /**
     * Remove uma despesa
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    static async delete(req, res) {
        try {
            const { id } = req.params;
            const { success, error } = await Despesa.delete(id, req.user.id);

            if (!success) {
                return res.status(400).json({
                    success: false,
                    message: error || 'Não foi possível remover a despesa'
                });
            }

            return res.status(200).json({
                success: true,
                message: 'Despesa removida com sucesso'
            });

        } catch (error) {
            console.error('Erro no controller delete despesa:', error);
            return res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    }

    /**
     * Atualiza tags de uma despesa
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    static async updateTags(req, res) {
        try {
            const { id } = req.params;
            const { tags } = req.body;

            // Verifica se despesa existe
            const despesa = await Despesa.findById(id, req.user.id);
            if (!despesa) {
                return res.status(404).json({
                    success: false,
                    message: 'Despesa não encontrada'
                });
            }

            // Valida tags
            if (!Array.isArray(tags)) {
                return res.status(400).json({
                    success: false,
                    message: 'Tags deve ser um array'
                });
            }

            // Remove tags existentes
            await supabase
                .from('gzen_despesa_tags')
                .delete()
                .eq('despesa_id', id);

            // Adiciona novas tags se existirem
            if (tags.length > 0) {
                const tagInserts = tags.map(tagId => ({
                    despesa_id: id,
                    tag_id: tagId
                }));

                const { error } = await supabase
                    .from('gzen_despesa_tags')
                    .insert(tagInserts);

                if (error) {
                    throw error;
                }
            }

            return res.status(200).json({
                success: true,
                message: 'Tags atualizadas com sucesso'
            });

        } catch (error) {
            console.error('Erro no controller updateTags despesa:', error);
            return res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    }

    /**
     * Busca resumo mensal de despesas
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    static async getResumoMensal(req, res) {
        try {
            const { mes, ano } = req.query;

            if (!mes || !ano) {
                return res.status(400).json({
                    success: false,
                    message: 'Mês e ano são obrigatórios'
                });
            }

            const resumo = await Despesa.getResumoMensal(
                req.user.id, 
                parseInt(mes), 
                parseInt(ano)
            );

            if (!resumo) {
                return res.status(500).json({
                    success: false,
                    message: 'Erro ao buscar resumo mensal'
                });
            }

            return res.status(200).json({
                success: true,
                message: 'Resumo mensal obtido com sucesso',
                data: { resumo }
            });

        } catch (error) {
            console.error('Erro no controller getResumoMensal despesa:', error);
            return res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    }
}
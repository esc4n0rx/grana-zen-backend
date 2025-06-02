// receitaController.js
import { Receita } from '../models/Receita.js';
import { FinanceData } from '../models/FinanceData.js';
import { 
    receitaSchema, 
    updateReceitaSchema, 
    financeFiltersSchema 
} from '../utils/financeValidators.js';

export class ReceitaController {
    /**
     * Cria uma nova receita
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    static async create(req, res) {
        try {
            // Valida os dados de entrada
            const validatedData = receitaSchema.parse(req.body);

            // Verifica se a conta existe e pertence ao usuário
            const userAccounts = await FinanceData.getUserAccounts(req.user.id);
            const accountExists = userAccounts.find(acc => acc.id === validatedData.account_id);
            
            if (!accountExists) {
                return res.status(400).json({
                    success: false,
                    message: 'Conta não encontrada ou não pertence ao usuário'
                });
            }

            // Validação específica para salários
            if (validatedData.eh_salario) {
                if (!validatedData.parcela_salario || !validatedData.total_parcelas_salario) {
                    return res.status(400).json({
                        success: false,
                        message: 'Para salários, informe a parcela e total de parcelas'
                    });
                }

                if (validatedData.parcela_salario > validatedData.total_parcelas_salario) {
                    return res.status(400).json({
                        success: false,
                        message: 'Parcela não pode ser maior que o total de parcelas'
                    });
                }
            }

            // Cria a receita
            const { receita, error } = await Receita.create(req.user.id, validatedData);

            if (error) {
                return res.status(400).json({
                    success: false,
                    message: error
                });
            }

            return res.status(201).json({
                success: true,
                message: 'Receita criada com sucesso',
                data: { receita }
            });

        } catch (error) {
            if (error.name === 'ZodError') {
                return res.status(400).json({
                    success: false,
                    message: 'Dados inválidos',
                    errors: error.errors
                });
            }

            console.error('Erro no controller create receita:', error);
            return res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    }

    /**
     * Lista receitas do usuário com filtros
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    static async list(req, res) {
        try {
            // Valida filtros
            const filters = financeFiltersSchema.parse(req.query);

            // Busca receitas
            const receitas = await Receita.findByUserId(req.user.id, filters);

            return res.status(200).json({
                success: true,
                message: 'Receitas listadas com sucesso',
                data: { 
                    receitas,
                    total: receitas.length,
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

            console.error('Erro no controller list receitas:', error);
            return res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    }

    /**
     * Busca uma receita específica
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    static async getById(req, res) {
        try {
            const { id } = req.params;
            const receita = await Receita.findById(id, req.user.id);

            if (!receita) {
                return res.status(404).json({
                    success: false,
                    message: 'Receita não encontrada'
                });
            }

            return res.status(200).json({
                success: true,
                message: 'Receita encontrada com sucesso',
                data: { receita }
            });

        } catch (error) {
            console.error('Erro no controller getById receita:', error);
            return res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    }

    /**
     * Atualiza uma receita
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    static async update(req, res) {
        try {
            const { id } = req.params;

            // Verifica se receita existe
            const receitaExistente = await Receita.findById(id, req.user.id);
            if (!receitaExistente) {
                return res.status(404).json({
                    success: false,
                    message: 'Receita não encontrada'
                });
            }

            // Valida dados de atualização
            const validatedData = updateReceitaSchema.parse(req.body);

            // Se mudou a conta, verifica se a nova conta existe
            if (validatedData.account_id && validatedData.account_id !== receitaExistente.account_id) {
                const userAccounts = await FinanceData.getUserAccounts(req.user.id);
                const accountExists = userAccounts.find(acc => acc.id === validatedData.account_id);
                
                if (!accountExists) {
                    return res.status(400).json({
                        success: false,
                        message: 'Nova conta não encontrada ou não pertence ao usuário'
                    });
                }
            }

            // Atualiza a receita
            const { receita, error } = await Receita.update(id, req.user.id, validatedData);

            if (error) {
                return res.status(400).json({
                    success: false,
                    message: error
                });
            }

            return res.status(200).json({
                success: true,
                message: 'Receita atualizada com sucesso',
                data: { receita }
            });

        } catch (error) {
            if (error.name === 'ZodError') {
                return res.status(400).json({
                    success: false,
                    message: 'Dados inválidos',
                    errors: error.errors
                });
            }

            console.error('Erro no controller update receita:', error);
            return res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    }

    /**
     * Remove uma receita
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    static async delete(req, res) {
        try {
            const { id } = req.params;
            const { success, error } = await Receita.delete(id, req.user.id);

            if (!success) {
                return res.status(400).json({
                    success: false,
                    message: error || 'Não foi possível remover a receita'
                });
            }

            return res.status(200).json({
                success: true,
                message: 'Receita removida com sucesso'
            });

        } catch (error) {
            console.error('Erro no controller delete receita:', error);
            return res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    }

    /**
     * Atualiza tags de uma receita
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    static async updateTags(req, res) {
        try {
            const { id } = req.params;
            const { tags } = req.body;

            // Verifica se receita existe
            const receita = await Receita.findById(id, req.user.id);
            if (!receita) {
                return res.status(404).json({
                    success: false,
                    message: 'Receita não encontrada'
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
                .from('gzen_receita_tags')
                .delete()
                .eq('receita_id', id);

            // Adiciona novas tags se existirem
            if (tags.length > 0) {
                const tagInserts = tags.map(tagId => ({
                    receita_id: id,
                    tag_id: tagId
                }));

                const { error } = await supabase
                    .from('gzen_receita_tags')
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
            console.error('Erro no controller updateTags receita:', error);
            return res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    }

    /**
     * Busca resumo mensal de receitas
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

            const resumo = await Receita.getResumoMensal(
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
            console.error('Erro no controller getResumoMensal receita:', error);
            return res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    }
}
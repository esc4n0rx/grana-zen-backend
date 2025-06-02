import { Account } from '../models/Account.js';
import { 
    contaCorrenteSchema, 
    cartaoCreditoSchema, 
    dinheiroVivoSchema, 
    updateAccountSchema 
} from '../utils/accountValidators.js';

export class AccountController {
    /**
     * Cria uma nova conta
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    static async create(req, res) {
        try {
            const { tipo_conta } = req.body;
            let validatedData;

            // Valida dados baseado no tipo de conta
            switch (tipo_conta) {
                case 'conta_corrente':
                    validatedData = contaCorrenteSchema.parse(req.body);
                    break;
                case 'cartao_credito':
                    validatedData = cartaoCreditoSchema.parse(req.body);
                    break;
                case 'dinheiro_vivo':
                    validatedData = dinheiroVivoSchema.parse(req.body);
                    break;
                default:
                    return res.status(400).json({
                        success: false,
                        message: 'Tipo de conta inválido. Tipos aceitos: conta_corrente, cartao_credito, dinheiro_vivo'
                    });
            }

            // Cria a conta
            const { account, error } = await Account.create(req.user.id, validatedData);

            if (error) {
                return res.status(400).json({
                    success: false,
                    message: error
                });
            }

            return res.status(201).json({
                success: true,
                message: 'Conta criada com sucesso',
                data: { account }
            });

        } catch (error) {
            if (error.name === 'ZodError') {
                return res.status(400).json({
                    success: false,
                    message: 'Dados inválidos',
                    errors: error.errors
                });
            }

            console.error('Erro no controller create:', error);
            return res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    }

    /**
     * Lista todas as contas do usuário
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    static async list(req, res) {
        try {
            const accounts = await Account.findByUserId(req.user.id);

            return res.status(200).json({
                success: true,
                message: 'Contas listadas com sucesso',
                data: { 
                    accounts,
                    total: accounts.length
                }
            });

        } catch (error) {
            console.error('Erro no controller list:', error);
            return res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    }

    /**
     * Busca uma conta específica
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    static async getById(req, res) {
        try {
            const { id } = req.params;
            const account = await Account.findById(id, req.user.id);

            if (!account) {
                return res.status(404).json({
                    success: false,
                    message: 'Conta não encontrada'
                });
            }

            return res.status(200).json({
                success: true,
                message: 'Conta encontrada com sucesso',
                data: { account }
            });

        } catch (error) {
            console.error('Erro no controller getById:', error);
            return res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    }

    /**
     * Atualiza uma conta
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    static async update(req, res) {
        try {
            const { id } = req.params;
            
            // Busca a conta para validar se existe e pegar o tipo
            const existingAccount = await Account.findById(id, req.user.id);
            if (!existingAccount) {
                return res.status(404).json({
                    success: false,
                    message: 'Conta não encontrada'
                });
            }

            // Valida saldo baseado no tipo de conta (se está sendo atualizado)
            if (req.body.saldo_atual !== undefined) {
                if (existingAccount.tipo_conta === 'conta_corrente' || existingAccount.tipo_conta === 'dinheiro_vivo') {
                    if (req.body.saldo_atual < 0) {
                        return res.status(400).json({
                            success: false,
                            message: 'Saldo não pode ser negativo para este tipo de conta'
                        });
                    }
                }
            }

            const validatedData = updateAccountSchema.parse(req.body);
            const { account, error } = await Account.update(id, req.user.id, validatedData);

            if (error) {
                return res.status(400).json({
                    success: false,
                    message: error
                });
            }

            return res.status(200).json({
                success: true,
                message: 'Conta atualizada com sucesso',
                data: { account }
            });

        } catch (error) {
            if (error.name === 'ZodError') {
                return res.status(400).json({
                    success: false,
                    message: 'Dados inválidos',
                    errors: error.errors
                });
            }

            console.error('Erro no controller update:', error);
            return res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    }

    /**
     * Remove uma conta (soft delete)
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    static async delete(req, res) {
        try {
            const { id } = req.params;
            const { success, error } = await Account.delete(id, req.user.id);

            if (!success) {
                return res.status(400).json({
                    success: false,
                    message: error || 'Não foi possível remover a conta'
                });
            }

            return res.status(200).json({
                success: true,
                message: 'Conta removida com sucesso'
            });

        } catch (error) {
            console.error('Erro no controller delete:', error);
            return res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    }

    /**
     * Remove uma conta permanentemente
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    static async permanentDelete(req, res) {
        try {
            const { id } = req.params;
            const { success, error } = await Account.permanentDelete(id, req.user.id);

            if (!success) {
                return res.status(400).json({
                    success: false,
                    message: error || 'Não foi possível remover a conta permanentemente'
                });
            }

            return res.status(200).json({
                success: true,
                message: 'Conta removida permanentemente'
            });

        } catch (error) {
            console.error('Erro no controller permanentDelete:', error);
            return res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    }

    /**
     * Lista contas por tipo
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    static async listByType(req, res) {
        try {
            const { tipo } = req.params;
            
            if (!['conta_corrente', 'cartao_credito', 'dinheiro_vivo'].includes(tipo)) {
                return res.status(400).json({
                    success: false,
                    message: 'Tipo de conta inválido'
                });
            }

            const allAccounts = await Account.findByUserId(req.user.id);
            const accountsByType = allAccounts.filter(account => account.tipo_conta === tipo);

            return res.status(200).json({
                success: true,
                message: `Contas do tipo ${tipo} listadas com sucesso`,
                data: { 
                    accounts: accountsByType,
                    total: accountsByType.length
                }
            });

        } catch (error) {
            console.error('Erro no controller listByType:', error);
            return res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    }
}
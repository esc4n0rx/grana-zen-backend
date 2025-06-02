import { supabase } from '../config/supabaseClient.js';

export class Account {
    /**
     * Cria uma nova conta
     * @param {string} userId - ID do usuário
     * @param {Object} accountData - Dados da conta
     * @returns {Object} Conta criada ou erro
     */
    static async create(userId, accountData) {
        try {
            const { 
                tipo_conta, 
                nome, 
                saldo_atual, 
                ativo,
                // Campos específicos que NÃO vão para tabela principal
                nome_banco, agencia, numero_conta, tipo_conta_corrente,
                bandeira, limite_total, limite_disponivel, vencimento_fatura, melhor_data_compra,
                descricao,
                ...otherData 
            } = accountData;
            
            // Cria registro na tabela principal APENAS com campos que existem nela
            const { data: account, error: accountError } = await supabase
                .from('gzen_accounts')
                .insert([{
                    user_id: userId,
                    nome,
                    tipo_conta,
                    saldo_atual: saldo_atual || 0,
                    ativo: ativo !== undefined ? ativo : true
                }])
                .select('*')
                .single();

            if (accountError) {
                console.error('Erro ao criar conta principal:', accountError);
                throw accountError;
            }

            // Cria registro específico baseado no tipo
            let specificData = null;
            
            if (tipo_conta === 'conta_corrente') {
                const { data, error } = await supabase
                    .from('gzen_conta_corrente')
                    .insert([{
                        account_id: account.id,
                        nome_banco,
                        agencia: agencia || null,
                        numero_conta: numero_conta || null,
                        tipo_conta_corrente: tipo_conta_corrente || 'corrente'
                    }])
                    .select('*')
                    .single();
                
                if (error) {
                    console.error('Erro ao criar detalhes conta corrente:', error);
                    throw error;
                }
                specificData = data;
                
            } else if (tipo_conta === 'cartao_credito') {
                const { data, error } = await supabase
                    .from('gzen_cartao_credito')
                    .insert([{
                        account_id: account.id,
                        nome_banco,
                        bandeira,
                        limite_total,
                        limite_disponivel,
                        vencimento_fatura,
                        melhor_data_compra: melhor_data_compra || null
                    }])
                    .select('*')
                    .single();
                
                if (error) {
                    console.error('Erro ao criar detalhes cartão crédito:', error);
                    throw error;
                }
                specificData = data;
                
            } else if (tipo_conta === 'dinheiro_vivo') {
                const { data, error } = await supabase
                    .from('gzen_dinheiro_vivo')
                    .insert([{
                        account_id: account.id,
                        descricao: descricao || 'Dinheiro em espécie'
                    }])
                    .select('*')
                    .single();
                
                if (error) {
                    console.error('Erro ao criar detalhes dinheiro vivo:', error);
                    throw error;
                }
                specificData = data;
            }

            return { 
                account: { 
                    ...account, 
                    detalhes: specificData 
                }, 
                error: null 
            };
            
        } catch (error) {
            console.error('Erro geral ao criar conta:', error);
            return { account: null, error: error.message };
        }
    }

    /**
     * Busca todas as contas do usuário
     * @param {string} userId - ID do usuário
     * @returns {Array} Lista de contas
     */
    static async findByUserId(userId) {
        try {
            const { data: accounts, error } = await supabase
                .from('gzen_accounts')
                .select('*')
                .eq('user_id', userId)
                .eq('ativo', true)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Erro ao buscar contas:', error);
                throw error;
            }

            // Busca detalhes específicos para cada conta
            const accountsWithDetails = await Promise.all(
                accounts.map(async (account) => {
                    let detalhes = null;
                    
                    try {
                        if (account.tipo_conta === 'conta_corrente') {
                            const { data } = await supabase
                                .from('gzen_conta_corrente')
                                .select('*')
                                .eq('account_id', account.id)
                                .single();
                            detalhes = data;
                            
                        } else if (account.tipo_conta === 'cartao_credito') {
                            const { data } = await supabase
                                .from('gzen_cartao_credito')
                                .select('*')
                                .eq('account_id', account.id)
                                .single();
                            detalhes = data;
                            
                        } else if (account.tipo_conta === 'dinheiro_vivo') {
                            const { data } = await supabase
                                .from('gzen_dinheiro_vivo')
                                .select('*')
                                .eq('account_id', account.id)
                                .single();
                            detalhes = data;
                        }
                    } catch (detailError) {
                        console.error(`Erro ao buscar detalhes para conta ${account.id}:`, detailError);
                    }
                    
                    return { ...account, detalhes };
                })
            );

            return accountsWithDetails;
            
        } catch (error) {
            console.error('Erro ao buscar contas por usuário:', error);
            return [];
        }
    }

    /**
     * Busca conta por ID
     * @param {string} accountId - ID da conta
     * @param {string} userId - ID do usuário (para verificação de propriedade)
     * @returns {Object} Conta encontrada ou null
     */
    static async findById(accountId, userId) {
        try {
            const { data: account, error } = await supabase
                .from('gzen_accounts')
                .select('*')
                .eq('id', accountId)
                .eq('user_id', userId)
                .single();

            if (error) {
                console.error('Erro ao buscar conta por ID:', error);
                return null;
            }

            // Busca detalhes específicos
            let detalhes = null;
            
            try {
                if (account.tipo_conta === 'conta_corrente') {
                    const { data } = await supabase
                        .from('gzen_conta_corrente')
                        .select('*')
                        .eq('account_id', account.id)
                        .single();
                    detalhes = data;
                    
                } else if (account.tipo_conta === 'cartao_credito') {
                    const { data } = await supabase
                        .from('gzen_cartao_credito')
                        .select('*')
                        .eq('account_id', account.id)
                        .single();
                    detalhes = data;
                    
                } else if (account.tipo_conta === 'dinheiro_vivo') {
                    const { data } = await supabase
                        .from('gzen_dinheiro_vivo')
                        .select('*')
                        .eq('account_id', account.id)
                        .single();
                    detalhes = data;
                }
            } catch (detailError) {
                console.error(`Erro ao buscar detalhes para conta ${account.id}:`, detailError);
            }

            return { ...account, detalhes };
            
        } catch (error) {
            console.error('Erro geral ao buscar conta por ID:', error);
            return null;
        }
    }

    /**
     * Atualiza uma conta
     * @param {string} accountId - ID da conta
     * @param {string} userId - ID do usuário
     * @param {Object} updateData - Dados para atualizar
     * @returns {Object} Conta atualizada ou erro
     */
    static async update(accountId, userId, updateData) {
        try {
            // Separa dados da tabela principal dos específicos
            const {
                nome_banco, agencia, numero_conta, tipo_conta_corrente,
                bandeira, limite_total, limite_disponivel, vencimento_fatura, melhor_data_compra,
                descricao,
                ...baseData
            } = updateData;

            // Só atualiza se há dados para a tabela principal
            let account = null;
            if (Object.keys(baseData).length > 0) {
                const { data, error: accountError } = await supabase
                    .from('gzen_accounts')
                    .update(baseData)
                    .eq('id', accountId)
                    .eq('user_id', userId)
                    .select('*')
                    .single();

                if (accountError) {
                    console.error('Erro ao atualizar conta principal:', accountError);
                    throw accountError;
                }
                account = data;
            } else {
                // Se não há dados para tabela principal, busca conta atual
                const { data } = await supabase
                    .from('gzen_accounts')
                    .select('*')
                    .eq('id', accountId)
                    .eq('user_id', userId)
                    .single();
                account = data;
            }

            // Atualiza tabela específica baseado no tipo
            let specificData = null;
            
            if (account.tipo_conta === 'conta_corrente' && (nome_banco || agencia || numero_conta || tipo_conta_corrente)) {
                const updateObj = {};
                if (nome_banco !== undefined) updateObj.nome_banco = nome_banco;
                if (agencia !== undefined) updateObj.agencia = agencia;
                if (numero_conta !== undefined) updateObj.numero_conta = numero_conta;
                if (tipo_conta_corrente !== undefined) updateObj.tipo_conta_corrente = tipo_conta_corrente;
                
                const { data, error } = await supabase
                    .from('gzen_conta_corrente')
                    .update(updateObj)
                    .eq('account_id', accountId)
                    .select('*')
                    .single();
                
                if (error) {
                    console.error('Erro ao atualizar detalhes conta corrente:', error);
                    throw error;
                }
                specificData = data;
                
            } else if (account.tipo_conta === 'cartao_credito' && (nome_banco || bandeira || limite_total || limite_disponivel || vencimento_fatura || melhor_data_compra)) {
                const updateObj = {};
                if (nome_banco !== undefined) updateObj.nome_banco = nome_banco;
                if (bandeira !== undefined) updateObj.bandeira = bandeira;
                if (limite_total !== undefined) updateObj.limite_total = limite_total;
                if (limite_disponivel !== undefined) updateObj.limite_disponivel = limite_disponivel;
                if (vencimento_fatura !== undefined) updateObj.vencimento_fatura = vencimento_fatura;
                if (melhor_data_compra !== undefined) updateObj.melhor_data_compra = melhor_data_compra;
                
                const { data, error } = await supabase
                    .from('gzen_cartao_credito')
                    .update(updateObj)
                    .eq('account_id', accountId)
                    .select('*')
                    .single();
                
                if (error) {
                    console.error('Erro ao atualizar detalhes cartão crédito:', error);
                    throw error;
                }
                specificData = data;
                
            } else if (account.tipo_conta === 'dinheiro_vivo' && descricao !== undefined) {
                const { data, error } = await supabase
                    .from('gzen_dinheiro_vivo')
                    .update({ descricao })
                    .eq('account_id', accountId)
                    .select('*')
                    .single();
                
                if (error) {
                    console.error('Erro ao atualizar detalhes dinheiro vivo:', error);
                    throw error;
                }
                specificData = data;
            }

            // Se não atualizou detalhes específicos, busca os existentes
            if (!specificData) {
                if (account.tipo_conta === 'conta_corrente') {
                    const { data } = await supabase
                        .from('gzen_conta_corrente')
                        .select('*')
                        .eq('account_id', accountId)
                        .single();
                    specificData = data;
                } else if (account.tipo_conta === 'cartao_credito') {
                    const { data } = await supabase
                        .from('gzen_cartao_credito')
                        .select('*')
                        .eq('account_id', accountId)
                        .single();
                    specificData = data;
                } else if (account.tipo_conta === 'dinheiro_vivo') {
                    const { data } = await supabase
                        .from('gzen_dinheiro_vivo')
                        .select('*')
                        .eq('account_id', accountId)
                        .single();
                    specificData = data;
                }
            }

            return { 
                account: { 
                    ...account, 
                    detalhes: specificData 
                }, 
                error: null 
            };
            
        } catch (error) {
            console.error('Erro geral ao atualizar conta:', error);
            return { account: null, error: error.message };
        }
    }

    /**
     * Remove uma conta (soft delete)
     * @param {string} accountId - ID da conta
     * @param {string} userId - ID do usuário
     * @returns {Object} Resultado da operação
     */
    static async delete(accountId, userId) {
        try {
            const { data: account, error } = await supabase
                .from('gzen_accounts')
                .update({ ativo: false })
                .eq('id', accountId)
                .eq('user_id', userId)
                .select('*')
                .single();

            if (error) {
                console.error('Erro ao fazer soft delete:', error);
                throw error;
            }

            return { success: true, error: null };
            
        } catch (error) {
            console.error('Erro geral ao deletar conta:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Remove uma conta permanentemente
     * @param {string} accountId - ID da conta
     * @param {string} userId - ID do usuário
     * @returns {Object} Resultado da operação
     */
    static async permanentDelete(accountId, userId) {
        try {
            const { error } = await supabase
                .from('gzen_accounts')
                .delete()
                .eq('id', accountId)
                .eq('user_id', userId);

            if (error) {
                console.error('Erro ao fazer hard delete:', error);
                throw error;
            }

            return { success: true, error: null };
            
        } catch (error) {
            console.error('Erro geral ao deletar permanentemente:', error);
            return { success: false, error: error.message };
        }
    }
}
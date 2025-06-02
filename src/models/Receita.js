// Receita.js
import { supabase } from '../config/supabaseClient.js';

export class Receita {
    /**
     * Cria uma nova receita
     * @param {string} userId - ID do usuário
     * @param {Object} receitaData - Dados da receita
     * @returns {Object} Receita criada ou erro
     */
    static async create(userId, receitaData) {
        try {
            const { tags, ...dadosReceita } = receitaData;
            
            // Converte data para formato correto (São Paulo timezone)
            const dataReceita = new Date(dadosReceita.data_receita + 'T00:00:00-03:00');
            
            // Cria a receita
            const { data: receita, error: receitaError } = await supabase
                .from('gzen_receitas')
                .insert([{
                    ...dadosReceita,
                    user_id: userId,
                    data_receita: dataReceita.toISOString().split('T')[0]
                }])
                .select('*')
                .single();

            if (receitaError) {
                throw receitaError;
            }

            // Adiciona tags se existirem
            if (tags && tags.length > 0) {
                const tagInserts = tags.map(tagId => ({
                    receita_id: receita.id,
                    tag_id: tagId
                }));

                const { error: tagsError } = await supabase
                    .from('gzen_receita_tags')
                    .insert(tagInserts);

                if (tagsError) {
                    console.error('Erro ao inserir tags:', tagsError);
                }
            }

            // Atualiza saldo da conta se receita confirmada
            if (receita.status === 'confirmada') {
                await this.updateAccountBalance(receita.account_id, receita.valor, 'add');
                await this.updateOrcamento(userId, receita.data_receita, receita.valor, 'receita', 'add');
            }

            return { receita, error: null };
        } catch (error) {
            console.error('Erro ao criar receita:', error);
            return { receita: null, error: error.message };
        }
    }

    /**
     * Busca receitas por usuário com filtros
     * @param {string} userId - ID do usuário
     * @param {Object} filters - Filtros de busca
     * @returns {Array} Lista de receitas
     */
    static async findByUserId(userId, filters = {}) {
        try {
            let query = supabase
                .from('gzen_receitas')
                .select(`
                    *,
                    gzen_accounts!inner(nome, tipo_conta),
                    gzen_categories(nome, cor, icone),
                    gzen_receita_tags!left(
                        gzen_tags(id, nome, cor)
                    )
                `)
                .eq('user_id', userId)
                .eq('ativo', true);

            // Aplica filtros
            if (filters.data_inicio) {
                query = query.gte('data_receita', filters.data_inicio);
            }
            if (filters.data_fim) {
                query = query.lte('data_receita', filters.data_fim);
            }
            if (filters.category_id) {
                query = query.eq('category_id', filters.category_id);
            }
            if (filters.account_id) {
                query = query.eq('account_id', filters.account_id);
            }
            if (filters.status) {
                query = query.eq('status', filters.status);
            }

            // Ordenação e paginação
            const offset = (filters.pagina - 1) * filters.limite;
            query = query
                .order('data_receita', { ascending: false })
                .range(offset, offset + filters.limite - 1);

            const { data: receitas, error } = await query;

            if (error) {
                throw error;
            }

            // Formata os dados para incluir tags de forma mais limpa
            const receitasFormatadas = receitas.map(receita => ({
                ...receita,
                conta: receita.gzen_accounts,
                categoria: receita.gzen_categories,
                tags: receita.gzen_receita_tags?.map(rt => rt.gzen_tags).filter(tag => tag) || [],
                gzen_accounts: undefined,
                gzen_categories: undefined,
                gzen_receita_tags: undefined
            }));

            return receitasFormatadas;
        } catch (error) {
            console.error('Erro ao buscar receitas:', error);
            return [];
        }
    }

    /**
     * Busca receita por ID
     * @param {string} receitaId - ID da receita
     * @param {string} userId - ID do usuário
     * @returns {Object} Receita encontrada ou null
     */
    static async findById(receitaId, userId) {
        try {
            const { data: receita, error } = await supabase
                .from('gzen_receitas')
                .select(`
                    *,
                    gzen_accounts(nome, tipo_conta),
                    gzen_categories(nome, cor, icone),
                    gzen_receita_tags(
                        gzen_tags(id, nome, cor)
                    )
                `)
                .eq('id', receitaId)
                .eq('user_id', userId)
                .single();

            if (error) {
                return null;
            }

            // Formata os dados
            return {
                ...receita,
                conta: receita.gzen_accounts,
                categoria: receita.gzen_categories,
                tags: receita.gzen_receita_tags?.map(rt => rt.gzen_tags) || [],
                gzen_accounts: undefined,
                gzen_categories: undefined,
                gzen_receita_tags: undefined
            };
        } catch (error) {
            console.error('Erro ao buscar receita por ID:', error);
            return null;
        }
    }

    /**
     * Atualiza uma receita
     * @param {string} receitaId - ID da receita
     * @param {string} userId - ID do usuário
     * @param {Object} updateData - Dados para atualizar
     * @returns {Object} Receita atualizada ou erro
     */
    static async update(receitaId, userId, updateData) {
        try {
            // Busca receita atual para comparações
            const receitaAtual = await this.findById(receitaId, userId);
            if (!receitaAtual) {
                throw new Error('Receita não encontrada');
            }

            // Converte data se fornecida
            if (updateData.data_receita) {
                const dataReceita = new Date(updateData.data_receita + 'T00:00:00-03:00');
                updateData.data_receita = dataReceita.toISOString().split('T')[0];
            }

            // Atualiza a receita
            const { data: receita, error } = await supabase
                .from('gzen_receitas')
                .update(updateData)
                .eq('id', receitaId)
                .eq('user_id', userId)
                .select('*')
                .single();

            if (error) {
                throw error;
            }

            // Gerencia mudanças no saldo da conta
            await this.handleBalanceUpdates(receitaAtual, receita, userId);

            return { receita, error: null };
        } catch (error) {
            console.error('Erro ao atualizar receita:', error);
            return { receita: null, error: error.message };
        }
    }

    /**
     * Remove uma receita (soft delete)
     * @param {string} receitaId - ID da receita
     * @param {string} userId - ID do usuário
     * @returns {Object} Resultado da operação
     */
    static async delete(receitaId, userId) {
        try {
            // Busca receita para reverter saldo se necessário
            const receita = await this.findById(receitaId, userId);
            if (!receita) {
                throw new Error('Receita não encontrada');
            }

            // Soft delete
            const { error } = await supabase
                .from('gzen_receitas')
                .update({ ativo: false })
                .eq('id', receitaId)
                .eq('user_id', userId);

            if (error) {
                throw error;
            }

            // Reverte saldo se receita estava confirmada
            if (receita.status === 'confirmada') {
                await this.updateAccountBalance(receita.account_id, receita.valor, 'subtract');
                await this.updateOrcamento(userId, receita.data_receita, receita.valor, 'receita', 'subtract');
            }

            return { success: true, error: null };
        } catch (error) {
            console.error('Erro ao deletar receita:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Atualiza saldo da conta
     * @param {string} accountId - ID da conta
     * @param {number} valor - Valor da transação
     * @param {string} operation - 'add' ou 'subtract'
     */
    static async updateAccountBalance(accountId, valor, operation) {
        try {
            const { data: account } = await supabase
                .from('gzen_accounts')
                .select('saldo_atual')
                .eq('id', accountId)
                .single();

            if (account) {
                const novoSaldo = operation === 'add' 
                    ? parseFloat(account.saldo_atual) + parseFloat(valor)
                    : parseFloat(account.saldo_atual) - parseFloat(valor);

                await supabase
                    .from('gzen_accounts')
                    .update({ saldo_atual: novoSaldo })
                    .eq('id', accountId);
            }
        } catch (error) {
            console.error('Erro ao atualizar saldo da conta:', error);
        }
    }

    /**
     * Atualiza orçamento do usuário
     * @param {string} userId - ID do usuário
     * @param {string} data - Data da transação
     * @param {number} valor - Valor da transação
     * @param {string} tipo - 'receita' ou 'despesa'
     * @param {string} operation - 'add' ou 'subtract'
     */
    static async updateOrcamento(userId, data, valor, tipo, operation) {
        try {
            const dataObj = new Date(data);
            const mes = dataObj.getMonth() + 1;
            const ano = dataObj.getFullYear();

            // Busca orçamento existente ou cria novo
            let { data: orcamento } = await supabase
                .from('gzen_orcamento')
                .select('*')
                .eq('user_id', userId)
                .eq('mes', mes)
                .eq('ano', ano)
                .single();

            if (!orcamento) {
                // Cria novo orçamento
                const { data: novoOrcamento } = await supabase
                    .from('gzen_orcamento')
                    .insert([{
                        user_id: userId,
                        mes,
                        ano,
                        receita_total: tipo === 'receita' ? valor : 0,
                        despesa_total: tipo === 'despesa' ? valor : 0,
                        saldo_atual: tipo === 'receita' ? valor : -valor
                    }])
                    .select('*')
                    .single();
                return;
            }

            // Atualiza orçamento existente
            const multiplicador = operation === 'add' ? 1 : -1;
            const valorAtualizado = parseFloat(valor) * multiplicador;

            const updates = {};
            if (tipo === 'receita') {
                updates.receita_total = parseFloat(orcamento.receita_total) + valorAtualizado;
            } else {
                updates.despesa_total = parseFloat(orcamento.despesa_total) + valorAtualizado;
            }

            // Recalcula saldo atual
            const novaReceita = updates.receita_total || orcamento.receita_total;
            const novaDespesa = updates.despesa_total || orcamento.despesa_total;
            updates.saldo_atual = parseFloat(novaReceita) - parseFloat(novaDespesa);

            await supabase
                .from('gzen_orcamento')
                .update(updates)
                .eq('id', orcamento.id);
        } catch (error) {
            console.error('Erro ao atualizar orçamento:', error);
        }
    }

    /**
     * Gerencia atualizações de saldo quando receita é modificada
     */
    static async handleBalanceUpdates(receitaAntiga, receitaNova, userId) {
        try {
            // Se mudou status de confirmada para não confirmada
            if (receitaAntiga.status === 'confirmada' && receitaNova.status !== 'confirmada') {
                await this.updateAccountBalance(receitaAntiga.account_id, receitaAntiga.valor, 'subtract');
                await this.updateOrcamento(userId, receitaAntiga.data_receita, receitaAntiga.valor, 'receita', 'subtract');
            }
            
            // Se mudou status de não confirmada para confirmada
            if (receitaAntiga.status !== 'confirmada' && receitaNova.status === 'confirmada') {
                await this.updateAccountBalance(receitaNova.account_id, receitaNova.valor, 'add');
                await this.updateOrcamento(userId, receitaNova.data_receita, receitaNova.valor, 'receita', 'add');
            }
            
            // Se já era confirmada e mudou valores
            if (receitaAntiga.status === 'confirmada' && receitaNova.status === 'confirmada') {
                // Reverte valores antigos
                await this.updateAccountBalance(receitaAntiga.account_id, receitaAntiga.valor, 'subtract');
                await this.updateOrcamento(userId, receitaAntiga.data_receita, receitaAntiga.valor, 'receita', 'subtract');
                
                // Aplica novos valores
                await this.updateAccountBalance(receitaNova.account_id, receitaNova.valor, 'add');
                await this.updateOrcamento(userId, receitaNova.data_receita, receitaNova.valor, 'receita', 'add');
            }
        } catch (error) {
            console.error('Erro ao gerenciar atualizações de saldo:', error);
        }
    }

    /**
     * Busca resumo de receitas por período
     * @param {string} userId - ID do usuário
     * @param {number} mes - Mês
     * @param {number} ano - Ano
     * @returns {Object} Resumo das receitas
     */
    static async getResumoMensal(userId, mes, ano) {
        try {
            const dataInicio = `${ano}-${mes.toString().padStart(2, '0')}-01`;
            const ultimoDia = new Date(ano, mes, 0).getDate();
            const dataFim = `${ano}-${mes.toString().padStart(2, '0')}-${ultimoDia}`;

            const { data: receitas, error } = await supabase
                .from('gzen_receitas')
                .select('valor, status, eh_salario')
                .eq('user_id', userId)
                .eq('ativo', true)
                .gte('data_receita', dataInicio)
                .lte('data_receita', dataFim);

            if (error) {
                throw error;
            }

            const resumo = {
                total_confirmadas: 0,
                total_pendentes: 0,
                total_salarios: 0,
                total_outras: 0,
                quantidade_receitas: receitas.length
            };

            receitas.forEach(receita => {
                const valor = parseFloat(receita.valor);
                
                if (receita.status === 'confirmada') {
                    resumo.total_confirmadas += valor;
                } else if (receita.status === 'pendente') {
                    resumo.total_pendentes += valor;
                }

                if (receita.eh_salario) {
                    resumo.total_salarios += valor;
                } else {
                    resumo.total_outras += valor;
                }
            });

            return resumo;
        } catch (error) {
            console.error('Erro ao buscar resumo mensal de receitas:', error);
            return null;
        }
    }
}
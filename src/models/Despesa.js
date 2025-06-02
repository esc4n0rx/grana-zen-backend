// Despesa.js
import { supabase } from '../config/supabaseClient.js';

export class Despesa {
    /**
     * Cria uma nova despesa
     * @param {string} userId - ID do usuário
     * @param {Object} despesaData - Dados da despesa
     * @returns {Object} Despesa criada ou erro
     */
    static async create(userId, despesaData) {
        try {
            const { tags, ...dadosDespesa } = despesaData;
            
            // Converte data para formato correto (São Paulo timezone)
            const dataDespesa = new Date(dadosDespesa.data_despesa + 'T00:00:00-03:00');
            
            // Cria a despesa
            const { data: despesa, error: despesaError } = await supabase
                .from('gzen_despesas')
                .insert([{
                    ...dadosDespesa,
                    user_id: userId,
                    data_despesa: dataDespesa.toISOString().split('T')[0]
                }])
                .select('*')
                .single();

            if (despesaError) {
                throw despesaError;
            }

            // Adiciona tags se existirem
            if (tags && tags.length > 0) {
                const tagInserts = tags.map(tagId => ({
                    despesa_id: despesa.id,
                    tag_id: tagId
                }));

                const { error: tagsError } = await supabase
                    .from('gzen_despesa_tags')
                    .insert(tagInserts);

                if (tagsError) {
                    console.error('Erro ao inserir tags:', tagsError);
                }
            }

            // Processa a despesa se confirmada
            if (despesa.status === 'confirmada') {
                await this.processarDespesa(despesa, userId);
            }

            return { despesa, error: null };
        } catch (error) {
            console.error('Erro ao criar despesa:', error);
            return { despesa: null, error: error.message };
        }
    }

    /**
    * Processa despesa (atualiza saldos e limites)
    * @param {Object} despesa - Dados da despesa
    * @param {string} userId - ID do usuário
    */
   static async processarDespesa(despesa, userId) {
       try {
           // Se é pagamento de fatura de cartão
           if (despesa.eh_pagamento_fatura && despesa.cartao_origem_id) {
               await this.processarPagamentoFatura(despesa);
           } else {
               // Despesa normal - debita da conta
               await this.updateAccountBalance(despesa.account_id, despesa.valor, 'subtract');
           }

           // Atualiza orçamento
           await this.updateOrcamento(userId, despesa.data_despesa, despesa.valor, 'despesa', 'add');
       } catch (error) {
           console.error('Erro ao processar despesa:', error);
       }
   }

   /**
    * Processa pagamento de fatura de cartão
    * @param {Object} despesa - Dados da despesa
    */
   static async processarPagamentoFatura(despesa) {
       try {
           // Debita valor da conta de pagamento
           await this.updateAccountBalance(despesa.account_id, despesa.valor, 'subtract');

           // Busca dados do cartão e atualiza limite disponível
           const { data: cartao } = await supabase
               .from('gzen_cartao_credito')
               .select('limite_disponivel, limite_total')
               .eq('account_id', despesa.cartao_origem_id)
               .single();

           if (cartao) {
               const novoLimiteDisponivel = parseFloat(cartao.limite_disponivel) + parseFloat(despesa.valor);
               
               // Garante que não ultrapasse o limite total
               const limiteAtualizado = Math.min(novoLimiteDisponivel, parseFloat(cartao.limite_total));

               await supabase
                   .from('gzen_cartao_credito')
                   .update({ limite_disponivel: limiteAtualizado })
                   .eq('account_id', despesa.cartao_origem_id);
           }
       } catch (error) {
           console.error('Erro ao processar pagamento de fatura:', error);
       }
   }

   /**
    * Busca despesas por usuário com filtros
    * @param {string} userId - ID do usuário
    * @param {Object} filters - Filtros de busca
    * @returns {Array} Lista de despesas
    */
   static async findByUserId(userId, filters = {}) {
       try {
           let query = supabase
               .from('gzen_despesas')
               .select(`
                   *,
                   gzen_accounts!inner(nome, tipo_conta),
                   gzen_categories(nome, cor, icone),
                   cartao_origem:gzen_accounts!cartao_origem_id(nome),
                   gzen_despesa_tags!left(
                       gzen_tags(id, nome, cor)
                   )
               `)
               .eq('user_id', userId)
               .eq('ativo', true);

           // Aplica filtros
           if (filters.data_inicio) {
               query = query.gte('data_despesa', filters.data_inicio);
           }
           if (filters.data_fim) {
               query = query.lte('data_despesa', filters.data_fim);
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
               .order('data_despesa', { ascending: false })
               .range(offset, offset + filters.limite - 1);

           const { data: despesas, error } = await query;

           if (error) {
               throw error;
           }

           // Formata os dados para incluir tags de forma mais limpa
           const despesasFormatadas = despesas.map(despesa => ({
               ...despesa,
               conta: despesa.gzen_accounts,
               categoria: despesa.gzen_categories,
               cartao_origem: despesa.cartao_origem,
               tags: despesa.gzen_despesa_tags?.map(dt => dt.gzen_tags).filter(tag => tag) || [],
               gzen_accounts: undefined,
               gzen_categories: undefined,
               gzen_despesa_tags: undefined
           }));

           return despesasFormatadas;
       } catch (error) {
           console.error('Erro ao buscar despesas:', error);
           return [];
       }
   }

   /**
    * Busca despesa por ID
    * @param {string} despesaId - ID da despesa
    * @param {string} userId - ID do usuário
    * @returns {Object} Despesa encontrada ou null
    */
   static async findById(despesaId, userId) {
       try {
           const { data: despesa, error } = await supabase
               .from('gzen_despesas')
               .select(`
                   *,
                   gzen_accounts(nome, tipo_conta),
                   gzen_categories(nome, cor, icone),
                   cartao_origem:gzen_accounts!cartao_origem_id(nome),
                   gzen_despesa_tags(
                       gzen_tags(id, nome, cor)
                   )
               `)
               .eq('id', despesaId)
               .eq('user_id', userId)
               .single();

           if (error) {
               return null;
           }

           // Formata os dados
           return {
               ...despesa,
               conta: despesa.gzen_accounts,
               categoria: despesa.gzen_categories,
               cartao_origem: despesa.cartao_origem,
               tags: despesa.gzen_despesa_tags?.map(dt => dt.gzen_tags) || [],
               gzen_accounts: undefined,
               gzen_categories: undefined,
               gzen_despesa_tags: undefined
           };
       } catch (error) {
           console.error('Erro ao buscar despesa por ID:', error);
           return null;
       }
   }

   /**
    * Atualiza uma despesa
    * @param {string} despesaId - ID da despesa
    * @param {string} userId - ID do usuário
    * @param {Object} updateData - Dados para atualizar
    * @returns {Object} Despesa atualizada ou erro
    */
   static async update(despesaId, userId, updateData) {
       try {
           // Busca despesa atual para comparações
           const despesaAtual = await this.findById(despesaId, userId);
           if (!despesaAtual) {
               throw new Error('Despesa não encontrada');
           }

           // Converte data se fornecida
           if (updateData.data_despesa) {
               const dataDespesa = new Date(updateData.data_despesa + 'T00:00:00-03:00');
               updateData.data_despesa = dataDespesa.toISOString().split('T')[0];
           }

           // Atualiza a despesa
           const { data: despesa, error } = await supabase
               .from('gzen_despesas')
               .update(updateData)
               .eq('id', despesaId)
               .eq('user_id', userId)
               .select('*')
               .single();

           if (error) {
               throw error;
           }

           // Gerencia mudanças no saldo das contas
           await this.handleBalanceUpdates(despesaAtual, despesa, userId);

           return { despesa, error: null };
       } catch (error) {
           console.error('Erro ao atualizar despesa:', error);
           return { despesa: null, error: error.message };
       }
   }

   /**
    * Remove uma despesa (soft delete)
    * @param {string} despesaId - ID da despesa
    * @param {string} userId - ID do usuário
    * @returns {Object} Resultado da operação
    */
   static async delete(despesaId, userId) {
       try {
           // Busca despesa para reverter saldo se necessário
           const despesa = await this.findById(despesaId, userId);
           if (!despesa) {
               throw new Error('Despesa não encontrada');
           }

           // Soft delete
           const { error } = await supabase
               .from('gzen_despesas')
               .update({ ativo: false })
               .eq('id', despesaId)
               .eq('user_id', userId);

           if (error) {
               throw error;
           }

           // Reverte saldo se despesa estava confirmada
           if (despesa.status === 'confirmada') {
               await this.reverterDespesa(despesa, userId);
           }

           return { success: true, error: null };
       } catch (error) {
           console.error('Erro ao deletar despesa:', error);
           return { success: false, error: error.message };
       }
   }

   /**
    * Reverte uma despesa (restaura saldos)
    * @param {Object} despesa - Dados da despesa
    * @param {string} userId - ID do usuário
    */
   static async reverterDespesa(despesa, userId) {
       try {
           // Se era pagamento de fatura
           if (despesa.eh_pagamento_fatura && despesa.cartao_origem_id) {
               // Restaura valor na conta de pagamento
               await this.updateAccountBalance(despesa.account_id, despesa.valor, 'add');

               // Reduz limite disponível do cartão
               const { data: cartao } = await supabase
                   .from('gzen_cartao_credito')
                   .select('limite_disponivel')
                   .eq('account_id', despesa.cartao_origem_id)
                   .single();

               if (cartao) {
                   const novoLimiteDisponivel = parseFloat(cartao.limite_disponivel) - parseFloat(despesa.valor);
                   const limiteAtualizado = Math.max(novoLimiteDisponivel, 0);

                   await supabase
                       .from('gzen_cartao_credito')
                       .update({ limite_disponivel: limiteAtualizado })
                       .eq('account_id', despesa.cartao_origem_id);
               }
           } else {
               // Despesa normal - restaura valor na conta
               await this.updateAccountBalance(despesa.account_id, despesa.valor, 'add');
           }

           // Atualiza orçamento
           await this.updateOrcamento(userId, despesa.data_despesa, despesa.valor, 'despesa', 'subtract');
       } catch (error) {
           console.error('Erro ao reverter despesa:', error);
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
               .select('saldo_atual, tipo_conta')
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
    * Gerencia atualizações de saldo quando despesa é modificada
    */
   static async handleBalanceUpdates(despesaAntiga, despesaNova, userId) {
       try {
           // Se mudou status de confirmada para não confirmada
           if (despesaAntiga.status === 'confirmada' && despesaNova.status !== 'confirmada') {
               await this.reverterDespesa(despesaAntiga, userId);
           }
           
           // Se mudou status de não confirmada para confirmada
           if (despesaAntiga.status !== 'confirmada' && despesaNova.status === 'confirmada') {
               await this.processarDespesa(despesaNova, userId);
           }
           
           // Se já era confirmada e mudou valores
           if (despesaAntiga.status === 'confirmada' && despesaNova.status === 'confirmada') {
               // Reverte valores antigos
               await this.reverterDespesa(despesaAntiga, userId);
               
               // Aplica novos valores
               await this.processarDespesa(despesaNova, userId);
           }
       } catch (error) {
           console.error('Erro ao gerenciar atualizações de saldo:', error);
       }
   }

   /**
    * Busca resumo de despesas por período
    * @param {string} userId - ID do usuário
    * @param {number} mes - Mês
    * @param {number} ano - Ano
    * @returns {Object} Resumo das despesas
    */
   static async getResumoMensal(userId, mes, ano) {
       try {
           const dataInicio = `${ano}-${mes.toString().padStart(2, '0')}-01`;
           const ultimoDia = new Date(ano, mes, 0).getDate();
           const dataFim = `${ano}-${mes.toString().padStart(2, '0')}-${ultimoDia}`;

           const { data: despesas, error } = await supabase
               .from('gzen_despesas')
               .select('valor, status, eh_pagamento_fatura, gzen_categories(nome)')
               .eq('user_id', userId)
               .eq('ativo', true)
               .gte('data_despesa', dataInicio)
               .lte('data_despesa', dataFim);

           if (error) {
               throw error;
           }

           const resumo = {
               total_confirmadas: 0,
               total_pendentes: 0,
               total_pagamento_faturas: 0,
               total_outras: 0,
               quantidade_despesas: despesas.length,
               por_categoria: {}
           };

           despesas.forEach(despesa => {
               const valor = parseFloat(despesa.valor);
               
               if (despesa.status === 'confirmada') {
                   resumo.total_confirmadas += valor;
               } else if (despesa.status === 'pendente') {
                   resumo.total_pendentes += valor;
               }

               if (despesa.eh_pagamento_fatura) {
                   resumo.total_pagamento_faturas += valor;
               } else {
                   resumo.total_outras += valor;
               }

               // Agrupa por categoria
               const categoria = despesa.gzen_categories?.nome || 'Sem categoria';
               if (!resumo.por_categoria[categoria]) {
                   resumo.por_categoria[categoria] = 0;
               }
               resumo.por_categoria[categoria] += valor;
           });

           return resumo;
       } catch (error) {
           console.error('Erro ao buscar resumo mensal de despesas:', error);
           return null;
       }
   }
}
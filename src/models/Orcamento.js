// Orcamento.js
import { supabase } from '../config/supabaseClient.js';

export class Orcamento {
    /**
     * Busca ou cria orçamento para um mês/ano específico
     * @param {string} userId - ID do usuário
     * @param {number} mes - Mês (1-12)
     * @param {number} ano - Ano
     * @returns {Object} Orçamento encontrado ou criado
     */
    static async findOrCreateByPeriod(userId, mes, ano) {
        try {
            // Tenta buscar orçamento existente
            let { data: orcamento, error } = await supabase
                .from('gzen_orcamento')
                .select('*')
                .eq('user_id', userId)
                .eq('mes', mes)
                .eq('ano', ano)
                .single();

            // Se não existe, cria um novo
            if (error && error.code === 'PGRST116') {
                const { data: novoOrcamento, error: createError } = await supabase
                    .from('gzen_orcamento')
                    .insert([{
                        user_id: userId,
                        mes,
                        ano,
                        receita_total: 0,
                        despesa_total: 0,
                        saldo_atual: 0,
                        meta_economia: 0
                    }])
                    .select('*')
                    .single();

                if (createError) {
                    throw createError;
                }

                orcamento = novoOrcamento;
            } else if (error) {
                throw error;
            }

            return orcamento;
        } catch (error) {
            console.error('Erro ao buscar/criar orçamento:', error);
            return null;
        }
    }

    /**
     * Atualiza orçamento
     * @param {string} userId - ID do usuário
     * @param {number} mes - Mês
     * @param {number} ano - Ano
     * @param {Object} updateData - Dados para atualizar
     * @returns {Object} Orçamento atualizado ou erro
     */
    static async update(userId, mes, ano, updateData) {
        try {
            const { data: orcamento, error } = await supabase
                .from('gzen_orcamento')
                .update(updateData)
                .eq('user_id', userId)
                .eq('mes', mes)
                .eq('ano', ano)
                .select('*')
                .single();

            if (error) {
                throw error;
            }

            return { orcamento, error: null };
        } catch (error) {
            console.error('Erro ao atualizar orçamento:', error);
            return { orcamento: null, error: error.message };
        }
    }

    /**
     * Recalcula totais do orçamento baseado nas transações reais
     * @param {string} userId - ID do usuário
     * @param {number} mes - Mês
     * @param {number} ano - Ano
     * @returns {Object} Orçamento recalculado
     */
    static async recalcular(userId, mes, ano) {
        try {
            const dataInicio = `${ano}-${mes.toString().padStart(2, '0')}-01`;
            const ultimoDia = new Date(ano, mes, 0).getDate();
            const dataFim = `${ano}-${mes.toString().padStart(2, '0')}-${ultimoDia}`;

            // Busca total de receitas confirmadas do período
            const { data: receitas } = await supabase
                .from('gzen_receitas')
                .select('valor')
                .eq('user_id', userId)
                .eq('status', 'confirmada')
                .eq('ativo', true)
                .gte('data_receita', dataInicio)
                .lte('data_receita', dataFim);

            // Busca total de despesas confirmadas do período
            const { data: despesas } = await supabase
                .from('gzen_despesas')
                .select('valor')
                .eq('user_id', userId)
                .eq('status', 'confirmada')
                .eq('ativo', true)
                .gte('data_despesa', dataInicio)
                .lte('data_despesa', dataFim);

            // Calcula totais
            const receitaTotal = receitas?.reduce((sum, r) => sum + parseFloat(r.valor), 0) || 0;
            const despesaTotal = despesas?.reduce((sum, d) => sum + parseFloat(d.valor), 0) || 0;
            const saldoAtual = receitaTotal - despesaTotal;

            // Atualiza ou cria orçamento
            const { data: orcamento, error } = await supabase
                .from('gzen_orcamento')
                .upsert([{
                    user_id: userId,
                    mes,
                    ano,
                    receita_total: receitaTotal,
                    despesa_total: despesaTotal,
                    saldo_atual: saldoAtual
                }], {
                    onConflict: 'user_id,mes,ano'
                })
                .select('*')
                .single();

            if (error) {
                throw error;
            }

            return { orcamento, error: null };
        } catch (error) {
            console.error('Erro ao recalcular orçamento:', error);
            return { orcamento: null, error: error.message };
        }
    }

    /**
     * Busca histórico de orçamentos do usuário
     * @param {string} userId - ID do usuário
     * @param {number} limite - Quantidade de registros
     * @returns {Array} Lista de orçamentos
     */
    static async getHistorico(userId, limite = 12) {
        try {
            const { data: orcamentos, error } = await supabase
                .from('gzen_orcamento')
                .select('*')
                .eq('user_id', userId)
                .order('ano', { ascending: false })
                .order('mes', { ascending: false })
                .limit(limite);

            if (error) {
                throw error;
            }

            return orcamentos || [];
        } catch (error) {
            console.error('Erro ao buscar histórico de orçamentos:', error);
            return [];
        }
    }

    /**
     * Busca resumo anual do usuário
     * @param {string} userId - ID do usuário
     * @param {number} ano - Ano
     * @returns {Object} Resumo anual
     */
    static async getResumoAnual(userId, ano) {
        try {
            const { data: orcamentos, error } = await supabase
                .from('gzen_orcamento')
                .select('*')
                .eq('user_id', userId)
                .eq('ano', ano)
                .order('mes');

            if (error) {
                throw error;
            }

            const resumo = {
                ano,
                receita_total_ano: 0,
                despesa_total_ano: 0,
                saldo_total_ano: 0,
                meta_economia_ano: 0,
                melhor_mes: null,
                pior_mes: null,
                meses: orcamentos || []
            };

            if (orcamentos && orcamentos.length > 0) {
                // Calcula totais anuais
                orcamentos.forEach(orc => {
                    resumo.receita_total_ano += parseFloat(orc.receita_total);
                    resumo.despesa_total_ano += parseFloat(orc.despesa_total);
                    resumo.meta_economia_ano += parseFloat(orc.meta_economia);
                });

                resumo.saldo_total_ano = resumo.receita_total_ano - resumo.despesa_total_ano;

                // Encontra melhor e pior mês
                const orcamentosComSaldo = orcamentos.map(orc => ({
                    ...orc,
                    saldo_calculado: parseFloat(orc.receita_total) - parseFloat(orc.despesa_total)
                }));

                resumo.melhor_mes = orcamentosComSaldo.reduce((prev, current) => 
                    (prev.saldo_calculado > current.saldo_calculado) ? prev : current
                );

                resumo.pior_mes = orcamentosComSaldo.reduce((prev, current) => 
                    (prev.saldo_calculado < current.saldo_calculado) ? prev : current
                );
            }

            return resumo;
        } catch (error) {
            console.error('Erro ao buscar resumo anual:', error);
            return null;
        }
    }

    /**
     * Busca estatísticas gerais do usuário
     * @param {string} userId - ID do usuário
     * @returns {Object} Estatísticas gerais
     */
    static async getEstatisticasGerais(userId) {
        try {
            // Busca dados dos últimos 12 meses
            const dataLimite = new Date();
            dataLimite.setMonth(dataLimite.getMonth() - 12);
            const anoLimite = dataLimite.getFullYear();
            const mesLimite = dataLimite.getMonth() + 1;

            const { data: orcamentos, error } = await supabase
                .from('gzen_orcamento')
                .select('*')
                .eq('user_id', userId)
                .or(`ano.gt.${anoLimite},and(ano.eq.${anoLimite},mes.gte.${mesLimite})`)
                .order('ano')
                .order('mes');

            if (error) {
                throw error;
            }

            const stats = {
                periodo_analisado: '12 meses',
                media_receitas: 0,
                media_despesas: 0,
                media_saldo: 0,
                maior_receita_mes: 0,
                maior_despesa_mes: 0,
                melhor_saldo_mes: 0,
                pior_saldo_mes: 0,
                meses_positivos: 0,
                meses_negativos: 0,
                total_meses: orcamentos?.length || 0
            };

            if (orcamentos && orcamentos.length > 0) {
                const receitas = orcamentos.map(o => parseFloat(o.receita_total));
                const despesas = orcamentos.map(o => parseFloat(o.despesa_total));
                const saldos = orcamentos.map(o => parseFloat(o.saldo_atual));

                stats.media_receitas = receitas.reduce((a, b) => a + b, 0) / receitas.length;
                stats.media_despesas = despesas.reduce((a, b) => a + b, 0) / despesas.length;
                stats.media_saldo = saldos.reduce((a, b) => a + b, 0) / saldos.length;

                stats.maior_receita_mes = Math.max(...receitas);
                stats.maior_despesa_mes = Math.max(...despesas);
                stats.melhor_saldo_mes = Math.max(...saldos);
                stats.pior_saldo_mes = Math.min(...saldos);

                stats.meses_positivos = saldos.filter(s => s > 0).length;
                stats.meses_negativos = saldos.filter(s => s < 0).length;
            }

            return stats;
        } catch (error) {
            console.error('Erro ao buscar estatísticas gerais:', error);
            return null;
        }
    }
}
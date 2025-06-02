// FinanceData.js
import { supabase } from '../config/supabaseClient.js';

export class FinanceData {
    /**
     * Busca todas as categorias ativas
     * @param {string} tipo - 'receita', 'despesa' ou null para todas
     * @returns {Array} Lista de categorias
     */
    static async getCategories(tipo = null) {
        try {
            let query = supabase
                .from('gzen_categories')
                .select('*')
                .eq('ativo', true)
                .order('nome');

            if (tipo) {
                query = query.eq('tipo', tipo);
            }

            const { data: categories, error } = await query;

            if (error) {
                throw error;
            }

            return categories || [];
        } catch (error) {
            console.error('Erro ao buscar categorias:', error);
            return [];
       }
   }

   /**
    * Busca todas as tags ativas
    * @returns {Array} Lista de tags
    */
   static async getTags() {
       try {
           const { data: tags, error } = await supabase
               .from('gzen_tags')
               .select('*')
               .eq('ativo', true)
               .order('nome');

           if (error) {
               throw error;
           }

           return tags || [];
       } catch (error) {
           console.error('Erro ao buscar tags:', error);
           return [];
       }
   }

   /**
    * Cria uma nova categoria personalizada
    * @param {Object} categoryData - Dados da categoria
    * @returns {Object} Categoria criada ou erro
    */
   static async createCategory(categoryData) {
       try {
           const { data: category, error } = await supabase
               .from('gzen_categories')
               .insert([categoryData])
               .select('*')
               .single();

           if (error) {
               throw error;
           }

           return { category, error: null };
       } catch (error) {
           console.error('Erro ao criar categoria:', error);
           return { category: null, error: error.message };
       }
   }

   /**
    * Cria uma nova tag personalizada
    * @param {Object} tagData - Dados da tag
    * @returns {Object} Tag criada ou erro
    */
   static async createTag(tagData) {
       try {
           const { data: tag, error } = await supabase
               .from('gzen_tags')
               .insert([tagData])
               .select('*')
               .single();

           if (error) {
               throw error;
           }

           return { tag, error: null };
       } catch (error) {
           console.error('Erro ao criar tag:', error);
           return { tag: null, error: error.message };
       }
   }

   /**
    * Busca contas do usuário para seleção
    * @param {string} userId - ID do usuário
    * @param {string} tipo - Filtro por tipo de conta
    * @returns {Array} Lista de contas
    */
   static async getUserAccounts(userId, tipo = null) {
       try {
           let query = supabase
               .from('gzen_accounts')
               .select('id, nome, tipo_conta, saldo_atual')
               .eq('user_id', userId)
               .eq('ativo', true)
               .order('nome');

           if (tipo) {
               query = query.eq('tipo_conta', tipo);
           }

           const { data: accounts, error } = await query;

           if (error) {
               throw error;
           }

           return accounts || [];
       } catch (error) {
           console.error('Erro ao buscar contas do usuário:', error);
           return [];
       }
   }

   /**
    * Busca estatísticas de categorias para o usuário
    * @param {string} userId - ID do usuário
    * @param {string} tipo - 'receita' ou 'despesa'
    * @param {number} mes - Mês (opcional)
    * @param {number} ano - Ano (opcional)
    * @returns {Array} Estatísticas por categoria
    */
   static async getCategoryStats(userId, tipo, mes = null, ano = null) {
       try {
           const tabela = tipo === 'receita' ? 'gzen_receitas' : 'gzen_despesas';
           const campoData = tipo === 'receita' ? 'data_receita' : 'data_despesa';

           let query = supabase
               .from(tabela)
               .select(`
                   valor,
                   gzen_categories(id, nome, cor, icone)
               `)
               .eq('user_id', userId)
               .eq('status', 'confirmada')
               .eq('ativo', true);

           // Filtros de período
           if (ano && mes) {
               const dataInicio = `${ano}-${mes.toString().padStart(2, '0')}-01`;
               const ultimoDia = new Date(ano, mes, 0).getDate();
               const dataFim = `${ano}-${mes.toString().padStart(2, '0')}-${ultimoDia}`;
               
               query = query
                   .gte(campoData, dataInicio)
                   .lte(campoData, dataFim);
           } else if (ano) {
               query = query
                   .gte(campoData, `${ano}-01-01`)
                   .lte(campoData, `${ano}-12-31`);
           }

           const { data: transacoes, error } = await query;

           if (error) {
               throw error;
           }

           // Agrupa por categoria
           const stats = {};
           let totalGeral = 0;

           transacoes?.forEach(transacao => {
               const categoria = transacao.gzen_categories || { nome: 'Sem categoria', cor: '#6B7280' };
               const valor = parseFloat(transacao.valor);
               
               totalGeral += valor;

               if (!stats[categoria.nome]) {
                   stats[categoria.nome] = {
                       categoria,
                       total: 0,
                       quantidade: 0,
                       percentual: 0
                   };
               }

               stats[categoria.nome].total += valor;
               stats[categoria.nome].quantidade += 1;
           });

           // Calcula percentuais
           Object.values(stats).forEach(stat => {
               stat.percentual = totalGeral > 0 ? (stat.total / totalGeral) * 100 : 0;
           });

           // Converte para array e ordena por valor
           return Object.values(stats).sort((a, b) => b.total - a.total);
       } catch (error) {
           console.error('Erro ao buscar estatísticas de categorias:', error);
           return [];
       }
   }
}
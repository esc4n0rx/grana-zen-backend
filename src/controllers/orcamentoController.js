// orcamentoController.js
import { Orcamento } from '../models/Orcamento.js';
import { FinanceData } from '../models/FinanceData.js';
import { orcamentoSchema } from '../utils/financeValidators.js';

export class OrcamentoController {
    /**
     * Busca orçamento por período
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    static async getByPeriod(req, res) {
        try {
            const { mes, ano } = req.query;

            if (!mes || !ano) {
                return res.status(400).json({
                    success: false,
                    message: 'Mês e ano são obrigatórios'
                });
            }

            const orcamento = await Orcamento.findOrCreateByPeriod(
                req.user.id,
                parseInt(mes),
                parseInt(ano)
            );

            if (!orcamento) {
                return res.status(500).json({
                    success: false,
                    message: 'Erro ao buscar orçamento'
                });
            }

            return res.status(200).json({
                success: true,
                message: 'Orçamento encontrado com sucesso',
                data: { orcamento }
            });

        } catch (error) {
            console.error('Erro no controller getByPeriod orçamento:', error);
            return res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    }

    /**
     * Atualiza orçamento
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    static async update(req, res) {
        try {
            // Valida dados
            const validatedData = orcamentoSchema.parse(req.body);

            const { orcamento, error } = await Orcamento.update(
                req.user.id,
                validatedData.mes,
                validatedData.ano,
                validatedData
            );

            if (error) {
                return res.status(400).json({
                    success: false,
                    message: error
                });
            }

            return res.status(200).json({
                success: true,
                message: 'Orçamento atualizado com sucesso',
                data: { orcamento }
            });

        } catch (error) {
            if (error.name === 'ZodError') {
                return res.status(400).json
                ({
                   success: false,
                   message: 'Dados inválidos',
                   errors: error.errors
               });
           }

           console.error('Erro no controller update orçamento:', error);
           return res.status(500).json({
               success: false,
               message: 'Erro interno do servidor'
           });
       }
   }

   /**
    * Recalcula orçamento baseado nas transações reais
    * @param {Object} req - Request object
    * @param {Object} res - Response object
    */
   static async recalcular(req, res) {
       try {
           const { mes, ano } = req.query;

           if (!mes || !ano) {
               return res.status(400).json({
                   success: false,
                   message: 'Mês e ano são obrigatórios'
               });
           }

           const { orcamento, error } = await Orcamento.recalcular(
               req.user.id,
               parseInt(mes),
               parseInt(ano)
           );

           if (error) {
               return res.status(400).json({
                   success: false,
                   message: error
               });
           }

           return res.status(200).json({
               success: true,
               message: 'Orçamento recalculado com sucesso',
               data: { orcamento }
           });

       } catch (error) {
           console.error('Erro no controller recalcular orçamento:', error);
           return res.status(500).json({
               success: false,
               message: 'Erro interno do servidor'
           });
       }
   }

   /**
    * Busca histórico de orçamentos
    * @param {Object} req - Request object
    * @param {Object} res - Response object
    */
   static async getHistorico(req, res) {
       try {
           const { limite = 12 } = req.query;

           const historico = await Orcamento.getHistorico(
               req.user.id,
               parseInt(limite)
           );

           return res.status(200).json({
               success: true,
               message: 'Histórico de orçamentos obtido com sucesso',
               data: { 
                   historico,
                   total: historico.length
               }
           });

       } catch (error) {
           console.error('Erro no controller getHistorico orçamento:', error);
           return res.status(500).json({
               success: false,
               message: 'Erro interno do servidor'
           });
       }
   }

   /**
    * Busca resumo anual
    * @param {Object} req - Request object
    * @param {Object} res - Response object
    */
   static async getResumoAnual(req, res) {
       try {
           const { ano } = req.query;

           if (!ano) {
               return res.status(400).json({
                   success: false,
                   message: 'Ano é obrigatório'
               });
           }

           const resumo = await Orcamento.getResumoAnual(
               req.user.id,
               parseInt(ano)
           );

           if (!resumo) {
               return res.status(500).json({
                   success: false,
                   message: 'Erro ao buscar resumo anual'
               });
           }

           return res.status(200).json({
               success: true,
               message: 'Resumo anual obtido com sucesso',
               data: { resumo }
           });

       } catch (error) {
           console.error('Erro no controller getResumoAnual orçamento:', error);
           return res.status(500).json({
               success: false,
               message: 'Erro interno do servidor'
           });
       }
   }

   /**
    * Busca estatísticas gerais
    * @param {Object} req - Request object
    * @param {Object} res - Response object
    */
   static async getEstatisticas(req, res) {
       try {
           const estatisticas = await Orcamento.getEstatisticasGerais(req.user.id);

           if (!estatisticas) {
               return res.status(500).json({
                   success: false,
                   message: 'Erro ao buscar estatísticas'
               });
           }

           return res.status(200).json({
               success: true,
               message: 'Estatísticas obtidas com sucesso',
               data: { estatisticas }
           });

       } catch (error) {
           console.error('Erro no controller getEstatisticas orçamento:', error);
           return res.status(500).json({
               success: false,
               message: 'Erro interno do servidor'
           });
       }
   }

   /**
    * Busca dashboard completo do usuário
    * @param {Object} req - Request object
    * @param {Object} res - Response object
    */
   static async getDashboard(req, res) {
       try {
           const { mes, ano } = req.query;
           const mesAtual = mes ? parseInt(mes) : new Date().getMonth() + 1;
           const anoAtual = ano ? parseInt(ano) : new Date().getFullYear();

           // Busca orçamento do período
           const orcamento = await Orcamento.findOrCreateByPeriod(
               req.user.id,
               mesAtual,
               anoAtual
           );

           // Busca estatísticas de categorias
           const [categoriasReceitas, categoriasDespesas] = await Promise.all([
               FinanceData.getCategoryStats(req.user.id, 'receita', mesAtual, anoAtual),
               FinanceData.getCategoryStats(req.user.id, 'despesa', mesAtual, anoAtual)
           ]);

           // Busca contas do usuário
           const contas = await FinanceData.getUserAccounts(req.user.id);

           // Calcula saldo total das contas
           const saldoTotalContas = contas.reduce((total, conta) => 
               total + parseFloat(conta.saldo_atual || 0), 0
           );

           const dashboard = {
               periodo: {
                   mes: mesAtual,
                   ano: anoAtual
               },
               orcamento,
               categorias: {
                   receitas: categoriasReceitas,
                   despesas: categoriasDespesas
               },
               contas: {
                   lista: contas,
                   saldo_total: saldoTotalContas
               },
               indicadores: {
                   taxa_economia: orcamento?.receita_total > 0 
                       ? (orcamento.saldo_atual / orcamento.receita_total) * 100 
                       : 0,
                   percentual_gasto: orcamento?.receita_total > 0 
                       ? (orcamento.despesa_total / orcamento.receita_total) * 100 
                       : 0,
                   meta_economia_atingida: orcamento?.meta_economia > 0 
                       ? (orcamento.saldo_atual / orcamento.meta_economia) * 100 
                       : 0
               }
           };

           return res.status(200).json({
               success: true,
               message: 'Dashboard obtido com sucesso',
               data: { dashboard }
           });

       } catch (error) {
           console.error('Erro no controller getDashboard:', error);
           return res.status(500).json({
               success: false,
               message: 'Erro interno do servidor'
           });
       }
   }
}
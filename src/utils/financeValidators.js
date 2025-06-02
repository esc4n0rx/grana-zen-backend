import { z } from 'zod';

// Validador para receita
export const receitaSchema = z.object({
    account_id: z.string().uuid('ID da conta deve ser um UUID válido'),
    category_id: z.string().uuid('ID da categoria deve ser um UUID válido').optional(),
    nome: z.string()
        .min(2, 'Nome deve ter pelo menos 2 caracteres')
        .max(255, 'Nome não pode exceder 255 caracteres'),
    valor: z.number()
        .positive('Valor deve ser positivo')
        .max(999999999.99, 'Valor muito alto'),
    data_receita: z.string()
        .refine((date) => !isNaN(Date.parse(date)), 'Data inválida'),
    eh_salario: z.boolean().default(false),
    parcela_salario: z.number()
        .int('Parcela deve ser um número inteiro')
        .min(1, 'Parcela deve ser pelo menos 1')
        .max(4, 'Parcela não pode exceder 4')
        .optional(),
    total_parcelas_salario: z.number()
        .int('Total de parcelas deve ser um número inteiro')
        .min(1, 'Total de parcelas deve ser pelo menos 1')
        .max(4, 'Total de parcelas não pode exceder 4')
        .optional(),
    observacoes: z.string().max(1000, 'Observações não podem exceder 1000 caracteres').optional(),
    status: z.enum(['pendente', 'confirmada', 'cancelada']).default('confirmada'),
    tags: z.array(z.string().uuid('Tag deve ser um UUID válido')).default([])
});

// Validador para despesa
export const despesaSchema = z.object({
    account_id: z.string().uuid('ID da conta deve ser um UUID válido'),
    category_id: z.string().uuid('ID da categoria deve ser um UUID válido').optional(),
    nome: z.string()
        .min(2, 'Nome deve ter pelo menos 2 caracteres')
        .max(255, 'Nome não pode exceder 255 caracteres'),
    valor: z.number()
        .positive('Valor deve ser positivo')
        .max(999999999.99, 'Valor muito alto'),
    data_despesa: z.string()
        .refine((date) => !isNaN(Date.parse(date)), 'Data inválida'),
    eh_pagamento_fatura: z.boolean().default(false),
    cartao_origem_id: z.string().uuid('ID do cartão deve ser um UUID válido').optional(),
    observacoes: z.string().max(1000, 'Observações não podem exceder 1000 caracteres').optional(),
    status: z.enum(['pendente', 'confirmada', 'cancelada']).default('confirmada'),
    tags: z.array(z.string().uuid('Tag deve ser um UUID válido')).default([])
});

// Validador para atualização de receita
export const updateReceitaSchema = receitaSchema.partial().omit(['tags']);

// Validador para atualização de despesa
export const updateDespesaSchema = despesaSchema.partial().omit(['tags']);

// Validador para orçamento
export const orcamentoSchema = z.object({
    mes: z.number().int().min(1).max(12),
    ano: z.number().int().min(2020).max(2050),
    meta_economia: z.number().min(0, 'Meta de economia não pode ser negativa').optional(),
    observacoes: z.string().max(1000, 'Observações não podem exceder 1000 caracteres').optional()
});

// Validador para filtros de busca
export const financeFiltersSchema = z.object({
    data_inicio: z.string()
        .refine((date) => !isNaN(Date.parse(date)), 'Data de início inválida')
        .optional(),
    data_fim: z.string()
        .refine((date) => !isNaN(Date.parse(date)), 'Data de fim inválida')
        .optional(),
    category_id: z.string().uuid().optional(),
    account_id: z.string().uuid().optional(),
    status: z.enum(['pendente', 'confirmada', 'cancelada']).optional(),
    tags: z.array(z.string().uuid()).default([]),
    limite: z.number().int().min(1).max(100).default(50),
    pagina: z.number().int().min(1).default(1)
});
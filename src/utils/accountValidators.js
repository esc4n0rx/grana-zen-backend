import { z } from 'zod';

// Validador base para conta
const baseAccountSchema = z.object({
    nome: z.string()
        .min(2, 'Nome deve ter pelo menos 2 caracteres')
        .max(255, 'Nome não pode exceder 255 caracteres'),
    saldo_atual: z.number().default(0), // Remove validação de negativo aqui
    ativo: z.boolean().default(true)
});

// Validador para conta corrente
export const contaCorrenteSchema = baseAccountSchema.extend({
    tipo_conta: z.literal('conta_corrente'),
    saldo_atual: z.number().min(0, 'Saldo não pode ser negativo').default(0), // Só conta corrente não pode ser negativa
    nome_banco: z.string()
        .min(2, 'Nome do banco deve ter pelo menos 2 caracteres')
        .max(255, 'Nome do banco não pode exceder 255 caracteres'),
    agencia: z.string()
        .max(20, 'Agência não pode exceder 20 caracteres')
        .optional(),
    numero_conta: z.string()
        .max(50, 'Número da conta não pode exceder 50 caracteres')
        .optional(),
    tipo_conta_corrente: z.enum(['corrente', 'poupanca', 'salario'])
        .default('corrente')
});

// Validador para cartão de crédito (permite saldo negativo)
export const cartaoCreditoSchema = baseAccountSchema.extend({
    tipo_conta: z.literal('cartao_credito'),
    saldo_atual: z.number().default(0), // Permite negativo para cartão
    nome_banco: z.string()
        .min(2, 'Nome do banco deve ter pelo menos 2 caracteres')
        .max(255, 'Nome do banco não pode exceder 255 caracteres'),
    bandeira: z.string()
        .min(2, 'Bandeira deve ter pelo menos 2 caracteres')
        .max(50, 'Bandeira não pode exceder 50 caracteres'),
    limite_total: z.number()
        .min(0, 'Limite total não pode ser negativo'),
    limite_disponivel: z.number()
        .min(0, 'Limite disponível não pode ser negativo'),
    vencimento_fatura: z.number()
        .min(1, 'Dia de vencimento deve ser entre 1 e 31')
        .max(31, 'Dia de vencimento deve ser entre 1 e 31'),
    melhor_data_compra: z.number()
        .min(1, 'Melhor data de compra deve ser entre 1 e 31')
        .max(31, 'Melhor data de compra deve ser entre 1 e 31')
        .optional()
});

// Validador para dinheiro vivo
export const dinheiroVivoSchema = baseAccountSchema.extend({
    tipo_conta: z.literal('dinheiro_vivo'),
    saldo_atual: z.number().min(0, 'Saldo não pode ser negativo').default(0), // Dinheiro vivo não pode ser negativo
    descricao: z.string()
        .max(255, 'Descrição não pode exceder 255 caracteres')
        .default('Dinheiro em espécie')
});

// Validador para atualização (todos os campos opcionais)
export const updateAccountSchema = z.object({
    nome: z.string()
        .min(2, 'Nome deve ter pelo menos 2 caracteres')
        .max(255, 'Nome não pode exceder 255 caracteres')
        .optional(),
    saldo_atual: z.number().optional(), // Remove validação aqui, será feita no controller
    ativo: z.boolean().optional(),
    // Campos específicos de conta corrente
    nome_banco: z.string()
        .min(2, 'Nome do banco deve ter pelo menos 2 caracteres')
        .max(255, 'Nome do banco não pode exceder 255 caracteres')
        .optional(),
    agencia: z.string()
        .max(20, 'Agência não pode exceder 20 caracteres')
        .optional(),
    numero_conta: z.string()
        .max(50, 'Número da conta não pode exceder 50 caracteres')
        .optional(),
    tipo_conta_corrente: z.enum(['corrente', 'poupanca', 'salario'])
        .optional(),
    // Campos específicos de cartão de crédito
    bandeira: z.string()
        .min(2, 'Bandeira deve ter pelo menos 2 caracteres')
        .max(50, 'Bandeira não pode exceder 50 caracteres')
        .optional(),
    limite_total: z.number()
        .min(0, 'Limite total não pode ser negativo')
        .optional(),
    limite_disponivel: z.number()
        .min(0, 'Limite disponível não pode ser negativo')
        .optional(),
    vencimento_fatura: z.number()
        .min(1, 'Dia de vencimento deve ser entre 1 e 31')
        .max(31, 'Dia de vencimento deve ser entre 1 e 31')
        .optional(),
    melhor_data_compra: z.number()
        .min(1, 'Melhor data de compra deve ser entre 1 e 31')
        .max(31, 'Melhor data de compra deve ser entre 1 e 31')
        .optional(),
    // Campo específico de dinheiro vivo
    descricao: z.string()
        .max(255, 'Descrição não pode exceder 255 caracteres')
        .optional()
});
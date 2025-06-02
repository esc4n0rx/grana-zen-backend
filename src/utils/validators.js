import { z } from 'zod';

// Validador para registro de usuário
export const registerSchema = z.object({
    nome: z.string()
        .min(2, 'Nome deve ter pelo menos 2 caracteres')
        .max(255, 'Nome não pode exceder 255 caracteres'),
    email: z.string()
        .email('Email inválido')
        .max(255, 'Email não pode exceder 255 caracteres'),
    senha: z.string()
        .min(6, 'Senha deve ter pelo menos 6 caracteres')
        .max(100, 'Senha não pode exceder 100 caracteres')
});

// Validador para login
export const loginSchema = z.object({
    email: z.string().email('Email inválido'),
    senha: z.string().min(1, 'Senha é obrigatória')
});

// Validador para atualização de perfil
export const updateProfileSchema = z.object({
    nome: z.string()
        .min(2, 'Nome deve ter pelo menos 2 caracteres')
        .max(255, 'Nome não pode exceder 255 caracteres')
        .optional(),
    avatar_url: z.string().url('URL do avatar inválida').optional(),
    salario: z.number().min(0, 'Salário não pode ser negativo').optional(),
    metodo_pagamento: z.enum(['mensal', 'quinzenal', 'semanal']).optional(),
    subsalario: z.record(z.number()).optional(),
    active: z.boolean().optional()
});
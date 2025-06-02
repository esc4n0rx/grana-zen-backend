// authController.js 
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { Profile } from '../models/Profile.js';
import { registerSchema, loginSchema, updateProfileSchema } from '../utils/validators.js';

export class AuthController {
    /**
     * Registra um novo usuário
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    static async register(req, res) {
        try {
            // Valida os dados de entrada
            const validatedData = registerSchema.parse(req.body);
            const { nome, email, senha } = validatedData;
            
            // Verifica se o usuário já existe
            const existingUser = await User.findByEmail(email);
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: 'Email já está em uso'
                });
            }
            
            // Cria o usuário
            const { user, error: userError } = await User.create({ nome, email, senha });
            
            if (userError) {
                return res.status(400).json({
                    success: false,
                    message: userError
                });
            }
            
            // Cria o perfil base
            const { profile, error: profileError } = await Profile.createBaseProfile(user.id, nome);
            
            if (profileError) {
                return res.status(400).json({
                    success: false,
                    message: 'Erro ao criar perfil: ' + profileError
                });
            }
            
            // Gera token JWT
            const token = jwt.sign(
                { userId: user.id },
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
            );
            
            return res.status(201).json({
                success: true,
                message: 'Usuário registrado com sucesso',
                data: {
                    user: {
                        id: user.id,
                        nome: user.nome,
                        email: user.email
                    },
                    profile: {
                        id: profile.id,
                        nome: profile.nome,
                        avatar_url: profile.avatar_url,
                        salario: profile.salario,
                        metodo_pagamento: profile.metodo_pagamento,
                        subsalario: profile.subsalario,
                        active: profile.active
                    },
                    token
                }
            });
            
        } catch (error) {
            if (error.name === 'ZodError') {
                return res.status(400).json({
                    success: false,
                    message: 'Dados inválidos',
                    errors: error.errors
                });
            }
            
            return res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    }
    
    /**
     * Faz login do usuário
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    static async login(req, res) {
        try {
            // Valida os dados de entrada
            const validatedData = loginSchema.parse(req.body);
            const { email, senha } = validatedData;
            
            // Busca o usuário
            const user = await User.findByEmail(email);
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'Email ou senha incorretos'
                });
            }
            
            // Verifica a senha
            const isPasswordValid = await User.comparePassword(senha, user.senha);
            if (!isPasswordValid) {
                return res.status(401).json({
                    success: false,
                    message: 'Email ou senha incorretos'
                });
            }
            
            // Busca o perfil
            const profile = await Profile.findByUserId(user.id);
            
            // Gera token JWT
            const token = jwt.sign(
                { userId: user.id },
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
            );
            
            return res.status(200).json({
                success: true,
                message: 'Login realizado com sucesso',
                data: {
                    user: {
                        id: user.id,
                        nome: user.nome,
                        email: user.email
                    },
                    profile: profile ? {
                        id: profile.id,
                        nome: profile.nome,
                        avatar_url: profile.avatar_url,
                        salario: profile.salario,
                        metodo_pagamento: profile.metodo_pagamento,
                        subsalario: profile.subsalario,
                        active: profile.active
                    } : null,
                    token
                }
            });
            
        } catch (error) {
            if (error.name === 'ZodError') {
                return res.status(400).json({
                    success: false,
                    message: 'Dados inválidos',
                    errors: error.errors
                });
            }
            
            return res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    }
    
    /**
     * Retorna o perfil do usuário autenticado
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    static async getProfile(req, res) {
        try {
            // Busca o perfil do usuário
            const profile = await Profile.findByUserId(req.user.id);
            
            if (!profile) {
                return res.status(404).json({
                    success: false,
                    message: 'Perfil não encontrado'
                });
            }
            
            return res.status(200).json({
                success: true,
                message: 'Perfil encontrado com sucesso',
                data: {
                    user: {
                        id: req.user.id,
                        nome: req.user.nome,
                        email: req.user.email
                    },
                    profile: {
                        id: profile.id,
                        nome: profile.nome,
                        avatar_url: profile.avatar_url,
                        salario: profile.salario,
                        metodo_pagamento: profile.metodo_pagamento,
                        subsalario: profile.subsalario,
                        active: profile.active
                    }
                }
            });
            
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    }
    
    /**
     * Atualiza o perfil do usuário autenticado
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    static async updateProfile(req, res) {
        try {
            // Valida os dados de entrada
            const validatedData = updateProfileSchema.parse(req.body);
            
            // Atualiza o perfil
            const { profile, error } = await Profile.update(req.user.id, validatedData);
            
            if (error) {
                return res.status(400).json({
                    success: false,
                    message: error
                });
            }
            
            return res.status(200).json({
                success: true,
                message: 'Perfil atualizado com sucesso',
                data: {
                    profile: {
                        id: profile.id,
                        nome: profile.nome,
                        avatar_url: profile.avatar_url,
                        salario: profile.salario,
                        metodo_pagamento: profile.metodo_pagamento,
                        subsalario: profile.subsalario,
                        active: profile.active
                    }
                }
            });
            
        } catch (error) {
            if (error.name === 'ZodError') {
                return res.status(400).json({
                    success: false,
                    message: 'Dados inválidos',
                    errors: error.errors
                });
            }
            
            return res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    }
}
// User.js 
import { supabase } from '../config/supabaseClient.js';
import bcrypt from 'bcryptjs';

export class User {
    /**
     * Cria um novo usuário
     * @param {Object} userData - Dados do usuário (nome, email, senha)
     * @returns {Object} Usuário criado ou erro
     */
    static async create(userData) {
        try {
            const { nome, email, senha } = userData;
            
            // Criptografa a senha
            const saltRounds = 12;
            const hashedPassword = await bcrypt.hash(senha, saltRounds);
            
            // Insere o usuário na tabela gzen_users
            const { data: user, error } = await supabase
                .from('gzen_users')
                .insert([{
                    nome,
                    email: email.toLowerCase(),
                    senha: hashedPassword
                }])
                .select('id, nome, email, created_at')
                .single();
            
            if (error) {
                throw error;
            }
            
            return { user, error: null };
        } catch (error) {
            return { user: null, error: error.message };
        }
    }
    
    /**
     * Busca usuário por email
     * @param {string} email - Email do usuário
     * @returns {Object} Usuário encontrado ou null
     */
    static async findByEmail(email) {
        try {
            const { data: user, error } = await supabase
                .from('gzen_users')
                .select('*')
                .eq('email', email.toLowerCase())
                .single();
            
            if (error) {
                return null;
            }
            
            return user;
        } catch (error) {
            return null;
        }
    }
    
    /**
     * Busca usuário por ID
     * @param {string} id - ID do usuário
     * @returns {Object} Usuário encontrado ou null
     */
    static async findById(id) {
        try {
            const { data: user, error } = await supabase
                .from('gzen_users')
                .select('id, nome, email, created_at, updated_at')
                .eq('id', id)
                .single();
            
            if (error) {
                return null;
            }
            
            return user;
        } catch (error) {
            return null;
        }
    }
    
    /**
     * Verifica se a senha está correta
     * @param {string} plainPassword - Senha em texto plano
     * @param {string} hashedPassword - Senha criptografada
     * @returns {boolean} True se a senha estiver correta
     */
    static async comparePassword(plainPassword, hashedPassword) {
        return await bcrypt.compare(plainPassword, hashedPassword);
    }
}
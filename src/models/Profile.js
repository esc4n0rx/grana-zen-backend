// Profile.js 
import { supabase } from '../config/supabaseClient.js';

export class Profile {
    /**
     * Cria perfil base para o usuário após registro
     * @param {string} userId - ID do usuário
     * @param {string} nome - Nome do usuário
     * @returns {Object} Perfil criado ou erro
     */
    static async createBaseProfile(userId, nome) {
        try {
            const { data: profile, error } = await supabase
                .from('gzen_profiles')
                .insert([{
                    user_id: userId,
                    nome,
                    avatar_url: 'https://via.placeholder.com/150/cccccc/ffffff?text=Avatar',
                    salario: 0.00,
                    metodo_pagamento: 'mensal',
                    subsalario: {},
                    active: false
                }])
                .select('*')
                .single();
            
            if (error) {
                throw error;
            }
            
            return { profile, error: null };
        } catch (error) {
            return { profile: null, error: error.message };
        }
    }
    
    /**
     * Busca perfil por ID do usuário
     * @param {string} userId - ID do usuário
     * @returns {Object} Perfil encontrado ou null
     */
    static async findByUserId(userId) {
        try {
            const { data: profile, error } = await supabase
                .from('gzen_profiles')
                .select('*')
                .eq('user_id', userId)
                .single();
            
            if (error) {
                return null;
            }
            
            return profile;
        } catch (error) {
            return null;
        }
    }
    
    /**
     * Atualiza perfil do usuário
     * @param {string} userId - ID do usuário
     * @param {Object} profileData - Dados do perfil para atualizar
     * @returns {Object} Perfil atualizado ou erro
     */
    static async update(userId, profileData) {
        try {
            const { data: profile, error } = await supabase
                .from('gzen_profiles')
                .update(profileData)
                .eq('user_id', userId)
                .select('*')
                .single();
            
            if (error) {
                throw error;
            }
            
            return { profile, error: null };
        } catch (error) {
            return { profile: null, error: error.message };
        }
    }
}
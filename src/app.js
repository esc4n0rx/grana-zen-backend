// app.js 
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js';
import accountRoutes from './routes/accountRoutes.js';
import financeRoutes from './routes/financeRoutes.js';

// Carrega variáveis de ambiente
dotenv.config();

const app = express();

// Middlewares globais
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://seudominio.com'] 
        : ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Middleware para logs em desenvolvimento
if (process.env.NODE_ENV === 'development') {
    app.use((req, res, next) => {
        console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
        next();
    });
}

// Rotas
app.use('/api/auth', authRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/finance', financeRoutes);

// Rota de health check
app.get('/api/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Grana Zen API está funcionando!',
        timestamp: new Date().toISOString()
    });
});

// Middleware para rotas não encontradas
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Rota não encontrada'
    });
});

// Middleware global de tratamento de erros
app.use((error, req, res, next) => {
    console.error('Erro não tratado:', error);
    
    res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
    });
});

export default app;
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { pool } from './config/database';
import empleadosRoutes from './routes/empleados.routes';
import authRoutes from './routes/auth.routes';
import adminRoutes from './routes/admin.routes';

dotenv.config({
    path: process.env.DOTENV_CONFIG_PATH || '.env',
});

if (process.env.DOTENV_CONFIG_PATH === '.env.seguridad.test') {
    if (
        process.env.DB_NAME !== 'falcon_seguridad_test' ||
        process.env.PORT !== '3001'
    ) {
        console.error(
            'ERROR: Configuración de pruebas incorrecta. Arranque cancelado.'
        );
        process.exit(1);
    }

    console.log(
        'CORRECTO: Configuración de pruebas seleccionada.'
    );
}

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(
    cors({
        origin: ['http://localhost:8081'],
        credentials: true,
    })
);

app.use(express.json());
app.use(cookieParser());


app.get('/api/health', (_req, res) => {
    res.json({
    status: 'ok',
    application: 'FALCÓN',
    message: 'API funcionando correctamente',
    });
});

app.get('/api/health/db', async (_req, res) => {
    try {
        const result = await pool.query(
            'SELECT current_database() AS database_name'
        );

        res.json({
            status: 'ok',
            database: result.rows[0].database_name,
            message: 'Conexión a PostgreSQL exitosa',
        });
    } catch (error) {
    console.error('Error de conexión a PostgreSQL:', error);

        res.status(500).json({
            status: 'error',
            message: 'No se pudo conectar a PostgreSQL',
        });
    }
});

app.use('/api/auth',authRoutes);
app.use('/api/empleados', empleadosRoutes);
app.use('/api/admin', adminRoutes);

app.listen(PORT, '127.0.0.1', () => {
    console.log(
        'Servidor FALCÓN en http://localhost:' +PORT
    );
});
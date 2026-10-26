import { pool } from '../config/database';

export const obtenerClienteAdmin = () => {
    return pool.connect();
};
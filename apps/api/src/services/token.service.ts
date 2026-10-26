import jwt, { JwtPayload } from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET || JWT_SECRET.length < 64) {
    throw new Error('JWT_SECRET no está configurado correctamente');
}

const claveSecreta: string = JWT_SECRET;

export const generarToken = (
    empleadoId: number
): string => {
    return jwt.sign(
        { empleadoId },
        claveSecreta,
        {
            algorithm: 'HS256',
            expiresIn: '15m',
        }
    );
};

export const verificarToken = (
    token: string
): JwtPayload | null => {
    try {
        const resultado = jwt.verify(token, claveSecreta, {
            algorithms: ['HS256'],
        });

    if (typeof resultado === 'string') {
        return null;
    }

    if (typeof resultado.empleadoId !== 'number') {
        return null;
    }

    return resultado;
    } catch {
        return null;
    }
};
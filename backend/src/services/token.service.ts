import jwt from 'jsonwebtoken';

interface TokenClaims {
  userId: number;
  tokenVersion: number;
}

export interface TokenService {
  sign(claims: TokenClaims): string;
  verify(token: string): TokenClaims | null;
}

export const createTokenService = (secret: string): TokenService => ({
  sign: (claims) =>
    jwt.sign(claims, secret, {
      algorithm: 'HS256',
      expiresIn: '15m',
      issuer: 'falcon-local-api',
      audience: 'falcon-mobile',
    }),
  verify: (token) => {
    try {
      const result = jwt.verify(token, secret, {
        algorithms: ['HS256'],
        issuer: 'falcon-local-api',
        audience: 'falcon-mobile',
      });
      if (
        typeof result === 'string' ||
        typeof result.userId !== 'number' ||
        typeof result.tokenVersion !== 'number'
      ) {
        return null;
      }
      return {
        userId: result.userId,
        tokenVersion: result.tokenVersion,
      };
    } catch {
      return null;
    }
  },
});

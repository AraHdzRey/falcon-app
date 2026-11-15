import bcrypt from 'bcrypt';

const BCRYPT_ROUNDS = 12;

export const hashPassword = (password: string): Promise<string> =>
  bcrypt.hash(password, BCRYPT_ROUNDS);

export const verifyPassword = (
  password: string,
  passwordHash: string,
): Promise<boolean> => bcrypt.compare(password, passwordHash);

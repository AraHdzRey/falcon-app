import * as SecureStore from 'expo-secure-store';
import type { FalconSession } from '../api/client';

const SESSION_KEY = 'falcon.session.v1';

export interface StoredSession extends FalconSession {
  expiresAt: number;
}

export const isStoredSessionUsable = (
  expiresAt: number,
  now = Date.now(),
): boolean => Number.isFinite(expiresAt) && expiresAt > now;

export const saveSecureSession = async (
  session: FalconSession,
): Promise<StoredSession> => {
  const stored = {
    ...session,
    expiresAt: Date.now() + session.expiresIn * 1000,
  };
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(stored));
  return stored;
};

export const loadSecureSession = async (): Promise<{
  session: StoredSession | null;
  expired: boolean;
}> => {
  const raw = await SecureStore.getItemAsync(SESSION_KEY);
  if (!raw) return { session: null, expired: false };
  try {
    const parsed = JSON.parse(raw) as StoredSession;
    if (
      typeof parsed.token !== 'string' ||
      typeof parsed.expiresAt !== 'number' ||
      typeof parsed.user !== 'object' ||
      parsed.user === null
    ) {
      throw new Error('Sesión local inválida');
    }
    if (!isStoredSessionUsable(parsed.expiresAt)) {
      await SecureStore.deleteItemAsync(SESSION_KEY);
      return { session: null, expired: true };
    }
    return { session: parsed, expired: false };
  } catch {
    await SecureStore.deleteItemAsync(SESSION_KEY);
    return { session: null, expired: true };
  }
};

export const clearSecureSession = async (): Promise<void> => {
  await SecureStore.deleteItemAsync(SESSION_KEY);
};

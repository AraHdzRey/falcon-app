export interface FalconUser {
  id: number;
  collaboratorId: number;
  employeeNumber: string;
  name: string;
  role: string;
}

export interface FalconSession {
  token: string;
  expiresIn: number;
  user: FalconUser;
}

export const normalizeApiUrl = (value: string | undefined): string => {
  const url = value?.trim().replace(/\/+$/, '');
  if (!url) {
    throw new Error(
      'Configura EXPO_PUBLIC_API_URL con la IP LAN de la computadora host.',
    );
  }
  if (!/^http:\/\/(?:\d{1,3}\.){3}\d{1,3}:\d+$/.test(url)) {
    throw new Error(
      'EXPO_PUBLIC_API_URL debe usar http://<IP_LAN>:<PUERTO> durante el piloto.',
    );
  }
  return url;
};

const apiBaseUrl = (): string =>
  normalizeApiUrl(process.env.EXPO_PUBLIC_API_URL);

const readJson = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch {
    throw new Error('La API devolvió una respuesta no válida.');
  }
};

export const login = async (
  employeeId: string,
  password: string,
): Promise<FalconSession> => {
  const response = await fetch(`${apiBaseUrl()}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      employeeId: employeeId.trim().toUpperCase(),
      password,
    }),
  });
  const body = await readJson(response);
  if (!response.ok) {
    throw new Error(
      response.status === 401
        ? 'ID de empleado o contraseña incorrectos.'
        : 'No fue posible iniciar sesión.',
    );
  }
  if (
    typeof body !== 'object' ||
    body === null ||
    !('token' in body) ||
    typeof body.token !== 'string' ||
    !('expiresIn' in body) ||
    typeof body.expiresIn !== 'number' ||
    !('user' in body) ||
    typeof body.user !== 'object' ||
    body.user === null
  ) {
    throw new Error('La respuesta de autenticación no es válida.');
  }
  return {
    token: body.token,
    expiresIn: body.expiresIn,
    user: body.user as FalconUser,
  };
};

export const getMe = async (token: string): Promise<FalconUser> => {
  const response = await fetch(`${apiBaseUrl()}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await readJson(response);
  if (
    !response.ok ||
    typeof body !== 'object' ||
    body === null ||
    !('user' in body)
  ) {
    throw new Error('La sesión no está activa.');
  }
  return body.user as FalconUser;
};

export const logout = async (token: string): Promise<void> => {
  const response = await fetch(`${apiBaseUrl()}/auth/logout`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error('No se pudo cerrar la sesión en el servidor.');
  }
};

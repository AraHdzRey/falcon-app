import { Platform } from 'react-native';

// Obtiene la dirección del backend de FALCÓN
export const obtenerUrlBaseApi = (): string => {
  const urlConfigurada =
    process.env.EXPO_PUBLIC_API_URL?.trim();

  // Permite configurar la API mediante una variable de entorno
  if (urlConfigurada) {
    return urlConfigurada.replace(/\/+$/, '');
  }

  // Dirección predeterminada para desarrollo web local
  if (Platform.OS === 'web') {
    return 'http://localhost:3000';
  }

  // Evita usar localhost incorrectamente en un teléfono
  throw new Error(
    'Configura EXPO_PUBLIC_API_URL para utilizar la API en dispositivos móviles.'
  );
};
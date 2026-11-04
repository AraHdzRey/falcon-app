
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { COLORS } from '../../src/constants/colors';
import { useSesion } from '../../src/context/sesion.context';

export default function HomeScreen() {
  const { cerrarSesion } = useSesion();

  const [cerrandoSesion, setCerrandoSesion] = useState(false);
  const [errorCierre, setErrorCierre] = useState<string | null>(null);

  // Evitar solicitudes duplicadas al pulsar rápidamente.
  const cierreEnCurso = useRef(false);

  const manejarCerrarSesion = async (): Promise<void> => {
    if (cierreEnCurso.current) {
      return;
    }

    cierreEnCurso.current = true;
    setCerrandoSesion(true);
    setErrorCierre(null);

    try {
      // Web: espera a que Express elimine la cookie.
      // Android: elimina el estado local de autenticación.
      await cerrarSesion();
    } catch (error) {
      const mensaje =
        error instanceof Error
          ? error.message
          : 'No se pudo cerrar sesión. Intenta nuevamente.';

      setErrorCierre(mensaje);
    } finally {
      cierreEnCurso.current = false;
      setCerrandoSesion(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>FALCÓN</Text>

      <Text style={styles.subtitle}>
        Instrumentos y Equipos FALCÓN
      </Text>

      <Text style={styles.welcome}>
        ¡Bienvenido a nuestra comunidad!
      </Text>

      <Text style={styles.description}>
        Un espacio para conectar, informar y escuchar
        a nuestros colaboradores.
      </Text>

      <Pressable
        onPress={() => {
          void manejarCerrarSesion();
        }}
        disabled={cerrandoSesion}
        style={[
          styles.logoutButton,
          cerrandoSesion && styles.logoutButtonDisabled,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Cerrar sesión"
        accessibilityState={{
          disabled: cerrandoSesion,
          busy: cerrandoSesion,
        }}
      >
        <Text style={styles.logoutButtonText}>
          {cerrandoSesion ? 'Cerrando sesión...' : 'Cerrar sesión'}
        </Text>
      </Pressable>

      {errorCierre !== null && (
        <Text
          style={styles.errorText}
          accessibilityLiveRegion="polite"
        >
          {errorCierre}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 18,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 32,
  },
  welcome: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  logoutButton: {
    marginTop: 32,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 10,
    alignItems: 'center',
    minWidth: 180,
  },
  logoutButtonDisabled: {
    opacity: 0.6,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    marginTop: 16,
    color: '#B42318',
    fontSize: 14,
    textAlign: 'center',
  },
});

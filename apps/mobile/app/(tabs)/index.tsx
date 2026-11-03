import { Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../../src/constants/colors';
import { useSesion } from '../../src/context/sesion.context';

export default function HomeScreen() {
  const { cerrarSesion } = useSesion();

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
        onPress={cerrarSesion}
        style={styles.logoutButton}
        accessibilityRole="button"
        accessibilityLabel="Cerrar sesión"
      >
        <Text style={styles.logoutButtonText}>
          Cerrar sesión
        </Text>
      </Pressable>

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
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

});
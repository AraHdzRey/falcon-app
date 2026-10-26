import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../../src/constants/colors';

export default function HomeScreen() {
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
});
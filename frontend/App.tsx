import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  getMe,
  login,
  logout,
  type FalconSession,
} from './src/api/client';

export default function App() {
  const [numeroEmpleado, setNumeroEmpleado] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [session, setSession] = useState<FalconSession | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!numeroEmpleado.trim() || !contrasena) {
      Alert.alert('Campos requeridos', 'Escribe tu ID de empleado y contraseña.');
      return;
    }
    setLoading(true);
    try {
      const nextSession = await login(numeroEmpleado, contrasena);
      const user = await getMe(nextSession.token);
      setSession({ ...nextSession, user });
      setContrasena('');
    } catch (error) {
      Alert.alert(
        'No se pudo iniciar sesión',
        error instanceof Error ? error.message : 'Error inesperado.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if (!session) return;
    setLoading(true);
    try {
      await logout(session.token);
      setSession(null);
    } catch (error) {
      Alert.alert(
        'No se pudo cerrar sesión',
        error instanceof Error ? error.message : 'Error inesperado.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#7A0010" />
      <View style={styles.header}>
        <Text style={styles.brand}>FALCÓN</Text>
      </View>

      <View style={styles.content}>
        <Image
          source={require('./assets/imagen-login.png')}
          style={styles.image}
          resizeMode="contain"
          accessibilityLabel="Identidad visual FALCÓN"
        />

        {session ? (
          <View style={styles.card}>
            <Text style={styles.title}>Sesión activa</Text>
            <Text style={styles.name}>{session.user.name}</Text>
            <Text style={styles.detail}>
              ID: {session.user.employeeNumber}
            </Text>
            <Text style={styles.detail}>Rol: {session.user.role}</Text>
            <Text style={styles.notice}>
              La autenticación se validó en la API local. La aplicación móvil no
              accede directamente a PostgreSQL.
            </Text>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleLogout}
              disabled={loading}
              accessibilityRole="button"
            >
              {loading ? (
                <ActivityIndicator color="#7A0010" />
              ) : (
                <Text style={styles.secondaryButtonText}>Cerrar sesión</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.title}>Bienvenido</Text>
            <Text style={styles.subtitle}>
              Ingresa con tu ID de empleado.
            </Text>
            <TextInput
              style={styles.input}
              value={numeroEmpleado}
              onChangeText={setNumeroEmpleado}
              placeholder="ID de empleado"
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={50}
              editable={!loading}
              accessibilityLabel="ID de empleado"
            />
            <TextInput
              style={styles.input}
              value={contrasena}
              onChangeText={setContrasena}
              placeholder="Contraseña"
              secureTextEntry
              maxLength={128}
              editable={!loading}
              accessibilityLabel="Contraseña"
            />
            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.disabled]}
              onPress={handleLogin}
              disabled={loading}
              accessibilityRole="button"
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>Iniciar sesión</Text>
              )}
            </TouchableOpacity>
            <Text style={styles.help}>
              La dirección de la API se configura una sola vez mediante
              EXPO_PUBLIC_API_URL.
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F2F2F2',
  },
  header: {
    backgroundColor: '#7A0010',
    paddingHorizontal: 28,
    paddingVertical: 20,
  },
  brand: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 8,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  image: {
    alignSelf: 'center',
    width: 220,
    height: 110,
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 24,
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  title: {
    color: '#242424',
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    color: '#666666',
    fontSize: 15,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 22,
  },
  input: {
    borderColor: '#D5D5D5',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    color: '#202020',
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: '#C8102E',
    borderRadius: 10,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  disabled: {
    opacity: 0.65,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  help: {
    color: '#777777',
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
    marginTop: 18,
  },
  name: {
    color: '#7A0010',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 18,
  },
  detail: {
    color: '#444444',
    fontSize: 15,
    textAlign: 'center',
    marginTop: 6,
  },
  notice: {
    backgroundColor: '#F9ECEE',
    color: '#5C111D',
    borderRadius: 10,
    padding: 14,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 20,
  },
  secondaryButton: {
    borderColor: '#C8102E',
    borderWidth: 1,
    borderRadius: 10,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  secondaryButtonText: {
    color: '#7A0010',
    fontSize: 16,
    fontWeight: '700',
  },
});

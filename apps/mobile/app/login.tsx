//Aqui tenemos todas las bibliotecas (Import) que se requiere para la funcion de componentes de la App
import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { loginStyles } from '../src/styles/login.styles';
import { LinearGradient } from 'expo-linear-gradient';
import { iniciarSesionApi } from '../src/services/auth-api.service';
import { useSesion } from '../src/context/sesion.context';
import { useRouter } from 'expo-router';


//Estructura principal de la App características...
export default function LoginScreen() {
  const [showPassword, setShowPassword] = useState(false);
  const [codigoEmpleado, setCodigoEmpleado] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [cargando, setCargando] = useState(false);
  const { iniciarSesion, sesionActiva } = useSesion();
  const router = useRouter();
    useEffect(() => {
      if (sesionActiva) {
        router.replace('/');
      }
    }, [sesionActiva, router]);
  const [mensajeLogin, setMensajeLogin] = useState('');
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;

  const manejarInicioSesion = async () => {
    if (cargando) {
      return;
    }

    setMensajeLogin('');

    const codigo = codigoEmpleado.trim().toUpperCase();

    if (!/^(?=.*[A-HJ-NP-Z])(?=.*[2-9])[A-HJ-NP-Z2-9]{12}$/.test(codigo)) {
      setMensajeLogin('Ingresa un ID de empleado válido de 12 caracteres.');
      return;
    }

    if (!contrasena) {
      setMensajeLogin('Ingresa tu contraseña.');
      return;
    }

    setCargando(true);

    try {
      const respuesta = await iniciarSesionApi(codigo, contrasena);
      iniciarSesion(respuesta.token, respuesta.expiresIn);

      setMensajeLogin(
        'Credenciales verificadas correctamente. Estamos preparando tu sesión.'
      );
    } catch (error: unknown) {
      setMensajeLogin(
        error instanceof Error
          ? error.message
          : 'Ocurrió un error al iniciar sesión.'
      );
    } finally {
      setCargando(false);
    }
  };

  return (

    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[
        loginStyles.container,
        isDesktop && loginStyles.desktopContainer,
      ]}
      keyboardShouldPersistTaps="handled"
    >

      <View
        style={
        isDesktop
          ? [
            loginStyles.desktopCard,
            { width: Math.min(width - 96, 1200) },
          ]
          : { width: '100%', alignItems: 'center' }
        }
      >
      <LinearGradient
        colors={['#950A0B', '#F9001D']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={isDesktop ?
        loginStyles.desktopBrandPanel :
        loginStyles.hero}
      >
        <View
          style={
            isDesktop
              ? {
                flex: 1,
                width: '100%',
                justifyContent: 'center',
                alignItems: 'center',
              }
          : {
              width: '100%',
              alignItems: 'center',
            }
  }
>
  <Text style={loginStyles.brand}>FALCÓN</Text>

  {isDesktop && (
    <Text style={loginStyles.desktopSlogan}>
      Conectados para un mejor equipo
    </Text>
  )}
</View>

        <Image
          source={require('../assets/branding/imagen-login.png')}
          style={isDesktop ?
            loginStyles.desktopBuildingImage :
            loginStyles.buildingImage}
          resizeMode="cover"
/>
      </LinearGradient>

      <View
        style={
          isDesktop
            ? loginStyles.desktopFormPanel
            : { width: '100%', alignItems: 'center' }
        }
      >

      <Text
        style={[
          loginStyles.title,
          isDesktop && loginStyles.desktopTitle,
        ]}
      >
        Iniciar Sesión
      </Text>

      <Text
        style={[
          loginStyles.description,
          isDesktop && loginStyles.desktopDescription,
        ]}
      >
        Bienvenido al espacio de nuestros colaboradores.
      </Text>

    <View style={loginStyles.formField}>
      <Text style={loginStyles.label}>ID de empleado</Text>

      <TextInput
        style={loginStyles.input}
        placeholder="Ingresa tu ID de empleado"
        placeholderTextColor="#888888"
        value={codigoEmpleado}
        onChangeText={(texto) =>
          setCodigoEmpleado(texto.toUpperCase())
        }
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={12}
        />
    </View>

    <View style={loginStyles.passwordField}>
      <Text style={loginStyles.label}>Contraseña</Text>

      <View style={loginStyles.passwordRow}>
        <TextInput
          style={loginStyles.passwordInput}
          placeholder="Ingresa tu contraseña"
          placeholderTextColor="#888888"
          value={contrasena}
          onChangeText={setContrasena}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="password"
          autoComplete="current-password"
        />

        <Pressable
          style={loginStyles.eyeButton}
          onPress={() => setShowPassword(!showPassword)}
          accessibilityRole="button"
          accessibilityLabel={
            showPassword
              ? 'Ocultar contraseña'
              : 'Mostrar contraseña'
          }
        >
          <Ionicons
            name={
              showPassword
                ? 'eye-off-outline'
                : 'eye-outline'
            }
            size={22}
            color="#2E2F32"
          />
        </Pressable>
      </View>
    </View>

    <Pressable
      style={loginStyles.forgotPasswordRow}
      accessibilityRole="link"
      accessibilityLabel="¿Olvidaste tu contraseña?"
      accessibilityState={{ disabled: true }}
      disabled={true}
    >
    <Text style={loginStyles.forgotPasswordText}>
      ¿Olvidaste tu contraseña?
    </Text>
    </Pressable>

    <Pressable
      style={loginStyles.loginButton}
      accessibilityRole="button"
      accessibilityLabel="Iniciar sesión"
      accessibilityState={{ disabled: cargando }}
      disabled={cargando}
      onPress={manejarInicioSesion}
    >
      <Text style={loginStyles.loginButtonText}>
        {cargando ? 'Verificando...' : 'Iniciar sesión'}
      </Text>
    </Pressable>

    <Text
      style={loginStyles.loginNotice}
      accessibilityLiveRegion="polite"
    >
      {mensajeLogin}
    </Text>

    </View>

    </View>

    </ScrollView>
  );
}
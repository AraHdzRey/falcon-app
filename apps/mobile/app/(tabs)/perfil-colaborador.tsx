import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import PerfilColaboradorScreen from '../../src/screens/perfil-colaborador.screen';
import { COLABORADORES_DEMO } from '../../src/screens/directorio.screen';
import { COLORS } from '../../src/constants/colors';

export default function PerfilColaboradorRoute() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const colaborador = COLABORADORES_DEMO.find(
    (persona) => persona.id === Number(id)
  );

  const volver = () => router.replace('/directorio');

  if (!colaborador) {
    return (
      <View style={styles.contenedor}>
        <Text style={styles.titulo}>Colaborador no encontrado</Text>
        <Text style={styles.descripcion}>
          No existe un perfil de demostración para el ID solicitado.
        </Text>
        <Pressable
          onPress={volver}
          style={styles.boton}
          accessibilityRole="button"
        >
          <Text style={styles.textoBoton}>Volver al Directorio</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <PerfilColaboradorScreen
      colaborador={colaborador}
      onVolver={volver}
    />
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: COLORS.background,
  },
  titulo: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 10,
  },
  descripcion: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    marginBottom: 20,
  },
  boton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  textoBoton: {
    color: COLORS.background,
    fontWeight: '700',
  },
});

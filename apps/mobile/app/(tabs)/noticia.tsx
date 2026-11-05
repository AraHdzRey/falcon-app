import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import DetalleNoticiaScreen from '../../src/screens/detalle-noticia.screen';
import { NOTICIAS_DEMO } from '../../src/screens/noticias.screen';
import { COLORS } from '../../src/constants/colors';

export default function NoticiaRoute() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const noticia = NOTICIAS_DEMO.find(
    (elemento) => String(elemento.id) === id
  );

  const volver = () => router.replace('/noticias');

  if (!noticia) {
    return (
      <View style={styles.contenedor}>
        <Text style={styles.titulo}>
          Noticia no encontrada
        </Text>

        <Text style={styles.descripcion}>
          No existe una noticia de demostración
          con el identificador solicitado.
        </Text>

        <Pressable
          onPress={volver}
          style={styles.boton}
          accessibilityRole="button"
        >
          <Text style={styles.textoBoton}>
            Volver a Noticias
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <DetalleNoticiaScreen
      noticia={noticia}
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
    fontSize: 13,
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

import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { COLORS } from '../constants/colors';
import type { Noticia } from './noticias.screen';

type Props = {
  noticia: Noticia;
  onVolver: () => void;
};

export default function DetalleNoticiaScreen({
  noticia,
  onVolver,
}: Props) {
  return (
    <ScrollView
      style={styles.pantalla}
      contentContainerStyle={styles.contenido}
    >
      <Pressable
        onPress={onVolver}
        style={styles.volver}
        accessibilityRole="button"
        accessibilityLabel="Volver a Noticias"
      >
        <Ionicons
          name="arrow-back"
          size={21}
          color={COLORS.primary}
        />
        <Text style={styles.textoVolver}>
          Volver a Noticias
        </Text>
      </Pressable>

      <Text style={styles.encabezado}>
        Detalle de noticia
      </Text>

      <View style={styles.tarjeta}>
        <Image
          source={{ uri: noticia.imagen }}
          style={styles.imagen}
          resizeMode="cover"
          accessibilityLabel={noticia.titulo}
        />

        <View style={styles.informacion}>
          <Text style={styles.titulo}>
            {noticia.titulo}
          </Text>

          <View style={styles.metadatos}>
            <View style={styles.fecha}>
              <Ionicons
                name="calendar-outline"
                size={16}
                color={COLORS.textSecondary}
              />
              <Text style={styles.textoFecha}>
                {noticia.fecha}
              </Text>
            </View>

            <View style={styles.etiqueta}>
              <Text style={styles.textoEtiqueta}>
                {noticia.categoria}
              </Text>
            </View>
          </View>

          <View style={styles.separador} />

          <Text style={styles.contenidoNoticia}>
            {noticia.contenido}
          </Text>
        </View>
      </View>

      <View style={styles.aviso}>
        <Ionicons
          name="information-circle-outline"
          size={19}
          color={COLORS.primary}
        />
        <Text style={styles.textoAviso}>
          Esta noticia es de demostración.
          Todavía no está conectada a PostgreSQL.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contenido: {
    padding: 16,
    paddingBottom: 32,
  },
  volver: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingVertical: 8,
    marginBottom: 15,
  },
  textoVolver: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  encabezado: {
    fontSize: 21,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 16,
  },
  tarjeta: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    overflow: 'hidden',
  },
  imagen: {
    width: '100%',
    height: 210,
    backgroundColor: COLORS.surface,
  },
  informacion: {
    padding: 17,
  },
  titulo: {
    fontSize: 21,
    fontWeight: '800',
    color: COLORS.text,
    lineHeight: 28,
    marginBottom: 15,
  },
  metadatos: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
  },
  fecha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  textoFecha: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  etiqueta: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
  },
  textoEtiqueta: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  separador: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 18,
  },
  contenidoNoticia: {
    fontSize: 14,
    lineHeight: 23,
    color: COLORS.text,
  },
  aviso: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    padding: 13,
    marginTop: 17,
    borderRadius: 9,
    backgroundColor: COLORS.surface,
  },
  textoAviso: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
});

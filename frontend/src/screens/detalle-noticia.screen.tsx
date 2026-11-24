import { Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../constants/colors';
import { formatNewsDate } from '../features/news/date';
import type { NewsItem } from '../sync/types';

type Props = { noticia: NewsItem; onVolver: () => void };

export default function DetalleNoticiaScreen({ noticia, onVolver }: Props) {
  return (
    <View style={[styles.pantalla, styles.contenido]}>
      <Pressable onPress={onVolver} style={styles.volver} accessibilityRole="button">
        <Text style={styles.textoVolver}>← Volver a Noticias</Text>
      </Pressable>
      <Text style={styles.encabezado}>Detalle de noticia</Text>
      <View style={styles.tarjeta}>
        <View style={[styles.imagen, { alignItems: 'center', justifyContent: 'center' }]}>
          <Text style={{ color: COLORS.primary, fontSize: 24, fontWeight: '800' }}>FALCÓN</Text>
        </View>
        <View style={styles.informacion}>
          <Text style={styles.titulo}>{noticia.title}</Text>
          <View style={styles.metadatos}>
            <Text style={styles.textoFecha}>{formatNewsDate(noticia.updatedAt, true)}</Text>
            {noticia.pending && <Text style={styles.textoEtiqueta}>Pendiente de sincronización</Text>}
          </View>
          <View style={styles.separador} />
          <Text style={styles.contenidoNoticia}>{noticia.body}</Text>
        </View>
      </View>
    </View>
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

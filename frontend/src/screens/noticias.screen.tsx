import { Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../constants/colors';
import type { NewsItem } from '../sync/types';

type Props = { noticias: NewsItem[]; onAbrirNoticia: (id: string) => void };

export default function NoticiasScreen({ noticias, onAbrirNoticia }: Props) {
  return (
    <View style={[styles.pantalla, styles.contenido]}>
      <Text style={styles.titulo}>Noticias</Text>
      <Text style={styles.aviso}>Noticias de la última sincronización del backend unificado.</Text>
      <Text style={styles.contador}>Noticias encontradas: {noticias.length}</Text>
      {noticias.length === 0 && <Text style={styles.aviso}>No hay noticias disponibles en la copia local.</Text>}
      {noticias.map(noticia => (
        <Pressable
          key={noticia.id}
          style={styles.tarjeta}
          onPress={() => onAbrirNoticia(noticia.id)}
          accessibilityRole="button"
          accessibilityLabel={`Leer noticia: ${noticia.title}`}
        >
          <View style={[styles.imagen, { alignItems: 'center', justifyContent: 'center' }]}>
            <Text style={{ color: COLORS.primary, fontWeight: '700' }}>FALCÓN</Text>
          </View>
          <View style={styles.informacion}>
            <Text style={styles.nombre}>{noticia.title}</Text>
            <Text style={styles.resumen} numberOfLines={2}>{noticia.body}</Text>
            <View style={styles.metadatos}>
              <Text style={styles.fecha}>{new Date(noticia.updatedAt).toLocaleDateString('es-MX')}</Text>
              {noticia.pending && <Text style={styles.categoria}>Pendiente</Text>}
            </View>
          </View>
          <Text style={{ color: COLORS.primary, fontSize: 22 }}>›</Text>
        </Pressable>
      ))}
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
  titulo: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 8,
  },
  aviso: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 17,
    lineHeight: 18,
  },
  filtros: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 17,
  },
  filtro: {
    paddingVertical: 9,
    paddingHorizontal: 13,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filtroActivo: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  textoFiltro: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '600',
  },
  textoFiltroActivo: {
    color: COLORS.background,
  },
  contador: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  tarjeta: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    marginBottom: 11,
    gap: 11,
  },
  imagen: {
    width: 90,
    height: 90,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
  },
  informacion: {
    flex: 1,
  },
  nombre: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  resumen: {
    fontSize: 12,
    lineHeight: 17,
    color: COLORS.textSecondary,
    marginTop: 5,
  },
  metadatos: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
    marginTop: 8,
    alignItems: 'center',
  },
  fecha: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  categoria: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
});

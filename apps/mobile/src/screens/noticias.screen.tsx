import { useMemo, useState } from 'react';
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

export type CategoriaNoticia = 'TI' | 'Administrativas';
type FiltroNoticia = 'Todas' | CategoriaNoticia;

export type Noticia = {
  id: number;
  titulo: string;
  fecha: string;
  categoria: CategoriaNoticia;
  imagen: string;
  contenido: string;
};

export const NOTICIAS_DEMO: Noticia[] = [
  {
    id: 1,
    titulo: 'Mantenimiento de sistemas',
    fecha: '16 oct. 2026',
    categoria: 'TI',
    imagen: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=950&q=75',
    contenido: 'El próximo 20 de octubre se realizará mantenimiento en los sistemas internos de TI. Durante este periodo puede haber interrupciones en el servicio.',
  },
  {
    id: 2,
    titulo: 'Actualización de herramientas',
    fecha: '12 oct. 2026',
    categoria: 'TI',
    imagen: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=950&q=75',
    contenido: 'Se implementarán nuevas versiones de herramientas internas para facilitar las tareas del equipo.',
  },
  {
    id: 3,
    titulo: 'Actividades del departamento',
    fecha: '05 oct. 2026',
    categoria: 'Administrativas',
    imagen: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=950&q=75',
    contenido: 'Te invitamos a participar en la reunión general del área.',
  },
  {
    id: 4,
    titulo: 'Aviso importante',
    fecha: '28 sep. 2026',
    categoria: 'Administrativas',
    imagen: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=950&q=75',
    contenido: 'Se modifica el horario de atención en el área de soporte. Consulta con tu coordinación para más detalles.',
  },
];

const FILTROS: FiltroNoticia[] = [
  'Todas',
  'TI',
  'Administrativas',
];

type Props = {
  onAbrirNoticia: (id: number) => void;
};

export default function NoticiasScreen({ onAbrirNoticia }: Props) {
  const [filtro, setFiltro] = useState<FiltroNoticia>('Todas');

  const noticias = useMemo(
    () => NOTICIAS_DEMO.filter(
      (noticia) =>
        filtro === 'Todas' || noticia.categoria === filtro
    ),
    [filtro]
  );

  return (
    <ScrollView
      style={styles.pantalla}
      contentContainerStyle={styles.contenido}
    >
      <Text style={styles.titulo}>Noticias</Text>

      <Text style={styles.aviso}>
        Noticias de demostración. Este módulo todavía no
        está conectado a PostgreSQL.
      </Text>

      <View style={styles.filtros}>
        {FILTROS.map((opcion) => {
          const activo = filtro === opcion;

          return (
            <Pressable
              key={opcion}
              onPress={() => setFiltro(opcion)}
              style={[
                styles.filtro,
                activo && styles.filtroActivo,
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: activo }}
            >
              <Text
                style={[
                  styles.textoFiltro,
                  activo && styles.textoFiltroActivo,
                ]}
              >
                {opcion}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.contador}>
        Noticias encontradas: {noticias.length}
      </Text>

      {noticias.map((noticia) => (
        <Pressable
          key={noticia.id}
          style={styles.tarjeta}
          onPress={() => onAbrirNoticia(noticia.id)}
          accessibilityRole="button"
          accessibilityLabel={`Leer noticia: ${noticia.titulo}`}
        >
          <Image
            source={{ uri: noticia.imagen }}
            style={styles.imagen}
            resizeMode="cover"
          />

          <View style={styles.informacion}>
            <Text style={styles.nombre}>
              {noticia.titulo}
            </Text>

            <Text
              style={styles.resumen}
              numberOfLines={2}
            >
              {noticia.contenido}
            </Text>

            <View style={styles.metadatos}>
              <Text style={styles.fecha}>
                {noticia.fecha}
              </Text>
              <Text style={styles.categoria}>
                {noticia.categoria}
              </Text>
            </View>
          </View>

          <Ionicons
            name="chevron-forward"
            size={18}
            color={COLORS.primary}
          />
        </Pressable>
      ))}
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

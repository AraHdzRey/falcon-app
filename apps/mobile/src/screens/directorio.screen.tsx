import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { COLORS } from '../constants/colors';

export type Colaborador = {
  id: number;
  nombre: string;
  puesto: string;
  area: string;
  correo: string;
  iniciales: string;
};

export const COLABORADORES_DEMO: Colaborador[] = [
  { id: 1, nombre: 'Ana Torres', puesto: 'Soporte técnico', area: 'TI', correo: 'ana.torres@falcon.com', iniciales: 'AT' },
  { id: 2, nombre: 'Carlos Ramírez', puesto: 'Desarrollo de software', area: 'TI', correo: 'carlos.ramirez@falcon.com', iniciales: 'CR' },
  { id: 3, nombre: 'Luis Méndez', puesto: 'Infraestructura', area: 'TI', correo: 'luis.mendez@falcon.com', iniciales: 'LM' },
  { id: 4, nombre: 'Sofía García', puesto: 'Redes y seguridad', area: 'TI', correo: 'sofia.garcia@falcon.com', iniciales: 'SG' },
  { id: 5, nombre: 'María López', puesto: 'Recursos Humanos', area: 'Administración', correo: 'maria.lopez@falcon.com', iniciales: 'ML' },
  { id: 6, nombre: 'Wendy Calixto', puesto: 'Diseño gráfico', area: 'Mejora Continua', correo: 'wendy.calixto@falcon.com', iniciales: 'WC' },
];

type Filtro = 'Todos' | 'TI' | 'Desarrollo' | 'Administración';
const FILTROS: Filtro[] = ['Todos', 'TI', 'Desarrollo', 'Administración'];

export default function DirectorioScreen() {
  const router = useRouter();
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('Todos');

  const colaboradores = useMemo(() => {
    const texto = busqueda.trim().toLocaleLowerCase('es');

    return COLABORADORES_DEMO.filter((persona) => {
      const coincideFiltro =
        filtro === 'Todos' ||
        (filtro === 'Desarrollo'
          ? persona.puesto.toLocaleLowerCase('es').includes('desarrollo')
          : persona.area === filtro);

      const campos = [persona.nombre, persona.puesto, persona.area]
        .join(' ')
        .toLocaleLowerCase('es');

      return coincideFiltro && campos.includes(texto);
    });
  }, [busqueda, filtro]);

  return (
    <ScrollView
      style={styles.pantalla}
      contentContainerStyle={styles.contenido}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.titulo}>Directorio de colaboradores</Text>
      <Text style={styles.aviso}>
        Vista demostrativa. Los datos todavía no están conectados a PostgreSQL.
      </Text>

      <View style={styles.buscador}>
        <Ionicons name="search-outline" size={20} color={COLORS.textSecondary} />
        <TextInput
          style={styles.entrada}
          value={busqueda}
          onChangeText={setBusqueda}
          placeholder="Buscar por nombre, puesto o área..."
          placeholderTextColor={COLORS.textSecondary}
          autoCapitalize="none"
        />
      </View>

      <View style={styles.filtros}>
        {FILTROS.map((opcion) => {
          const seleccionado = filtro === opcion;

          return (
            <Pressable
              key={opcion}
              onPress={() => setFiltro(opcion)}
              style={[styles.filtro, seleccionado && styles.filtroActivo]}
            >
              <Text style={[
                styles.textoFiltro,
                seleccionado && styles.textoFiltroActivo,
              ]}>
                {opcion}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.contador}>
        Colaboradores encontrados: {colaboradores.length}
      </Text>

      {colaboradores.length === 0 ? (
        <Text style={styles.sinResultados}>
          No encontramos colaboradores con esos criterios.
        </Text>
      ) : (
        colaboradores.map((persona) => (
          <Pressable
            key={persona.id}
            style={styles.tarjeta}
            onPress={() => router.push({
              pathname: '/perfil-colaborador',
              params: { id: String(persona.id) },
            })}
            accessibilityRole="button"
            accessibilityLabel={`Ver perfil de ${persona.nombre}`}
          >
            <View style={styles.avatar}>
              <Text style={styles.iniciales}>{persona.iniciales}</Text>
            </View>

            <View style={styles.informacion}>
              <Text style={styles.nombre}>{persona.nombre}</Text>
              <Text style={styles.detalle}>{persona.puesto} | {persona.area}</Text>
              <Text style={styles.correo}>{persona.correo}</Text>
            </View>

            <Ionicons
              name="person-outline"
              size={21}
              color={COLORS.primary}
            />
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: COLORS.background },
  contenido: { padding: 16, paddingBottom: 32 },
  titulo: { fontSize: 21, fontWeight: '800', color: COLORS.text, marginBottom: 9 },
  aviso: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 18 },
  buscador: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12,
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 10,
    backgroundColor: COLORS.background, marginBottom: 15,
  },
  entrada: { flex: 1, minHeight: 46, marginLeft: 9, color: COLORS.text },
  filtros: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  filtro: {
    paddingHorizontal: 12, paddingVertical: 9, borderRadius: 8,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
  },
  filtroActivo: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  textoFiltro: { fontSize: 12, color: COLORS.text },
  textoFiltroActivo: { color: COLORS.background, fontWeight: '700' },
  contador: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 12 },
  tarjeta: {
    flexDirection: 'row', alignItems: 'center', padding: 13,
    backgroundColor: COLORS.background, borderWidth: 1,
    borderColor: COLORS.border, borderRadius: 12, marginBottom: 10,
  },
  avatar: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center',
  },
  iniciales: { fontWeight: '800', color: COLORS.primary, fontSize: 15 },
  informacion: { flex: 1, marginHorizontal: 12 },
  nombre: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  detalle: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  correo: { fontSize: 11, color: COLORS.textSecondary, marginTop: 4 },
  sinResultados: { color: COLORS.textSecondary, paddingVertical: 20 },
});


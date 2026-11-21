import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { COLORS } from '../constants/colors';
import type { Colaborador } from '../features/directory/model';

type Props = {
  colaboradores: Colaborador[];
  origen: 'api' | 'cache';
  onAbrirPerfil: (id: number) => void;
};

export default function DirectorioScreen({ colaboradores, origen, onAbrirPerfil }: Props) {
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState('Todos');
  const areas = useMemo(() => ['Todos', ...new Set(colaboradores.map(p => p.area))], [colaboradores]);
  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLocaleLowerCase('es');
    return colaboradores.filter(persona =>
      (filtro === 'Todos' || persona.area === filtro) &&
      [persona.nombre, persona.puesto, persona.area, persona.employeeNumber]
        .join(' ').toLocaleLowerCase('es').includes(texto),
    );
  }, [busqueda, filtro, colaboradores]);

  return (
    <View style={[styles.pantalla, styles.contenido]}>
      <Text style={styles.titulo}>Directorio de colaboradores</Text>
      <Text style={styles.aviso}>
        {origen === 'api'
          ? 'Datos obtenidos de la API unificada.'
          : 'Modo sin conexión: datos del último directorio sincronizado; faltan algunos detalles.'}
      </Text>
      <View style={styles.buscador}>
        <Text style={{ color: COLORS.primary }}>Buscar</Text>
        <TextInput
          style={styles.entrada}
          value={busqueda}
          onChangeText={setBusqueda}
          placeholder="Buscar por nombre, puesto o área..."
          placeholderTextColor={COLORS.textSecondary}
          autoCapitalize="none"
          accessibilityLabel="Buscar colaboradores"
        />
      </View>
      <View style={styles.filtros}>
        {areas.map(opcion => {
          const seleccionado = filtro === opcion;
          return (
            <Pressable
              key={opcion}
              onPress={() => setFiltro(opcion)}
              style={[styles.filtro, seleccionado && styles.filtroActivo]}
              accessibilityRole="button"
              accessibilityState={{ selected: seleccionado }}
            >
              <Text style={[styles.textoFiltro, seleccionado && styles.textoFiltroActivo]}>{opcion}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.contador}>Colaboradores encontrados: {filtrados.length}</Text>
      {filtrados.length === 0 ? (
        <Text style={styles.sinResultados}>No encontramos colaboradores con esos criterios.</Text>
      ) : filtrados.map(persona => (
        <Pressable
          key={persona.id}
          style={styles.tarjeta}
          onPress={() => onAbrirPerfil(persona.id)}
          accessibilityRole="button"
          accessibilityLabel={`Ver perfil de ${persona.nombre}`}
        >
          <View style={styles.avatar}><Text style={styles.iniciales}>{persona.iniciales}</Text></View>
          <View style={styles.informacion}>
            <Text style={styles.nombre}>{persona.nombre}</Text>
            <Text style={styles.detalle}>{persona.puesto} | {persona.area}</Text>
            <Text style={styles.correo}>{persona.correo}</Text>
          </View>
          <Text style={{ color: COLORS.primary, fontSize: 22 }}>›</Text>
        </Pressable>
      ))}
    </View>
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

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../constants/colors';
import type { Colaborador } from '../features/directory/model';

type Props = { colaborador: Colaborador; onVolver: () => void };

export default function PerfilColaboradorScreen({ colaborador, onVolver }: Props) {
  return (
    <View style={[styles.pantalla, styles.contenido]}>
      <Pressable onPress={onVolver} style={styles.volver} accessibilityRole="button">
        <Text style={styles.textoVolver}>← Volver al Directorio</Text>
      </Pressable>
      <Text style={styles.titulo}>Perfil del colaborador</Text>
      <View style={styles.tarjetaPerfil}>
        <View style={styles.avatar}><Text style={styles.iniciales}>{colaborador.iniciales}</Text></View>
        <Text style={styles.nombre}>{colaborador.nombre}</Text>
        <Text style={styles.puesto}>{colaborador.puesto}</Text>
        <Text style={styles.area}>{colaborador.area}</Text>
      </View>
      <View style={styles.tarjetaInformacion}>
        <Text style={styles.subtitulo}>Información laboral</Text>
        <View style={styles.fila}>
          <Text style={{ color: COLORS.primary }}>•</Text>
          <View style={styles.detalle}><Text style={styles.etiqueta}>Puesto</Text><Text style={styles.valor}>{colaborador.puesto}</Text></View>
        </View>
        <View style={styles.separador} />
        <View style={styles.fila}>
          <Text style={{ color: COLORS.primary }}>•</Text>
          <View style={styles.detalle}><Text style={styles.etiqueta}>Departamento</Text><Text style={styles.valor}>{colaborador.area}</Text></View>
        </View>
        <View style={styles.separador} />
        <View style={styles.fila}>
          <Text style={{ color: COLORS.primary }}>•</Text>
          <View style={styles.detalle}><Text style={styles.etiqueta}>Correo institucional</Text><Text style={styles.valor}>{colaborador.correo}</Text></View>
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
    gap: 8,
    marginBottom: 18,
    paddingVertical: 7,
  },
  textoVolver: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  titulo: {
    color: COLORS.text,
    fontSize: 21,
    fontWeight: '800',
    marginBottom: 16,
  },
  tarjetaPerfil: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    marginBottom: 16,
  },
  avatar: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: COLORS.background,
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iniciales: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.primary,
  },
  nombre: {
    marginTop: 14,
    fontSize: 21,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
  },
  puesto: {
    marginTop: 7,
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  area: {
    marginTop: 5,
    fontSize: 13,
    color: COLORS.primaryDark,
    fontWeight: '700',
  },
  tarjetaInformacion: {
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: COLORS.background,
  },
  subtitulo: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 12,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 13,
  },
  detalle: {
    flex: 1,
  },
  etiqueta: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  valor: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  separador: {
    height: 1,
    backgroundColor: COLORS.border,
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
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.textSecondary,
  },
});

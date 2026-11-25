import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { COLORS } from '../constants/colors';
import { formatNewsDate } from '../features/news/date';
import {
  NEWS_BODY_MAX_LENGTH,
  NEWS_TITLE_MAX_LENGTH,
  validateNewsForm,
  type NewsFormInput,
} from '../features/news/model';
import type { NewsItem } from '../sync/types';

type Props = {
  noticia: NewsItem;
  canEdit: boolean;
  isOnline: boolean;
  onVolver: () => void;
  onEditarNoticia: (id: string, input: NewsFormInput) => Promise<NewsItem>;
};

export default function DetalleNoticiaScreen({
  noticia,
  canEdit,
  isOnline,
  onVolver,
  onEditarNoticia,
}: Props) {
  const [modalVisible, setModalVisible] = useState(false);
  const [titulo, setTitulo] = useState(noticia.title);
  const [contenido, setContenido] = useState(noticia.body);
  const [errorFormulario, setErrorFormulario] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const edicionBloqueada = Boolean(noticia.pending) || !isOnline;

  const abrirModalEditar = () => {
    if (edicionBloqueada) return;
    setTitulo(noticia.title);
    setContenido(noticia.body);
    setErrorFormulario(null);
    setModalVisible(true);
  };

  const cerrarModalEditar = () => {
    if (guardando) return;
    setModalVisible(false);
    setErrorFormulario(null);
  };

  const handleGuardar = async () => {
    const validacion = validateNewsForm(titulo, contenido);
    if (!validacion.ok) {
      setErrorFormulario(validacion.error);
      return;
    }

    setErrorFormulario(null);
    setGuardando(true);
    try {
      await onEditarNoticia(noticia.id, validacion.value);
      setModalVisible(false);
    } catch (error) {
      setErrorFormulario(
        error instanceof Error
          ? error.message
          : 'No se pudo actualizar la noticia.',
      );
    } finally {
      setGuardando(false);
    }
  };

  return (
    <View style={[styles.pantalla, styles.contenido]}>
      <Pressable
        onPress={onVolver}
        style={styles.volver}
        accessibilityRole="button"
      >
        <Text style={styles.textoVolver}>← Volver a Noticias</Text>
      </Pressable>

      <View style={styles.barraEncabezado}>
        <Text style={styles.encabezado}>Detalle de noticia</Text>
        {canEdit && (
          <Pressable
            style={[
              styles.botonEditar,
              edicionBloqueada && styles.botonEditarDeshabilitado,
            ]}
            onPress={abrirModalEditar}
            disabled={edicionBloqueada}
            accessibilityRole="button"
            accessibilityLabel="Editar noticia"
          >
            <Text style={styles.textoBotonEditar}>Editar</Text>
          </Pressable>
        )}
      </View>

      {canEdit && edicionBloqueada && (
        <View style={styles.avisoBloqueo}>
          <Text style={styles.textoAvisoBloqueo}>
            {noticia.pending
              ? 'Esta noticia todavía está pendiente de sincronizar. Para editarla se requiere conexión y que esté sincronizada con el servidor.'
              : 'Para editar esta noticia se requiere conexión activa con el servidor.'}
          </Text>
        </View>
      )}

      <View style={styles.tarjeta}>
        <View
          style={[
            styles.imagen,
            { alignItems: 'center', justifyContent: 'center' },
          ]}
        >
          <Text
            style={{ color: COLORS.primary, fontSize: 24, fontWeight: '800' }}
          >
            FALCÓN
          </Text>
        </View>
        <View style={styles.informacion}>
          <Text style={styles.titulo}>{noticia.title}</Text>
          <View style={styles.metadatos}>
            <Text style={styles.textoFecha}>
              {formatNewsDate(noticia.updatedAt, true)}
            </Text>
            {noticia.pending && (
              <Text style={styles.textoEtiqueta}>
                Pendiente de sincronización
              </Text>
            )}
          </View>
          <View style={styles.separador} />
          <Text style={styles.contenidoNoticia}>{noticia.body}</Text>
        </View>
      </View>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={cerrarModalEditar}
      >
        <View style={styles.modalFondo}>
          <View style={styles.modalTarjeta}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitulo}>Editar noticia</Text>

              <Text style={styles.campoEtiqueta}>
                Título ({titulo.trim().length}/{NEWS_TITLE_MAX_LENGTH})
              </Text>
              <TextInput
                style={styles.campoEntrada}
                value={titulo}
                onChangeText={setTitulo}
                placeholder="Título de la noticia"
                placeholderTextColor={COLORS.textSecondary}
                maxLength={NEWS_TITLE_MAX_LENGTH}
                editable={!guardando}
                accessibilityLabel="Editar título de la noticia"
              />

              <Text style={styles.campoEtiqueta}>
                Contenido ({contenido.trim().length}/{NEWS_BODY_MAX_LENGTH})
              </Text>
              <TextInput
                style={[styles.campoEntrada, styles.campoMultilinea]}
                value={contenido}
                onChangeText={setContenido}
                placeholder="Contenido completo de la noticia"
                placeholderTextColor={COLORS.textSecondary}
                maxLength={NEWS_BODY_MAX_LENGTH}
                multiline
                editable={!guardando}
                accessibilityLabel="Editar contenido de la noticia"
              />

              {errorFormulario && (
                <Text style={styles.errorTexto}>{errorFormulario}</Text>
              )}

              <View style={styles.modalAcciones}>
                <Pressable
                  style={styles.botonSecundario}
                  onPress={cerrarModalEditar}
                  disabled={guardando}
                  accessibilityRole="button"
                >
                  <Text style={styles.textoSecundario}>Cancelar</Text>
                </Pressable>
                <Pressable
                  style={styles.botonPrimario}
                  onPress={() => void handleGuardar()}
                  disabled={guardando}
                  accessibilityRole="button"
                >
                  {guardando ? (
                    <ActivityIndicator size="small" color={COLORS.background} />
                  ) : (
                    <Text style={styles.textoPrimario}>Guardar cambios</Text>
                  )}
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  barraEncabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 14,
  },
  encabezado: {
    fontSize: 21,
    fontWeight: '800',
    color: COLORS.text,
  },
  botonEditar: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
  },
  botonEditarDeshabilitado: {
    opacity: 0.45,
  },
  textoBotonEditar: {
    color: COLORS.background,
    fontSize: 13,
    fontWeight: '700',
  },
  avisoBloqueo: {
    backgroundColor: '#FFF4D6',
    borderRadius: 9,
    padding: 12,
    marginBottom: 14,
  },
  textoAvisoBloqueo: {
    color: '#6A4A00',
    fontSize: 12,
    lineHeight: 18,
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
  textoFecha: {
    fontSize: 12,
    color: COLORS.textSecondary,
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
  modalFondo: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    padding: 18,
  },
  modalTarjeta: {
    backgroundColor: COLORS.background,
    borderRadius: 14,
    padding: 18,
    maxHeight: '85%',
  },
  modalTitulo: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 12,
  },
  campoEtiqueta: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 6,
    marginTop: 6,
  },
  campoEntrada: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 10,
  },
  campoMultilinea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  errorTexto: {
    color: COLORS.error,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 10,
  },
  modalAcciones: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  botonSecundario: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 10,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoSecundario: {
    color: COLORS.primaryDark,
    fontWeight: '700',
    fontSize: 14,
  },
  botonPrimario: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoPrimario: {
    color: COLORS.background,
    fontWeight: '700',
    fontSize: 14,
  },
});

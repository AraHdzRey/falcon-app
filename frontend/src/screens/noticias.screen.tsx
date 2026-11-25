import { useEffect, useMemo, useState } from 'react';
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
  NEWS_SEARCH_MAX_LENGTH,
  NEWS_TITLE_MAX_LENGTH,
  filterNewsLocally,
  normalizeNewsSearch,
  validateNewsForm,
  type NewsFormInput,
} from '../features/news/model';
import type { NewsItem } from '../sync/types';

type Props = {
  noticias: NewsItem[];
  isOnline: boolean;
  canCreate: boolean;
  onAbrirNoticia: (noticia: NewsItem) => void;
  onBuscarRemoto: (search: string) => Promise<NewsItem[]>;
  onCrearNoticia: (input: NewsFormInput) => Promise<void>;
};

type RemoteSearchState = {
  query: string;
  status: 'loading' | 'success' | 'fallback';
  items: NewsItem[];
};

export default function NoticiasScreen({
  noticias,
  isOnline,
  canCreate,
  onAbrirNoticia,
  onBuscarRemoto,
  onCrearNoticia,
}: Props) {
  const [busqueda, setBusqueda] = useState('');
  const [remoteSearch, setRemoteSearch] = useState<RemoteSearchState | null>(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [nuevoTitulo, setNuevoTitulo] = useState('');
  const [nuevoContenido, setNuevoContenido] = useState('');
  const [errorFormulario, setErrorFormulario] = useState<string | null>(null);
  const [publicando, setPublicando] = useState(false);

  const consultaNormalizada = useMemo(() => normalizeNewsSearch(busqueda), [busqueda]);
  const errorBusqueda = consultaNormalizada.ok ? null : consultaNormalizada.error;
  const terminoActivo = consultaNormalizada.ok ? consultaNormalizada.value : undefined;

  useEffect(() => {
    if (!terminoActivo || !isOnline) {
      return undefined;
    }

    let cancelled = false;
    const timer = setTimeout(() => {
      if (cancelled) return;
      setRemoteSearch({ query: terminoActivo, status: 'loading', items: [] });
      void onBuscarRemoto(terminoActivo)
        .then((items) => {
          if (cancelled) return;
          setRemoteSearch({ query: terminoActivo, status: 'success', items });
        })
        .catch(() => {
          if (cancelled) return;
          setRemoteSearch({ query: terminoActivo, status: 'fallback', items: [] });
        });
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [terminoActivo, isOnline, onBuscarRemoto]);

  const estadoRemotoActual =
    terminoActivo && isOnline && remoteSearch?.query === terminoActivo
      ? remoteSearch
      : null;
  const buscando = estadoRemotoActual?.status === 'loading';
  const usandoFallbackOffline = Boolean(
    terminoActivo && (!isOnline || estadoRemotoActual?.status === 'fallback'),
  );
  const usandoResultadosApi = estadoRemotoActual?.status === 'success';

  const noticiasMostradas = useMemo(() => {
    if (!terminoActivo) {
      return noticias;
    }
    if (estadoRemotoActual?.status === 'success') {
      return estadoRemotoActual.items;
    }
    return filterNewsLocally(noticias, terminoActivo);
  }, [noticias, terminoActivo, estadoRemotoActual]);

  const abrirModalCrear = () => {
    setNuevoTitulo('');
    setNuevoContenido('');
    setErrorFormulario(null);
    setModalVisible(true);
  };

  const cerrarModalCrear = () => {
    if (publicando) return;
    setModalVisible(false);
    setErrorFormulario(null);
  };

  const handlePublicar = async () => {
    const validacion = validateNewsForm(nuevoTitulo, nuevoContenido);
    if (!validacion.ok) {
      setErrorFormulario(validacion.error);
      return;
    }
    setErrorFormulario(null);
    setPublicando(true);
    try {
      await onCrearNoticia(validacion.value);
      setNuevoTitulo('');
      setNuevoContenido('');
      setModalVisible(false);
    } catch (error) {
      setErrorFormulario(
        error instanceof Error
          ? error.message
          : 'No se pudo guardar la noticia.',
      );
    } finally {
      setPublicando(false);
    }
  };

  return (
    <View style={[styles.pantalla, styles.contenido]}>
      <View style={styles.encabezado}>
        <Text style={styles.titulo}>Noticias</Text>
        {canCreate && (
          <Pressable
            style={styles.botonNueva}
            onPress={abrirModalCrear}
            accessibilityRole="button"
            accessibilityLabel="Nueva noticia"
          >
            <Text style={styles.textoBotonNueva}>+ Nueva noticia</Text>
          </Pressable>
        )}
      </View>

      <Text style={styles.aviso}>
        {usandoResultadosApi
          ? 'Resultados obtenidos de la API unificada.'
          : 'Noticias de la última sincronización del backend unificado.'}
      </Text>

      <View style={styles.buscador}>
        <Text style={styles.etiquetaBuscador}>Buscar</Text>
        <TextInput
          style={styles.entradaBuscador}
          value={busqueda}
          onChangeText={setBusqueda}
          placeholder="Buscar por título o contenido..."
          placeholderTextColor={COLORS.textSecondary}
          maxLength={NEWS_SEARCH_MAX_LENGTH}
          autoCapitalize="none"
          returnKeyType="search"
          accessibilityLabel="Buscar noticias"
        />
        {busqueda.length > 0 && (
          <Pressable
            style={styles.botonLimpiar}
            onPress={() => setBusqueda('')}
            accessibilityRole="button"
            accessibilityLabel="Limpiar búsqueda"
          >
            <Text style={styles.textoLimpiar}>×</Text>
          </Pressable>
        )}
      </View>

      {errorBusqueda && <Text style={styles.errorTexto}>{errorBusqueda}</Text>}

      {buscando && (
        <View style={styles.estadoCarga}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.textoCarga}>Buscando noticias...</Text>
        </View>
      )}

      {usandoFallbackOffline && terminoActivo && (
        <Text style={styles.avisoOffline}>
          Mostrando resultados guardados sin conexión
        </Text>
      )}

      <Text style={styles.contador}>
        Noticias encontradas: {noticiasMostradas.length}
      </Text>

      {noticiasMostradas.length === 0 ? (
        <Text style={styles.sinResultados}>
          {terminoActivo
            ? `No se encontraron noticias para «${terminoActivo}».`
            : 'No hay noticias vigentes.'}
        </Text>
      ) : (
        noticiasMostradas.map((noticia) => (
          <Pressable
            key={noticia.id}
            style={styles.tarjeta}
            onPress={() => onAbrirNoticia(noticia)}
            accessibilityRole="button"
            accessibilityLabel={`Leer noticia: ${noticia.title}`}
          >
            <View
              style={[
                styles.imagen,
                { alignItems: 'center', justifyContent: 'center' },
              ]}
            >
              <Text style={{ color: COLORS.primary, fontWeight: '700' }}>
                FALCÓN
              </Text>
            </View>
            <View style={styles.informacion}>
              <Text style={styles.nombre}>{noticia.title}</Text>
              <Text style={styles.resumen} numberOfLines={2}>
                {noticia.body}
              </Text>
              <View style={styles.metadatos}>
                <Text style={styles.fecha}>
                  {formatNewsDate(noticia.updatedAt)}
                </Text>
                {noticia.pending && (
                  <Text style={styles.categoria}>Pendiente</Text>
                )}
              </View>
            </View>
            <Text style={{ color: COLORS.primary, fontSize: 22 }}>›</Text>
          </Pressable>
        ))
      )}

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={cerrarModalCrear}
      >
        <View style={styles.modalFondo}>
          <View style={styles.modalTarjeta}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitulo}>Nueva noticia</Text>
              {!isOnline && (
                <Text style={styles.avisoOffline}>
                  Sin conexión: se guardará en tu dispositivo y se sincronizará
                  automáticamente al recuperar la red.
                </Text>
              )}

              <Text style={styles.campoEtiqueta}>
                Título ({nuevoTitulo.trim().length}/{NEWS_TITLE_MAX_LENGTH})
              </Text>
              <TextInput
                style={styles.campoEntrada}
                value={nuevoTitulo}
                onChangeText={setNuevoTitulo}
                placeholder="Escribe el título de la noticia"
                placeholderTextColor={COLORS.textSecondary}
                maxLength={NEWS_TITLE_MAX_LENGTH}
                editable={!publicando}
                accessibilityLabel="Título de la noticia"
              />

              <Text style={styles.campoEtiqueta}>
                Contenido ({nuevoContenido.trim().length}/{NEWS_BODY_MAX_LENGTH})
              </Text>
              <TextInput
                style={[styles.campoEntrada, styles.campoMultilinea]}
                value={nuevoContenido}
                onChangeText={setNuevoContenido}
                placeholder="Escribe el contenido completo del comunicado"
                placeholderTextColor={COLORS.textSecondary}
                maxLength={NEWS_BODY_MAX_LENGTH}
                multiline
                editable={!publicando}
                accessibilityLabel="Contenido de la noticia"
              />

              {errorFormulario && (
                <Text style={styles.errorTexto}>{errorFormulario}</Text>
              )}

              <View style={styles.modalAcciones}>
                <Pressable
                  style={styles.botonSecundario}
                  onPress={cerrarModalCrear}
                  disabled={publicando}
                  accessibilityRole="button"
                >
                  <Text style={styles.textoSecundario}>Cancelar</Text>
                </Pressable>
                <Pressable
                  style={styles.botonPrimario}
                  onPress={() => void handlePublicar()}
                  disabled={publicando}
                  accessibilityRole="button"
                >
                  {publicando ? (
                    <ActivityIndicator size="small" color={COLORS.background} />
                  ) : (
                    <Text style={styles.textoPrimario}>Publicar</Text>
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
  encabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 8,
  },
  titulo: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
  },
  botonNueva: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
  },
  textoBotonNueva: {
    color: COLORS.background,
    fontSize: 12,
    fontWeight: '700',
  },
  aviso: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 14,
    lineHeight: 18,
  },
  buscador: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    backgroundColor: COLORS.background,
    marginBottom: 12,
  },
  etiquetaBuscador: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 12,
  },
  entradaBuscador: {
    flex: 1,
    minHeight: 46,
    marginLeft: 9,
    color: COLORS.text,
  },
  botonLimpiar: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  textoLimpiar: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  estadoCarga: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  textoCarga: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  avisoOffline: {
    backgroundColor: '#FFF4D6',
    color: '#6A4A00',
    borderRadius: 8,
    padding: 10,
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 12,
  },
  errorTexto: {
    color: COLORS.error,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 10,
  },
  contador: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  sinResultados: {
    color: COLORS.textSecondary,
    fontSize: 13,
    paddingVertical: 18,
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

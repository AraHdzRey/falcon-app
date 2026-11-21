import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { getMe, login, logout, listDirectory } from './src/api/client';
import { adaptDirectory, type Colaborador } from './src/features/directory/model';
import DirectorioScreen from './src/screens/directorio.screen';
import PerfilColaboradorScreen from './src/screens/perfil-colaborador.screen';
import NoticiasScreen from './src/screens/noticias.screen';
import DetalleNoticiaScreen from './src/screens/detalle-noticia.screen';
import type { NewsItem } from './src/sync/types';
import {
  cacheProfile,
  initializeDatabase,
  loadLocalDashboard,
  queueDemoNews,
} from './src/storage/database';
import {
  clearSecureSession,
  loadSecureSession,
  saveSecureSession,
  type StoredSession,
} from './src/storage/session';
import { runSynchronization } from './src/sync/engine';
import type { LocalDashboard } from './src/sync/types';

type ConnectivityState = 'initializing' | 'online' | 'offline' | 'syncing';

const EMPTY_DASHBOARD: LocalDashboard = {
  profile: null,
  directory: [],
  news: [],
  pendingCount: 0,
  conflictCount: 0,
  lastSync: null,
};

export default function App() {
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [session, setSession] = useState<StoredSession | null>(null);
  const [dashboard, setDashboard] = useState(EMPTY_DASHBOARD);
  const [connectivity, setConnectivity] =
    useState<ConnectivityState>('initializing');
  const [sessionMessage, setSessionMessage] = useState('');
  const [draftTitle, setDraftTitle] = useState('');
  const [draftBody, setDraftBody] = useState('');
  const syncInProgress = useRef(new Set<number>());
  const sessionRef = useRef<StoredSession | null>(null);
  const logoutInProgress = useRef(false);
  const [panel, setPanel] = useState<'inicio' | 'directorio' | 'perfil' | 'noticias' | 'noticia'>('inicio');
  const [directoryPeople, setDirectoryPeople] = useState<Colaborador[]>([]);
  const [directoryOrigin, setDirectoryOrigin] = useState<'api' | 'cache'>('cache');
  const [selectedPerson, setSelectedPerson] = useState<Colaborador | null>(null);
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);

  const refreshLocal = useCallback(async (activeSession: StoredSession) => {
    const local = await loadLocalDashboard(activeSession.user.id);
    if (sessionRef.current === activeSession) {
      setDashboard(local);
    }
  }, []);

  const synchronize = useCallback(
    async (activeSession: StoredSession) => {
      const userId = activeSession.user.id;
      const isCurrent = () =>
        sessionRef.current === activeSession &&
        sessionRef.current?.user.id === userId;

      if (!isCurrent() || syncInProgress.current.has(userId)) return;

      syncInProgress.current.add(userId);
      setConnectivity('syncing');

      try {
        await runSynchronization(activeSession.token, userId, isCurrent);
        if (!isCurrent()) return;
        await refreshLocal(activeSession);
        if (isCurrent()) setConnectivity('online');
      } catch {
        if (isCurrent()) {
          await refreshLocal(activeSession);
          if (isCurrent()) setConnectivity('offline');
        }
      } finally {
        syncInProgress.current.delete(userId);
      }
    },
    [refreshLocal],
  );

  useEffect(() => {
    let active = true;
    const initialize = async () => {
      try {
        const stored = await loadSecureSession();
        if (!active) return;
        setConnectivity('offline');
        if (stored.session) {
          await initializeDatabase(stored.session.user.id);
          const local = await loadLocalDashboard(stored.session.user.id);
          if (!active) return;
          sessionRef.current = stored.session;
          setDashboard(local);
          setSession(stored.session);
        } else if (stored.expired) {
          setDashboard(EMPTY_DASHBOARD);
          setSessionMessage(
            'La sesión local expiró. Se requiere conexión para volver a iniciar sesión.',
          );
        }
      } catch {
        if (active) {
          setConnectivity('offline');
          setSessionMessage('No fue posible inicializar la copia local.');
        }
      }
    };
    void initialize();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!session) return undefined;
    void synchronize(session);
    const timer = setInterval(() => void synchronize(session), 4_000);
    const expiryTimer = setTimeout(() => {
      if (sessionRef.current !== session) return;
      sessionRef.current = null;
      setPanel('inicio');
      setDirectoryPeople([]);
      setSelectedPerson(null);
      setSelectedNews(null);
      setDashboard(EMPTY_DASHBOARD);
      void clearSecureSession();
      setSession(null);
      setConnectivity('offline');
      setSessionMessage(
        'La sesión local expiró. Se requiere conexión para volver a iniciar sesión.',
      );
    }, Math.max(0, session.expiresAt - Date.now()));
    return () => {
      clearInterval(timer);
      clearTimeout(expiryTimer);
    };
  }, [session, synchronize]);

  const handleLogin = async () => {
    if (logoutInProgress.current) return;
    if (!employeeId.trim() || !password) {
      Alert.alert('Campos requeridos', 'Escribe tu ID de empleado y contraseña.');
      return;
    }
    setConnectivity('syncing');
    try {
      const authenticated = await login(employeeId, password);
      const user = await getMe(authenticated.token);
      await initializeDatabase(user.id);
      const stored = await saveSecureSession({ ...authenticated, user });
      await cacheProfile(user.id, user, stored.expiresAt);
      sessionRef.current = stored;
      setPanel('inicio');
      setDirectoryPeople([]);
      setSelectedPerson(null);
      setSelectedNews(null);
      setSession(stored);
      setPassword('');
      setSessionMessage('');
      await refreshLocal(stored);
      await synchronize(stored);
    } catch (error) {
      setConnectivity('offline');
      Alert.alert(
        'No se pudo iniciar sesión',
        error instanceof Error ? error.message : 'Error inesperado.',
      );
    }
  };

  const handleLogout = async () => {
    if (!session || logoutInProgress.current) return;
    logoutInProgress.current = true;
    sessionRef.current = null;
    setPanel('inicio');
    setDirectoryPeople([]);
    setSelectedPerson(null);
    setSelectedNews(null);
    setSession(null);
    setDashboard(EMPTY_DASHBOARD);
    setDraftTitle('');
    setDraftBody('');
    setConnectivity('syncing');
    try {
      await logout(session.token);
    } catch {
      // El cierre local prevalece; el token corto expirará en el servidor.
    } finally {
      await clearSecureSession();
      logoutInProgress.current = false;
      setSession(null);
      setConnectivity('offline');
      setSessionMessage('Sesión cerrada en este dispositivo.');
    }
  };

  const handleQueueNews = async () => {
    const title = draftTitle.trim();
    const body = draftBody.trim();
    if (!title || !body) {
      Alert.alert('Datos requeridos', 'Escribe título y contenido de prueba.');
      return;
    }
    if (!session || sessionRef.current !== session ||
        !canCreateNews) return;

    await queueDemoNews(session.user.id, title, body);
    setDraftTitle('');
    setDraftBody('');
    await refreshLocal(session);
    void synchronize(session);
  };

  const openDirectory = async (activeSession: StoredSession) => {
    if (sessionRef.current !== activeSession) return;
    setDirectoryPeople(adaptDirectory(dashboard.directory));
    setDirectoryOrigin('cache');
    setSelectedPerson(null);
    setPanel('directorio');
    try {
      const items = await listDirectory(activeSession.token);
      if (sessionRef.current !== activeSession) return;
      setDirectoryPeople(adaptDirectory(items));
      setDirectoryOrigin('api');
    } catch {
      // El Directorio continua disponible desde SQLite del usuario activo.
    }
  };

  const statusLabel =
    connectivity === 'online'
      ? 'EN LÍNEA'
      : connectivity === 'syncing'
        ? 'SINCRONIZANDO'
        : connectivity === 'initializing'
          ? 'INICIANDO'
          : 'MODO OFFLINE';
  const canCreateNews =
    session?.user.role === 'editor_noticias' ||
    session?.user.role === 'administrador';

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#7A0010" />
      <View style={styles.header}>
        <Text style={styles.brand}>FALCÓN</Text>
        <Text style={styles.status}>{statusLabel}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Image
          source={require('./assets/imagen-login.png')}
          style={styles.image}
          resizeMode="contain"
          accessibilityLabel="Identidad visual FALCÓN"
        />

        {session && panel !== 'inicio' ? (
          <View>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => setPanel('inicio')} accessibilityRole="button">
              <Text style={styles.secondaryButtonText}>← Inicio</Text>
            </TouchableOpacity>
            {panel === 'directorio' ? (
              <DirectorioScreen
                colaboradores={directoryPeople}
                origen={directoryOrigin}
                onAbrirPerfil={(id) => {
                  const person = directoryPeople.find(entry => entry.id === id);
                  if (person) { setSelectedPerson(person); setPanel('perfil'); }
                }}
              />
            ) : panel === 'perfil' && selectedPerson ? (
              <PerfilColaboradorScreen colaborador={selectedPerson} onVolver={() => setPanel('directorio')} />
            ) : panel === 'noticias' ? (
              <NoticiasScreen
                noticias={dashboard.news}
                onAbrirNoticia={(id) => {
                  const news = dashboard.news.find(item => item.id === id);
                  if (news) { setSelectedNews(news); setPanel('noticia'); }
                }}
              />
            ) : panel === 'noticia' && selectedNews ? (
              <DetalleNoticiaScreen noticia={selectedNews} onVolver={() => setPanel('noticias')} />
            ) : null}
          </View>
        ) : session ? (
          <>
            <View style={styles.card}>
              <Text style={styles.title}>Sesión activa</Text>
              <Text style={styles.name}>{session.user.name}</Text>
              <Text style={styles.detail}>ID: {session.user.employeeNumber}</Text>
              <Text style={styles.detail}>Rol: {session.user.role}</Text>
              {connectivity === 'offline' && (
                <Text style={styles.warning}>
                  Trabajando con la última copia sincronizada. Un login nuevo
                  requiere que la API vuelva a estar disponible.
                </Text>
              )}
              <View style={styles.metrics}>
                <Text style={styles.metric}>Directorio: {dashboard.directory.length}</Text>
                <Text style={styles.metric}>Noticias: {dashboard.news.length}</Text>
                <Text style={styles.metric}>Pendientes: {dashboard.pendingCount}</Text>
              </View>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => void openDirectory(session)} accessibilityRole="button">
                <Text style={styles.secondaryButtonText}>Ver Directorio de colaboradores</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => setPanel('noticias')} accessibilityRole="button">
                <Text style={styles.secondaryButtonText}>Ver Noticias</Text>
              </TouchableOpacity>
              {dashboard.conflictCount > 0 && (
                <Text style={styles.conflict}>
                  Conflictos conservados para revisión: {dashboard.conflictCount}
                </Text>
              )}
              <Text style={styles.lastSync}>
                Última sincronización:{' '}
                {dashboard.lastSync
                  ? new Date(dashboard.lastSync).toLocaleString()
                  : 'todavía no realizada'}
              </Text>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => void synchronize(session)}
                disabled={connectivity === 'syncing'}
                accessibilityRole="button"
              >
                {connectivity === 'syncing' ? (
                  <ActivityIndicator color="#7A0010" />
                ) : (
                  <Text style={styles.secondaryButtonText}>Sincronizar ahora</Text>
                )}
              </TouchableOpacity>
            </View>

            {canCreateNews && <View style={styles.card}>
              <Text style={styles.sectionTitle}>Operación de prueba</Text>
              <Text style={styles.help}>
                Se guarda primero en SQLite. Si no hay API, permanece marcada
                como PENDIENTE DE SINCRONIZACIÓN.
              </Text>
              <TextInput
                style={styles.input}
                value={draftTitle}
                onChangeText={setDraftTitle}
                placeholder="Título de noticia sintética"
                maxLength={160}
              />
              <TextInput
                style={[styles.input, styles.multiline]}
                value={draftBody}
                onChangeText={setDraftBody}
                placeholder="Contenido de prueba"
                maxLength={2000}
                multiline
              />
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => void handleQueueNews()}
                accessibilityRole="button"
              >
                <Text style={styles.primaryButtonText}>Guardar localmente</Text>
              </TouchableOpacity>
            </View>}

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Noticias sincronizadas</Text>
              {dashboard.news.length === 0 ? (
                <Text style={styles.help}>No hay noticias en la copia local.</Text>
              ) : (
                dashboard.news.map((news) => (
                  <View style={styles.news} key={news.id}>
                    <Text style={styles.newsTitle}>{news.title}</Text>
                    <Text style={styles.newsBody}>{news.body}</Text>
                    {news.pending && (
                      <Text style={styles.pending}>PENDIENTE DE SINCRONIZACIÓN</Text>
                    )}
                  </View>
                ))
              )}
            </View>

            <TouchableOpacity
              style={styles.logoutButton}
              onPress={() => void handleLogout()}
              accessibilityRole="button"
            >
              <Text style={styles.secondaryButtonText}>Cerrar sesión</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.card}>
            <Text style={styles.title}>Bienvenido</Text>
            <Text style={styles.subtitle}>Ingresa con tu ID de empleado.</Text>
            {sessionMessage ? <Text style={styles.warning}>{sessionMessage}</Text> : null}
            <TextInput
              style={styles.input}
              value={employeeId}
              onChangeText={setEmployeeId}
              placeholder="ID de empleado"
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={50}
              editable={connectivity !== 'syncing'}
              accessibilityLabel="ID de empleado"
            />
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Contraseña"
              secureTextEntry
              maxLength={128}
              editable={connectivity !== 'syncing'}
              accessibilityLabel="Contraseña"
            />
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => void handleLogin()}
              disabled={connectivity === 'syncing'}
              accessibilityRole="button"
            >
              {connectivity === 'syncing' ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>Iniciar sesión online</Text>
              )}
            </TouchableOpacity>
            <Text style={styles.help}>
              Las contraseñas nunca se guardan localmente. Sólo una sesión ya
              validada y vigente puede reutilizar la caché offline.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F2F2F2' },
  header: {
    backgroundColor: '#7A0010',
    paddingHorizontal: 24,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brand: { color: '#FFFFFF', fontSize: 25, fontWeight: '800', letterSpacing: 7 },
  status: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  content: { padding: 20, gap: 16, paddingBottom: 40 },
  image: { alignSelf: 'center', width: 210, height: 90 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    shadowColor: '#000000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  title: { color: '#242424', fontSize: 25, fontWeight: '700', textAlign: 'center' },
  sectionTitle: { color: '#242424', fontSize: 19, fontWeight: '700' },
  subtitle: { color: '#666666', textAlign: 'center', marginTop: 6, marginBottom: 20 },
  name: { color: '#7A0010', fontSize: 20, fontWeight: '700', textAlign: 'center', marginTop: 14 },
  detail: { color: '#444444', textAlign: 'center', marginTop: 5 },
  metrics: { marginTop: 16, gap: 5 },
  metric: { color: '#444444', fontSize: 14 },
  lastSync: { color: '#777777', fontSize: 12, marginTop: 14 },
  warning: {
    backgroundColor: '#FFF4D6',
    color: '#6A4A00',
    borderRadius: 9,
    padding: 12,
    marginVertical: 14,
    lineHeight: 18,
  },
  conflict: { color: '#8A2C0D', fontWeight: '700', marginTop: 12 },
  input: {
    borderColor: '#D5D5D5',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#202020',
    marginTop: 12,
  },
  multiline: { minHeight: 88, textAlignVertical: 'top' },
  primaryButton: {
    backgroundColor: '#C8102E',
    borderRadius: 10,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  secondaryButton: {
    borderColor: '#C8102E',
    borderWidth: 1,
    borderRadius: 10,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  logoutButton: {
    borderColor: '#C8102E',
    borderWidth: 1,
    borderRadius: 10,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  secondaryButtonText: { color: '#7A0010', fontSize: 16, fontWeight: '700' },
  help: { color: '#777777', fontSize: 12, lineHeight: 17, marginTop: 8 },
  news: { borderTopWidth: 1, borderTopColor: '#EEEEEE', marginTop: 14, paddingTop: 12 },
  newsTitle: { color: '#333333', fontWeight: '700', fontSize: 15 },
  newsBody: { color: '#555555', marginTop: 5, lineHeight: 19 },
  pending: { color: '#A15C00', fontSize: 11, fontWeight: '800', marginTop: 8 },
});

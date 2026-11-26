import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

interface InicioProps {
  name: string;
  newsCount: number;
  latestNewsTitle?: string;
  onDirectory: () => void;
  onNews: () => void;
  onProfile: () => void;
  onComplaints: () => void;
}

export default function InicioScreen({
  name,
  newsCount,
  latestNewsTitle,
  onDirectory,
  onNews,
  onProfile,
  onComplaints,
}: InicioProps) {
  const firstName = name.trim().split(/\s+/)[0] || 'colaborador';

  return (
    <View style={styles.root}>
      <View style={styles.welcome}>
        <View style={styles.welcomeText}>
          <Text style={styles.greeting} numberOfLines={2}>¡Hola, {firstName}!</Text>
          <Text style={styles.description}>
            Bienvenido a FALCÓN, tu espacio de información y comunicación interna.
          </Text>
        </View>
        <Image
          source={require('../../assets/imagen-login.png')}
          resizeMode="cover"
          style={styles.welcomeImage}
          accessibilityLabel="Imagen institucional FALCÓN"
        />
      </View>

      <View style={styles.grid}>
        <Pressable
          style={styles.module}
          onPress={onDirectory}
          accessibilityRole="button"
          accessibilityLabel="Directorio"
        >
          <Text style={styles.moduleIcon}>♧</Text>
          <Text style={styles.moduleTitle}>Directorio</Text>
          <Text style={styles.moduleDescription}>
            Busca y consulta la información de tus compañeros.
          </Text>
        </Pressable>

        <Pressable
          style={styles.module}
          onPress={onComplaints}
          accessibilityRole="button"
          accessibilityLabel="Falcón te escucha"
        >
          <Text style={styles.moduleIcon}>!</Text>
          <Text style={styles.moduleTitle}>Falcón te escucha</Text>
          <Text style={styles.moduleDescription}>
            Reporta quejas, sugerencias o incidencias con seguimiento confidencial.
          </Text>
        </Pressable>

        <Pressable
          style={styles.module}
          onPress={onNews}
          accessibilityRole="button"
          accessibilityLabel="Noticias"
        >
          <Text style={styles.moduleIcon}>▤</Text>
          <Text style={styles.moduleTitle}>Noticias</Text>
          <Text style={styles.moduleDescription}>
            Consulta los comunicados y novedades del área.
          </Text>
        </Pressable>

        <Pressable
          style={styles.module}
          onPress={onProfile}
          accessibilityRole="button"
          accessibilityLabel="Mi perfil"
        >
          <Text style={styles.moduleIcon}>♙</Text>
          <Text style={styles.moduleTitle}>Perfil</Text>
          <Text style={styles.moduleDescription}>
            Gestiona tu información personal.
          </Text>
        </Pressable>
      </View>

      <View style={styles.newsHeader}>
        <Text style={styles.newsHeading}>Últimas noticias</Text>
        <Pressable onPress={onNews} accessibilityRole="button">
          <Text style={styles.newsLink}>Ver todas  ›</Text>
        </Pressable>
      </View>

      <Pressable
        style={styles.newsCard}
        onPress={onNews}
        accessibilityRole="button"
      >
        <View style={styles.newsAccent} />
        <View style={styles.newsContent}>
          <Text style={styles.newsTitle}>
            {latestNewsTitle || 'Noticias institucionales'}
          </Text>
          <Text style={styles.newsDescription}>
            {newsCount > 0
              ? 'Consulta las publicaciones más recientes.'
              : 'No hay publicaciones disponibles en la copia local.'}
          </Text>
        </View>
        <Text style={styles.newsChevron}>›</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 16,
  },
  welcome: {
    flexDirection: 'row',
    backgroundColor: '#F5F6F7',
    borderRadius: 16,
    overflow: 'hidden',
    minHeight: 112,
    borderWidth: 1,
    borderColor: '#E7E7E7',
  },
  welcomeText: {
    flex: 1,
    padding: 14,
    justifyContent: 'center',
  },
  greeting: {
    fontSize: 18,
    fontWeight: '800',
    color: '#171717',
  },
  description: {
    fontSize: 11,
    color: '#333333',
    lineHeight: 16,
    marginTop: 6,
  },
  welcomeImage: {
    width: 110,
    height: '100%',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  module: {
    width: '48%',
    minHeight: 145,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderColor: '#E1E1E1',
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moduleIcon: {
    color: '#B71C1C',
    fontSize: 30,
    fontWeight: '700',
  },
  moduleTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#171717',
    marginTop: 5,
  },
  moduleDescription: {
    textAlign: 'center',
    fontSize: 11,
    lineHeight: 15,
    color: '#444444',
    marginTop: 4,
  },
  newsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  newsHeading: {
    fontSize: 19,
    fontWeight: '800',
    color: '#171717',
  },
  newsLink: {
    color: '#A80717',
    fontSize: 12,
    fontWeight: '700',
  },
  newsCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E5E5',
    borderWidth: 1,
    borderRadius: 13,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    minHeight: 90,
    gap: 12,
  },
  newsAccent: {
    width: 58,
    height: 62,
    backgroundColor: '#8E1616',
    borderRadius: 9,
  },
  newsContent: {
    flex: 1,
  },
  newsTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#171717',
  },
  newsDescription: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 5,
    color: '#555555',
  },
  newsChevron: {
    fontSize: 25,
    color: '#A80717',
  },
});

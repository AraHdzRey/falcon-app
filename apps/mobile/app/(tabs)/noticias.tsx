import { useRouter } from 'expo-router';

import NoticiasScreen from '../../src/screens/noticias.screen';

export default function NoticiasRoute() {
  const router = useRouter();

  const abrirNoticia = (id: number) => {
    router.push({
      pathname: '/noticia',
      params: { id: String(id) },
    });
  };

  return (
    <NoticiasScreen onAbrirNoticia={abrirNoticia} />
  );
}

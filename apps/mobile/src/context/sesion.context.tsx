import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { Platform } from 'react-native';

import { consultarSesionWeb } from '../services/sesion-web.service';
import { cerrarSesionWebApi } from '../services/logout-web.service';

// Datos de la sesión autenticada
interface Sesion {
  token: string | null;
  expiraEn: number;
}

// Funciones y valores disponibles para las pantallas
interface SesionContexto {
  token: string | null;
  sesionActiva: boolean;
  verificandoSesionWeb: boolean;
  iniciarSesion: (token: string, duracionSegundos: number) => void;
  iniciarSesionWeb: (duracionSegundos: number) => void;
  cerrarSesion: () => Promise<void>;
}

const ContextoSesion = createContext<SesionContexto | undefined>(
  undefined
);

export function SesionProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [sesion, setSesion] = useState<Sesion | null>(null);

  const [verificandoSesionWeb, setVerificandoSesionWeb] = useState(
    Platform.OS === 'web'
  );

  // Recuperar la sesión guardada en la cookie HttpOnly
  // cuando se inicia la aplicación web.
  useEffect(() => {
    if (Platform.OS !== 'web') {
      return;
    }

    let cancelado = false;

    const recuperarSesionWeb = async () => {
      try {
        const resultado = await consultarSesionWeb();

        if (cancelado || resultado === null) {
          return;
        }

        // No reemplazar una sesión iniciada mientras
        // se estaba realizando la consulta.
        setSesion((sesionActual) => {
          if (sesionActual !== null) {
            return sesionActual;
          }

          return {
            token: null,
            expiraEn: Date.now() + resultado.expiresIn * 1000,
          };
        });
      } catch (error) {
        if (!cancelado) {
          console.warn(
            'No se pudo recuperar la sesión web:',
            error
          );
        }
      } finally {
        if (!cancelado) {
          setVerificandoSesionWeb(false);
        }
      }
    };

    void recuperarSesionWeb();

    return () => {
      cancelado = true;
    };
  }, []);

  // Cerrar automáticamente la sesión al expirar.
  useEffect(() => {
    if (!sesion) {
      return;
    }

    const tiempoRestante = Math.max(
      0,
      sesion.expiraEn - Date.now()
    );

    const temporizador = setTimeout(() => {
      setSesion(null);
    }, tiempoRestante);

    return () => clearTimeout(temporizador);
  }, [sesion]);

  // Registrar una sesión con JWT.
  const iniciarSesion = (
    token: string,
    duracionSegundos: number
  ) => {
    if (
      !token ||
      !Number.isFinite(duracionSegundos) ||
      duracionSegundos <= 0
    ) {
      throw new Error('Datos de sesión inválidos');
    }

    setSesion({
      token,
      expiraEn: Date.now() + duracionSegundos * 1000,
    });
  };

  // Registrar una sesión web validada por Express.
  // No almacena el JWT de la cookie HttpOnly.
  const iniciarSesionWeb = (
    duracionSegundos: number
  ) => {
    if (
      !Number.isFinite(duracionSegundos) ||
      duracionSegundos <= 0
    ) {
      throw new Error('Duración de sesión web inválida');
    }

    setSesion({
      token: null,
      expiraEn: Date.now() + duracionSegundos * 1000,
    });
  };

  // Cerrar la sesión según la plataforma.
    const cerrarSesion = async (): Promise<void> => {
      if (Platform.OS === 'web') {
      // Esperar la confirmación de Express antes de
      // eliminar el estado de autenticación local.
        await cerrarSesionWebApi();
      }

    // En Android se limpia el estado local directamente.
    // En Web se limpia solo después del logout exitoso.
      setSesion(null);
    };


  const sesionActiva =
    sesion !== null && sesion.expiraEn > Date.now();

  return (
    <ContextoSesion.Provider
      value={{
        token: sesionActiva ? sesion.token : null,
        sesionActiva,
        verificandoSesionWeb,
        iniciarSesion,
        iniciarSesionWeb,
        cerrarSesion,
      }}
    >
      {children}
    </ContextoSesion.Provider>
  );
}

// Permite utilizar la sesión desde otras pantallas.
export function useSesion() {
  const contexto = useContext(ContextoSesion);

  if (!contexto) {
    throw new Error(
      'useSesion debe utilizarse dentro de SesionProvider'
    );
  }

  return contexto;
}
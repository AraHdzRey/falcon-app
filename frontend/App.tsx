import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet,
  StatusBar,
} from 'react-native';

type Empleado = {
  id: number;
  nombre: string;
  puesto: string;
};

const API_URL = 'http://192.168.100.33:3000/api/empleados';

export default function App() {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [nombre, setNombre] = useState('');
  const [puesto, setPuesto] = useState('');
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  // Consultar empleados registrados
  const obtenerEmpleados = async () => {
    setCargando(true);
    setError('');

    try {
      const respuesta = await fetch(API_URL);

      if (!respuesta.ok) {
        throw new Error('Error al consultar empleados');
      }

      const datos: Empleado[] = await respuesta.json();
      setEmpleados(datos);

    } catch (error) {
      setError('No se pudo conectar con el servidor FALCÓN');
    } finally {
      setCargando(false);
    }
  };

  // Registrar un nuevo empleado
  const guardarEmpleado = async () => {
    const nombreLimpio = nombre.trim();
    const puestoLimpio = puesto.trim();

    if (!nombreLimpio || !puestoLimpio) {
      Alert.alert(
        'Campos obligatorios',
        'Escribe el nombre y el puesto del empleado.'
      );
      return;
    }

    if (nombreLimpio.length > 100 || puestoLimpio.length > 100) {
      Alert.alert(
        'Datos demasiado largos',
        'Cada campo debe tener como máximo 100 caracteres.'
      );
      return;
    }

    setGuardando(true);

    try {
      const respuesta = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nombre: nombreLimpio,
          puesto: puestoLimpio,
        }),
      });

      if (!respuesta.ok) {
        throw new Error('No se pudo guardar el empleado');
      }

      Alert.alert(
        'Registro exitoso',
        'El empleado fue guardado correctamente.'
      );

      setNombre('');
      setPuesto('');

      await obtenerEmpleados();

    } catch (error) {
      Alert.alert(
        'Error',
        'No se pudo registrar el empleado.'
      );
    } finally {
      setGuardando(false);
    }
  };

  useEffect(() => {
    obtenerEmpleados();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <ScrollView keyboardShouldPersistTaps="handled">
        <Text style={styles.titulo}>FALCÓN</Text>

        <Text style={styles.subtitulo}>
          Sistema de Gestión de Empleados
        </Text>

        <Text style={styles.seccion}>
          Registrar empleado
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Nombre del empleado"
          placeholderTextColor="#64748B"
          value={nombre}
          onChangeText={setNombre}
          maxLength={100}
        />

        <TextInput
          style={styles.input}
          placeholder="Puesto del empleado"
          placeholderTextColor="#64748B"
          value={puesto}
          onChangeText={setPuesto}
          maxLength={100}
        />

        <TouchableOpacity
          style={[
            styles.boton,
            guardando && styles.botonDeshabilitado,
          ]}
          onPress={guardarEmpleado}
          disabled={guardando}
        >
          <Text style={styles.textoBoton}>
            {guardando ? 'Guardando...' : 'Guardar empleado'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.seccion}>
          Lista de empleados
        </Text>

        {cargando ? (
          <ActivityIndicator size="large" color="#60A5FA" />
        ) : error ? (
          <Text style={styles.error}>{error}</Text>
        ) : empleados.length === 0 ? (
          <Text style={styles.mensaje}>
            No hay empleados registrados.
          </Text>
        ) : (
          empleados.map((empleado) => (
            <View key={empleado.id} style={styles.tarjeta}>
              <Text style={styles.nombre}>
                {empleado.nombre}
              </Text>
              <Text style={styles.puesto}>
                Puesto: {empleado.puesto}
              </Text>
            </View>
          ))
        )}

        <TouchableOpacity
          style={styles.botonActualizar}
          onPress={obtenerEmpleados}
        >
          <Text style={styles.textoBoton}>
            Actualizar empleados
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#10243A',
    padding: 24,
    paddingTop: 60,
  },
  titulo: {
    fontSize: 38,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  subtitulo: {
    fontSize: 16,
    color: '#60A5FA',
    textAlign: 'center',
    marginBottom: 30,
  },
  seccion: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 15,
    marginTop: 20,
  },
  input: {
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 10,
    marginBottom: 12,
    color: '#10243A',
    fontSize: 16,
  },
  boton: {
    backgroundColor: '#16A34A',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  botonDeshabilitado: {
    opacity: 0.6,
  },
  botonActualizar: {
    backgroundColor: '#2563EB',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 15,
    marginBottom: 30,
  },
  textoBoton: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  tarjeta: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    marginBottom: 12,
  },
  nombre: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10243A',
  },
  puesto: {
    fontSize: 15,
    color: '#475569',
    marginTop: 5,
  },
  error: {
    color: '#FCA5A5',
    textAlign: 'center',
  },
  mensaje: {
    color: '#FFFFFF',
    textAlign: 'center',
  },
});
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';

type EmpleadoVista = {
  id: number;
  nombre: string;
  puesto: string;
};

const EMPLEADOS_DEMO: EmpleadoVista[] = [
  {
    id: 1,
    nombre: 'Empleado de ejemplo',
    puesto: 'Puesto de demostración',
  },
];

export default function EmpleadosScreen() {
  const [empleados, setEmpleados] =
    useState<EmpleadoVista[]>(EMPLEADOS_DEMO);

  const [nombre, setNombre] = useState('');
  const [puesto, setPuesto] = useState('');
  const [mensaje, setMensaje] = useState('');

  const guardarEnDemostracion = () => {
    const nombreLimpio = nombre.trim();
    const puestoLimpio = puesto.trim();

    if (!nombreLimpio || !puestoLimpio) {
      setMensaje('Completa el nombre y el puesto.');
      return;
    }

    if (
      nombreLimpio.length > 100 ||
      puestoLimpio.length > 100
    ) {
      setMensaje('Cada campo admite máximo 100 caracteres.');
      return;
    }

    setEmpleados((actuales) => [
      ...actuales,
      {
        id: Date.now(),
        nombre: nombreLimpio,
        puesto: puestoLimpio,
      },
    ]);

    setNombre('');
    setPuesto('');
    setMensaje(
      'Agregado a la demostración. No se guardó en PostgreSQL.'
    );
  };

  const restablecerDemostracion = () => {
    setEmpleados(EMPLEADOS_DEMO);
    setMensaje('Vista de demostración restablecida.');
  };

  return (
    <View style={styles.container}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.contenido}
      >
        <Text style={styles.titulo}>FALCÓN</Text>

        <Text style={styles.subtitulo}>
          Sistema de Gestión de Empleados
        </Text>

        <Text style={styles.aviso}>
          Vista de demostración: no se realizan consultas
          ni registros en el servidor.
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
          style={styles.boton}
          onPress={guardarEnDemostracion}
          accessibilityRole="button"
        >
          <Text style={styles.textoBoton}>
            Agregar a demostración
          </Text>
        </TouchableOpacity>

        {mensaje ? (
          <Text style={styles.mensaje}>{mensaje}</Text>
        ) : null}

        <Text style={styles.seccion}>
          Lista de empleados
        </Text>

        {empleados.map((empleado) => (
          <View key={empleado.id} style={styles.tarjeta}>
            <Text style={styles.nombre}>
              {empleado.nombre}
            </Text>
            <Text style={styles.puesto}>
              Puesto: {empleado.puesto}
            </Text>
          </View>
        ))}

        <TouchableOpacity
          style={styles.botonActualizar}
          onPress={restablecerDemostracion}
          accessibilityRole="button"
        >
          <Text style={styles.textoBoton}>
            Restablecer demostración
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
  },
  contenido: {
    padding: 24,
    paddingTop: 40,
    paddingBottom: 40,
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
    marginBottom: 24,
  },
  aviso: {
    color: '#FDE68A',
    textAlign: 'center',
    marginBottom: 12,
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
  mensaje: {
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 10,
  },
});

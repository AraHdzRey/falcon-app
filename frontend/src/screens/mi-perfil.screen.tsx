import { StyleSheet, Text, View } from 'react-native';

interface MiPerfilProps {
  name: string;
  employeeNumber: string;
  role: string;
}

const displayRole = (role: string): string =>
  role === 'administrador'
    ? 'Administrador'
    : role === 'ti'
      ? 'TI'
      : role === 'colaborador'
        ? 'Colaborador'
        : role.replace(/_/g, ' ');

export default function MiPerfilScreen({
  name,
  employeeNumber,
  role,
}: MiPerfilProps) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase())
    .join('');

  return (
    <View style={styles.screen}>
      <Text style={styles.heading}>Mi perfil</Text>

      <View style={styles.identity}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials || 'F'}</Text>
        </View>
        <View style={styles.identityText}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.role}>{displayRole(role)}</Text>
        </View>
      </View>

      <Text style={styles.section}>Información laboral</Text>
      <View style={styles.panel}>
        <View style={styles.row}>
          <Text style={styles.label}>ID de empleado</Text>
          <Text style={styles.value}>{employeeNumber}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.label}>Perfil de acceso</Text>
          <Text style={styles.value}>{displayRole(role)}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.label}>Puesto</Text>
          <Text style={styles.unavailable}>No disponible en piloto</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.label}>Área</Text>
          <Text style={styles.unavailable}>No disponible en piloto</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.label}>Antigüedad</Text>
          <Text style={styles.unavailable}>No disponible en piloto</Text>
        </View>
      </View>

      <Text style={styles.section}>Información personal</Text>
      <View style={styles.panel}>
        {['CURP', 'RFC', 'Cumpleaños'].map((field, index) => (
          <View key={field}>
            {index > 0 && <View style={styles.divider} />}
            <View style={styles.row}>
              <Text style={styles.label}>{field}</Text>
              <Text style={styles.unavailable}>No disponible</Text>
            </View>
          </View>
        ))}
      </View>

      <Text style={styles.note}>
        Esta vista muestra únicamente información disponible para el piloto.
        Los datos personales pendientes no se simulan ni se almacenan.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { gap: 14, paddingBottom: 12 },
  heading: {
    color: '#202020',
    fontSize: 25,
    fontWeight: '800',
    marginBottom: 4,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6E6E6',
    borderRadius: 15,
    padding: 18,
    gap: 15,
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#F7ECEC',
    borderWidth: 2,
    borderColor: '#B71C1C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 23,
    fontWeight: '800',
    color: '#A31320',
  },
  identityText: { flex: 1 },
  name: {
    fontSize: 20,
    fontWeight: '800',
    color: '#202020',
  },
  role: {
    fontSize: 14,
    color: '#666666',
    marginTop: 5,
    textTransform: 'capitalize',
  },
  section: {
    fontSize: 19,
    color: '#202020',
    fontWeight: '800',
    marginTop: 10,
  },
  panel: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6E6E6',
    borderRadius: 15,
    paddingHorizontal: 18,
  },
  row: {
    paddingVertical: 17,
    gap: 6,
  },
  label: {
    fontSize: 14,
    color: '#777777',
  },
  value: {
    fontSize: 16,
    fontWeight: '700',
    color: '#282828',
  },
  unavailable: {
    fontSize: 14,
    color: '#777777',
    fontStyle: 'italic',
  },
  divider: {
    height: 1,
    backgroundColor: '#EEEEEE',
  },
  note: {
    fontSize: 12,
    lineHeight: 18,
    color: '#777777',
    marginTop: 4,
  },
});

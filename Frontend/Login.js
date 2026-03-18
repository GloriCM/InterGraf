import React, { useState } from 'react';
// Herramientas para armar la pantalla de Login
import { StyleSheet, Text, View, TextInput, TouchableOpacity, SafeAreaView, StatusBar, Image, Alert, ActivityIndicator, Platform } from 'react-native';
// El icono circular del logo
import { Ionicons } from '@expo/vector-icons';
// Conexión directa a nuestra base de datos en Supabase
import { supabase } from './supabase';

export default function Login({ onRegisterPress, onRecoverPasswordPress, onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Estados para 2FA
  const [step, setStep] = useState(1);
  const [codigoGenerado, setCodigoGenerado] = useState('');
  const [codigoIngresado, setCodigoIngresado] = useState('');
  const [userData, setUserData] = useState(null);
  // Función para validar las credenciales al presionar 'Ingresar'
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Por favor ingresa correo y contraseña.");
      return;
    }

    setLoading(true);

    try {
      // Buscamos la empresa por correo y contraseña exactos
      const { data, error } = await supabase
        .from('Usuarios_Registrados')
        .select('*')
        .eq('correo', email)
        .eq('contrasena', password)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        // En lugar de pasar al dashboard, generamos el código 2FA
        const nuevoCodigo = Math.floor(100000 + Math.random() * 900000).toString();
        setCodigoGenerado(nuevoCodigo);
        setUserData(data);

        // Pasamos al paso 2: Seleccionar método de envío
        setStep(2);
      } else {
        // Si no coincide, avisamos al usuario
        if (Platform.OS === 'web') {
          window.alert("Error de acceso: Correo o contraseña incorrectos.");
        } else {
          Alert.alert("Error de acceso", "Correo o contraseña incorrectos.");
        }
      }
    } catch (err) {
      console.error("Error en login:", err.message);
      if (Platform.OS === 'web') {
        window.alert("Error: Ocurrió un error al intentar ingresar.");
      } else {
        Alert.alert("Error", "Ocurrió un error al intentar ingresar.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Función para manejar la selección del método de envío
  const handleSelectMethod = (metodo) => {
    const mensaje = `Simulando envío por ${metodo} a ${metodo === 'Correo' ? email : 'tu teléfono registrado'}.\n\nCódigo: ${codigoGenerado}`;

    // En la web, Alert.alert a veces no ejecuta el evento onPress correctamente
    if (Platform.OS === 'web') {
      window.alert(`Código de Verificación (Simulado)\n\n${mensaje}`);
      setStep(3); // Avanzamos al paso de verificación
    } else {
      Alert.alert(
        "Código de Verificación (Simulado)",
        mensaje,
        [{ text: "OK", onPress: () => setStep(3) }] // Avanzamos al paso de verificación
      );
    }
  };

  const handleVerifyCode = () => {
    if (!codigoIngresado) {
      Alert.alert("Error", "Por favor ingresa el código de verificación.");
      return;
    }

    if (codigoIngresado === codigoGenerado) {
      // Código correcto, pasamos al dashboard
      if (Platform.OS === 'web') {
        window.alert(`¡Verificación correcta! Ingresando al sistema...`);
      }
      onLoginSuccess(userData);
    } else {
      if (Platform.OS === 'web') {
        window.alert("Error: El código ingresado es incorrecto.");
      } else {
        Alert.alert("Error", "El código ingresado es incorrecto.");
      }
    }
  };

  const reSendCode = () => {
    // Si queremos reenviar, podríamos volver al selector o reenviar al último
    setStep(2); // Para que elija el método de nuevo
  };
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#020617" />
      <View style={styles.card}>
        <View style={styles.logoContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="aperture-outline" size={60} color="#0ea5e9" />
          </View>
          <Text style={styles.logoText}>INTERGEA</Text>
          <View style={styles.logoUnderline} />
        </View>

        <Text style={styles.accessTitle}>
          {step === 1 ? "ACCESO" : step === 2 ? "MÉTODO DE VERIFICACIÓN" : "VERIFICACIÓN 2FA"}
        </Text>
        <Text style={styles.description}>
          {step === 1
            ? "Plataforma industrial centralizada que se conecta con proveedores certificados"
            : step === 2
              ? "Selecciona dónde deseas recibir tu código de seguridad de 6 dígitos."
              : "Ingresa el código que te hemos enviado."}
        </Text>

        {step === 1 && (
          <>
            {/* Campo para el correo */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Correo electrónico:</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* Campo para la contraseña */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Contraseña:</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            {/* Botón principal de entrada con indicador de carga */}
            <TouchableOpacity
              style={[styles.loginButton, loading && { opacity: 0.7 }]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.loginButtonText}>Ingresar</Text>
              )}
            </TouchableOpacity>

            {/* Enlaces de ayuda para registro o olvido de clave */}
            <View style={styles.footerLinks}>
              <Text style={styles.footerTextText}>¿No tienes acceso?</Text>
              <TouchableOpacity onPress={onRegisterPress}>
                <Text style={styles.linkText}>Registrar Empresa</Text>
              </TouchableOpacity>

              <Text style={[styles.footerTextText, { marginTop: 15 }]}>¿Olvidaste tu contraseña?</Text>
              <TouchableOpacity onPress={onRecoverPasswordPress}>
                <Text style={styles.linkText}>Recuperar contraseña</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {step === 2 && (
          <View style={{ width: '100%', alignItems: 'center' }}>
            <TouchableOpacity
              style={[styles.loginButton, { width: '80%', marginBottom: 15, backgroundColor: '#0f766e' }]}
              onPress={() => handleSelectMethod('Correo')}
            >
              <Text style={styles.loginButtonText}>Recibir por Correo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.loginButton, { width: '80%', marginBottom: 25, backgroundColor: '#334155' }]}
              onPress={() => handleSelectMethod('SMS')}
            >
              <Text style={styles.loginButtonText}>Recibir por SMS</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setStep(1)}>
              <Text style={styles.linkText}>Volver al Acceso</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 3 && (
          <>
            {/* Campo para el código 2FA */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Código de Seguridad:</Text>
              <TextInput
                style={styles.input}
                value={codigoIngresado}
                onChangeText={setCodigoIngresado}
                keyboardType="numeric"
                maxLength={6}
                placeholder="123456"
                placeholderTextColor="#64748b"
              />
            </View>

            <TouchableOpacity
              style={styles.loginButton}
              onPress={handleVerifyCode}
            >
              <Text style={styles.loginButtonText}>Verificar Código</Text>
            </TouchableOpacity>

            <View style={styles.footerLinks}>
              <Text style={styles.footerTextText}>¿No recibiste el código?</Text>
              <TouchableOpacity onPress={reSendCode}>
                <Text style={styles.linkText}>Elegir otro método / Reenviar</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setStep(1)} style={{ marginTop: 15 }}>
                <Text style={styles.linkText}>Volver al Acceso</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

// Configuración estética de la pantalla de Login
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '85%',
    backgroundColor: '#0f172a',
    borderRadius: 40,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  logoText: {
    color: '#94a3b8',
    fontSize: 16,
    fontWeight: '300',
    letterSpacing: 4,
  },
  logoUnderline: {
    width: 100,
    height: 1,
    backgroundColor: '#0891b2',
    marginTop: 5,
  },
  accessTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  description: {
    color: '#94a3b8',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 20,
  },
  inputGroup: {
    width: '100%',
    marginBottom: 20,
  },
  label: {
    color: '#ffffff',
    fontSize: 14,
    marginBottom: 8,
    marginLeft: 5,
  },
  input: {
    backgroundColor: '#cbd5e1',
    borderRadius: 25,
    height: 40,
    paddingHorizontal: 20,
    fontSize: 16,
    color: '#0f172a',
  },
  loginButton: {
    backgroundColor: '#0891b2',
    width: '70%',
    height: 45,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 25,
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footerLinks: {
    alignItems: 'center',
  },
  footerTextText: {
    color: '#ffffff',
    fontSize: 13,
    marginBottom: 2,
  },
  linkText: {
    color: '#0891b2',
    fontSize: 13,
    fontWeight: 'bold',
  },
});

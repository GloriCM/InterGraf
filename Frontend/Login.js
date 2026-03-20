import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, SafeAreaView, StatusBar, Alert, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from './supabase';

export default function Login({ onRegisterPress, onRecoverPasswordPress, onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Función para validar las credenciales usando Supabase Auth
  const handleLogin = async () => {
    if (!email || !password) {
      if (Platform.OS === 'web') {
        window.alert("Por favor ingresa correo y contraseña.");
      } else {
        Alert.alert("Error", "Por favor ingresa correo y contraseña.");
      }
      return;
    }

    setLoading(true);

    try {
      // Intentar login con Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (authError) {
        setLoading(false);
        let mensaje = "Correo o contraseña incorrectos.";

        // Si el correo no está verificado, Supabase devuelve un error específico
        if (authError.message.includes('Email not confirmed')) {
          mensaje = "Tu correo aún no ha sido verificado. Revisa tu bandeja de entrada (o spam) y haz clic en el enlace de verificación.";
        }

        if (Platform.OS === 'web') {
          window.alert(mensaje);
        } else {
          Alert.alert("Error de acceso", mensaje);
        }
        return;
      }

      // Login exitoso en Auth, ahora obtenemos los datos de la empresa
      const authUserId = authData.user.id;

      const { data: empresaData, error: empresaError } = await supabase
        .from('Usuarios_Registrados')
        .select('*')
        .eq('auth_user_id', authUserId)
        .maybeSingle();

      if (empresaError) {
        setLoading(false);
        alert("Error al obtener datos de la empresa.");
        return;
      }

      if (!empresaData) {
        setLoading(false);
        // Usuario existe en Auth pero no en nuestra tabla (caso raro)
        if (Platform.OS === 'web') {
          window.alert("No se encontraron datos de empresa asociados a esta cuenta.");
        } else {
          Alert.alert("Error", "No se encontraron datos de empresa asociados a esta cuenta.");
        }
        return;
      }

      // Actualizar estado a Verificado si aún está pendiente (el login exitoso confirma verificación)
      if (empresaData.estado === 'Pendiente de verificación') {
        await supabase
          .from('Usuarios_Registrados')
          .update({ estado: 'Verificado' })
          .eq('id', empresaData.id);
        empresaData.estado = 'Verificado';
      }

      setLoading(false);
      onLoginSuccess(empresaData);

    } catch (err) {
      setLoading(false);
      console.error("Error en login:", err.message);
      if (Platform.OS === 'web') {
        window.alert("Ocurrió un error al intentar ingresar.");
      } else {
        Alert.alert("Error", "Ocurrió un error al intentar ingresar.");
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#020617" />
      <View style={styles.card}>
        <View style={styles.logoContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="aperture-outline" size={60} color="hsla(199, 54%, 50%, 1.00)" />
          </View>
          <Text style={styles.logoText}>INTERGEA</Text>
          <View style={styles.logoUnderline} />
        </View>

        <Text style={styles.accessTitle}>ACCESO</Text>
        <Text style={styles.description}>
          Plataforma industrial centralizada que se conecta con proveedores certificados
        </Text>

        {/* Campo para el correo */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Correo electrónico:</Text>
          <TextInput
            style={styles.input}
            value={email}
            autoComplete="off"
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
            autoComplete="off"
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
            <ActivityIndicator color="#ffffff" />
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
      </View>
    </SafeAreaView>
  );
}

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

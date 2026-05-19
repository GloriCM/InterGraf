import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, SafeAreaView, StatusBar, Alert, ActivityIndicator, Platform, KeyboardAvoidingView, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { registerForPushNotificationsAsync } from './App';

export default function Login({ onRegisterPress, onRecoverPasswordPress, onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [keepLoggedIn, setKeepLoggedIn] = useState(false);

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
      console.log("Procediendo directamente a Auth (Bypass Pre-vuelo)...");
      console.log("Intentando signInWithPassword (v1.3.3)...");

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      console.log("Respuesta Auth recibida:", authData ? "Éxito" : "Sin Datos");

      if (authError) {
        setLoading(false);
        let mensaje = "Correo o contraseña incorrectos.";
        if (authError.message.includes('Email confirmed')) {
           // Nota: El error 'Email confirmed' suele ser lo opuesto, 
           // pero mantenemos la lógica de verificación por si acaso.
        }
        
        if (Platform.OS === 'web') window.alert(authError.message);
        else Alert.alert("Error de acceso", authError.message);
        return;
      }

      console.log("Login exitoso en Auth. Obteniendo perfil...");
      
      // 2. Obtener los datos del perfil inmediatamente (más confiable que esperar al listener global)
      const { data: dbUser, error: dbError } = await supabase
        .from('Usuarios_Registrados')
        .select('*')
        .eq('auth_user_id', authData.user.id)
        .maybeSingle();

      if (dbError) {
        console.error("Error al obtener perfil en login:", dbError);
        throw new Error("No pudimos cargar tu perfil. Revisa tu conexión.");
      }

      if (!dbUser) {
        console.warn("Perfil no encontrado para:", authData.user.id);
        Alert.alert("Perfil no encontrado", "Tu cuenta existe pero no hay datos de empresa. Contacta soporte.");
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      console.log("Perfil obtenido con éxito. Redirigiendo...");

      // 3. Registrar para notificaciones y guardar el token
      try {
        const pushToken = await registerForPushNotificationsAsync();
        if (pushToken) {
          console.log("Guardando push_token en perfil:", pushToken);
          await supabase
            .from('Usuarios_Registrados')
            .update({ push_token: pushToken })
            .eq('auth_user_id', authData.user.id);
        }
      } catch (e) {
        console.log("Error al registrar notificaciones:", e);
      }

      // Guardar preferencia de mantener sesión iniciada
      try {
        if (keepLoggedIn) {
          await AsyncStorage.setItem('keepLoggedIn', 'true');
        } else {
          await AsyncStorage.setItem('keepLoggedIn', 'false');
        }
      } catch (asyncErr) {
        console.error("Error al guardar persistencia:", asyncErr);
      }

      onLoginSuccess(dbUser);
      setLoading(false);

    } catch (err) {
      setLoading(false);
      console.error("Error crítico en login:", err.message);
      if (Platform.OS === 'web') window.alert("Error: " + err.message);
      else Alert.alert("Error", err.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#020617" />
      <KeyboardAvoidingView
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        style={{ flex: 1, width: '100%' }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center' }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <View style={styles.logoContainer}>
              <Image
                source={require('./assets/LOGO-completo.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
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
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  value={password}
                  autoComplete="off"
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color="#475569"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Mantener sesión iniciada */}
            <TouchableOpacity 
              style={styles.rememberMeContainer} 
              onPress={() => setKeepLoggedIn(!keepLoggedIn)}
              activeOpacity={0.8}
            >
              <View style={[styles.checkbox, keepLoggedIn && styles.checkboxChecked]}>
                {keepLoggedIn && <Ionicons name="checkmark" size={14} color="#ffffff" />}
              </View>
              <Text style={styles.rememberMeText}>Mantener sesión iniciada</Text>
            </TouchableOpacity>

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

            {/* Etiqueta de versión para control de actualizaciones */}
            <Text style={styles.versionTag}>v1.8.0 - InterGea (Modern Header)</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  logoImage: {
    width: 280,
    height: 120,
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
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#cbd5e1',
    borderRadius: 25,
    height: 40,
  },
  passwordInput: {
    flex: 1,
    height: 40,
    paddingHorizontal: 20,
    fontSize: 16,
    color: '#0f172a',
  },
  eyeButton: {
    paddingHorizontal: 15,
    height: '100%',
    justifyContent: 'center',
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
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
    paddingHorizontal: 5,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#475569',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    backgroundColor: 'transparent',
  },
  checkboxChecked: {
    backgroundColor: '#0891b2',
    borderColor: '#0891b2',
  },
  rememberMeText: {
    color: '#cbd5e1',
    fontSize: 14,
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
  versionTag: {
    marginTop: 20,
    color: '#475569',
    fontSize: 10,
    fontWeight: '300',
  },
});

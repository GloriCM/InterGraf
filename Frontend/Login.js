import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, SafeAreaView, StatusBar, Alert, ActivityIndicator, Platform, KeyboardAvoidingView, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from './supabase';

export default function Login({ onRegisterPress, onRecoverPasswordPress, onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
      console.log("Iniciando Pre-vuelo de conectividad (v1.3.3)...");
      const { data: pingData, error: pingError } = await supabase.from('Usuarios_Registrados').select('id').limit(1);
      
      if (pingError) {
        console.error("Fallo de Pre-vuelo (Conexión/CORS):", pingError.message);
        throw new Error("PRE_VUELO_FALLIDO: " + pingError.message);
      }
      console.log("Pre-vuelo EXITOSO. Procediendo a Auth...");

      console.log("Intentando signInWithPassword (v1.3.3)...");
      
      // Definimos un tiempo de espera de 12 segundos para no dejar al usuario colgado
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("TIEMPO_EXCEDIDO")), 12000)
      );

      // Carrera entre la petición real y el timeout
      const { data: authData, error: authError } = await Promise.race([
        supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim(),
        }),
        timeoutPromise
      ]);

      console.log("Respuesta Auth recibida:", authData ? "Éxito" : "Sin Datos");

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
      console.log("Buscando empresa en DB para UID:", authUserId);

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
      
      let errorMsg = "Ocurrió un error al intentar ingresar.";
      if (err.message === "TIEMPO_EXCEDIDO") {
        errorMsg = "La conexión está tardando demasiado. Revisa tu internet o intenta de nuevo.";
      } else if (err.message.includes("PRE_VUELO_FALLIDO")) {
          errorMsg = "No se pudo conectar con el servidor. Verifica que no tengas extensiones bloqueadoras o problemas de red.";
      }

      if (Platform.OS === 'web') {
        window.alert(errorMsg);
      } else {
        Alert.alert("Error", errorMsg);
      }
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
            <Text style={styles.versionTag}>v1.4.5 - InterGea (Un-delete Fix)</Text>
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

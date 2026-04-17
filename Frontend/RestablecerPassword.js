import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, SafeAreaView, StatusBar, Alert, ActivityIndicator, Platform, KeyboardAvoidingView, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from './supabase';

/**
 * Componente para establecer una nueva contraseña (Validación y actualización.)
 */
export default function RestablecerPassword({ onBack, onResetSuccess, recoveryToken, recoveryRefresh }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeUserEmail, setActiveUserEmail] = useState(null);
  const [sessionCheckTimeout, setSessionCheckTimeout] = useState(false);

  // Al cargar, intentamos ver si ya hay una sesión activa para mostrar el correo
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setActiveUserEmail(session.user.email);
      } else {
        // Ponemos un cronómetro de 5 segundos
        const timer = setTimeout(() => {
          if (!activeUserEmail) setSessionCheckTimeout(true);
        }, 5000);
        return () => clearTimeout(timer);
      }
    };
    checkSession();
  }, []);

  /**
   * Valida que la contraseña cumpla con las políticas de seguridad:
   * - Longitud entre 7 y 15 caracteres.
   * - Al menos un número.
   * - Al menos un símbolo/carácter especial.
   */
  const validatePassword = (pass) => {
    const minLength = 7;
    const maxLength = 15;
    const hasNumber = /\d/.test(pass);
    const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(pass);

    if (pass.length < minLength || pass.length > maxLength) {
      return `La contraseña debe tener entre ${minLength} y ${maxLength} caracteres.`;
    }
    if (!hasNumber) {
      return "La contraseña debe tener al menos un número.";
    }
    if (!hasSymbol) {
      return "La contraseña debe tener al menos un símbolo.";
    }
    return null; // Todo correcto
  };

  // Función para actualizar la contraseña en Supabase
  const handleUpdatePassword = async () => {
    // 1. Verificar que ambas contraseñas coincidan
    if (password !== confirmPassword) {
      const msg = "Las contraseñas no coinciden.";
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert("Error", msg);
      return;
    }

    // 2. Aplicar reglas de complejidad del requerimiento
    const validationError = validatePassword(password);
    if (validationError) {
      if (Platform.OS === 'web') window.alert(validationError);
      else Alert.alert("Requisitos de seguridad", validationError);
      return;
    }

    setLoading(true);

    try {
      // RE-INYECCIÓN DE SESIÓN: Garantizamos que la sesión esté viva justo antes de guardar
      if (recoveryToken) {
        console.log("Re-inyectando sesión antes de actualizar...");
        const { error: sError } = await supabase.auth.setSession({
          access_token: recoveryToken,
          refresh_token: recoveryRefresh || "",
        });
        if (sError) console.error("Error en setSession:", sError.message);
        
        // FORZAMOS sincronización del cliente recuperando el usuario explícitamente
        const { data: { user } } = await supabase.auth.getUser();
        if (user) setActiveUserEmail(user.email);
      }

      const { data: { session } } = await supabase.auth.getSession();
      console.log("Sesión verificada antes de update:", session ? session.user.email : "NULA");
      if (!session) {
        throw new Error("No hay sesión activa. Por favor, reabre el enlace de tu correo.");
      }

      /**
       * supabase.auth.updateUser permite actualizar la contraseña del usuario actual.
       */
      const { error } = await supabase.auth.updateUser({ password: password });

      if (error) throw error;

      const successMsg = "Tu contraseña ha sido actualizada con éxito.";
      if (Platform.OS === 'web') window.alert(successMsg);
      else Alert.alert("Éxito", successMsg);
      
      onResetSuccess();
    } catch (err) {
      console.error("Error al actualizar contraseña:", err.message);
      const errorMsg = "No se pudo actualizar: " + err.message;
      if (Platform.OS === 'web') window.alert(errorMsg);
      else Alert.alert("Error", errorMsg);
    } finally {
      setLoading(false);
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
              <View style={styles.iconCircle}>
                <Ionicons name="lock-closed-outline" size={60} color="hsla(199, 54%, 50%, 1.00)" />
              </View>
              <Text style={styles.logoText}>SEGURIDAD</Text>
              <View style={styles.logoUnderline} />
            </View>

            <Text style={styles.accessTitle}>Nueva Contraseña</Text>
            <Text style={styles.description}>
              Crea una nueva contraseña que cumpla con las políticas de seguridad corporativa.
            </Text>

            {/* Campo para la nueva clave */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nueva Contraseña:</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity style={styles.eyeButton} onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#475569" />
                </TouchableOpacity>
              </View>
              <Text style={styles.hint}>7-15 caracteres, 1 número, 1 símbolo.</Text>
            </View>
            

            
            {/* Campo para confirmar la clave */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirmar Contraseña:</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity style={styles.eyeButton} onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                  <Ionicons name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#475569" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Indicador de sesión activa con advertencia de timeout */}
            <Text style={[styles.sessionStatus, sessionCheckTimeout && { color: '#ef4444' }]}>
              {activeUserEmail 
                ? `Listo para actualizar: ${activeUserEmail}` 
                : (sessionCheckTimeout 
                    ? "Sesión no detectada. Por favor, reabre el link de tu correo." 
                    : "Verificando sesión...")
              }
            </Text>

            {/* Botón para aplicar el cambio */}
            <TouchableOpacity
              style={[styles.submitButton, loading && { opacity: 0.7 }]}
              onPress={handleUpdatePassword}
              disabled={loading}
            >
              <Text style={styles.submitButtonText}>{loading ? 'Guardando...' : 'Actualizar Contraseña'}</Text>
            </TouchableOpacity>

            {/* Botón para cancelar y volver */}
            <TouchableOpacity onPress={onBack} style={{ marginTop: 20 }}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>

            {/* Etiqueta de versión al final para no estorbar */}
            <Text style={styles.versionTagFooter}>v1.4.5 - InterGea (Un-delete Fix)</Text>
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
  hint: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 5,
    marginLeft: 10,
  },
  submitButton: {
    backgroundColor: '#0891b2',
    width: '80%',
    height: 45,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelText: {
    color: '#0891b2',
    fontSize: 14,
    fontWeight: '500',
  },
  versionTagFooter: {
    color: '#475569',
    fontSize: 10,
    marginTop: 40,
    marginBottom: 10,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  sessionStatus: {
    color: '#10b981',
    fontSize: 11,
    marginBottom: 15,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

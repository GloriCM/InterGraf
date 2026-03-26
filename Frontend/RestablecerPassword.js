import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, SafeAreaView, StatusBar, Alert, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from './supabase';

/**
 * Componente para establecer una nueva contraseña (Validación y actualización.)
 */
export default function RestablecerPassword({ onBack, onResetSuccess }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

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
      /**
       * supabase.auth.updateUser permite actualizar la contraseña del usuario actual.
       * El usuario tiene una sesión activa temporal gracias al token de recuperación.
       */
      const { error } = await supabase.auth.updateUser({ password: password });

      if (error) throw error;

      const successMsg = "Tu contraseña ha sido actualizada con éxito.";
      if (Platform.OS === 'web') window.alert(successMsg);
      else Alert.alert("Éxito", successMsg);
      
      // Llamar al callback de éxito para navegar al login
      onResetSuccess();
    } catch (err) {
      console.error("Error al actualizar contraseña:", err.message);
      const errorMsg = "No se pudo actualizar la contraseña. El enlace puede haber expirado.";
      if (Platform.OS === 'web') window.alert(errorMsg);
      else Alert.alert("Error", errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#020617" />
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
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
          />
          <Text style={styles.hint}>7-15 caracteres, 1 número, 1 símbolo.</Text>
        </View>

        {/* Campo para confirmar la clave */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Confirmar Contraseña:</Text>
          <TextInput
            style={styles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            autoCapitalize="none"
          />
        </View>

        {/* Botón para aplicar el cambio */}
        <TouchableOpacity
          style={[styles.actionButton, loading && { opacity: 0.7 }]}
          onPress={handleUpdatePassword}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.actionButtonText}>Actualizar Contraseña</Text>
          )}
        </TouchableOpacity>

        {/* Opción para cancelar y volver */}
        <TouchableOpacity onPress={onBack} style={{ marginTop: 15 }}>
          <Text style={styles.linkText}>Cancelar</Text>
        </TouchableOpacity>
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
  hint: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 5,
    marginLeft: 10,
  },
  actionButton: {
    backgroundColor: '#0891b2',
    width: '80%',
    height: 45,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  linkText: {
    color: '#0891b2',
    fontSize: 14,
    fontWeight: '500',
  },
});

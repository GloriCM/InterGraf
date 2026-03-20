import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, SafeAreaView, StatusBar, Alert, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from './supabase';

/**
 * Componente para solicitar el enlace de recuperación de contraseña.
 * RF-004: Recuperación de contraseña - Paso 1: Solicitud por correo.
 */
export default function RecuperarPassword({ onBack }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  // Función para procesar la solicitud de restablecimiento
  const handleResetRequest = async () => {
    // Validación básica de entrada
    if (!email) {
      const msg = "Por favor ingresa tu correo electrónico.";
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert("Error", msg);
      return;
    }

    setLoading(true);

    try {
      /**
       * supabase.auth.resetPasswordForEmail envía un correo con un enlace único.
       * El enlace incluye un token que redirige al usuario de vuelta a la aplicación.
       */
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        // Redirige a la URL de origen en web, o un esquema personalizado en móvil
        redirectTo: Platform.OS === 'web' ? window.location.origin : 'intergraf://reset-password',
      });

      if (error) {
        throw error;
      }

      const successMsg = "Se ha enviado un enlace de recuperación a tu correo.";
      if (Platform.OS === 'web') window.alert(successMsg);
      else Alert.alert("Éxito", successMsg);
      
      // Volver a la pantalla de login tras el éxito
      onBack();
    } catch (err) {
      console.error("Error en recuperación:", err.message);
      const errorMsg = "No se pudo enviar el correo de recuperación. Verifica que el correo sea válido.";
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
        {/* Botón para regresar al login */}
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#0891b2" />
        </TouchableOpacity>

        <View style={styles.logoContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="mail-outline" size={60} color="hsla(199, 54%, 50%, 1.00)" />
          </View>
          <Text style={styles.logoText}>RECUPERACIÓN</Text>
          <View style={styles.logoUnderline} />
        </View>

        <Text style={styles.accessTitle}>Recuperar Clave</Text>
        <Text style={styles.description}>
          Ingresa tu correo corporativo y te enviaremos un enlace para restablecer tu contraseña.
        </Text>

        {/* Campo de entrada para el correo */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Correo electrónico:</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="ejemplo@empresa.com"
            placeholderTextColor="#64748b"
          />
        </View>

        {/* Botón de acción con estado de carga */}
        <TouchableOpacity
          style={[styles.actionButton, loading && { opacity: 0.7 }]}
          onPress={handleResetRequest}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.actionButtonText}>Enviar Enlace</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// Estilos visuales del componente (Glassmorphism / Dark Mode)
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
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    padding: 10,
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
  actionButton: {
    backgroundColor: '#0891b2',
    width: '70%',
    height: 45,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, SafeAreaView, StatusBar, Alert, ActivityIndicator, Platform, KeyboardAvoidingView, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from './supabase';
import * as Linking from 'expo-linking';

/**
 * Componente para solicitar el enlace de recuperación de contraseña (Solicitud por correo.)
 */
export default function RecuperarPassword({ onBack }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Efecto para manejar el contador de enfriamiento del botón
  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  // Función para procesar la solicitud de restablecimiento
  const handleResetRequest = async () => {
    // Validación básica de entrada
    if (!email) {
      const msg = "Por favor ingresa tu correo electrónico.";
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert("Error", msg);
      return;
    }

    if (cooldown > 0) {
      const waitMsg = `Por seguridad, espera ${cooldown} segundos antes de solicitar otro enlace.`;
      if (Platform.OS === 'web') window.alert(waitMsg);
      else Alert.alert("Espera un momento", waitMsg);
      return;
    }

    setLoading(true);

    try {
      // **NUEVO**: Verificar si el correo existe en nuestra tabla antes de enviar nada
      const { data: userRecord, error: userError } = await supabase
        .from('Usuarios_Registrados')
        .select('id')
        .eq('correo', email)
        .maybeSingle();

      if (userError) {
        throw new Error("Error al verificar el correo.");
      }

      if (!userRecord) {
        setLoading(false);
        const nonExistentMsg = "Este correo no se encuentra registrado en nuestra base de datos.";
        if (Platform.OS === 'web') window.alert(nonExistentMsg);
        else Alert.alert("Error", nonExistentMsg);
        return;
      }

      /**
       * supabase.auth.resetPasswordForEmail envía un correo con un enlace único.
       * El enlace incluye un token que redirige al usuario de vuelta a la aplicación.
       */
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        // Redirige a la URL de origen en web, o a la app en móvil usando el nuevo esquema
        redirectTo: Linking.createURL('reset-password'),
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
      let errorMsg = "No se pudo enviar el correo: " + err.message;
      
      // Manejo específico del error de Rate Limit de Supabase
      if (err.message.includes("10 seconds") || err.message.includes("Too many requests")) {
        errorMsg = "Por seguridad, debes esperar un momento entre solicitudes. Inténtalo de nuevo en unos segundos.";
        setCooldown(60); // Bloqueamos por 1 minuto si el servidor nos rechaza
      }

      if (Platform.OS === 'web') window.alert(errorMsg);
      else Alert.alert("Error", errorMsg);
    } finally {
      setLoading(false);
      // Tras un intento (exitoso o no), ponemos un pequeño cooldown preventivo de 10s
      if (cooldown === 0) setCooldown(10);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#020617" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        style={{ flex: 1, width: '100%' }}
      >
        <ScrollView 
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center' }}
          keyboardShouldPersistTaps="handled"
        >
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

            {/* Etiqueta de versión para control de actualizaciones */}
            <Text style={styles.versionTagFooter}>v1.4.5 - InterGea (Un-delete Fix)</Text>
            
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

            {/* Botón de acción con estado de carga y cooldown */}
            <TouchableOpacity
              style={[styles.actionButton, (loading || cooldown > 0) && { opacity: 0.7 }]}
              onPress={handleResetRequest}
              disabled={loading || cooldown > 0}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.actionButtonText}>
                  {cooldown > 0 ? `Esperar (${cooldown}s)` : 'Enviar Enlace'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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

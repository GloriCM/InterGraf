import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, SafeAreaView, StatusBar, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function Login({ onRegisterPress, onRecoverPasswordPress }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#020617" />
      <View style={styles.card}>
        <View style={styles.logoContainer}>
          <View style={styles.iconCircle}> {/*AQUI SE PONE EL ICONO DEL LOGO*/}
            <Ionicons name="aperture-outline" size={60} color="#0ea5e9" />
          </View>
          <Text style={styles.logoText}>INTERGEA</Text>
          <View style={styles.logoUnderline} />
        </View>

        <Text style={styles.accessTitle}>ACCESO</Text>
        <Text style={styles.description}>
          Plataforma industrial centralizada que se conecta con proveedores certificados en la industria de gráficas
        </Text>
        {/*Ingreso de correo */}
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
        {/*Ingreso de contraseña */}
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
        {/*Boton de ingresar */}
        <TouchableOpacity style={styles.loginButton}>
          <Text style={styles.loginButtonText}>Ingresar</Text>
        </TouchableOpacity>

        {/*Boton de registrar */}
        <View style={styles.footerLinks}>
          <Text style={styles.footerTextText}>¿No tienes acceso?</Text>
          <TouchableOpacity onPress={onRegisterPress}>
            <Text style={styles.linkText}>Registrar Empresa</Text>
          </TouchableOpacity>

          {/*Boton de recuperar contraseña */}
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

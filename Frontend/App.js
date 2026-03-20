import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, StatusBar, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from './supabase';
import Login from './Login';
import CrearProducto from './CrearProducto';
import Inventario from './Inventario';
import Registro from './Registro';

export default function App() {
  // Manejamos en qué pantalla estamos (login, registro o dashboard)
  const [currentScreen, setCurrentScreen] = useState('login');

  // Datos de la empresa después de loguearse con éxito
  const [userData, setUserData] = useState(null); 

  // Si el usuario está en la pantalla de Login
  if (currentScreen === 'login') {
    return (
      <Login
        onRegisterPress={() => setCurrentScreen('register')}
        onRecoverPasswordPress={() => alert('Próximamente: Recuperar contraseña')}
        onLoginSuccess={(data) => {
          setUserData(data);
          setCurrentScreen('dashboard');
        }}
      />
    );
  }

  // Si el usuario ya entró con éxito (Panel de Bienvenida)
  if (currentScreen === 'dashboard' && userData) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
        <View style={styles.dashboardContainer}>
          <Ionicons name="aperture" size={80} color="#0891b2" />
          <Text style={styles.welcomeText}>¡Bienvenido!</Text>
          <Text style={styles.companyNameText}>{userData.razon_social}</Text>
          
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>NIT: <Text style={styles.infoValue}>{userData.numero_documento}</Text></Text>
            <Text style={styles.infoLabel}>Ciudad: <Text style={styles.infoValue}>{userData.ciudad}</Text></Text>
            <Text style={styles.infoLabel}>Sector: <Text style={styles.infoValue}>{userData.sector_empresarial}</Text></Text>
          </View>

          <TouchableOpacity 
            style={[styles.logoutButton, { backgroundColor: '#10b981', marginBottom: 15 }]} 
            onPress={() => setCurrentScreen('inventario')}
          >
            <Text style={styles.logoutButtonText}>Gestionar Inventario</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.logoutButton, { backgroundColor: '#0ea5e9', marginBottom: 15 }]} 
            onPress={() => setCurrentScreen('crear_producto')}
          >
            <Text style={styles.logoutButtonText}>Publicar Nuevo Producto</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.logoutButton, { backgroundColor: '#ef4444' }]} 
            onPress={async () => {
              await supabase.auth.signOut();
              setUserData(null);
              setCurrentScreen('login');
            }}
          >
            <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Pantalla de Crear Producto
  if (currentScreen === 'crear_producto') {
    return <CrearProducto onBack={() => setCurrentScreen('dashboard')} onNavigate={setCurrentScreen} />;
  }

  // Pantalla de Inventario
  if (currentScreen === 'inventario') {
    return <Inventario onBack={() => setCurrentScreen('dashboard')} onNavigate={setCurrentScreen} />;
  }

  // Pantalla de Registro (componente aislado con su propio estado)
  return (
    <Registro
      onBack={() => setCurrentScreen('login')}
      onRegistrationSuccess={(data) => {
        setCurrentScreen('login');
        if (Platform.OS === 'web') {
          window.alert("¡Registro Exitoso! Revisa tu correo electrónico para verificar tu cuenta antes de iniciar sesión.");
        } else {
          alert("¡Registro Exitoso! Revisa tu correo electrónico para verificar tu cuenta antes de iniciar sesión.");
        }
      }}
    />
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#020617',
  },
  dashboardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#020617',
  },
  welcomeText: {
    color: '#94a3b8',
    fontSize: 18,
    marginTop: 20,
  },
  companyNameText: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: '#0f172a',
    width: '90%',
    padding: 25,
    borderRadius: 20,
    marginBottom: 40,
  },
  infoLabel: {
    color: '#94a3b8',
    fontSize: 14,
    marginBottom: 10,
  },
  infoValue: {
    color: '#ffffff',
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
  },
  logoutButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

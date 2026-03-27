import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, StatusBar, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from './supabase';
import Login from './Login';
import CrearProducto from './CrearProducto';
import Inventario from './Inventario';
import Registro from './Registro';
import RecuperarPassword from './RecuperarPassword';
import RestablecerPassword from './RestablecerPassword';
import Perfil from './Perfil';
import Mensajeria from './Mensajeria';
import { useEffect } from 'react';

export default function App() {
  // Manejamos en qué pantalla estamos (login, registro o dashboard)
  const [currentScreen, setCurrentScreen] = useState('login');

  // Datos de la empresa después de loguearse con éxito
  const [userData, setUserData] = useState(null); 

  // Datos del producto seleccionado para editar
  const [selectedProduct, setSelectedProduct] = useState(null);

  /**
   * Efecto para escuchar eventos de autenticación globales de Supabase.
   * Detecta cuando el usuario llega desde un correo de recuperación de contraseña.
   */
  useEffect(() => {
    // Listener de Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Evento Auth Detectado:", event);
      
      // Si el evento es PASSWORD_RECOVERY, mostramos la pantalla de nueva contraseña
      if (event === 'PASSWORD_RECOVERY') {
        setCurrentScreen('reset_password');
      }
    });

    // Limpieza del listener al desmontar el componente
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Si el usuario está en la pantalla de Login
  if (currentScreen === 'login') {
    return (
      <Login
        onRegisterPress={() => setCurrentScreen('register')}
        onRecoverPasswordPress={() => setCurrentScreen('recover_password')}
        onLoginSuccess={(data) => {
          setUserData(data);
          setCurrentScreen('dashboard');
        }}
      />
    );
  }

  // Pantalla de Recuperar Contraseña (Solicitud)
  if (currentScreen === 'recover_password') {
    return (
      <RecuperarPassword 
        onBack={() => setCurrentScreen('login')} 
      />
    );
  }

  // Pantalla de Restablecer Contraseña (Nueva clave)
  if (currentScreen === 'reset_password') {
    return (
      <RestablecerPassword 
        onBack={() => setCurrentScreen('login')}
        onResetSuccess={() => {
          setCurrentScreen('login');
          if (Platform.OS === 'web') {
            window.alert("¡Contraseña actualizada! Ya puedes iniciar sesión con tu nueva clave.");
          } else {
            alert("¡Contraseña actualizada! Ya puedes iniciar sesión con tu nueva clave.");
          }
        }}
      />
    );
  }

  // Si el usuario ya entró con éxito (Panel de Bienvenida)
  if (currentScreen === 'dashboard' && userData) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#0B1120" />
        <View style={styles.dashboardContainer}>
          <View style={styles.iconContainer}>
            <Ionicons name="shield-checkmark" size={36} color="#3b82f6" />
          </View>
          
          <Text style={styles.welcomeText}>¡Bienvenido!</Text>
          <Text style={styles.companyNameText}>{userData.razon_social}</Text>
          <Text style={styles.subtitleText}>Selecciona tu rol inicial</Text>
          
          <TouchableOpacity 
            style={styles.roleCard} 
            // onPress={() => setCurrentScreen('comprador')} // Descomenta cuando tengas la pantalla
          >
            <View style={[styles.roleIconContainer, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
              <Ionicons name="cart-outline" size={24} color="#3b82f6" />
            </View>
            <Text style={styles.roleTitle}>Comprador</Text>
            <Text style={styles.roleSubtitle}>ADQUIRIR INSUMOS</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.roleCard} 
            onPress={() => setCurrentScreen('inventario')}
          >
            <View style={[styles.roleIconContainer, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
              <Ionicons name="trending-up-outline" size={24} color="#10b981" />
            </View>
            <Text style={styles.roleTitle}>Vendedor</Text>
            <Text style={styles.roleSubtitle}>GESTIONAR BODEGA</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.logoutTextButton} 
            onPress={async () => {
              await supabase.auth.signOut();
              setUserData(null);
              setCurrentScreen('login');
            }}
          >
            <Text style={styles.logoutText}>Cerrar Sesión</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }


  // Pantalla de Crear Producto
  if (currentScreen === 'crear_producto') {
    return <CrearProducto userData={userData} onBack={() => setCurrentScreen('dashboard')} onNavigate={setCurrentScreen} />;
  }

  // Pantalla de Editar Producto
  if (currentScreen === 'editar_producto') {
    return (
      <CrearProducto 
        onBack={() => setCurrentScreen('inventario')} 
        onNavigate={setCurrentScreen} 
        producto={selectedProduct}
        userData={userData}
      />
    );
  }

  // Pantalla de Mensajeria
  if (currentScreen === 'mensajeria') {
    return <Mensajeria onBack={() => setCurrentScreen('dashboard')} onNavigate={setCurrentScreen} />;
  }

  // Pantalla de Inventario
  if (currentScreen === 'inventario') {
    return (
      <Inventario 
        onBack={() => setCurrentScreen('dashboard')} 
        userData={userData}
        onNavigate={(screen, extraData) => {
          if (screen === 'editar_producto') {
            setSelectedProduct(extraData);
          }
          setCurrentScreen(screen);
        }} 
      />
    );
  }

  // Pantalla de Perfil
  if (currentScreen === 'perfil') {
    return (
      <Perfil 
        userData={userData} 
        onUpdate={setUserData} 
        onBack={() => setCurrentScreen('dashboard')} 
        onNavigate={setCurrentScreen} 
      />
    );
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
    backgroundColor: '#0B1120',
  },
  dashboardContainer: {
    flex: 1,
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#0B1120',
    paddingTop: 80,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  welcomeText: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  companyNameText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
  },
  subtitleText: {
    color: '#94a3b8',
    fontSize: 16,
    marginBottom: 48,
  },
  roleCard: {
    backgroundColor: '#0F172A',
    width: '100%',
    padding: 24,
    borderRadius: 24,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  roleIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  roleTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  roleSubtitle: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
  logoutTextButton: {
    marginTop: 'auto',
    marginBottom: 20,
    padding: 10,
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '500',
  },
});

import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, StatusBar, Platform, Linking as RNLinking, Alert } from 'react-native';
import * as Linking from 'expo-linking';
import { supabase } from './supabase';
import Login from './Login';
import Registro from './Registro';
import RecuperarPassword from './RecuperarPassword';
import RestablecerPassword from './RestablecerPassword';
import Inventario from './Inventario';
import Perfil from './Perfil';
import Mensajeria from './Mensajeria';
import DetalleProducto from './DetalleProducto';
import PedidosVendedor from './PedidosVendedor';
import CrearProducto from './CrearProducto';
import Comprador from './Comprador';
import ResumenCarrito from './ResumenCarrito';
import PedidosComprador from './PedidosComprador';
import { Ionicons } from '@expo/vector-icons';

import MenuLateral from './MenuLateral';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('login');
  const [userData, setUserData] = useState(null);
  const [session, setSession] = useState(null);
  const [menuVisible, setMenuVisible] = useState(false);

  // Estados para recuperación de contraseña
  const [recoveryToken, setRecoveryToken] = useState(null);
  const [recoveryRefresh, setRecoveryRefresh] = useState(null);

  // Estados para navegación persistente entre componentes
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Estado para gestión de mensajería directa
  const [initialRecipientId, setInitialRecipientId] = useState(null);
  const [initialProductContext, setInitialProductContext] = useState(null);
  const [initialMessageText, setInitialMessageText] = useState(null);

  // ESTADO DEL CARRITO COMPARTIDO (v1.3.0)
  const [cart, setCart] = useState([]);

  useEffect(() => {
    // 1. Listener de URLs para Deep Linking (Expo Linking)
    const handleDeepLink = async (url) => {
      if (!url) return;
      console.log("URL de Deep Link abierta (LOG):", url);

      const { queryParams } = Linking.parse(url);

      const accessTokenMatch = url.match(/[#&?]access_token=([^&]+)/);
      const refreshTokenMatch = url.match(/[#&?]refresh_token=([^&]+)/);
      const typeMatch = url.match(/[#&?]type=([^&]+)/);

      const accessToken = accessTokenMatch ? accessTokenMatch[1] : (queryParams?.access_token || "");
      const refreshToken = refreshTokenMatch ? refreshTokenMatch[1] : (queryParams?.refresh_token || "");
      const type = typeMatch ? typeMatch[1] : (queryParams?.type || "");

      if (accessToken) {
        setRecoveryToken(accessToken);
        setRecoveryRefresh(refreshToken);

        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
      }

      if (url.includes('reset-password') || type === 'recovery' || accessToken) {
        // Detectar si hay un error en la URL (ej. link expirado)
        const errorMatch = url.match(/[#&?]error=([^&]+)/);
        const errorDescMatch = url.match(/[#&?]error_description=([^&]+)/);

        if (errorMatch) {
          const desc = errorDescMatch ? decodeURIComponent(errorDescMatch[1]).replace(/\+/g, ' ') : "El enlace es inválido o ha expirado.";
          Alert.alert("Enlace Inválido", desc);
          setCurrentScreen('login');
          return;
        }

        setTimeout(() => {
          setCurrentScreen('reset_password');
        }, 1000);
      }
    };

    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    Linking.getInitialURL().then(url => {
      if (url) handleDeepLink(url);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);

      if (event === 'PASSWORD_RECOVERY') {
        if (session) {
          setRecoveryToken(session.access_token);
          setRecoveryRefresh(session.refresh_token);
          setCurrentScreen('reset_password');
        }
      }

      if (event === 'SIGNED_IN') {
        if (session?.user) {
          const { data: userData, error } = await supabase
            .from('Usuarios_Registrados')
            .select('*')
            .eq('auth_user_id', session.user.id)
            .maybeSingle();

          if (!error && userData) {
            setUserData(userData);
            setCurrentScreen('dashboard');
          }
        }
      }

      if (event === 'SIGNED_OUT') {
        setUserData(null);
        setCart([]);
        setCurrentScreen('login');
      }
    });

    return () => {
      subscription.remove();
      authListener.subscription.unsubscribe();
    };
  }, []);

  const toggleMenu = () => setMenuVisible(!menuVisible);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUserData(null);
    setCurrentScreen('login');
  };

  // --- NAVEGACIÓN PRINCIPAL ---

  const renderContent = () => {
    if (currentScreen === 'login') {
      return (
        <Login
          onLoginSuccess={(data) => {
            setUserData(data);
            setCurrentScreen('dashboard');
          }}
          onRegisterPress={() => setCurrentScreen('registro')}
          onRecoverPasswordPress={() => setCurrentScreen('recuperar')}
        />
      );
    }

    if (currentScreen === 'registro') {
      return <Registro onBack={() => setCurrentScreen('login')} onRegistrationSuccess={() => setCurrentScreen('login')} />;
    }

    if (currentScreen === 'recuperar') {
      return <RecuperarPassword onBack={() => setCurrentScreen('login')} />;
    }

    if (currentScreen === 'reset_password') {
      return (
        <RestablecerPassword
          recoveryToken={recoveryToken}
          recoveryRefresh={recoveryRefresh}
          onBack={() => setCurrentScreen('login')}
          onSuccess={handleLogout}
        />
      );
    }

    // Dashboard de Roles
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

            <View style={styles.roleGrid}>
              <TouchableOpacity style={styles.roleCard} onPress={() => setCurrentScreen('comprador')}>
                <View style={[styles.roleIconContainer, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                  <Ionicons name="cart-outline" size={24} color="#3b82f6" />
                </View>
                <Text style={styles.roleTitle}>Comprador</Text>
                <Text style={styles.roleSubtitle}>ADQUIRIR INSUMOS</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.roleCard} onPress={() => setCurrentScreen('inventario')}>
                <View style={[styles.roleIconContainer, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                  <Ionicons name="trending-up-outline" size={24} color="#10b981" />
                </View>
                <Text style={styles.roleTitle}>Vendedor</Text>
                <Text style={styles.roleSubtitle}>GESTIONAR BODEGA</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.logoutTextButton} onPress={handleLogout}>
                <Text style={styles.logoutText}>Cerrar Sesión</Text>
              </TouchableOpacity>
              <Text style={styles.versionTag}>v1.5.1 - InterGea (Modern Header)</Text>
            </View>
          </View>
        </SafeAreaView>
      );
    }

    if (currentScreen === 'inventario') {
      return (
        <Inventario
          onBack={() => setCurrentScreen('dashboard')}
          onNavigate={(screen, params) => {
            if (params) setSelectedProduct(params);
            setCurrentScreen(screen);
          }}
          onToggleMenu={toggleMenu}
          viewMode="vendedor"
          userData={userData}
        />
      );
    }

    if (currentScreen === 'comprador') {
      return (
        <Comprador
          userData={userData}
          onBack={() => setCurrentScreen('dashboard')}
          onNavigate={(screen, params) => {
            if (params) setSelectedProduct(params);
            setCurrentScreen(screen);
          }}
          onToggleMenu={toggleMenu}
          cart={cart}
          setCart={setCart}
        />
      );
    }

    if (currentScreen === 'detalle_producto' && selectedProduct) {
      return (
        <DetalleProducto
          producto={selectedProduct}
          onBack={() => setCurrentScreen('comprador')}
          onNavigate={(screen, params) => {
            if (params) setSelectedProduct(params);
            setCurrentScreen(screen);
          }}
          onToggleMenu={toggleMenu}
          onAddToCart={(item) => setCart([...cart, item])}
          userData={userData}
        />
      );
    }

    if (currentScreen === 'crear_producto') {
      return (
        <CrearProducto
          onBack={() => setCurrentScreen('inventario')}
          onNavigate={(screen, params) => {
            if (params) setSelectedProduct(params);
            setCurrentScreen(screen);
          }}
          userData={userData}
        />
      );
    }

    if (currentScreen === 'editar_producto' && selectedProduct) {
      return (
        <CrearProducto
          producto={selectedProduct}
          onBack={() => setCurrentScreen('inventario')}
          onNavigate={(screen, params) => {
            if (params) setSelectedProduct(params);
            setCurrentScreen(screen);
          }}
          userData={userData}
        />
      );
    }

    const standardNavigate = (screen, params) => {
      if (params) setSelectedProduct(params);
      setCurrentScreen(screen);
    };

    // Default simple render for and common screens
    if (currentScreen === 'perfil') return <Perfil userData={userData} onUpdate={setUserData} onBack={() => setCurrentScreen('dashboard')} onNavigate={standardNavigate} onToggleMenu={toggleMenu} />;
    if (currentScreen === 'mensajeria') return <Mensajeria onBack={() => setCurrentScreen('dashboard')} onNavigate={standardNavigate} userData={userData} initialRecipientId={initialRecipientId} initialProductContext={initialProductContext} initialMessageText={initialMessageText} />;
    if (currentScreen === 'resumen_carrito') return <ResumenCarrito userData={userData} cart={cart} setCart={setCart} onBack={() => setCurrentScreen('comprador')} onNavigate={standardNavigate} />;
    if (currentScreen === 'pedidos_comprador') return <PedidosComprador userData={userData} onBack={() => setCurrentScreen('dashboard')} onNavigate={standardNavigate} onToggleMenu={toggleMenu} />;
    if (currentScreen === 'pedidos_vendedor') return <PedidosVendedor onBack={() => setCurrentScreen('dashboard')} onNavigate={standardNavigate} userData={userData} onToggleMenu={toggleMenu} />;

    return null;
  };
  return (
    <View style={{ flex: 1 }}>
      {renderContent()}
      <MenuLateral
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onNavigate={(screen, params) => {
          if (params) setSelectedProduct(params);
          setCurrentScreen(screen);
        }}
        userData={userData}
        onLogout={handleLogout}
        cartCount={cart.length}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#020617' },
  dashboardContainer: { flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center' },
  iconContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(59, 130, 246, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  welcomeText: { color: '#94a3b8', fontSize: 16, fontWeight: '500', marginBottom: 8 },
  companyNameText: { color: '#ffffff', fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 12 },
  subtitleText: { color: '#64748b', fontSize: 14, marginBottom: 40 },
  roleGrid: { width: '100%', gap: 16 },
  roleCard: { backgroundColor: '#0F172A', width: '100%', padding: 24, borderRadius: 24, alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.05)' },
  roleIconContainer: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  roleTitle: { color: '#ffffff', fontSize: 18, fontWeight: '700', marginBottom: 8 },
  roleSubtitle: { color: '#64748b', fontSize: 10, fontWeight: 'bold', letterSpacing: 1.5 },
  logoutTextButton: { marginTop: 20, padding: 12, alignItems: 'center' },
  logoutText: { color: '#ef4444', fontSize: 14, fontWeight: '600' },
  versionTag: { marginTop: 30, color: '#334155', fontSize: 10, fontWeight: '300', textAlign: 'center' },
});

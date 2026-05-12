import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

/**
 * COMPONENTE: BottomTab
 * Barra de navegación inferior dinámica según el rol del usuario.
 */
export default function BottomTab({ currentScreen, onNavigate, userData }) {
  
  // Lista de pantallas donde NO debe aparecer la barra
  const hiddenScreens = ['login', 'registro', 'recuperar', 'reset_password', 'dashboard'];
  
  if (hiddenScreens.includes(currentScreen) || !userData) {
    return null;
  }

  // Determinar rol (Comprador o Vendedor)
  // Basado en App.js, el rol se elige en el dashboard, pero userData tiene los datos de la empresa.
  // Usaremos el estado currentScreen para inferir el rol activo si es posible, 
  // o simplemente mostrar las opciones relevantes.
  
  const isVendedorView = ['inventario', 'pedidos_vendedor', 'crear_producto', 'editar_producto'].includes(currentScreen);
  
  // Definición de pestañas por "rol/contexto"
  const tabs = isVendedorView ? [
    { id: 'dashboard', label: 'Roles', icon: 'swap-horizontal', iconOutline: 'swap-horizontal-outline' },
    { id: 'pedidos_vendedor', label: 'Ventas', icon: 'cart', iconOutline: 'cart-outline' },
    { id: 'perfil', label: 'Perfil', icon: 'person', iconOutline: 'person-outline' },
  ] : [
    { id: 'dashboard', label: 'Roles', icon: 'swap-horizontal', iconOutline: 'swap-horizontal-outline' },
    { id: 'pedidos_comprador', label: 'Pedidos', icon: 'receipt', iconOutline: 'receipt-outline' },
    { id: 'perfil', label: 'Perfil', icon: 'person', iconOutline: 'person-outline' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        {tabs.map((tab) => {
          const isActive = currentScreen === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={styles.tabItem}
              onPress={() => onNavigate(tab.id)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconContainer, isActive && styles.iconContainerActive]}>
                <Ionicons 
                  name={isActive ? tab.icon : tab.iconOutline} 
                  size={24} 
                  color={isActive ? '#3b82f6' : '#94a3b8'} 
                />
                {isActive && <View style={styles.activeDot} />}
              </View>
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
    backgroundColor: 'transparent',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(15, 23, 42, 0.95)', // Fondo oscuro semi-transparente
    height: 70,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'space-around',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  iconContainerActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  activeDot: {
    position: 'absolute',
    bottom: -2,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#3b82f6',
  },
  tabLabel: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 4,
    fontWeight: '600',
  },
  tabLabelActive: {
    color: '#3b82f6',
    fontWeight: '800',
  },
});

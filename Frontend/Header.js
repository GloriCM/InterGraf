import React from 'react';
import { StyleSheet, View, TouchableOpacity, Image, Platform, StatusBar, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * COMPONENTE: HEADER MINIMALISTA
 * Implementa el diseño requerido: Hamburguesa a la izquierda y Logo + Nombre 'InterGea' centrado.
 */
export default function Header({ onMenuPress }) {
  return (
    <View style={styles.headerContainer}>
      {/* Icono Hamburguesa Izquierda */}
      <TouchableOpacity onPress={onMenuPress} style={styles.menuButton}>
        <Ionicons name="menu-outline" size={32} color="#ffffff" />
      </TouchableOpacity>

      {/* Logo y Nombre Centrado */}
      <View style={styles.logoWrapper}>
        <Image 
          source={require('./assets/LOGO-Sin-Letras.png')} 
          style={styles.logoIcon} 
          resizeMode="contain" 
        />
        <Text style={styles.brandName}>InterGea</Text>
      </View>

      {/* Placeholder para balancear el layout */}
      <View style={styles.placeholder} />
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    height: 75,
    backgroundColor: 'transparent',
    zIndex: 1000,
    marginTop: Platform.OS === 'android' ? StatusBar.currentHeight : 10,
  },
  menuButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  logoWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  logoIcon: {
    height: 40,
    width: 40,
  },
  brandName: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  placeholder: {
    width: 44,
  },
});

import React from 'react';
import { StyleSheet, View, TouchableOpacity, Image, Platform, StatusBar, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * COMPONENTE: HEADER MINIMALISTA
 * Implementa el diseño requerido: Hamburguesa a la izquierda y Logo + Nombre 'InterGea' centrado.
 */
export default function Header({ onMenuPress, showBack = false, onBack, onCartPress, cartCount = 0 }) {
  return (
    <View style={styles.headerContainer}>
      {/* Icono Izquierda: Atrás o Hamburguesa */}
      <TouchableOpacity onPress={showBack ? onBack : onMenuPress} style={styles.menuButton}>
        <Ionicons name={showBack ? "arrow-back-outline" : "menu-outline"} size={32} color="#ffffff" />
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

      {/* Icono Derecha: Carrito con Badge (Opcional) */}
      {onCartPress ? (
        <TouchableOpacity onPress={onCartPress} style={styles.cartButton}>
          <Ionicons name="cart-outline" size={28} color="#ffffff" />
          {cartCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{cartCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      ) : (
        <View style={styles.placeholder} />
      )}
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
  cartButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'flex-end',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: -2,
    backgroundColor: '#3b82f6',
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#020617',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '900',
  },
});

import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Modal, Animated, Dimensions, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

/**
 * COMPONENTE: MENÚ LATERAL (DRAWER)
 * Proporciona acceso a todas las funcionalidades que eliminamos de la barra superior.
 */
export default function MenuLateral({ visible, onClose, onNavigate, userData, onLogout, cartCount }) {
  if (!visible) return null;

  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <Animated.View style={styles.drawerContainer}>
          <SafeAreaView style={styles.safeArea}>
            {/* Header del Menú */}
            <View style={styles.drawerHeader}>
              <View style={styles.userInfo}>
                <View style={styles.avatar}>
                  <Ionicons name="person" size={24} color="#3b82f6" />
                </View>
                <View>
                  <Text style={styles.userName}>{userData?.razon_social || 'Usuario'}</Text>
                  <Text style={styles.userRole}>{userData?.email || 'InterGraf User'}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={28} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {/* Opciones de Navegación */}
            <View style={styles.menuItems}>
              <MenuItem
                icon="home-outline"
                label="Cambio de Rol"
                onPress={() => { onNavigate('dashboard'); onClose(); }}
              />
              <MenuItem
                icon="layers-outline"
                label="Inventario / Catálogo"
                onPress={() => { onNavigate('inventario'); onClose(); }}
              />
              <MenuItem
                icon="cart-outline"
                label="Mi Carrito"
                badge={cartCount}
                onPress={() => { onNavigate('resumen_carrito'); onClose(); }}
              />
              <MenuItem
                icon="receipt-outline"
                label="Mis Pedidos"
                onPress={() => { onNavigate('pedidos_comprador'); onClose(); }}
              />
              <MenuItem
                icon="chatbubble-ellipses-outline"
                label="Mensajería"
                onPress={() => { onNavigate('mensajeria'); onClose(); }}
              />
              <MenuItem
                icon="person-outline"
                label="Mi Perfil"
                onPress={() => { onNavigate('perfil'); onClose(); }}
              />

              <View style={styles.divider} />

              <MenuItem
                icon="log-out-outline"
                label="Cerrar Sesión"
                color="#ef4444"
                onPress={() => { onLogout(); onClose(); }}
              />
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>InterGea v1.5.0</Text>
            </View>
          </SafeAreaView>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}

const MenuItem = ({ icon, label, onPress, color = '#cbd5e1', badge }) => (
  <TouchableOpacity style={styles.menuItem} onPress={onPress}>
    <Ionicons name={icon} size={22} color={color} style={{ width: 30 }} />
    <Text style={[styles.menuItemText, { color }]}>{label}</Text>
    {badge > 0 && (
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{badge}</Text>
      </View>
    )}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  drawerContainer: {
    width: width * 0.75,
    height: '100%',
    backgroundColor: '#0f172a',
    borderTopRightRadius: 24,
    borderBottomRightRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 20,
  },
  safeArea: {
    flex: 1,
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 40,
    paddingTop: 10,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  userRole: {
    color: '#64748b',
    fontSize: 12,
  },
  closeBtn: {
    padding: 4,
  },
  menuItems: {
    flex: 1,
    gap: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: '500',
    marginLeft: 10,
  },
  badge: {
    backgroundColor: '#3b82f6',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 'auto',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: '#1e293b',
    marginVertical: 20,
  },
  footer: {
    paddingBottom: 20,
    alignItems: 'center',
  },
  footerText: {
    color: '#334155',
    fontSize: 10,
    fontWeight: 'bold',
  },
});

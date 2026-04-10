import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  FlatList,
  Platform,
  StatusBar,
  Alert,
  ActivityIndicator,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from './supabase';

/**
 * COMPONENTE: RESUMEN DEL CARRITO
 * Permite al comprador revisar los productos seleccionados, ajustar cantidades o proceder al pago.
 */
export default function ResumenCarrito({ userData, cart, setCart, onBack, onNavigate }) {
  const [procesando, setProcesando] = useState(false);
  const [simulandoPago, setSimulandoPago] = useState(false);

  const total = cart.reduce((acc, item) => acc + (item.precio * item.cantidadSeleccionada), 0);

  /**
   * Elimina un producto del carrito y DEVUELVE el stock a la base de datos.
   */
  const handleRemoveItem = (item) => {
    // Solo removemos del estado local (ya que el stock no se descuenta al añadir)
    setCart(prev => prev.filter(i => i.id !== item.id));
  };

  /**
   * Finaliza la compra y crea los registros en la tabla de pedidos.
   */
  const handleFinalizarCompra = async () => {
    if (cart.length === 0) return;
    
    setSimulandoPago(true);
    
    // 1. Simulación de Pago (2 segundos)
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setProcesando(true);
    try {
      // 2. Descuento Real del Stock en la BD
      for (const item of cart) {
        const { data: prod, error: fetchErr } = await supabase
          .from('productos')
          .select('stock')
          .eq('id', item.id)
          .single();
        
        if (fetchErr) throw fetchErr;

        const { error: stockErr } = await supabase
          .from('productos')
          .update({ stock: (prod.stock || 0) - item.cantidadSeleccionada })
          .eq('id', item.id);

        if (stockErr) throw stockErr;
      }

      // 3. Creación de Pedidos (Agrupados por vendedor)
      const vendedoresIds = [...new Set(cart.map(item => item.vendedor_id))];

      for (const vId of vendedoresIds) {
        const itemsVendedor = cart.filter(it => it.vendedor_id === vId);
        const subtotal = itemsVendedor.reduce((acc, it) => acc + (it.precio * it.cantidadSeleccionada), 0);

        const { data: pedido, error: pedidoError } = await supabase
          .from('pedidos')
          .insert([{
            comprador_id: userData.auth_user_id,
            vendedor_id: vId,
            total: subtotal,
            estado: 'Pendiente'
          }])
          .select()
          .single();

        if (pedidoError) throw pedidoError;

        const detalles = itemsVendedor.map(it => ({
          pedido_id: pedido.id,
          producto_id: it.id,
          cantidad: it.cantidadSeleccionada,
          precio_unitario: it.precio
        }));

        const { error: detallesError } = await supabase
          .from('detalle_pedidos')
          .insert(detalles);

        if (detallesError) throw detallesError;
      }

      setCart([]);
      setSimulandoPago(false);
      
      const successMsg = "¡Pago realizado con éxito! Tu pedido ha sido procesado.";
      if (Platform.OS === 'web') {
        window.alert(successMsg);
      } else {
        Alert.alert("Éxito", successMsg);
      }
      
      onNavigate('pedidos_comprador');
    } catch (error) {
      setSimulandoPago(false);
      Alert.alert("Error en la transacción", error.message);
    } finally {
      setProcesando(false);
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.cartItem}>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.nombre}</Text>
        <Text style={styles.itemSub}>{item.categoria} - Cant: {item.cantidadSeleccionada}</Text>
        <Text style={styles.itemPrice}>${item.precio * item.cantidadSeleccionada}</Text>
      </View>
      <TouchableOpacity 
        style={styles.removeBtn} 
        onPress={() => handleRemoveItem(item)}
      >
        <Ionicons name="trash-outline" size={20} color="#ef4444" />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tu Carrito</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <PaymentModal visible={simulandoPago} />
        {cart.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="cart-outline" size={80} color="#1e293b" />
            <Text style={styles.emptyText}>Tu carrito está vacío</Text>
            <TouchableOpacity style={styles.shopBtn} onPress={onBack}>
              <Text style={styles.shopBtnText}>Explorar Suministros</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <FlatList
              data={cart}
              renderItem={renderItem}
              keyExtractor={item => item.id.toString()}
              contentContainerStyle={styles.listContent}
            />

            <View style={styles.footer}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total Estimado:</Text>
                <Text style={styles.totalValue}>${total}</Text>
              </View>
              
              <TouchableOpacity 
                style={[styles.checkoutBtn, procesando && { opacity: 0.7 }]} 
                onPress={handleFinalizarCompra}
                disabled={procesando}
              >
                {procesando ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <>
                    <Text style={styles.checkoutBtnText}>Confirmar Pedido</Text>
                    <Ionicons name="chevron-forward" size={20} color="#ffffff" />
                  </>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

/**
 * MODAL DE SIMULACIÓN DE PAGO
 */
function PaymentModal({ visible }) {
    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.modalOverlay}>
                <View style={styles.paymentCard}>
                    <ActivityIndicator size="large" color="#0ea5e9" />
                    <Text style={styles.paymentTitle}>Procesando Pago Seguro</Text>
                    <Text style={styles.paymentSub}>Cifrando transacción y verificando stock...</Text>
                    
                    <View style={styles.secureBadge}>
                        <Ionicons name="shield-checkmark" size={16} color="#10b981" />
                        <Text style={styles.secureText}>Pago Protegido SSL</Text>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderColor: '#1e293b',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  backBtn: {
    padding: 5,
  },
  content: {
    flex: 1,
  },
  listContent: {
    padding: 20,
  },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 20,
    padding: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  itemSub: {
    color: '#94a3b8',
    fontSize: 12,
    marginBottom: 8,
  },
  itemPrice: {
    color: '#3b82f6',
    fontSize: 16,
    fontWeight: 'bold',
  },
  removeBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    padding: 24,
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  totalLabel: {
    color: '#94a3b8',
    fontSize: 16,
  },
  totalValue: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  checkoutBtn: {
    backgroundColor: '#0ea5e9',
    height: 56,
    borderRadius: 28,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkoutBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  emptyText: {
    color: '#475569',
    fontSize: 18,
    marginTop: 20,
    marginBottom: 30,
  },
  shopBtn: {
    backgroundColor: 'rgba(14, 165, 233, 0.1)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#0ea5e9',
  },
  shopBtnText: {
    color: '#0ea5e9',
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentCard: {
    backgroundColor: '#0f172a',
    borderRadius: 30,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e293b',
    width: '80%',
  },
  paymentTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 20,
  },
  paymentSub: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
  },
  secureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 30,
  },
  secureText: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  Modal,
  ScrollView,
  StatusBar,
  Alert,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from './supabase';

/**
 * COMPONENTE: PEDIDOS COMPRADOR (Sección 3.4)
 * Muestra el historial de compras realizadas por la empresa.
 */
export default function PedidosComprador({ userData, onBack, onNavigate }) {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Estados para el detalle
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    fetchPedidos();
  }, [userData]);

  /**
   * Carga los pedidos realizados por el usuario logueado.
   */
  const fetchPedidos = async () => {
    if (!userData?.auth_user_id) return;
    
    setLoading(true);
    try {
      // Obtenemos los pedidos donde el usuario es el comprador.
      // Incluimos los datos del vendedor para mostrar su nombre.
      const { data, error } = await supabase
        .from('pedidos')
        .select(`
          *,
          vendedor:vendedor_id (id, razon_social, ciudad),
          detalles:detalle_pedidos (*)
        `)
        .eq('comprador_id', userData.auth_user_id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error al cargar pedidos del comprador:", error.message);
        setPedidos([]);
      } else {
        setPedidos(data || []);
      }
    } catch (error) {
      console.error('Error in fetchPedidos (comprador):', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  /**
   * Lógica para cancelar un pedido. Solo se puede si está en estado 'Pendiente'.
   */
  const cancelarPedido = async (item) => {
    if (item.estado !== 'Pendiente') {
      const msg = 'Solo puedes cancelar pedidos que aún estén en estado "Pendiente".';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Aviso', msg);
      return;
    }

    const confirmarStr = `¿Estás seguro de que deseas cancelar el pedido #${item.id.toString().substring(0, 8).toUpperCase()}?`;
    
    const realizarCancelacion = async () => {
      try {
        const { error } = await supabase
          .from('pedidos')
          .update({ estado: 'Cancelado' })
          .eq('id', item.id);

        if (error) throw error;
        
        fetchPedidos(); // Recargar lista
        setModalVisible(false);
        if (Platform.OS === 'web') window.alert('Pedido cancelado correctamente.');
      } catch (error) {
        Alert.alert('Error', 'No se pudo cancelar el pedido: ' + error.message);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(confirmarStr)) {
        await realizarCancelacion();
      }
    } else {
      Alert.alert('Confirmar', confirmarStr, [
        { text: 'No', style: 'cancel' },
        { text: 'Sí, cancelar', style: 'destructive', onPress: realizarCancelacion }
      ]);
    }
  };

  /**
   * Abre la mensajería con el vendedor directamente.
   */
  const contactarVendedor = (vendedorId) => {
    setModalVisible(false);
    onNavigate('mensajeria', { initialRecipient: vendedorId });
  };

  const getBadgeStyle = (estado) => {
    switch (estado) {
      case 'Pendiente': return { bg: '#fee2e2', text: '#ef4444' };
      case 'En preparación': return { bg: '#fef3c7', text: '#d97706' };
      case 'Enviado': return { bg: '#e0f2fe', text: '#0284c7' };
      case 'Entregado': return { bg: '#dcfce7', text: '#16a34a' };
      case 'Cancelado': return { bg: '#f1f5f9', text: '#64748b' };
      default: return { bg: '#f1f5f9', text: '#64748b' };
    }
  };

  const renderPedidoItem = ({ item }) => {
    const statusStyle = getBadgeStyle(item.estado);
    const date = new Date(item.created_at).toLocaleDateString();

    return (
      <TouchableOpacity 
        style={styles.pedidoCard}
        onPress={() => { setPedidoSeleccionado(item); setModalVisible(true); }}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.orderId}>PEDIDO #{item.id.toString().substring(0, 8).toUpperCase()}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.statusText, { color: statusStyle.text }]}>{item.estado}</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <Ionicons name="business-outline" size={14} color="#94a3b8" />
            <Text style={styles.vendorName}>{item.vendedor?.razon_social || 'Proveedor'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={14} color="#94a3b8" />
            <Text style={styles.orderDate}>{date}</Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.totalLabel}>Total: <Text style={styles.totalAmount}>${item.total}</Text></Text>
          <Ionicons name="chevron-forward" size={18} color="#475569" />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mis Compras</Text>
        <TouchableOpacity onPress={fetchPedidos} style={styles.refreshBtn}>
          <Ionicons name="refresh-outline" size={22} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* LISTA */}
      {loading && !refreshing ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : (
        <FlatList
          data={pedidos}
          renderItem={renderPedidoItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); fetchPedidos(); }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="cart-outline" size={60} color="#1e293b" />
              <Text style={styles.emptyText}>No has realizado pedidos aún.</Text>
            </View>
          }
        />
      )}

      {/* MODAL DE DETALLE */}
      <Modal visible={modalVisible} transparent={true} animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {pedidoSeleccionado && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Detalle de Compra</Text>
                  <TouchableOpacity onPress={() => setModalVisible(false)}>
                    <Ionicons name="close" size={24} color="#94a3b8" />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                  <View style={styles.section}>
                    <Text style={styles.sectionLabel}>Proveedor:</Text>
                    <View style={styles.vendorCard}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.vendorTitle}>{pedidoSeleccionado.vendedor?.razon_social}</Text>
                        <Text style={styles.vendorSubtitle}>{pedidoSeleccionado.vendedor?.ciudad}</Text>
                      </View>
                      <TouchableOpacity 
                        style={styles.msgBtn}
                        onPress={() => contactarVendedor(pedidoSeleccionado.vendedor_id)}
                      >
                        <Ionicons name="chatbubble-ellipses" size={22} color="#3b82f6" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.section}>
                    <Text style={styles.sectionLabel}>Estado de Envío:</Text>
                    <View style={[styles.statusBanner, { backgroundColor: getBadgeStyle(pedidoSeleccionado.estado).bg + '20' }]}>
                      <Ionicons name="cube" size={20} color={getBadgeStyle(pedidoSeleccionado.estado).text} />
                      <Text style={[styles.statusBannerText, { color: getBadgeStyle(pedidoSeleccionado.estado).text }]}>
                        {pedidoSeleccionado.estado}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.section}>
                    <Text style={styles.sectionLabel}>Productos:</Text>
                    {pedidoSeleccionado.detalles?.map((det, idx) => (
                      <View key={idx} style={styles.prodRow}>
                        <Text style={styles.prodName}>Producto ID #{det.producto_id}</Text>
                        <Text style={styles.prodQty}>Cant: {det.cantidad}</Text>
                        <Text style={styles.prodPrice}>${det.precio_unitario * det.cantidad}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.modalFooter}>
                    <Text style={styles.totalLabelFooter}>Total pagado:</Text>
                    <Text style={styles.totalValueFooter}>${pedidoSeleccionado.total}</Text>
                  </View>

                  {pedidoSeleccionado.estado === 'Pendiente' && (
                    <TouchableOpacity 
                      style={styles.cancelarBtn}
                      onPress={() => cancelarPedido(pedidoSeleccionado)}
                    >
                      <Text style={styles.cancelarBtnText}>Cancelar Pedido</Text>
                    </TouchableOpacity>
                  )}
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderColor: '#1e293b',
  },
  headerTitle: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' },
  backBtn: { padding: 5 },
  refreshBtn: { padding: 5 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 20, paddingBottom: 40 },
  pedidoCard: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  orderId: { color: '#3b82f6', fontWeight: 'bold', fontSize: 12 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: 'bold' },
  cardBody: { marginBottom: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  vendorName: { color: '#ffffff', fontSize: 15, fontWeight: 'bold', marginLeft: 8 },
  orderDate: { color: '#94a3b8', fontSize: 12, marginLeft: 8 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderColor: '#1e293b', paddingTop: 10 },
  totalLabel: { color: '#64748b', fontSize: 12 },
  totalAmount: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { color: '#475569', marginTop: 16, fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#0f172a', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { color: '#ffffff', fontSize: 20, fontWeight: 'bold' },
  section: { marginBottom: 24 },
  sectionLabel: { color: '#64748b', fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 10, letterSpacing: 1 },
  vendorCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', padding: 16, borderRadius: 16 },
  vendorTitle: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  vendorSubtitle: { color: '#94a3b8', fontSize: 12 },
  msgBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(59, 130, 246, 0.1)', justifyContent: 'center', alignItems: 'center' },
  statusBanner: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12 },
  statusBannerText: { fontSize: 14, fontWeight: 'bold', marginLeft: 10 },
  prodRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderColor: '#1e293b' },
  prodName: { color: '#cbd5e1', fontSize: 13, flex: 2 },
  prodQty: { color: '#64748b', fontSize: 13, flex: 1, textAlign: 'center' },
  prodPrice: { color: '#ffffff', fontSize: 13, fontWeight: 'bold', flex: 1, textAlign: 'right' },
  modalFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 20 },
  totalLabelFooter: { color: '#94a3b8', fontSize: 14 },
  totalValueFooter: { color: '#ffffff', fontSize: 24, fontWeight: 'bold' },
  cancelarBtn: { backgroundColor: 'rgba(239, 68, 68, 0.1)', height: 50, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 10, borderWidth: 1, borderColor: '#ef4444' },
  cancelarBtnText: { color: '#ef4444', fontWeight: 'bold' },
});

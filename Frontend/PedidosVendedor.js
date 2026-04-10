import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  TextInput,
  Platform,
  StatusBar,
  ActivityIndicator,
  FlatList,
  Modal,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from './supabase';

/**
 * COMPONENTE: PEDIDOS VENDEDOR (RF-013)
 * Este componente permite a los proveedores visualizar y gestionar los pedidos recibidos.
 */
export default function PedidosVendedor({ userData, onBack, onNavigate }) {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Estados para filtros
  const [filtroEstado, setFiltroEstado] = useState('Todos');
  const [busquedaComprador, setBusquedaComprador] = useState('');
  const [busquedaId, setBusquedaId] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Estado para el modal de detalle
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Opciones de estado para el filtro y para actualización (según RF-14)
  const estadosPosibles = ['Todos', 'Pendiente', 'En preparación', 'Enviado', 'Entregado', 'Cancelado'];

  useEffect(() => {
    fetchPedidos();

    // SUSCRIPCIÓN EN TIEMPO REAL A NUEVOS PEDIDOS
    const canalPedidos = supabase
      .channel('public:pedidos-seller')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'pedidos',
        filter: `vendedor_id=eq.${userData?.auth_user_id}`
      }, (payload) => {
        // Al recibir un nuevo pedido, recargar lista y alertar
        fetchPedidos();
        const msg = "¡Has recibido un nuevo pedido! Revisa la lista.";
        if (Platform.OS === 'web') {
          window.alert(msg);
        } else {
          Alert.alert("🎉 Nuevo Pedido", msg);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(canalPedidos);
    };
  }, [userData]);

  /**
   * Obtiene los pedidos asociados a este proveedor desde Supabase.
   * RF-013.a: Solo visualiza pedidos asociados a sus productos (vendedor_id).
   */
  const fetchPedidos = async () => {
    if (!userData?.auth_user_id) return;
    
    setLoading(true);
    try {
      // Nota: Asumimos que existe la tabla 'pedidos' vinculada por 'vendedor_id'
      // y que tiene una relación con 'Usuarios_Registrados' para los datos del comprador.
      const { data, error } = await supabase
        .from('pedidos')
        .select(`
          *,
          comprador:Usuarios_Registrados!pedidos_comprador_id_fkey (id, razon_social, ciudad),
          detalles:detalle_pedidos (*)
        `)
        .eq('vendedor_id', userData.auth_user_id)
        .order('created_at', { ascending: false });

      if (error) {
        // Si la tabla no existe aún, lanzará un error silencioso para el usuario
        // pero lo logueamos para depuración.
        console.error("Error al cargar pedidos:", error.message);
        setPedidos([]);
      } else {
        setPedidos(data || []);
      }
    } catch (error) {
      console.error('Error in fetchPedidos:', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  /**
   * Lógica de filtrado en el cliente para los pedidos cargados.
   */
  const pedidosFiltrados = pedidos.filter(p => {
    const matchEstado = filtroEstado === 'Todos' || p.estado === filtroEstado;
    const matchComprador = p.comprador?.razon_social?.toLowerCase().includes(busquedaComprador.toLowerCase());
    const matchId = p.id.toString().includes(busquedaId);
    return matchEstado && matchComprador && matchId;
  });

  /**
   * Renderiza el badge de estado con su color correspondiente.
   */
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

  /**
   * Formatea la fecha para visualización.
   */
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  /**
   * Cambia el estado del pedido en la base de datos (RF-14).
   */
  const cambiarEstado = async (id, nuevoEstado) => {
    try {
      const { error } = await supabase
        .from('pedidos')
        .update({ estado: nuevoEstado })
        .eq('id', id);

      if (error) throw error;
      
      // Actualizar localmente
      setPedidos(pedidos.map(p => p.id === id ? { ...p, estado: nuevoEstado } : p));
      if (pedidoSeleccionado?.id === id) {
        setPedidoSeleccionado({ ...pedidoSeleccionado, estado: nuevoEstado });
      }
      
      if (Platform.OS === 'web') {
        window.alert(`Estado del pedido #${id} actualizado a ${nuevoEstado}`);
      }
    } catch (error) {
      Alert.alert("Error", "No se pudo actualizar el estado: " + error.message);
    }
  };

  const renderPedidoItem = ({ item }) => {
    const statusStyle = getBadgeStyle(item.estado);
    
    return (
      <TouchableOpacity 
        style={styles.pedidoCard}
        onPress={() => {
          setPedidoSeleccionado(item);
          setModalVisible(true);
        }}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.orderId}>#{item.id.toString().substring(0, 8).toUpperCase()}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.statusText, { color: statusStyle.text }]}>{item.estado}</Text>
          </View>
        </View>
        
        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={14} color="#94a3b8" />
            <Text style={styles.compradorName}>{item.comprador?.razon_social || 'Comprador Desconocido'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={14} color="#94a3b8" />
            <Text style={styles.orderDate}>{formatDate(item.created_at)}</Text>
          </View>
        </View>
        
        <View style={styles.cardFooter}>
          <Text style={styles.itemCount}>{item.detalles?.length || 0} productos</Text>
          <Text style={styles.totalAmount}>${item.total || 0}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.topRow}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.title}>Pedidos Recibidos</Text>
          <TouchableOpacity onPress={fetchPedidos}>
            <Ionicons name="reload" size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* BARRA DE BÚSQUEDA Y FILTRO */}
        <View style={styles.searchBarContainer}>
          <View style={styles.searchWrapper}>
            <Ionicons name="search" size={18} color="#94a3b8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar por ID o comprador..."
              placeholderTextColor="#64748b"
              value={busquedaComprador || busquedaId}
              onChangeText={(text) => {
                setBusquedaComprador(text);
                setBusquedaId(text);
              }}
            />
          </View>
          <TouchableOpacity 
            style={[styles.filterToggle, showFilters && styles.filterToggleActive]} 
            onPress={() => setShowFilters(!showFilters)}
          >
            <Ionicons name="options-outline" size={20} color={showFilters ? "#3b82f6" : "#ffffff"} />
          </TouchableOpacity>
        </View>

        {/* FILTROS EXPANDIDOS */}
        {showFilters && (
          <View style={styles.filtersContainer}>
            <Text style={styles.filterLabel}>Filtrar por Estado:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.estadoChips}>
              {estadosPosibles.map(est => (
                <TouchableOpacity 
                  key={est} 
                  style={[styles.chip, filtroEstado === est && styles.chipActive]}
                  onPress={() => setFiltroEstado(est)}
                >
                  <Text style={[styles.chipText, filtroEstado === est && styles.chipTextActive]}>{est}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      {/* CONTENIDO PRINCIPAL */}
      {loading && !refreshing ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Cargando pedidos...</Text>
        </View>
      ) : (
        <FlatList
          data={pedidosFiltrados}
          renderItem={renderPedidoItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContent}
          onRefresh={() => { setRefreshing(true); fetchPedidos(); }}
          refreshing={refreshing}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt-outline" size={64} color="#1e293b" />
              <Text style={styles.emptyText}>No se encontraron pedidos</Text>
            </View>
          }
        />
      )}

      {/* MODAL DE DETALLE DEL PEDIDO */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {pedidoSeleccionado && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Detalle del Pedido</Text>
                  <TouchableOpacity onPress={() => setModalVisible(false)}>
                    <Ionicons name="close-circle" size={28} color="#94a3b8" />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Comprador:</Text>
                    <Text style={styles.detailValue}>{pedidoSeleccionado.comprador?.razon_social}</Text>
                    <Text style={styles.detailSubValue}>{pedidoSeleccionado.comprador?.ciudad || 'Ciudad no especificada'}</Text>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Estado Actual:</Text>
                    <View style={styles.statusPicker}>
                      {estadosPosibles.filter(e => e !== 'Todos').map(est => (
                        <TouchableOpacity 
                          key={est}
                          style={[styles.statusOption, pedidoSeleccionado.estado === est && styles.statusOptionActive]}
                          onPress={() => cambiarEstado(pedidoSeleccionado.id, est)}
                        >
                          <Text style={[styles.statusOptionText, pedidoSeleccionado.estado === est && styles.statusOptionTextActive]}>{est}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Productos:</Text>
                    {pedidoSeleccionado.detalles?.map((det, index) => (
                      <View key={index} style={styles.productRow}>
                        <View style={styles.productInfo}>
                          <Text style={styles.productName}>Producto ID: {det.producto_id}</Text>
                          <Text style={styles.productQty}>Cantidad: {det.cantidad}</Text>
                        </View>
                        <Text style={styles.productPrice}>${det.precio_unitario * det.cantidad}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.modalFooter}>
                    <Text style={styles.totalLabel}>TOTAL DEL PEDIDO:</Text>
                    <Text style={styles.totalValue}>${pedidoSeleccionado.total}</Text>
                  </View>
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
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  header: {
    backgroundColor: '#0f172a',
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderColor: '#1e293b',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    marginBottom: 15,
  },
  backBtn: {
    padding: 5,
  },
  title: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  searchBarContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  searchWrapper: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 40,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
    marginLeft: 8,
  },
  filterToggle: {
    width: 40,
    height: 40,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterToggleActive: {
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  filtersContainer: {
    paddingHorizontal: 16,
    paddingTop: 15,
  },
  filterLabel: {
    color: '#94a3b8',
    fontSize: 12,
    marginBottom: 10,
  },
  estadoChips: {
    flexDirection: 'row',
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#1e293b',
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: '#3b82f6',
  },
  chipText: {
    color: '#cbd5e1',
    fontSize: 12,
  },
  chipTextActive: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  listContent: {
    padding: 16,
    paddingBottom: 30,
  },
  pedidoCard: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    padding: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderId: {
    color: '#3b82f6',
    fontWeight: 'bold',
    fontSize: 14,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  cardBody: {
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  compradorName: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 6,
  },
  orderDate: {
    color: '#94a3b8',
    fontSize: 12,
    marginLeft: 6,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingTop: 12,
  },
  itemCount: {
    color: '#64748b',
    fontSize: 12,
  },
  totalAmount: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#94a3b8',
    marginTop: 10,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    color: '#475569',
    marginTop: 15,
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  detailSection: {
    marginBottom: 25,
  },
  detailLabel: {
    color: '#94a3b8',
    fontSize: 12,
    textTransform: 'uppercase',
    marginBottom: 8,
    letterSpacing: 1,
  },
  detailValue: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  detailSubValue: {
    color: '#64748b',
    fontSize: 14,
  },
  statusPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 5,
  },
  statusOption: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  statusOptionActive: {
    borderColor: '#3b82f6',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  statusOptionText: {
    color: '#94a3b8',
    fontSize: 12,
  },
  statusOptionTextActive: {
    color: '#3b82f6',
    fontWeight: 'bold',
  },
  productRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#1e293b',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  productName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  productQty: {
    color: '#64748b',
    fontSize: 12,
  },
  productPrice: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    marginTop: 10,
  },
  totalLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: 'bold',
  },
  totalValue: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: 'bold',
  },
});

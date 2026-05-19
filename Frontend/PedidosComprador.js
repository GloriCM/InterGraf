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
  Platform,
  TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from './supabase';
import Header from './Header';

/**
 * COMPONENTE: PEDIDOS COMPRADOR (Secci├│n 3.4)
 * Muestra el historial de compras realizadas por la empresa.
 */
export default function PedidosComprador({ userData, onBack, onNavigate, onToggleMenu }) {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Estados para el detalle
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);

  // Estados para cancelaci├│n
  const [motivoCancelacion, setMotivoCancelacion] = useState('');
  const [submittingCancel, setSubmittingCancel] = useState(false);

  const openModal = (item) => {
    setPedidoSeleccionado(item);
    setRating(0);
    setComment('');
    setMotivoCancelacion('');
    setModalVisible(true);
  };

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
          vendedor:Usuarios_Registrados!pedidos_vendedor_id_fkey (id, razon_social, ciudad),
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
   * L├│gica para cancelar un pedido. (RF-029)
   * Solo se permite si est├í en estados habilitados (Pendiente).
   */
  const cancelarPedido = async (item) => {
    const estadosHabilitados = ['Pendiente'];
    
    if (!estadosHabilitados.includes(item.estado)) {
      const msg = `No es posible cancelar el pedido en su estado actual (${item.estado}). Solo se pueden cancelar pedidos en estado: ${estadosHabilitados.join(', ')}.`;
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Cancelaci├│n no permitida', msg);
      return;
    }

    const confirmarStr = `┬┐Est├ís seguro de que deseas cancelar el pedido #${item.id.toString().substring(0, 8).toUpperCase()}?`;
    
    const realizarCancelacion = async () => {
      console.log("DEBUG: Iniciando proceso de cancelaci├│n para pedido:", item.id);
      setSubmittingCancel(true);
      try {
        // RF-029.c: Se registra el estado y el motivo en el pedido
        const { error } = await supabase
          .from('pedidos')
          .update({ 
            estado: 'Cancelado',
            motivo_cancelacion: motivoCancelacion.trim() || 'Cancelado por el comprador'
          })
          .eq('id', item.id);

        if (error) throw error;
        
        // --- RESTAURACI├ôN DE STOCK ---
        // Al cancelar, devolvemos las unidades al inventario (RF-029)
        if (item.detalles && item.detalles.length > 0) {
          console.log("DEBUG: Restaurando stock para", item.detalles.length, "productos...");
          for (const det of item.detalles) {
            // Obtenemos stock actual primero para evitar inconsistencias si otro proceso lo cambi├│
            const { data: prodData } = await supabase
              .from('productos')
              .select('stock')
              .eq('id', det.producto_id)
              .single();
            
            if (prodData) {
              const nuevoStock = (prodData.stock || 0) + det.cantidad;
              await supabase
                .from('productos')
                .update({ stock: nuevoStock })
                .eq('id', det.producto_id);
              console.log(`DEBUG: Producto ${det.producto_id} - Stock restaurado a ${nuevoStock}`);
            }
          }
        }
        // -----------------------------

        fetchPedidos(); // Recargar lista
        setModalVisible(false);
        const msgExito = 'Pedido cancelado correctamente.';
        Platform.OS === 'web' ? window.alert(msgExito) : Alert.alert('├ëxito', msgExito);
      } catch (error) {
        console.error("DEBUG: Error al cancelar pedido:", error);
        
        // Fallback: Si el error es por la columna motivo_cancelacion, intentamos sin ella
        if (error.message && (error.message.includes("column") || error.message.includes("motivo_cancelacion"))) {
           console.log("DEBUG: Reintentando sin columna motivo_cancelacion...");
           try {
             const { error: retryError } = await supabase
               .from('pedidos')
               .update({ estado: 'Cancelado' })
               .eq('id', item.id);
             
             if (retryError) throw retryError;
             
             // Restaurar stock incluso en fallback
             if (item.detalles && item.detalles.length > 0) {
               for (const det of item.detalles) {
                 const { data: prodData } = await supabase.from('productos').select('stock').eq('id', det.producto_id).single();
                 if (prodData) {
                   await supabase.from('productos').update({ stock: (prodData.stock || 0) + det.cantidad }).eq('id', det.producto_id);
                 }
               }
             }

             fetchPedidos();
             setModalVisible(false);
             const msgExito = 'Pedido cancelado correctamente (sin registro de motivo).';
             Platform.OS === 'web' ? window.alert(msgExito) : Alert.alert('├ëxito', msgExito);
             return;
           } catch (err2) {
             console.error("DEBUG: Fall├│ tambi├®n el reintento:", err2);
           }
        }

        const msg = 'No se pudo cancelar el pedido: ' + error.message;
        Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Error', msg);
      } finally {
        setSubmittingCancel(false);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(confirmarStr)) {
        await realizarCancelacion();
      }
    } else {
      Alert.alert('Confirmar Cancelaci├│n', confirmarStr, [
        { text: 'Volver', style: 'cancel' },
        { text: 'S├¡, cancelar pedido', style: 'destructive', onPress: realizarCancelacion }
      ]);
    }
  };

  /**
   * Simula la respuesta de Wompi actualizando el estado del pedido.
   */
  const simularPago = async (item, nuevoEstado) => {
    try {
      const { error } = await supabase
        .from('pedidos')
        .update({ estado: nuevoEstado })
        .eq('id', item.id);

      if (error) throw error;

      // Devolver stock si es rechazado/cancelado
      if (nuevoEstado === 'Cancelado') {
         const { data: detalles } = await supabase
            .from('detalle_pedidos')
            .select('producto_id, cantidad')
            .eq('pedido_id', item.id);
            
         if (detalles) {
            for (const det of detalles) {
               const { data: prod } = await supabase.from('productos').select('stock').eq('id', det.producto_id).single();
               if (prod) {
                 await supabase.from('productos').update({ stock: (prod.stock || 0) + det.cantidad }).eq('id', det.producto_id);
               }
            }
         }
      }

      setPedidoSeleccionado({ ...pedidoSeleccionado, estado: nuevoEstado });
      fetchPedidos();
      
      const msg = nuevoEstado === 'En preparaci├│n' 
        ? 'Pago aprobado. El pedido ahora est├í En Preparaci├│n.' 
        : 'Pago rechazado. El pedido ha sido cancelado y el stock devuelto.';
        
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Simulador Wompi', msg);
    } catch (error) {
      Alert.alert('Error', 'No se pudo simular el pago: ' + error.message);
    }
  };

  /**
   * Env├¡a la calificaci├│n del pedido a Supabase
   */
  const submitRating = async () => {
    if (rating === 0) {
      const msg = 'Por favor selecciona una calificaci├│n de 1 a 5 estrellas.';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Error', msg);
      return;
    }
    setSubmittingRating(true);
    try {
      const { error } = await supabase
        .from('pedidos')
        .update({ calificacion: rating, comentario_calificacion: comment })
        .eq('id', pedidoSeleccionado.id);
      
      if (error) throw error;
      
      // Actualizar estado local
      setPedidoSeleccionado({ ...pedidoSeleccionado, calificacion: rating, comentario_calificacion: comment });
      fetchPedidos();
      if (Platform.OS === 'web') window.alert('Calificaci├│n enviada correctamente.');
    } catch (error) {
      Alert.alert('Error', 'No se pudo enviar la calificaci├│n: ' + error.message);
    } finally {
      setSubmittingRating(false);
    }
  };

  /**
   * Abre la mensajer├¡a con el vendedor directamente.
   */
  const contactarVendedor = (vendedorId) => {
    setModalVisible(false);
    onNavigate('mensajeria', { initialRecipient: vendedorId });
  };

  const getBadgeStyle = (estado) => {
    switch (estado) {
      case 'Pendiente': return { bg: '#fee2e2', text: '#ef4444' };
      case 'En preparaci├│n': return { bg: '#fef3c7', text: '#d97706' };
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
        onPress={() => openModal(item)}
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
      
      {/* HEADER PRINCIPAL INTERGEA */}
      <Header onMenuPress={onToggleMenu} />

      {/* HEADER DE LA SECCI├ôN (MIS PEDIDOS) */}
      <View style={styles.header}>
        {/* Espaciador invisible para mantener el t├¡tulo centrado */}
        <TouchableOpacity onPress={() => onNavigate('comprador')} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mis Pedidos</Text>
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
              <Text style={styles.emptyText}>No has realizado pedidos a├║n.</Text>
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
                    <Text style={styles.sectionLabel}>Estado de Env├¡o:</Text>
                    <View style={[styles.statusBanner, { backgroundColor: getBadgeStyle(pedidoSeleccionado.estado).bg + '20' }]}>
                      <Ionicons name="cube" size={20} color={getBadgeStyle(pedidoSeleccionado.estado).text} />
                      <Text style={[styles.statusBannerText, { color: getBadgeStyle(pedidoSeleccionado.estado).text }]}>
                        {pedidoSeleccionado.estado}
                      </Text>
                    </View>
                    
                    {/* RF-029: Mostrar motivo solo si est├í cancelado */}
                    {pedidoSeleccionado.estado === 'Cancelado' && pedidoSeleccionado.motivo_cancelacion && (
                      <View style={styles.motivoContainer}>
                        <Ionicons name="information-circle-outline" size={16} color="#ef4444" />
                        <Text style={styles.motivoText}>
                          Motivo: {pedidoSeleccionado.motivo_cancelacion}
                        </Text>
                      </View>
                    )}
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

                  {/* SECCI├ôN DE CALIFICACI├ôN */}
                  {pedidoSeleccionado.estado === 'Entregado' && (
                    <View style={styles.section}>
                      <Text style={styles.sectionLabel}>Calificaci├│n del Pedido:</Text>
                      {pedidoSeleccionado.calificacion ? (
                        <View style={styles.ratingCard}>
                          <View style={styles.starsContainer}>
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Ionicons 
                                key={star} 
                                name={star <= pedidoSeleccionado.calificacion ? "star" : "star-outline"} 
                                size={28} 
                                color="#fbbf24" 
                              />
                            ))}
                          </View>
                          {pedidoSeleccionado.comentario_calificacion ? (
                            <Text style={styles.ratingComment}>"{pedidoSeleccionado.comentario_calificacion}"</Text>
                          ) : null}
                          <Text style={styles.ratedText}>┬íGracias por tu calificaci├│n!</Text>
                        </View>
                      ) : (
                        <View style={styles.ratingCard}>
                          <Text style={styles.ratingPrompt}>┬┐C├│mo calificar├¡as este pedido?</Text>
                          <View style={styles.starsContainer}>
                            {[1, 2, 3, 4, 5].map((star) => (
                              <TouchableOpacity key={star} onPress={() => setRating(star)}>
                                <Ionicons 
                                  name={star <= rating ? "star" : "star-outline"} 
                                  size={36} 
                                  color="#fbbf24" 
                                />
                              </TouchableOpacity>
                            ))}
                          </View>
                          <TextInput
                            style={styles.commentInput}
                            placeholder="Deja un comentario (opcional)"
                            placeholderTextColor="#64748b"
                            value={comment}
                            onChangeText={setComment}
                            multiline
                          />
                          <TouchableOpacity 
                            style={[styles.submitRatingBtn, submittingRating && { opacity: 0.7 }]}
                            onPress={submitRating}
                            disabled={submittingRating}
                          >
                            {submittingRating ? (
                              <ActivityIndicator color="#ffffff" size="small" />
                            ) : (
                              <Text style={styles.submitRatingText}>Enviar Calificaci├│n</Text>
                            )}
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  )}

                  {pedidoSeleccionado.estado === 'Pendiente' && (
                    <View style={styles.section}>
                      <Text style={styles.sectionLabel}>Gesti├│n de Pedido:</Text>
                      
                      {/* Simulador de Pago Wompi (Para desarrollo/testing) */}
                      <View style={styles.simuladorContainer}>
                        <Text style={styles.simuladorTitle}>Simulador de Pago Wompi</Text>
                        <View style={styles.simuladorActions}>
                          <TouchableOpacity 
                            style={[styles.simularBtn, { backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: '#10b981' }]}
                            onPress={() => simularPago(pedidoSeleccionado, 'En preparaci├│n')}
                          >
                            <Ionicons name="checkmark-circle-outline" size={20} color="#10b981" />
                            <Text style={[styles.simularBtnText, { color: '#10b981' }]}>Aprobar</Text>
                          </TouchableOpacity>
                          
                          <TouchableOpacity 
                            style={[styles.simularBtn, { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: '#ef4444' }]}
                            onPress={() => simularPago(pedidoSeleccionado, 'Cancelado')}
                          >
                            <Ionicons name="close-circle-outline" size={20} color="#ef4444" />
                            <Text style={[styles.simularBtnText, { color: '#ef4444' }]}>Rechazar</Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      {/* RF-029: Cancelaci├│n con Motivo */}
                      <View style={{ marginTop: 20 }}>
                        <TextInput
                          style={styles.commentInput}
                          placeholder="Motivo de cancelaci├│n (opcional)"
                          placeholderTextColor="#64748b"
                          value={motivoCancelacion}
                          onChangeText={setMotivoCancelacion}
                          multiline
                        />
                        <TouchableOpacity 
                          style={[styles.cancelarBtn, submittingCancel && { opacity: 0.7 }]}
                          onPress={() => cancelarPedido(pedidoSeleccionado)}
                          disabled={submittingCancel}
                        >
                          {submittingCancel ? (
                            <ActivityIndicator color="#ef4444" size="small" />
                          ) : (
                            <Text style={styles.cancelarBtnText}>Cancelar Pedido</Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
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
  listContent: { padding: 20, paddingBottom: 120 },
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
  ratingCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 16, alignItems: 'center' },
  starsContainer: { flexDirection: 'row', justifyContent: 'center', marginVertical: 10, gap: 8 },
  ratingPrompt: { color: '#ffffff', fontSize: 14, fontWeight: 'bold' },
  ratedText: { color: '#10b981', fontSize: 12, marginTop: 10, fontWeight: 'bold' },
  ratingComment: { color: '#cbd5e1', fontSize: 13, marginTop: 8, fontStyle: 'italic', textAlign: 'center' },
  commentInput: { backgroundColor: '#0f172a', width: '100%', borderRadius: 12, color: '#ffffff', padding: 12, minHeight: 80, textAlignVertical: 'top', marginTop: 10, borderWidth: 1, borderColor: '#334155' },
  submitRatingBtn: { backgroundColor: '#3b82f6', width: '100%', paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginTop: 15 },
  submitRatingText: { color: '#ffffff', fontWeight: 'bold', fontSize: 14 },
  simuladorContainer: { marginTop: 10, padding: 16, backgroundColor: '#1e293b', borderRadius: 16, borderWidth: 1, borderColor: '#334155', borderStyle: 'dashed' },
  simuladorTitle: { color: '#94a3b8', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', textAlign: 'center', marginBottom: 12, letterSpacing: 1 },
  simuladorActions: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  simularBtn: { flex: 1, flexDirection: 'row', height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, gap: 6 },
  simularBtnText: { fontWeight: 'bold', fontSize: 13 },
  motivoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 10,
    borderRadius: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  motivoText: {
    color: '#ef4444',
    fontSize: 13,
    fontStyle: 'italic',
    marginLeft: 8,
    flex: 1,
  },
});

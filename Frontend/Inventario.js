import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  Platform,
  Modal,
  TextInput,
  StatusBar,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from './supabase';

export default function Inventario({ userData, onBack, onNavigate }) {
  // Datos provenientes de la base de datos
  const [inventario, setInventario] = useState([]);
  const [loading, setLoading] = useState(true);

  // Efecto para cargar los productos desde Supabase
  useEffect(() => {
    const fetchProductos = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('productos')
          .select('*')
          .eq('usuario_id', userData?.id || null);

        if (error) {
          throw error;
        }

        if (data) {
          // Mapear los datos de BD a la estructura que espera la interfaz
          const productosFormateados = data.map((prod) => ({
            id: prod.id,
            identificador: prod.nombre,
            sku: prod.id ? prod.id.substring(0, 8).toUpperCase() : 'N/A', // Generar SKU visual corto a partir del UUID
            stock: prod.stock,
            minimo: prod.cantidad_minima || 10,
          }));
          setInventario(productosFormateados);
        }
      } catch (error) {
        console.error('Error fetching productos:', error.message);
        if (Platform.OS === 'web') {
          window.alert('Error al cargar inventario: ' + error.message);
        } else {
          Alert.alert('Error', 'No se pudo cargar el inventario: ' + error.message);
        }
      } finally {
        setLoading(false);
      }
    };

    if (userData?.id) {
      fetchProductos();
    } else {
      setLoading(false);
    }
  }, [userData]);

  // Historial de movimientos
  const [historial, setHistorial] = useState([]);

  // Estados para el Modal de Ajuste
  const [modalVisible, setModalVisible] = useState(false);
  const [productoAjustado, setProductoAjustado] = useState(null);
  
  // Opciones: 'nuevo_valor', 'sumar', 'restar'
  const [tipoAjuste, setTipoAjuste] = useState('nuevo_valor');
  const [cantidadAjuste, setCantidadAjuste] = useState('');
  const [motivoAjuste, setMotivoAjuste] = useState('');

  // Estados para ver el historial
  const [verHistorial, setVerHistorial] = useState(false);

  // --- Funciones Lógicas ---

  const abrirModalDeAjuste = (producto) => {
    setProductoAjustado(producto);
    setCantidadAjuste('');
    setMotivoAjuste('');
    setTipoAjuste('nuevo_valor'); // Por defecto reemplazar todo el valor
    setModalVisible(true);
  };

  const calcularEstado = (stock, minimo) => {
    if (stock === 0) return { texto: 'Agotado', color: '#ef4444' };
    if (stock <= minimo) return { texto: 'Bajo', color: '#f59e0b' };
    return { texto: 'Disponible', color: '#10b981' };
  };

  const procesarAjuste = async () => {
    if (!productoAjustado) return;

    let cantVal = parseInt(cantidadAjuste, 10);
    if (isNaN(cantVal) && cantidadAjuste !== '') {
      Platform.OS === 'web' ? window.alert('Error: La cantidad debe ser un número.') : Alert.alert('Error', 'La cantidad debe ser un número.');
      return;
    }

    if (isNaN(cantVal)) cantVal = 0; // Si dejó vacío

    let nuevoStock = productoAjustado.stock;
    let tipoOperacion = '';
    
    // b) el proveedor puede aumentar o disminuir stock.
    if (tipoAjuste === 'sumar') {
      nuevoStock += cantVal;
      tipoOperacion = `Aumentó ${cantVal}`;
    } else if (tipoAjuste === 'restar') {
      nuevoStock -= cantVal;
      tipoOperacion = `Disminuyó ${cantVal}`;
    } else {
      nuevoStock = cantVal;
      const diferencia = nuevoStock - productoAjustado.stock;
      tipoOperacion = diferencia >= 0 ? `Aumentó ${diferencia} (Fijado en ${nuevoStock})` : `Disminuyó ${Math.abs(diferencia)} (Fijado en ${nuevoStock})`;
    }

    // b) no se aceptan valores negativos.
    if (nuevoStock < 0) {
      Platform.OS === 'web' 
        ? window.alert('Operación Inválida\n\nEl stock resultante no puede ser menor que cero.') 
        : Alert.alert('Operación Inválida', 'El stock resultante no puede ser menor que cero.');
      return;
    }

    try {
      // Registrar actualización en Supabase
      const { error } = await supabase
        .from('productos')
        .update({ stock: nuevoStock })
        .eq('id', productoAjustado.id);
        
      if (error) throw error;

      // a) Actualizar el inventario local
      const nuevoInventario = inventario.map(prod => 
        prod.id === productoAjustado.id ? { ...prod, stock: nuevoStock } : prod
      );
      setInventario(nuevoInventario);

      // c) Genera un registro en el historial de movimientos
      const nuevoRegistro = {
        id: Date.now(),
        fecha: new Date().toLocaleString(),
        productoId: productoAjustado.id,
        identificador: productoAjustado.identificador,
        sku: productoAjustado.sku,
        operacion: tipoOperacion,
        stockAnterior: productoAjustado.stock,
        stockNuevo: nuevoStock,
        motivo: motivoAjuste || 'Ajuste manual sin especificar',
      };
      
      setHistorial([nuevoRegistro, ...historial]);

      // Cerrar modal
      setModalVisible(false);

    } catch (err) {
      console.error('Error actualizando stock:', err.message);
      if (Platform.OS === 'web') {
        window.alert('Error al actualizar inventario: ' + err.message);
      } else {
        Alert.alert('Error', 'No se pudo guardar el ajuste: ' + err.message);
      }
    }
  };

  // --- Renderizado ---

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER DE NAVEGACIÓN */}
      <View style={styles.header}>
        <View style={styles.headerIcons}>
          {/* Logo Pequeño */}
          <View style={{ alignItems: 'center', marginRight: 15 }}>
            <Ionicons name="aperture" size={20} color="#0ea5e9" />
            <Text style={{ fontSize: 6, color: '#0ea5e9', fontWeight: 'bold' }}>INTERGEA</Text>
          </View>

          <TouchableOpacity onPress={() => onNavigate ? onNavigate('dashboard') : onBack()}>
            <Ionicons name="home" size={22} color="#f8fafc" style={{ marginHorizontal: 8 }} />
          </TouchableOpacity>
          

          <TouchableOpacity onPress={() => setVerHistorial(false)}>
            <Ionicons name={!verHistorial ? "layers" : "layers-outline"} size={24} color={!verHistorial ? "#0ea5e9" : "#64748b"} style={{ marginHorizontal: 8 }} />
          </TouchableOpacity>
          
          <TouchableOpacity onPress={() => setVerHistorial(true)}>
            <Ionicons name={verHistorial ? "cube" : "cube-outline"} size={24} color={verHistorial ? "#0ea5e9" : "#64748b"} style={{ marginHorizontal: 8 }} />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => onNavigate && onNavigate('perfil')}>
            <Ionicons name="person-circle-outline" size={30} color="#cbd5e1" style={{ marginHorizontal: 8 }} />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => onNavigate && onNavigate('mensajeria')}>
            <Ionicons name="chatbubble-outline" size={24} color="#64748b" style={{ marginHorizontal: 8 }} />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => onNavigate && onNavigate('login')}>
            <Ionicons name="log-out-outline" size={26} color="#f8fafc" style={{ marginLeft: 8 }} />
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.title}>{verHistorial ? "Historial de Ajustes" : "Inventario"}</Text>

      {/* VISTA PRINCIPAL (Inventario o Historial) */}
      <ScrollView contentContainerStyle={styles.scrollContent} style={styles.scrollView}>
        {!verHistorial ? (
          // --- TABLA DE INVENTARIO ---
          loading ? (
             <ActivityIndicator size="large" color="#0ea5e9" style={{ marginTop: 50 }} />
          ) : inventario.length === 0 ? (
             <Text style={{color: '#94a3b8', marginTop: 50}}>No hay productos en inventario.</Text>
          ) : (
            inventario.map((item) => {
              const estado = calcularEstado(item.stock, item.minimo);
              return (
              <View key={item.id} style={styles.cardItem}>
                <View style={styles.cardHeader}>
                  <Text style={styles.itemTitle}>{item.identificador}</Text>
                  <Text style={styles.itemSku}>SKU: {item.sku}</Text>
                </View>
                
                <View style={styles.gridContainer}>
                  <View style={styles.gridBox}>
                    <Text style={styles.gridLabel}>Stock</Text>
                    <Text style={styles.gridValueNumber}>{item.stock}</Text>
                  </View>
                  <View style={styles.gridLine} />
                  <View style={styles.gridBox}>
                    <Text style={styles.gridLabel}>Mínimo</Text>
                    <Text style={styles.gridValueNumber}>{item.minimo}</Text>
                  </View>
                  <View style={styles.gridLine} />
                  <View style={styles.gridBox}>
                    <Text style={styles.gridLabel}>Estado</Text>
                    <View style={[styles.estadoBadge, { backgroundColor: estado.color + '20', borderColor: estado.color }]}>
                      <Text style={[styles.estadoText, { color: estado.color }]}>{estado.texto}</Text>
                    </View>
                  </View>
                </View>

                {/* BOTONES DE ACCIÓN */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 15 }}>
                  {/* Ajustar Stock (Solo para el responsable) */}
                  <TouchableOpacity 
                    style={[styles.btnAccion, { backgroundColor: '#cbd5e1', flex: 1, marginRight: 8 }]} 
                    onPress={() => abrirModalDeAjuste(item)}
                  >
                    <Ionicons name="stats-chart-outline" size={16} color="#0f172a" />
                    <Text style={styles.btnAccionText}>Stock</Text>
                  </TouchableOpacity>

                  {/* Editar Info (Restringido a la empresa propietaria) */}
                  {item.empresa_id === userData?.id ? (
                    <TouchableOpacity 
                      style={[styles.btnAccion, { backgroundColor: '#0ea5e9', flex: 1.5 }]} 
                      onPress={() => onNavigate('editar_producto', item)}
                    >
                      <Ionicons name="create-outline" size={16} color="#ffffff" />
                      <Text style={[styles.btnAccionText, { color: '#ffffff' }]}>Editar Producto</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={[styles.btnAccion, { backgroundColor: '#1e293b', flex: 1.5, opacity: 0.5 }]}>
                      <Ionicons name="lock-closed-outline" size={16} color="#64748b" />
                      <Text style={[styles.btnAccionText, { color: '#64748b' }]}>Solo Lectura</Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })
          )
        ) : (
          // --- LISTA DE HISTORIAL ---
          historial.length === 0 ? (
            <Text style={{color: '#94a3b8', marginTop: 20}}>No hay movimientos registrados recientes.</Text>
          ) : (
            historial.map((reg) => (
              <View key={reg.id} style={styles.historyCard}>
                <View style={styles.historyHeader}>
                  <Text style={styles.historyDate}>{reg.fecha}</Text>
                  <Text style={styles.historySku}>{reg.sku}</Text>
                </View>
                <Text style={styles.historyProduct}>{reg.identificador}</Text>
                <Text style={styles.historyOp}>{reg.operacion}</Text>
                <Text style={styles.historyStock}>Stock resultante: {reg.stockNuevo}</Text>
                <Text style={styles.historyReason}>Motivo: <Text style={{fontWeight:'normal'}}>{reg.motivo}</Text></Text>
              </View>
            ))
          )
        )}
      </ScrollView>

      {/* MODAL DE AJUSTE MANUAL */}
      {modalVisible && productoAjustado && (
        <Modal transparent={true} animationType="slide" visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Ajuste Manual</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Ionicons name="close-circle" size={28} color="#94a3b8" />
                </TouchableOpacity>
              </View>
              
              <Text style={styles.modalSubtitle}>{productoAjustado.identificador} (SKU: {productoAjustado.sku})</Text>
              <Text style={styles.modalStockActual}>Stock actual: <Text style={{color:'#fff', fontWeight: 'bold'}}>{productoAjustado.stock}</Text></Text>

              <View style={styles.ajusteOpciones}>
                <TouchableOpacity style={[styles.btnTipoAjuste, tipoAjuste === 'nuevo_valor' && styles.btnTipoAjusteActivo]} onPress={() => setTipoAjuste('nuevo_valor')}>
                  <Text style={styles.btnTipoAjusteText}>Fijar Valor</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btnTipoAjuste, tipoAjuste === 'sumar' && styles.btnTipoAjusteActivo]} onPress={() => setTipoAjuste('sumar')}>
                  <Text style={styles.btnTipoAjusteText}>Sumar (+)</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btnTipoAjuste, tipoAjuste === 'restar' && styles.btnTipoAjusteActivo]} onPress={() => setTipoAjuste('restar')}>
                  <Text style={styles.btnTipoAjusteText}>Restar (-)</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.modalLabel}>{tipoAjuste === 'nuevo_valor' ? 'Nuevo Stock:' : 'Cantidad a ajustar:'}</Text>
              <TextInput
                style={styles.modalInput}
                keyboardType="numeric"
                value={cantidadAjuste}
                onChangeText={setCantidadAjuste}
                placeholder="Ej: 5"
                placeholderTextColor="#94a3b8"
              />

              <Text style={styles.modalLabel}>Motivo del ajuste (Opcional):</Text>
              <TextInput
                style={[styles.modalInput, { minHeight: 60 }]}
                multiline={true}
                value={motivoAjuste}
                onChangeText={setMotivoAjuste}
                placeholder="Ej: Corrección por merma, compra local..."
                placeholderTextColor="#94a3b8"
              />

              <TouchableOpacity style={styles.btnGuardar} onPress={procesarAjuste}>
                <Text style={styles.btnGuardarText}>Guardar Ajuste</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* Botón Flotante para Crear Producto */}
      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => onNavigate && onNavigate('crear_producto')}
      >
        <Ionicons name="add" size={32} color="#ffffff" />
      </TouchableOpacity>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 20,
    paddingBottom: 15,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  title: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  scrollView: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    alignItems: 'center',
    paddingBottom: 40,
  },
  cardItem: {
    width: '90%',
    backgroundColor: '#0f172a',
    borderRadius: 20,
    padding: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  cardHeader: {
    marginBottom: 15,
  },
  itemTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  itemSku: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  gridContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 15,
    padding: 15,
  },
  gridBox: {
    flex: 1,
    alignItems: 'center',
  },
  gridLine: {
    width: 1,
    height: '100%',
    backgroundColor: '#334155',
  },
  gridLabel: {
    color: '#94a3b8',
    fontSize: 11,
    marginBottom: 5,
  },
  gridValueNumber: {
    color: '#e2e8f0',
    fontSize: 18,
    fontWeight: 'bold',
  },
  estadoBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  estadoText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  btnAccion: {
    flexDirection: 'row',
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnAccionText: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  // -- Estilos Historial --
  historyCard: {
    width: '90%',
    backgroundColor: '#0f172a',
    borderRadius: 15,
    padding: 15,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#0ea5e9'
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  historyDate: {
    color: '#94a3b8',
    fontSize: 11,
  },
  historySku: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: 'bold',
  },
  historyProduct: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  historyOp: {
    color: '#0ea5e9',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  historyStock: {
    color: '#10b981',
    fontSize: 12,
    marginBottom: 5,
  },
  historyReason: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: 'bold',
    fontStyle: 'italic',
  },
  // -- Estilos Modal --
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    backgroundColor: '#0f172a',
    borderRadius: 25,
    padding: 25,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalSubtitle: {
    color: '#0ea5e9',
    fontSize: 14,
    marginBottom: 10,
  },
  modalStockActual: {
    color: '#94a3b8',
    fontSize: 14,
    marginBottom: 20,
  },
  ajusteOpciones: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  btnTipoAjuste: {
    flex: 1,
    backgroundColor: '#1e293b',
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  btnTipoAjusteActivo: {
    backgroundColor: '#0ea5e920',
    borderColor: '#0ea5e9',
  },
  btnTipoAjusteText: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: 'bold',
  },
  modalLabel: {
    color: '#e2e8f0',
    fontSize: 13,
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    color: '#ffffff',
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginBottom: 15,
  },
  btnGuardar: {
    backgroundColor: '#0ea5e9',
    height: 45,
    borderRadius: 22.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  btnGuardarText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  fab: {
    position: 'absolute',
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    right: 20,
    bottom: 25,
    backgroundColor: '#0ea5e9',
    borderRadius: 30,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 5,
  },
});

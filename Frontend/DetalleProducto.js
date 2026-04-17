import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Image,
  Dimensions,
  Platform,
  StatusBar,
  Alert,
  TextInput,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from './supabase';

const { width } = Dimensions.get('window');

/**
 * COMPONENTE: DETALLE DEL PRODUCTO
 * Muestra la información completa de un suministro y permite añadir al carrito o contactar al vendedor.
 */
export default function DetalleProducto({ userData, producto, onBack, onNavigate, onAddToCart }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [cantidad, setCantidad] = useState(producto.cantidad_minima || 1);
  const [enviando, setEnviando] = useState(false);

  if (!producto) return null;

  const imagenes = Array.isArray(producto.imagenes) ? producto.imagenes : [];
  const hasImages = imagenes.length > 0;

  const nextImage = () => {
    if (imagenes.length > 1) {
      setCurrentImageIndex((prev) => (prev + 1) % imagenes.length);
    }
  };

  const prevImage = () => {
    if (imagenes.length > 1) {
      setCurrentImageIndex((prev) => (prev - 1 + imagenes.length) % imagenes.length);
    }
  };

  const handleAddToCart = async () => {
    const numCantidad = parseInt(cantidad);
    if (isNaN(numCantidad) || numCantidad < (producto.cantidad_minima || 1)) {
        Alert.alert("Cantidad inválida", `La cantidad mínima es ${producto.cantidad_minima || 1}`);
        return;
    }
    if (numCantidad > (producto.stock || 0)) {
        Alert.alert("Sin stock", "No puedes añadir más de lo que hay disponible.");
        return;
    }

    setEnviando(true);
    try {
        // Añadimos al estado local del carrito sin descontar de la DB todavía
        onAddToCart({ ...producto, cantidadSeleccionada: numCantidad });
        
        const msg = `¡${numCantidad} unidad(es) de ${producto.nombre} añadida(s) al carrito!`;
        if (Platform.OS === 'web') {
            window.alert(msg);
        } else {
            Alert.alert('Éxito', msg);
        }
        
        onBack(); // Regresamos al catálogo
    } catch (err) {
        Alert.alert("Error", err.message);
    } finally {
        setEnviando(false);
    }
  };

  /**
   * Lógica para incrementar cantidad respetando el stock disponible.
   */
  const incrementar = () => {
    if (cantidad < (producto.stock || 0)) {
      setCantidad(cantidad + 1);
    }
  };

  /**
   * Lógica para decrementar cantidad respetando el mínimo de compra.
   */
  const decrementar = () => {
    if (cantidad > (producto.cantidad_minima || 1)) {
      setCantidad(cantidad - 1);
    }
  };

  const contactarVendedor = (customMessage = null) => {
    // Si customMessage no es un string (ej. es un objeto de evento de React), lo ponemos como null
    const finalMessage = typeof customMessage === 'string' ? customMessage : null;
    
    const sellerAuthId = producto.Usuarios_Registrados?.auth_user_id;
    console.log("DEBUG: Intentando contactar al vendedor con AuthID:", sellerAuthId);
    console.log("DEBUG: Contexto del producto:", producto.nombre);
    
    if (!sellerAuthId) {
      const errorMsg = "No se pudo identificar el ID de autenticación del vendedor.";
      console.error("DEBUG:", errorMsg, "Producto Data:", JSON.stringify(producto));
      if (Platform.OS === 'web') {
        window.alert("Error: " + errorMsg);
      } else {
        Alert.alert("Error", errorMsg);
      }
      return;
    }

    onNavigate('mensajeria', { 
      initialRecipient: sellerAuthId,
      initialProduct: producto,
      initialMessage: finalMessage
    });
  };

  const solicitarProducto = () => {
    const msg = `Hola, me gustaría solicitar información sobre el producto: ${producto.nombre}, ya que se encuentra sin stock actualmente.`;
    contactarVendedor(msg);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* HEADER FLOTANTE */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.circleBtn}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <View style={{ width: 44 }} /> 
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* CARRUSEL DE IMÁGENES */}
        <View style={styles.imageContainer}>
          {hasImages ? (
            <>
              <Image 
                source={{ uri: imagenes[currentImageIndex] }} 
                style={styles.mainImage} 
                resizeMode="cover" 
              />
              {imagenes.length > 1 && (
                <>
                  <TouchableOpacity style={[styles.navArrow, styles.arrowLeft]} onPress={prevImage}>
                    <Ionicons name="chevron-back" size={28} color="#ffffff" />
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.navArrow, styles.arrowRight]} onPress={nextImage}>
                    <Ionicons name="chevron-forward" size={28} color="#ffffff" />
                  </TouchableOpacity>
                  <View style={styles.pagination}>
                    <Text style={styles.paginationText}>{currentImageIndex + 1} / {imagenes.length}</Text>
                  </View>
                </>
              )}
            </>
          ) : (
            <View style={styles.noImagePlaceholder}>
              <Ionicons name="image-outline" size={80} color="#334155" />
              <Text style={styles.noImageText}>Sin imágenes disponibles</Text>
            </View>
          )}
        </View>

        {/* INFORMACIÓN DEL PRODUCTO */}
        <View style={styles.infoContent}>
          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.categoryText}>{producto.categoria || 'Sin Categoría'}</Text>
                {(producto.stock || 0) <= 0 && (
                   <View style={styles.outOfStockBadge}>
                     <Text style={styles.outOfStockText}>SIN STOCK</Text>
                   </View>
                )}
              </View>
              <Text style={styles.productName}>{producto.nombre}</Text>
            </View>
            <Text style={styles.priceText}>${producto.precio || '0'}</Text>
          </View>

          <View style={styles.divider} />

          {/* VENDEDOR INFO */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Proveedor</Text>
            <View style={styles.sellerCard}>
              <View style={styles.sellerAvatar}>
                <Ionicons name="business" size={20} color="#3b82f6" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sellerName}>{producto.Usuarios_Registrados?.razon_social || 'Empresa proveedora'}</Text>
                <Text style={styles.sellerLocation}>
                  <Ionicons name="location-outline" size={12} color="#94a3b8" /> {producto.Usuarios_Registrados?.ciudad || 'Ubicación no disponible'}
                </Text>
              </View>
              <TouchableOpacity style={styles.msgBtn} onPress={contactarVendedor}>
                <Ionicons name="chatbubble-ellipses-outline" size={22} color="#3b82f6" />
              </TouchableOpacity>
            </View>
          </View>

          {/* SELECTOR DE CANTIDAD */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cantidad a comprar</Text>
            <View style={styles.quantityContainer}>
              <TouchableOpacity 
                style={[styles.qtyBtn, cantidad <= (producto.cantidad_minima || 1) && styles.qtyBtnDisabled]} 
                onPress={decrementar}
              >
                <Ionicons name="remove" size={24} color={cantidad <= (producto.cantidad_minima || 1) ? "#475569" : "#ffffff"} />
              </TouchableOpacity>
              
              <View style={styles.qtyDisplay}>
                <TextInput 
                    style={styles.qtyInput}
                    value={String(cantidad)}
                    onChangeText={(text) => {
                        const cleanText = text.replace(/[^0-9]/g, '');
                        setCantidad(cleanText ? parseInt(cleanText) : 0);
                    }}
                    keyboardType="numeric"
                    maxLength={5}
                />
              </View>

              <TouchableOpacity 
                style={[styles.qtyBtn, (cantidad >= (producto.stock || 0) || (producto.stock || 0) <= 0) && styles.qtyBtnDisabled]} 
                onPress={incrementar}
                disabled={(producto.stock || 0) <= 0}
              >
                <Ionicons name="add" size={24} color={(cantidad >= (producto.stock || 0) || (producto.stock || 0) <= 0) ? "#475569" : "#ffffff"} />
              </TouchableOpacity>

              <View style={styles.stockAvailability}>
                <Text style={[styles.stockText, (producto.stock || 0) <= 0 && { color: '#ef4444' }]}>
                    {(producto.stock || 0) <= 0 ? "Sin stock disponible" : `Disponibles: ${producto.stock}`}
                </Text>
              </View>
            </View>
          </View>

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* FOOTER BAR (BOTÓN DE ACCIÓN) */}
      <View style={styles.footer}>
        <TouchableOpacity 
            style={[
                styles.primaryBtn, 
                enviando && { opacity: 0.7 },
                (producto.stock || 0) <= 0 && { backgroundColor: '#475569', shadowColor: 'transparent' }
            ]} 
            onPress={(producto.stock || 0) <= 0 ? solicitarProducto : handleAddToCart}
            disabled={enviando}
        >
          {enviando ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
                <Ionicons 
                    name={(producto.stock || 0) <= 0 ? "chatbubble-ellipses" : "cart"} 
                    size={20} 
                    color="#ffffff" 
                    style={{ marginRight: 10 }} 
                />
                <Text style={styles.primaryBtnText}>
                    {(producto.stock || 0) <= 0 ? "Solicitar Producto" : "Añadir al Carrito"}
                </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  header: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    left: 0,
    right: 0,
    height: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 100,
  },
  circleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  imageContainer: {
    width: width,
    height: width * 0.9,
    backgroundColor: '#0f172a',
    position: 'relative',
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
  noImagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImageText: {
    color: '#475569',
    marginTop: 10,
    fontSize: 16,
  },
  navArrow: {
    position: 'absolute',
    top: '45%',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowLeft: { left: 15 },
  arrowRight: { right: 15 },
  pagination: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  paginationText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  infoContent: {
    padding: 24,
    backgroundColor: '#020617',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -32,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  categoryText: {
    color: '#3b82f6',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  productName: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  priceText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: '#1e293b',
    marginBottom: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
  },
  sellerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  sellerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  sellerName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  sellerLocation: {
    color: '#94a3b8',
    fontSize: 12,
  },
  msgBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  descriptionText: {
    color: '#cbd5e1',
    fontSize: 15,
    lineHeight: 24,
  },
  specsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  specItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%',
    backgroundColor: '#0f172a',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  specTextCol: {
    marginLeft: 12,
  },
  specLabel: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: 'bold',
  },
  specValue: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: 'bold',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    backgroundColor: 'rgba(2, 6, 23, 0.9)',
    borderTopWidth: 1,
    borderColor: '#1e293b',
  },
  primaryBtn: {
    backgroundColor: '#3b82f6',
    flexDirection: 'row',
    height: 56,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  qtyBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyBtnDisabled: {
    opacity: 0.3,
  },
  qtyDisplay: {
    width: 60,
    alignItems: 'center',
  },
  qtyInput: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    width: '100%',
  },
  qtyText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  stockAvailability: {
    marginLeft: 'auto',
    marginRight: 10,
  },
  stockText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '500',
  },
  outOfStockBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 10,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  outOfStockText: {
    color: '#ef4444',
    fontSize: 10,
    fontWeight: 'bold',
  },
});

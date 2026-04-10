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
  Image,
  Dimensions,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from './supabase';

const { width } = Dimensions.get('window');

/**
 * COMPONENTE: VISTA COMPRADOR
 * Permite buscar y explorar productos de otros proveedores.
 */
export default function Comprador({ userData, onBack, onNavigate, cart, setCart }) {
  const [productos, setProductos] = useState([]);
  const [productosFiltrados, setProductosFiltrados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Filtros
  const [categoriaSel, setCategoriaSel] = useState('Todas');
  const [ciudadSel, setCiudadSel] = useState('Todas');
  const [showFilters, setShowFilters] = useState(false);

  // Datos para filtros (extraídos de los productos cargados)
  const [categorias, setCategorias] = useState(['Todas']);
  const [ciudades, setCiudades] = useState(['Todas']);

  useEffect(() => {
    fetchProductos();
  }, [userData]);

  const fetchProductos = async () => {
    setLoading(true);
    try {
      // 1. Obtener todos los productos EXCEPTO los del usuario actual
      const { data, error } = await supabase
        .from('productos')
        .select(`
          *,
          Usuarios_Registrados:usuario_id (auth_user_id, razon_social, ciudad)
        `)
        .neq('usuario_id', userData?.id || null);

      if (error) throw error;

      if (data) {
        setProductos(data);
        setProductosFiltrados(data);

        // 2. Extraer categorías y ciudades únicas para los filtros
        const cats = ['Todas', ...new Set(data.map(p => p.categoria).filter(Boolean))];
        const ciuds = ['Todas', ...new Set(data.map(p => p.Usuarios_Registrados?.ciudad).filter(Boolean))];
        
        setCategorias(cats);
        setCiudades(ciuds);
      }
    } catch (error) {
      console.error('Error cargando productos:', error.message);
    } finally {
      setLoading(false);
    }
  };

  // Lógica de filtrado
  useEffect(() => {
    let filtrados = productos;

    if (search.trim()) {
      filtrados = filtrados.filter(p => 
        p.nombre?.toLowerCase().includes(search.toLowerCase()) ||
        p.descripcion?.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (categoriaSel !== 'Todas') {
      filtrados = filtrados.filter(p => p.categoria === categoriaSel);
    }

    if (ciudadSel !== 'Todas') {
      filtrados = filtrados.filter(p => p.Usuarios_Registrados?.ciudad === ciudadSel);
    }

    setProductosFiltrados(filtrados);
  }, [search, categoriaSel, ciudadSel, productos]);

  const resetFilters = () => {
    setSearch('');
    setCategoriaSel('Todas');
    setCiudadSel('Todas');
  };

  // --- Sub-componente: Card de Producto ---
  const ProductCard = ({ item }) => {
    const imagenUrl = item.imagenes && item.imagenes.length > 0 ? item.imagenes[0] : null;

    return (
      <TouchableOpacity 
        style={styles.productCard}
        onPress={() => onNavigate('detalle_producto', item)}
        activeOpacity={0.9}
      >
        <View style={styles.imageContainer}>
          {imagenUrl ? (
            <Image source={{ uri: imagenUrl }} style={styles.productImage} resizeMode="cover" />
          ) : (
            <View style={styles.noImage}>
              <Ionicons name="image-outline" size={32} color="#334155" />
            </View>
          )}
          
          <View style={styles.badgeContainer}>
            {item.stock <= (item.cantidad_minima || 5) && (
              <View style={styles.lowStockBadge}>
                <Text style={styles.lowStockText}>Bajo Stock</Text>
              </View>
            )}
            <View style={styles.cityBadge}>
              <Text style={styles.cityText}>{item.Usuarios_Registrados?.ciudad || 'N/A'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.cardInfo}>
          <Text style={styles.productName} numberOfLines={1}>{item.nombre}</Text>
          <Text style={styles.sellerName} numberOfLines={1}>
            {item.Usuarios_Registrados?.razon_social || 'Proveedor'}
          </Text>
          
          <View style={styles.priceRow}>
            <Text style={styles.priceCurrency}>$</Text>
            <Text style={styles.priceValue}>{item.precio?.toLocaleString() || '---'}</Text>
            
            <TouchableOpacity 
              style={styles.addIconBtn}
              onPress={() => onNavigate('detalle_producto', item)}
            >
              <Ionicons name="add" size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => onBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Explorar Suministros</Text>
          <TouchableOpacity 
            style={styles.cartBtn}
            onPress={() => onNavigate('pedidos_comprador')}
          >
            <Ionicons name="receipt-outline" size={26} color="#ffffff" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.cartBtn}
            onPress={() => onNavigate('resumen_carrito')}
          >
            <Ionicons name="cart-outline" size={26} color="#ffffff" />
            {cart.length > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{cart.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* SEARCH BAR */}
        <View style={styles.searchContainer}>
          <View style={styles.searchWrapper}>
            <Ionicons name="search" size={20} color="#94a3b8" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar tintas, papeles, repuestos..."
              placeholderTextColor="#64748b"
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={18} color="#94a3b8" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity 
            style={[styles.filterBtn, showFilters && styles.filterBtnActive]}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Ionicons name="options-outline" size={24} color={showFilters ? "#3b82f6" : "#ffffff"} />
          </TouchableOpacity>
        </View>

        {/* FILTERS (Desplegable) */}
        {showFilters && (
          <View style={styles.filtersWrapper}>
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Categoría</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterOptions}>
                {categorias.map(cat => (
                  <TouchableOpacity 
                    key={cat} 
                    style={[styles.optionChip, categoriaSel === cat && styles.optionChipActive]}
                    onPress={() => setCategoriaSel(cat)}
                  >
                    <Text style={[styles.optionChipText, categoriaSel === cat && styles.optionChipTextActive]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Ciudad</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterOptions}>
                {ciudades.map(ciu => (
                  <TouchableOpacity 
                    key={ciu} 
                    style={[styles.optionChip, ciudadSel === ciu && styles.optionChipActive]}
                    onPress={() => setCiudadSel(ciu)}
                  >
                    <Text style={[styles.optionChipText, ciudadSel === ciu && styles.optionChipTextActive]}>{ciu}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {(categoriaSel !== 'Todas' || ciudadSel !== 'Todas') && (
              <TouchableOpacity style={styles.resetFiltersBtn} onPress={resetFilters}>
                <Text style={styles.resetFiltersText}>Limpiar Filtros</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* CONTENT */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Cargando suministros...</Text>
        </View>
      ) : productosFiltrados.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="search-outline" size={64} color="#1e293b" />
          <Text style={styles.noResultsTitle}>No se encontraron resultados</Text>
          <Text style={styles.noResultsSubtitle}>Prueba con otros términos o filtros</Text>
          <TouchableOpacity style={styles.resetSearchBtn} onPress={resetFilters}>
            <Text style={styles.resetSearchBtnText}>Mostrar todos</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.resultsHeader}>
            <Text style={styles.resultsCount}>{productosFiltrados.length} productos encontrados</Text>
          </View>
          
          <View style={styles.grid}>
            {productosFiltrados.map(item => (
              <ProductCard key={item.id} item={item} />
            ))}
          </View>
        </ScrollView>
      )}
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
    paddingBottom: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 15,
    elevation: 10,
    zIndex: 100,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    marginBottom: 20,
  },
  backBtn: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cartBtn: {
    padding: 8,
    position: 'relative',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
  },
  cartBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#f43f5e',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#0f172a',
    paddingHorizontal: 4,
  },
  cartBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  searchWrapper: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderRadius: 16,
    alignItems: 'center',
    paddingHorizontal: 15,
    height: 52,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '500',
  },
  filterBtn: {
    width: 52,
    height: 52,
    backgroundColor: '#1e293b',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  filterBtnActive: {
    borderColor: '#0ea5e9',
    backgroundColor: 'rgba(14, 165, 233, 0.1)',
  },
  filtersWrapper: {
    paddingTop: 20,
    paddingHorizontal: 20,
  },
  filterSection: {
    marginBottom: 16,
  },
  filterLabel: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  filterOptions: {
    flexDirection: 'row',
  },
  optionChip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#1e293b',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  optionChipActive: {
    backgroundColor: '#0ea5e9',
    borderColor: '#38bdf8',
    shadowColor: '#0ea5e9',
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  optionChipText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
  },
  optionChipTextActive: {
    color: '#ffffff',
  },
  resetFiltersBtn: {
    alignSelf: 'center',
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(14, 165, 233, 0.1)',
    borderRadius: 10,
  },
  resetFiltersText: {
    color: '#0ea5e9',
    fontSize: 13,
    fontWeight: '700',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    color: '#94a3b8',
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  noResultsTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
    marginTop: 24,
    textAlign: 'center',
  },
  noResultsSubtitle: {
    color: '#64748b',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 30,
    lineHeight: 22,
  },
  resetSearchBtn: {
    backgroundColor: '#0ea5e9',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: '#0ea5e9',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
    elevation: 6,
  },
  resetSearchBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 16,
  },
  scrollContent: {
    paddingBottom: 40,
    paddingTop: 10,
  },
  resultsHeader: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  resultsCount: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  grid: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  productCard: {
    width: (width - 55) / 2,
    backgroundColor: '#0f172a',
    borderRadius: 24,
    marginBottom: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1e293b',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  imageContainer: {
    width: '100%',
    height: 160,
    backgroundColor: '#1e293b',
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  noImage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeContainer: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 6,
  },
  lowStockBadge: {
    backgroundColor: '#f43f5e',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    shadowColor: '#f43f5e',
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  lowStockText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  cityBadge: {
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  cityText: {
    color: '#cbd5e1',
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  cardInfo: {
    padding: 15,
  },
  productName: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  sellerName: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 12,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  priceCurrency: {
    color: '#0ea5e9',
    fontSize: 14,
    fontWeight: '800',
    marginRight: 2,
  },
  priceValue: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
    flex: 1,
  },
  addIconBtn: {
    backgroundColor: '#0ea5e9',
    width: 32,
    height: 32,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0ea5e9',
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
});

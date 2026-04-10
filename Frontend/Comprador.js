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
          Usuarios_Registrados:usuario_id (razon_social, ciudad)
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
      >
        <View style={styles.imageContainer}>
          {imagenUrl ? (
            <Image source={{ uri: imagenUrl }} style={styles.productImage} resizeMode="cover" />
          ) : (
            <View style={styles.noImage}>
              <Ionicons name="image-outline" size={32} color="#475569" />
            </View>
          )}
          {item.stock <= (item.cantidad_minima || 5) && (
            <View style={styles.lowStockBadge}>
              <Text style={styles.lowStockText}>Bajo Stock</Text>
            </View>
          )}
        </View>

        <View style={styles.cardInfo}>
          <Text style={styles.productName} numberOfLines={1}>{item.nombre}</Text>
          <Text style={styles.sellerName} numberOfLines={1}>
            <Ionicons name="business" size={10} color="#94a3b8" /> {item.Usuarios_Registrados?.razon_social || 'Proveedor'}
          </Text>
          
          <View style={styles.priceRow}>
            <Text style={styles.priceText}>${item.precio || 'Consultar'}</Text>
            <View style={styles.cityBadge}>
              <Text style={styles.cityText}>{item.Usuarios_Registrados?.ciudad || 'N/A'}</Text>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.viewDetailBtn}
            onPress={() => onNavigate('detalle_producto', item)}
          >
            <Text style={styles.viewDetailBtnText}>Ver Detalles</Text>
            <Ionicons name="chevron-forward" size={14} color="#ffffff" />
          </TouchableOpacity>
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
            // Aquí se podría abrir un modal con el carrito
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
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderColor: '#1e293b',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    marginBottom: 16,
  },
  backBtn: {
    padding: 8,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cartBtn: {
    padding: 8,
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#ef4444',
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#0f172a',
  },
  cartBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  searchContainer: {
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
    height: 48,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
  },
  filterBtn: {
    width: 48,
    height: 48,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  filterBtnActive: {
    borderColor: '#3b82f6',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  filtersWrapper: {
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  filterSection: {
    marginBottom: 12,
  },
  filterLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  filterOptions: {
    flexDirection: 'row',
  },
  optionChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1e293b',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  optionChipActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#60a5fa',
  },
  optionChipText: {
    color: '#cbd5e1',
    fontSize: 13,
  },
  optionChipTextActive: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  resetFiltersBtn: {
    alignSelf: 'center',
    marginTop: 8,
  },
  resetFiltersText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '500',
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
  },
  noResultsTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 24,
  },
  noResultsSubtitle: {
    color: '#64748b',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  resetSearchBtn: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  resetSearchBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  resultsHeader: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  resultsCount: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '500',
  },
  grid: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  productCard: {
    width: (width - 48) / 2,
    backgroundColor: '#0f172a',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  imageContainer: {
    width: '100%',
    height: 140,
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
  lowStockBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  lowStockText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  cardInfo: {
    padding: 12,
  },
  productName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  sellerName: {
    color: '#94a3b8',
    fontSize: 10,
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  priceText: {
    color: '#3b82f6',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cityBadge: {
    backgroundColor: 'rgba(148, 163, 184, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  cityText: {
    color: '#94a3b8',
    fontSize: 9,
    fontWeight: '500',
  },
  viewDetailBtn: {
    backgroundColor: '#3b82f6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  viewDetailBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
    marginRight: 4,
  },
});

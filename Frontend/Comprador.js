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

import Header from './Header';

const { width } = Dimensions.get('window');

/**
 * COMPONENTE: VISTA COMPRADOR
 * Permite buscar y explorar productos de otros proveedores.
 */
export default function Comprador({ userData, onBack, onNavigate, cart, setCart, onToggleMenu }) {
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

  // --- Sub-component: Card de Producto ---
  const ProductCard = ({ item }) => {
    const imagenUrl = item.imagenes && item.imagenes.length > 0 ? item.imagenes[0] : null;

    return (
      <TouchableOpacity 
        style={styles.productCard}
        onPress={() => onNavigate('detalle_producto', item)}
        activeOpacity={0.8}
      >
        <View style={styles.imageContainer}>
          {imagenUrl ? (
            <Image source={{ uri: imagenUrl }} style={styles.productImage} resizeMode="cover" />
          ) : (
            <View style={styles.noImage}>
              <Ionicons name="cube-outline" size={40} color="#334155" />
            </View>
          )}
          
          <View style={styles.badgeContainer}>
            {item.stock <= (item.cantidad_minima || 5) && (
              <View style={styles.lowStockBadge}>
                <Ionicons name="alert-circle" size={10} color="#ffffff" style={{ marginRight: 2 }} />
                <Text style={styles.lowStockText}>Bajo Stock</Text>
              </View>
            )}
            <View style={styles.cityBadge}>
              <Ionicons name="location" size={10} color="#38bdf8" style={{ marginRight: 2 }} />
              <Text style={styles.cityText}>{item.Usuarios_Registrados?.ciudad || 'N/A'}</Text>
            </View>
          </View>
          
          <View style={styles.categoryBadge}>
             <Text style={styles.categoryBadgeText}>{item.categoria || 'Suministro'}</Text>
          </View>
        </View>

        <View style={styles.cardInfo}>
          <Text style={styles.productName} numberOfLines={2}>{item.nombre}</Text>
          <View style={styles.sellerRow}>
            <Ionicons name="business-outline" size={12} color="#64748b" style={{ marginRight: 4 }} />
            <Text style={styles.sellerName} numberOfLines={1}>
              {item.Usuarios_Registrados?.razon_social || 'Proveedor'}
            </Text>
          </View>
          
          <View style={styles.priceRow}>
            <View style={styles.priceContainer}>
              <Text style={styles.priceCurrency}>$</Text>
              <Text style={styles.priceValue}>{item.precio?.toLocaleString() || '---'}</Text>
            </View>
            
            <View style={styles.addIconBtn}>
              <Ionicons name="chevron-forward" size={16} color="#ffffff" />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* HEADER INTEGRADO */}
      <View style={styles.header}>
        <Header onMenuPress={onToggleMenu} />

        {/* SEARCH BAR REFINADA */}
        <View style={styles.searchContainer}>
          <View style={styles.searchWrapper}>
            <Ionicons name="search" size={20} color="#64748b" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar tintas, papeles, repuestos..."
              placeholderTextColor="#475569"
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={20} color="#64748b" />
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

        {/* FILTERS (Desplegable Premium) */}
        {showFilters && (
          <View style={styles.filtersWrapper}>
            <View style={styles.filterSection}>
              <View style={styles.filterHeader}>
                <Ionicons name="layers-outline" size={14} color="#3b82f6" style={{ marginRight: 6 }} />
                <Text style={styles.filterLabel}>Categoría</Text>
              </View>
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
              <View style={styles.filterHeader}>
                <Ionicons name="location-outline" size={14} color="#3b82f6" style={{ marginRight: 6 }} />
                <Text style={styles.filterLabel}>Ubicación</Text>
              </View>
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
                <Ionicons name="refresh-outline" size={14} color="#0ea5e9" style={{ marginRight: 4 }} />
                <Text style={styles.resetFiltersText}>Limpiar Filtros</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* CONTENT AREA */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Cargando catálogo...</Text>
        </View>
      ) : productosFiltrados.length === 0 ? (
        <View style={styles.centered}>
          <View style={styles.noResultsIcon}>
            <Ionicons name="search-outline" size={48} color="#334155" />
          </View>
          <Text style={styles.noResultsTitle}>Sin resultados</Text>
          <Text style={styles.noResultsSubtitle}>No encontramos productos que coincidan con tu búsqueda.</Text>
          <TouchableOpacity style={styles.resetSearchBtn} onPress={resetFilters}>
            <Text style={styles.resetSearchBtnText}>Ver todo el catálogo</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.resultsHeader}>
            <Text style={styles.resultsCount}>{productosFiltrados.length} SUMINISTROS DISPONIBLES</Text>
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
    paddingBottom: 25,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 20,
    elevation: 15,
    zIndex: 100,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    alignItems: 'center',
    marginTop: 5,
  },
  searchWrapper: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderRadius: 18,
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 56,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '500',
  },
  filterBtn: {
    width: 56,
    height: 56,
    backgroundColor: '#1e293b',
    borderRadius: 18,
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
    paddingTop: 24,
    paddingHorizontal: 20,
  },
  filterSection: {
    marginBottom: 20,
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  filterLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  filterOptions: {
    flexDirection: 'row',
  },
  optionChip: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: '#0f172a',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  optionChipActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#60a5fa',
    shadowColor: '#3b82f6',
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 8,
  },
  optionChipText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '700',
  },
  optionChipTextActive: {
    color: '#ffffff',
  },
  resetFiltersBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(14, 165, 233, 0.08)',
    borderRadius: 14,
    alignSelf: 'center',
  },
  resetFiltersText: {
    color: '#0ea5e9',
    fontSize: 13,
    fontWeight: '800',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    color: '#64748b',
    marginTop: 20,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  noResultsIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  noResultsTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 12,
    textAlign: 'center',
  },
  noResultsSubtitle: {
    color: '#64748b',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  resetSearchBtn: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 36,
    paddingVertical: 18,
    borderRadius: 20,
    shadowColor: '#3b82f6',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 15,
    elevation: 10,
  },
  resetSearchBtnText: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 15,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  scrollContent: {
    paddingBottom: 60,
    paddingTop: 15,
  },
  resultsHeader: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    marginBottom: 8,
  },
  resultsCount: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
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
    borderRadius: 28,
    marginBottom: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1e293b',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 12,
    elevation: 6,
  },
  imageContainer: {
    width: '100%',
    height: 150,
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
    backgroundColor: '#1e293b',
  },
  badgeContainer: {
    position: 'absolute',
    top: 12,
    left: 12,
    gap: 6,
    zIndex: 10,
  },
  lowStockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  lowStockText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  cityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  cityText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  categoryBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: 'rgba(59, 130, 246, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderTopLeftRadius: 12,
  },
  categoryBadgeText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  cardInfo: {
    padding: 16,
  },
  productName: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 6,
    lineHeight: 20,
    minHeight: 40,
  },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sellerName: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '600',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  priceCurrency: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '900',
    marginRight: 2,
  },
  priceValue: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
  },
  addIconBtn: {
    backgroundColor: '#3b82f6',
    width: 28,
    height: 28,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3b82f6',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
});

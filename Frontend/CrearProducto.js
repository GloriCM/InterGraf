import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  Platform,
  StatusBar,
  ActivityIndicator,
  Image
} from 'react-native';
import { Picker } from '@react-native-picker/picker'; // Si se usa para categorías, aunque ahora es un TextInput
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { supabase } from './supabase';

export default function CrearProducto({ onBack, onNavigate, producto, userData }) {
  // Determinar si estamos en modo edición
  const esEdicion = !!producto;
  // --- Estados del Formulario ---
  const [nombre, setNombre] = useState(producto?.nombre || '');
  const [precio, setPrecio] = useState(producto?.precio?.toString() || '');
  const [stock, setStock] = useState(producto?.stock?.toString() || '');
  const [descripcionTecnica, setDescripcionTecnica] = useState(producto?.descripcionTecnica || '');

  // Nuevos campos solicitados
  const [categoria, setCategoria] = useState(producto?.categoria || '');
  const [preciosVolumen, setPreciosVolumen] = useState(producto?.preciosVolumen || '');
  const [cantidadMinima, setCantidadMinima] = useState(producto?.cantidadMinima?.toString() || '1');
  const [tiempoEstimado, setTiempoEstimado] = useState(producto?.tiempoEstimado || '');

  // Imágenes
  const [imagenes, setImagenes] = useState(producto?.imagenes || []);
  const [loading, setLoading] = useState(false);

  // Efecto para verificar propiedad en modo edición
  useEffect(() => {
    if (esEdicion && producto.usuario_id !== userData?.id) {
       mostrarError("No tienes permisos para editar este producto.");
       onBack();
    }
  }, [esEdicion, producto, userData]);

  // --- Funciones ---

  const handleSelectImage = async () => {
    // Pedir permisos en móvil (en web no lanza error automáticamente, el navegador maneja el prompt de archivos)
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Lo sentimos, necesitamos permisos a la cámara para que esto funcione.');
        return;
      }
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 1, // Alta calidad
    });

    if (!result.canceled) {
      const nuevasImagenes = result.assets.map(asset => asset.uri);
      setImagenes([...imagenes, ...nuevasImagenes]);
    }
  };

  const mostrarError = (mensaje) => {
    if (Platform.OS === 'web') {
      window.alert("Error de Validación\n\n" + mensaje);
    } else {
      Alert.alert('Error de Validación', mensaje);
    }
  };

  const handleLanzarAlMercado = async () => {
    // 1. Nombre obligatorio y máximo 150 caracteres
    if (!nombre || nombre.trim() === '') {
      return mostrarError('El nombre del producto es obligatorio.');
    }
    if (nombre.length > 150) {
      return mostrarError('El nombre no puede exceder los 150 caracteres.');
    }

    // 2. Descripción larga obligatoria
    if (!descripcionTecnica || descripcionTecnica.trim() === '') {
      return mostrarError('La descripción técnica es obligatoria.');
    }

    // 3. Categoría obligatoria
    if (!categoria || categoria.trim() === '') {
      return mostrarError('La categoría es obligatoria.');
    }

    // 4. Precio unitario: decimal > 0
    const precioUnitarioNum = parseFloat(precio);
    if (isNaN(precioUnitarioNum) || precioUnitarioNum <= 0) {
      return mostrarError('El precio unitario debe ser un número mayor a 0.');
    }

    // 5. Cantidad Minima: entero >= 1
    const cantidadMinNum = parseInt(cantidadMinima, 10);
    if (isNaN(cantidadMinNum) || cantidadMinNum < 1) {
      return mostrarError('La cantidad mínima debe ser un número entero mayor o igual a 1.');
    }

    // 6. Stock: entero >= 0
    const stockNum = parseInt(stock, 10);
    if (isNaN(stockNum) || stockNum < 0) {
      return mostrarError('El stock debe ser un número entero mayor o igual a 0.');
    }

    // 7. Tiempo estimado: obligatorio
    if (!tiempoEstimado || tiempoEstimado.trim() === '') {
      return mostrarError('El tiempo estimado de entrega o producción es obligatorio.');
    }

    // 8. Validación de imagen recomendada
    if (imagenes.length === 0) {
      return mostrarError('Por favor sube al menos una imagen de alta calidad.');
    }

    setLoading(true);

    try {
      // 1. Subir imágenes (solo si son nuevas URIs locales)
      const uploadedImageUrls = [];
      const cleanName = nombre.replace(/[^a-zA-Z0-9]/g, '');
      
      for (let i = 0; i < imagenes.length; i++) {
        const logoUri = imagenes[i];
        
        // Si ya es una URL de Supabase (comienza con http), la mantenemos tal cual
        if (logoUri.startsWith('http')) {
          uploadedImageUrls.push(logoUri);
          continue;
        }

        let base64 = "";
        let ext = "jpeg";

        if (Platform.OS === 'web') {
          const response = await fetch(logoUri);
          const blob = await response.blob();
          base64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          ext = blob.type.split('/')[1] || 'jpeg';
        } else {
          base64 = await FileSystem.readAsStringAsync(logoUri, { encoding: 'base64' });
          ext = logoUri.split('.').pop() || 'jpg';
        }

        const fileName = `${cleanName}_${Date.now()}_img${i}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('productos_fotos')
          .upload(fileName, decode(base64), { contentType: `image/${ext}` });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage.from('productos_fotos').getPublicUrl(fileName);
        uploadedImageUrls.push(publicUrlData.publicUrl);
      }

      // 2. Insertar o Actualizar en Base de Datos
      const productoDatos = {
        usuario_id: userData?.id || null,
        nombre,
        precio: precioUnitarioNum,
        stock: stockNum,
        descripcion_tecnica: descripcionTecnica,
        categoria,
        precios_volumen: preciosVolumen,
        cantidad_minima: cantidadMinNum,
        tiempo_estimado: tiempoEstimado,
        imagenes: uploadedImageUrls
      };

      let query;
      if (esEdicion) {
        query = supabase
          .from('productos')
          .update(productoDatos)
          .eq('id', producto.id);
      } else {
        query = supabase
          .from('productos')
          .insert([productoDatos]);
      }

      const { error } = await query.select();

      if (error) throw error;

      setLoading(false);
      
      const tituloExito = esEdicion ? '¡Producto Actualizado!' : '¡Producto Creado!';
      const mensajeExito = esEdicion 
        ? 'Los cambios se han guardado exitosamente.' 
        : 'El producto ha sido lanzado al mercado exitosamente.';

      if (Platform.OS === 'web') {
        window.alert(`${tituloExito}\n\n${mensajeExito}`);
      } else {
        Alert.alert(tituloExito, mensajeExito);
      }
      
      if (!esEdicion) {
        // Limpiar formulario si es creación
        setNombre('');
        setPrecio('');
        setStock('');
        setDescripcionTecnica('');
        setCategoria('');
        setPreciosVolumen('');
        setCantidadMinima('1');
        setTiempoEstimado('');
        setImagenes([]);
      }

      // Volver atrás
      onBack();

    } catch (err) {
      setLoading(false);
      console.error("Error guardando producto:", err);
      if (Platform.OS === 'web') {
        window.alert("Error guardando el producto: " + err.message);
      } else {
        Alert.alert("Error", "Error guardando el producto: " + err.message);
      }
    }
  };

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
          

          <TouchableOpacity onPress={() => onNavigate && onNavigate('inventario')}>
            <Ionicons name="layers" size={24} color="#64748b" style={{ marginHorizontal: 8 }} />
          </TouchableOpacity>
          
          <TouchableOpacity onPress={() => onNavigate && onNavigate('inventario')}>
            <Ionicons name="cube-outline" size={24} color="#64748b" style={{ marginHorizontal: 8 }} />
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

      <View style={styles.titleWrapper}>
        <TouchableOpacity 
          style={styles.backArrowOnly} 
          onPress={() => onNavigate && onNavigate('inventario')}
        >
          <Ionicons name="chevron-back" size={32} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.title}>{esEdicion ? 'Editar Producto' : 'Agregar Producto'}</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} style={styles.scrollView}>
        <View style={styles.card}>

           {/* Icono + central */}
          <View style={styles.topIconContainer}>
            <View style={styles.topIconCircle}>
              <Ionicons name={esEdicion ? "create-outline" : "add-outline"} size={32} color="#60a5fa" />
            </View>
          </View>

          {/* Nombre del producto */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nombre del producto:</Text>
            <TextInput
              style={styles.input}
              value={nombre}
              onChangeText={setNombre}
              maxLength={150}
              placeholder="Ej: Afiches A3 full color"
              placeholderTextColor="#94a3b8"
            />
          </View>

          {/* Precio */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Precio unitario ($):</Text>
            <TextInput
              style={styles.input}
              value={precio}
              onChangeText={setPrecio}
              keyboardType="decimal-pad"
              placeholder="Ej: 15.50"
              placeholderTextColor="#94a3b8"
            />
          </View>

          {/* Precios por volumen (Opcional) */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Precios por volumen (Opcional):</Text>
            <TextInput
              style={styles.input}
              value={preciosVolumen}
              onChangeText={setPreciosVolumen}
              placeholder="Ej: >= 100: $14.00, >= 500: $12.00"
              placeholderTextColor="#94a3b8"
            />
          </View>

          {/* Stock disponible */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Stock disponible:</Text>
            <TextInput
              style={styles.input}
              value={stock}
              onChangeText={setStock}
              keyboardType="number-pad"
              placeholder="Ej: 500"
              placeholderTextColor="#94a3b8"
            />
          </View>

          {/* Cantidad mínima */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Cantidad mínima de pedido:</Text>
            <TextInput
              style={styles.input}
              value={cantidadMinima}
              onChangeText={setCantidadMinima}
              keyboardType="number-pad"
              placeholder="Ej: 1"
              placeholderTextColor="#94a3b8"
            />
          </View>

          {/* Tiempo estimado */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Tiempo estimado:</Text>
            <TextInput
              style={styles.input}
              value={tiempoEstimado}
              onChangeText={setTiempoEstimado}
              placeholder="Ej: 3-5 días hábiles"
              placeholderTextColor="#94a3b8"
            />
          </View>

          {/* Categoría */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Categoría:</Text>
            <TextInput
              style={styles.input}
              value={categoria}
              onChangeText={setCategoria}
              placeholder="Ej: Impresión Digital, Offset..."
              placeholderTextColor="#94a3b8"
            />
          </View>

          {/* Descripción Técnica */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Descripción Técnica:</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={descripcionTecnica}
              onChangeText={setDescripcionTecnica}
              multiline={true}
              numberOfLines={4}
              placeholder="Escribe todas las especificaciones, pesos, medidas, sustratos, acabados..."
              placeholderTextColor="#94a3b8"
              textAlignVertical="top"
            />
          </View>

          {/* Subir Fotos */}
          <View style={[styles.inputGroup, { alignItems: 'center' }]}>
            <Text style={[styles.label, { width: '100%', textAlign: 'left', marginBottom: 15 }]}>Subir fotos (Alta Calidad):</Text>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginBottom: 10 }}>
              {imagenes.map((uri, index) => (
                <View key={index} style={styles.imagePreviewWrapper}>
                  <Image source={{ uri }} style={styles.imagePreview} />
                  <TouchableOpacity 
                    style={styles.removeImageBtn} 
                    onPress={() => setImagenes(imagenes.filter((_, i) => i !== index))}
                  >
                    <Ionicons name="close-circle" size={20} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            <TouchableOpacity style={styles.fotoBtn} onPress={handleSelectImage}>
              <Text style={styles.fotoBtnLine}>+</Text>
            </TouchableOpacity>
            <Text style={{ color: '#64748b', fontSize: 11, marginTop: 5 }}>{imagenes.length} imágenes seleccionadas</Text>
          </View>

          {/* Botón Principal */}
          <TouchableOpacity 
            style={[styles.lanzarBtn, loading && { opacity: 0.7 }]} 
            onPress={handleLanzarAlMercado}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.lanzarBtnText}>
                {esEdicion ? 'Guardar Cambios' : 'Lanzar al mercado'}
              </Text>
            )}
          </TouchableOpacity>

        </View>
      </ScrollView>
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
    paddingBottom: 20,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  titleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 25,
    marginTop: 10,
    marginBottom: 20,
  },
  backArrowOnly: {
    padding: 5,
  },
  title: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    alignItems: 'center',
    paddingBottom: 40,
  },
  card: {
    width: '85%',
    backgroundColor: '#0f172a', // Azul oscuro de la tarjeta
    borderRadius: 30,
    padding: 25,
    alignItems: 'center',
    borderColor: '#1e293b',
    borderWidth: 1,
  },
  topIconContainer: {
    alignItems: 'center',
    marginBottom: 30,
    marginTop: -10,
  },
  topIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputGroup: {
    width: '100%',
    marginBottom: 20,
  },
  label: {
    color: '#e2e8f0', // Texto un poco más claro
    fontSize: 14,
    marginBottom: 8,
    marginLeft: 5,
  },
  input: {
    backgroundColor: '#e2e8f0', // Gris claro para el input
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 10, // Aumenta para web/android multi plataforma
    fontSize: 14,
    color: '#0f172a',
    minHeight: 45,
  },
  textArea: {
    borderRadius: 20,
    minHeight: 100,
    paddingTop: 15,
  },
  pickerContainer: {
    backgroundColor: '#e2e8f0',
    borderRadius: 25,
    overflow: 'hidden',
  },
  picker: {
    height: 45,
    width: '100%',
    color: '#0f172a',
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  fotoBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fotoBtnLine: {
    fontSize: 30,
    color: '#0f172a',
    fontWeight: '300',
    lineHeight: 35,
  },
  imagePreviewWrapper: {
    margin: 5,
    position: 'relative',
  },
  imagePreview: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: '#cbd5e1',
  },
  removeImageBtn: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#ffffff',
    borderRadius: 10,
  },
  lanzarBtn: {
    backgroundColor: '#0ea5e9', // Azul cian vibrante
    width: '85%',
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  lanzarBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

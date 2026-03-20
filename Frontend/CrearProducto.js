import React, { useState } from 'react';
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
  StatusBar
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

export default function CrearProducto({ onBack, onNavigate }) {
  // --- Estados del Formulario ---
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [stock, setStock] = useState('');
  const [descripcionTecnica, setDescripcionTecnica] = useState('');

  // Nuevos campos solicitados
  const [categoria, setCategoria] = useState('');
  const [preciosVolumen, setPreciosVolumen] = useState('');
  const [cantidadMinima, setCantidadMinima] = useState('1'); // Por defecto 1
  const [tiempoEstimado, setTiempoEstimado] = useState('');

  // Imágenes
  const [imagenes, setImagenes] = useState([]);

  // Lista de categorías de ejemplo
  const categoriasDisponibles = [
    'Seleccionar Categoría...',
    'Impresión Digital',
    'Impresión Offset',
    'Gran Formato',
    'Material Promocional',
    'Empaques / Packaging',
    'Otros'
  ];

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

  const handleLanzarAlMercado = () => {
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

    // 3. Categoría lista obligatoria
    if (!categoria || categoria === 'Seleccionar Categoría...') {
      return mostrarError('Debes seleccionar una categoría.');
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

    // --- ÉXITO ---
    const productoDatos = {
      nombre,
      precio: precioUnitarioNum,
      stock: stockNum,
      descripcionTecnica,
      categoria,
      preciosVolumen,
      cantidadMinima: cantidadMinNum,
      tiempoEstimado,
      imagenes
    };

    console.log("Producto a guardar:", productoDatos);

    if (Platform.OS === 'web') {
      window.alert("¡Producto Creado!\n\nEl producto ha sido lanzado al mercado exitosamente.");
    } else {
      Alert.alert('¡Producto Creado!', 'El producto ha sido lanzado al mercado exitosamente.');
    }

    // Aquí iría la lógica para volver o limpiar el formulario
    // if(onBack) onBack(); 
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER DE NAVEGACIÓN */}
      <View style={styles.header}>
        <View style={styles.headerIcons}>
          <TouchableOpacity onPress={() => onNavigate ? onNavigate('dashboard') : onBack()}>
            <Ionicons name="home-outline" size={24} color="#94a3b8" style={{ marginHorizontal: 12 }} />
          </TouchableOpacity>
          <TouchableOpacity>
            <Ionicons name="help-outline" size={24} color="#94a3b8" style={{ marginHorizontal: 12 }} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onNavigate && onNavigate('crear_producto')}>
            <Ionicons name="layers" size={24} color="#0ea5e9" style={{ marginHorizontal: 12 }} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onNavigate && onNavigate('inventario')}>
            <Ionicons name="cube-outline" size={24} color="#94a3b8" style={{ marginHorizontal: 12 }} />
          </TouchableOpacity>
          <TouchableOpacity>
            <Ionicons name="clipboard-outline" size={24} color="#94a3b8" style={{ marginHorizontal: 12 }} />
          </TouchableOpacity>
          <TouchableOpacity>
            <Ionicons name="star-outline" size={24} color="#94a3b8" style={{ marginHorizontal: 12 }} />
          </TouchableOpacity>
          <TouchableOpacity>
            <Ionicons name="chatbubble-ellipses-outline" size={24} color="#94a3b8" style={{ marginHorizontal: 12 }} />
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.title}>Agregar Producto</Text>

      <ScrollView contentContainerStyle={styles.scrollContent} style={styles.scrollView}>
        <View style={styles.card}>

          {/* Icono + central - Simula agregar un logo rápido si fuera necesario. En la UI es puramente decorativo y evoca creación */}
          <View style={styles.topIconContainer}>
            <View style={styles.topIconCircle}>
              <Ionicons name="add-outline" size={32} color="#60a5fa" />
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
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={categoria}
                onValueChange={(itemValue) => setCategoria(itemValue)}
                style={styles.picker}
                dropdownIconColor="#0f172a"
              >
                {categoriasDisponibles.map((cat, index) => (
                  <Picker.Item label={cat} value={cat} key={index} color={Platform.OS === 'ios' ? '#fff' : '#0f172a'} />
                ))}
              </Picker>
            </View>
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
                  {/* Vista preliminar simple */}
                  <View style={styles.imagePlaceholder}>
                    <Text style={{ color: '#0f172a', fontWeight: 'bold', fontSize: 10 }}>IMG {index + 1}</Text>
                  </View>
                </View>
              ))}
            </View>

            <TouchableOpacity style={styles.fotoBtn} onPress={handleSelectImage}>
              <Text style={styles.fotoBtnLine}>+</Text>
            </TouchableOpacity>
            <Text style={{ color: '#64748b', fontSize: 11, marginTop: 5 }}>{imagenes.length} imágenes seleccionadas</Text>
          </View>

          {/* Botón Principal */}
          <TouchableOpacity style={styles.lanzarBtn} onPress={handleLanzarAlMercado}>
            <Text style={styles.lanzarBtnText}>Lanzar al mercado</Text>
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
  title: {
    color: '#ffffff',
    fontSize: 24,
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
    alignItems: 'center'
  },
  imagePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#cbd5e1',
    justifyContent: 'center',
    alignItems: 'center'
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

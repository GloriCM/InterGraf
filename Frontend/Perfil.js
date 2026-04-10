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
  StatusBar,
  Image,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { supabase } from './supabase';

export default function Perfil({ userData, onUpdate, onBack, onNavigate }) {
  const [razonSocial, setRazonSocial] = useState(userData?.razon_social || '');
  const [direccion, setDireccion] = useState(userData?.direccion || '');
  const [descripcion, setDescripcion] = useState(userData?.descripcion || '');
  const [logoUri, setLogoUri] = useState(userData?.logo_url || null);
  const [loading, setLoading] = useState(false);
  const [newImageSelected, setNewImageSelected] = useState(false);

  const pickImage = async () => {
    // Pedimos permiso
    if (Platform.OS !== 'web') {
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    }

    try {
      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!pickerResult.canceled) {
        const asset = pickerResult.assets[0];
        if (asset.mimeType && !asset.mimeType.startsWith('image/')) {
          alert("¡Error! Selecciona solo un archivo de imagen.");
          return;
        }
        setLogoUri(asset.uri);
        setNewImageSelected(true);
      }
    } catch (err) {
      alert("Error al abrir la galería: " + err.message);
    }
  };

  const handleSave = async () => {
    if (!razonSocial || !direccion || !descripcion) {
      if (Platform.OS === 'web') {
        window.alert("Por favor completa todos los campos.");
      } else {
        Alert.alert("Error", "Por favor completa todos los campos.");
      }
      return;
    }

    setLoading(true);

    let finalLogoUrl = userData?.logo_url || null;

    try {
      if (newImageSelected && logoUri) {
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

        const fileName = `${razonSocial.replace(/\s/g, '')}_${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('logos')
          .upload(fileName, decode(base64), { contentType: `image/${ext}` });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage.from('logos').getPublicUrl(fileName);
        finalLogoUrl = publicUrlData.publicUrl;
      }

      if (userData?.id) {
        const { data, error } = await supabase
          .from('Usuarios_Registrados')
          .update({
            razon_social: razonSocial,
            direccion: direccion,
            descripcion: descripcion,
            logo_url: finalLogoUrl,
          })
          .eq('id', userData.id)
          .select()
          .single();

        if (error) throw error;

        // Actualizamos el estado global en App.js
        if (onUpdate) {
            onUpdate(data);
        }
      }

      setLoading(false);
      
      if (Platform.OS === 'web') {
        window.alert("¡Perfil actualizado con éxito!");
      } else {
        Alert.alert("Éxito", "¡Perfil actualizado con éxito!");
      }
      setNewImageSelected(false);
      
    } catch (err) {
      setLoading(false);
      console.error("Error actualizando perfil:", err);
      if (Platform.OS === 'web') {
        window.alert("Error guardando cambios: " + err.message);
      } else {
        Alert.alert("Error", "Error guardando cambios: " + err.message);
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
            <Ionicons name="layers-outline" size={24} color="#64748b" style={{ marginHorizontal: 8 }} />
          </TouchableOpacity>

          <TouchableOpacity>
            <Ionicons name="person-circle" size={30} color="#0ea5e9" style={{ marginHorizontal: 8 }} />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => onNavigate && onNavigate('mensajeria')}>
            <Ionicons name="chatbubble-outline" size={24} color="#64748b" style={{ marginHorizontal: 8 }} />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => onNavigate && onNavigate('pedidos_vendedor')}>
            <Ionicons name="receipt-outline" size={24} color="#64748b" style={{ marginHorizontal: 8 }} />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => {
              supabase.auth.signOut();
              if(onNavigate) onNavigate('login');
          }}>
            <Ionicons name="log-out-outline" size={26} color="#f8fafc" style={{ marginLeft: 8 }} />
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.title}>Editar Perfil</Text>

      <ScrollView contentContainerStyle={styles.scrollContent} style={styles.scrollView}>
        <View style={styles.card}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              {logoUri ? (
                <Image source={{ uri: logoUri }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                   <Ionicons name="person" size={50} color="#94a3b8" />
                </View>
              )}
            </View>
            <View style={styles.profileHeaderText}>
              <Text style={styles.userName}>{razonSocial || 'Usuario'}</Text>
              <Text style={styles.statusText}>Verificada</Text>
            </View>
          </View>



          <View style={styles.inputGroup}>
            <Text style={styles.label}>Direccion:</Text>
            <TextInput
              style={styles.input}
              value={direccion}
              onChangeText={setDireccion}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Descripcion del Negocio:</Text>
            <TextInput
              style={styles.input}
              value={descripcion}
              onChangeText={setDescripcion}
            />
          </View>

          <View style={styles.logoSection}>
            <Text style={styles.labelCambiar}>Cambiar Logo:</Text>
            <TouchableOpacity style={styles.uploadBtn} onPress={pickImage}>
              <Text style={styles.uploadBtnText}>+</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, loading && { opacity: 0.7 }]}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.saveBtnText}>Guardar</Text>
            )}
          </TouchableOpacity>

        </View>

        {/* SECCIÓN ESTADÍSTICAS */}
        <Text style={styles.statsMainTitle}>Estadísticas</Text>

        <View style={styles.statsOuterCard}>
          <Text style={styles.statsLabelPink}>Ingresos consolidados</Text>
          <View style={styles.statsValueRow}>
            <Text style={styles.statsValueMain}>$0</Text>
            <Text style={styles.statsValueSub}>COP</Text>
          </View>
        </View>

        <View style={styles.statsOuterCard}>
          <Text style={styles.statsLabelWhite}>Crecimiento mensual</Text>
          <View style={styles.statsGrowthRow}>
            <View style={styles.growthIconContainer}>
              <Ionicons name="trending-up" size={28} color="#34d399" />
            </View>
            <Text style={styles.statsValueMain}>0%</Text>
          </View>
        </View>

        <View style={styles.statsOuterCard}>
          <Text style={styles.statsLabelPink}>Ventas realizadas</Text>
        </View>

        <View style={[styles.statsOuterCard, { minHeight: 90 }]} />

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
    backgroundColor: '#0f172a',
    borderRadius: 30,
    padding: 25,
    borderColor: '#1e293b',
    borderWidth: 1,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  avatarContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#cbd5e1',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: '#f8fafc',
    marginRight: 20,
  },
  avatarPlaceholder: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#cbd5e1',
  },
  avatar: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  profileHeaderText: {
    flex: 1,
  },
  userName: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  statusText: {
    color: '#10b981', // Verde
    fontSize: 14,
    fontWeight: 'bold',
  },
  inputGroup: {
    width: '100%',
    marginBottom: 20,
  },
  label: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    marginLeft: 5,
  },
  input: {
    backgroundColor: '#cbd5e1',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
    minHeight: 45,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  labelCambiar: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    alignSelf: 'flex-start',
    marginLeft: 5,
  },
  uploadBtn: {
    width: 80,
    height: 60,
    backgroundColor: '#cbd5e1',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 5,
  },
  uploadBtnText: {
    fontSize: 30,
    color: '#0f172a',
    fontWeight: 'bold',
  },
  saveBtn: {
    backgroundColor: '#0ea5e9',
    width: '80%',
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statsMainTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 40,
    marginBottom: 20,
  },
  statsOuterCard: {
    width: '85%',
    backgroundColor: 'transparent',
    borderRadius: 30,
    padding: 25,
    borderColor: '#cbd5e1',
    borderWidth: 1,
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  statsLabelPink: {
    color: '#9d174d',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  statsLabelWhite: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  statsValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  statsValueMain: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  statsValueSub: {
    color: '#cbd5e1',
    fontSize: 12,
    marginLeft: 6,
  },
  statsGrowthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  growthIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#064e3b',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
});

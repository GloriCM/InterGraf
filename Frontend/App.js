import React, { useState } from 'react';
// Importamos las herramientas básicas de la interfaz de usuario
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, SafeAreaView, StatusBar, Platform } from 'react-native';
// Iconos para que la app se vea profesional
import { AntDesign, Ionicons } from '@expo/vector-icons';
// El selector de ciudades
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
// Lista de ciudades colombianas externa
import { colombianCities } from './cities';
// Nuestra conexión configurada con la base de datos
import { supabase } from './supabase';
// El componente de la pantalla de login
import Login from './Login';
// Componente de Crear Producto
import CrearProducto from './CrearProducto';
// Componente de Inventario
import Inventario from './Inventario';

export default function App() {
  // Manejamos en qué pantalla estamos (login, registro o dashboard)
  const [currentScreen, setCurrentScreen] = useState('login');

  // Guardamos si aceptó los términos legales
  const [isChecked, setIsChecked] = useState(false);
  // La ciudad que el usuario elija del menú
  const [selectedCity, setSelectedCity] = useState('');

  // Aquí guardamos todo lo que el usuario escribe en el formulario
  const [razonSocial, setRazonSocial] = useState('');
  const [numeroDocumento, setNumeroDocumento] = useState('');
  const [direccion, setDireccion] = useState('');
  const [sectorEmpresarial, setSectorEmpresarial] = useState('');
  const [correo, setCorreo] = useState('');
  const [telefono, setTelefono] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [confirmarContrasena, setConfirmarContrasena] = useState('');
  const [logoUri, setLogoUri] = useState(null); 
  const [loading, setLoading] = useState(false);
  // Datos de la empresa después de loguearse con éxito
  const [userData, setUserData] = useState(null); 

  // Para mostrar alertas rojas si algo falta o está mal
  const [errors, setErrors] = useState({});

  // Abrir la galería para que el usuario elija su logo
  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      alert("¡Necesitamos permiso para acceder a tus fotos!");
      return;
    }

    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, 
      aspect: [1, 1], 
      quality: 0.5, 
    });

    if (!pickerResult.canceled) {
      const asset = pickerResult.assets[0];
      // Solo aceptamos fotos, nada de PDFs
      if (asset.mimeType && !asset.mimeType.startsWith('image/')) {
        alert("¡Error! Selecciona solo un archivo de imagen (no PDFs ni otros documentos).");
        return;
      } else if (asset.uri.toLowerCase().endsWith('.pdf')) {
        alert("¡Error! No se permiten archivos PDF. Selecciona una imagen.");
        return;
      }

      setLogoUri(asset.uri);
      setErrors({ ...errors, logo: null }); 
    }
  };

  // El motor que valida los datos y los envía a la nube
  const handleSubmit = async () => {
    setErrors({});
    let newErrors = {};

    // Validamos que no deje campos obligatorios vacíos
    if (!razonSocial) newErrors.razonSocial = "Obligatorio";
    if (!numeroDocumento) newErrors.numeroDocumento = "Obligatorio";
    if (!direccion) newErrors.direccion = "Obligatorio";
    if (!selectedCity) newErrors.ciudad = "Debes seleccionar una ciudad";
    if (!sectorEmpresarial) newErrors.sectorEmpresarial = "Obligatorio";
    if (!correo) newErrors.correo = "Obligatorio";
    if (!telefono) newErrors.telefono = "Obligatorio";
    if (!descripcion) newErrors.descripcion = "Obligatorio";
    if (!contrasena) newErrors.contrasena = "Obligatorio";
    if (!confirmarContrasena) newErrors.confirmarContrasena = "Obligatorio";
    if (!logoUri) newErrors.logo = "Debes subir un logo";

    // Filtros de formato para NIT, teléfono y correo
    if (numeroDocumento && !/^\d+$/.test(numeroDocumento)) {
      newErrors.numeroDocumento = "Solo números";
    }
    if (telefono && !/^\d+$/.test(telefono)) {
      newErrors.telefono = "Solo números";
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (correo && !emailRegex.test(correo)) {
      newErrors.correo = "Correo inválido";
    }

    // Seguridad básica para la contraseña
    if (contrasena) {
      const minLength = contrasena.length >= 6;
      const digitCount = (contrasena.match(/\d/g) || []).length;
      const specialCharRegex = /[!@#$%^&*(),.?":{}|<>\-=_+]/;

      if (!minLength || digitCount < 2 || !specialCharRegex.test(contrasena)) {
        newErrors.contrasena = "Mín. 6 chars, 2 números, 1 especial";
      }
    }

    if (contrasena && confirmarContrasena && contrasena !== confirmarContrasena) {
      newErrors.confirmarContrasena = "No coincide";
    }

    if (!isChecked) {
      newErrors.terminos = "Debes aceptar los términos";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);

    // Revisamos si el correo ya existe para no duplicar
    const { data: existingUser, error: searchError } = await supabase
      .from('Usuarios_Registrados')
      .select('correo')
      .eq('correo', correo)
      .maybeSingle();

    if (searchError) {
      setLoading(false);
      alert("Ocurrió un error al verificar tu correo en el servidor.");
      return;
    }

    if (existingUser) {
      setLoading(false);
      setErrors({ correo: "Este correo ya está registrado" });
      return;
    }

    let publicLogoUrl = null;

    try {
      // Proceso para preparar y subir la imagen ya sea en Web o Celular
      let base64 = "";
      let ext = "jpeg"; 

      if (Platform.OS === 'web') {
        const response = await fetch(logoUri);
        const blob = await response.blob();
        if (blob.size > 2 * 1024 * 1024) { 
          setLoading(false);
          setErrors({ logo: "La imagen debe pesar menos de 2MB" });
          return;
        }

        base64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
             resolve(reader.result.split(',')[1]); 
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

        if (blob.type === 'image/png') ext = 'png';
        else if (blob.type === 'image/jpeg') ext = 'jpeg';
        else ext = 'jpg';

      } else {
        const fileInfo = await FileSystem.getInfoAsync(logoUri);
        if (fileInfo.size > 2 * 1024 * 1024) { 
          setLoading(false);
          setErrors({ logo: "La imagen debe pesar menos de 2MB" });
          return;
        }

        base64 = await FileSystem.readAsStringAsync(logoUri, { encoding: 'base64' });
        ext = logoUri.substring(logoUri.lastIndexOf(".") + 1) || 'jpg';
      }

      // Nombre único para que las imágenes no se sobreescriban
      const fileName = `${razonSocial.replace(/\s+/g, '')}_${Date.now()}.${ext}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('logos')
        .upload(fileName, decode(base64), {
          contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`
        });

      if (uploadError) {
        throw uploadError;
      }

      // Generamos el link público para guardarlo en la tabla
      const { data: publicUrlData } = supabase.storage
        .from('logos')
        .getPublicUrl(fileName);

      publicLogoUrl = publicUrlData.publicUrl;

    } catch (err) {
      setLoading(false);
      console.error("Error subiendo el logo:", err.message);
      alert("Hubo un error al intentar subir la foto. Intenta con otra imagen.");
      return;
    }

    // Insertamos todos los datos finales en la base de datos
    const { data, error } = await supabase
      .from('Usuarios_Registrados')
      .insert([
        {
          razon_social: razonSocial,
          tipo_documento: 'NIT',
          numero_documento: numeroDocumento,
          direccion: direccion,
          ciudad: selectedCity,
          sector_empresarial: sectorEmpresarial,
          correo: correo,
          telefono: telefono,
          descripcion: descripcion,
          contrasena: contrasena, 
          logo_url: publicLogoUrl, 
        }
      ]);

    setLoading(false);

    if (error) {
      console.error('Error insertando datos en Supabase:', error);
      alert("Hubo un error al registrar la empresa: " + error.message);
    } else {
      console.log("Datos insertados correctamente en Supabase");
      alert("¡Registro Exitoso! La empresa ha sido guardada.");
      // Limpiamos los campos para dejar el formulario listo otra vez
      setRazonSocial('');
      setNumeroDocumento('');
      setCorreo('');
      setContrasena('');
      setConfirmarContrasena('');
      setLogoUri(null); 
      setIsChecked(false);
      setCurrentScreen('login'); 
    }
  };

  // Si el usuario está en la pantalla de Login
  if (currentScreen === 'login') {
    return (
      <Login
        onRegisterPress={() => setCurrentScreen('register')}
        onRecoverPasswordPress={() => alert('Próximamente: Recuperar contraseña')}
        onLoginSuccess={(data) => {
          setUserData(data);
          setCurrentScreen('dashboard');
        }}
      />
    );
  }

  // Si el usuario ya entró con éxito (Panel de Bienvenida)
  if (currentScreen === 'dashboard' && userData) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
        <View style={styles.dashboardContainer}>
          <Ionicons name="aperture" size={80} color="#0891b2" />
          <Text style={styles.welcomeText}>¡Bienvenido!</Text>
          <Text style={styles.companyNameText}>{userData.razon_social}</Text>
          
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>NIT: <Text style={styles.infoValue}>{userData.numero_documento}</Text></Text>
            <Text style={styles.infoLabel}>Ciudad: <Text style={styles.infoValue}>{userData.ciudad}</Text></Text>
            <Text style={styles.infoLabel}>Sector: <Text style={styles.infoValue}>{userData.sector_empresarial}</Text></Text>
          </View>

          <TouchableOpacity 
            style={[styles.logoutButton, { backgroundColor: '#10b981', marginBottom: 15 }]} 
            onPress={() => setCurrentScreen('inventario')}
          >
            <Text style={styles.logoutButtonText}>Gestionar Inventario</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.logoutButton, { backgroundColor: '#0ea5e9', marginBottom: 15 }]} 
            onPress={() => setCurrentScreen('crear_producto')}
          >
            <Text style={styles.logoutButtonText}>Publicar Nuevo Producto</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.logoutButton, { backgroundColor: '#ef4444' }]} 
            onPress={() => {
              setUserData(null);
              setCurrentScreen('login');
            }}
          >
            <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Pantalla de Crear Producto
  if (currentScreen === 'crear_producto') {
    return <CrearProducto onBack={() => setCurrentScreen('dashboard')} onNavigate={setCurrentScreen} />;
  }

  // Pantalla de Inventario
  if (currentScreen === 'inventario') {
    return <Inventario onBack={() => setCurrentScreen('dashboard')} onNavigate={setCurrentScreen} />;
  }

  // Diseño visual de la pantalla de Registro
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>

          <View style={styles.logoContainer}>
            <Ionicons name="aperture" size={40} color="#0891b2" />
            <Text style={styles.logoText}> INTERGEA</Text>
          </View>

          <Text style={styles.title}> Formulario de Afiliacion</Text>
          <Text style={styles.subtitle}> Validacion de la empresa</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Razon Social:</Text>
            <TextInput
              style={[styles.input, errors.razonSocial && styles.inputError]}
              value={razonSocial}
              onChangeText={(text) => { setRazonSocial(text); setErrors({ ...errors, razonSocial: null }); }}
            />
            {errors.razonSocial && <Text style={styles.errorText}>{errors.razonSocial}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>NIT:</Text>
            <TextInput
              style={[styles.input, errors.numeroDocumento && styles.inputError]}
              value={numeroDocumento}
              onChangeText={(text) => { 
                const numericValue = text.replace(/[^0-9]/g, '');
                setNumeroDocumento(numericValue); 
                setErrors({ ...errors, numeroDocumento: null }); 
              }}
              keyboardType="numeric"
            />
            {errors.numeroDocumento && <Text style={styles.errorText}>{errors.numeroDocumento}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Direccion:</Text>
            <TextInput
              style={[styles.input, errors.direccion && styles.inputError]}
              value={direccion}
              onChangeText={(text) => { setDireccion(text); setErrors({ ...errors, direccion: null }); }}
            />
            {errors.direccion && <Text style={styles.errorText}>{errors.direccion}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Ciudad:</Text>
            <View style={[styles.pickerContainer, errors.ciudad && styles.inputError]}>
              <Picker
                selectedValue={selectedCity}
                onValueChange={(itemValue) => { setSelectedCity(itemValue); setErrors({ ...errors, ciudad: null }); }}
                style={styles.picker}
              >
                <Picker.Item label="Seleccione una ciudad" value="" />
                {colombianCities.map((city, index) => (
                  <Picker.Item key={index} label={city} value={city} />
                ))}
              </Picker>
            </View>
            {errors.ciudad && <Text style={styles.errorText}>{errors.ciudad}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Sector Empresarial:</Text>
            <TextInput
              style={[styles.input, errors.sectorEmpresarial && styles.inputError]}
              value={sectorEmpresarial}
              onChangeText={(text) => { setSectorEmpresarial(text); setErrors({ ...errors, sectorEmpresarial: null }); }}
            />
            {errors.sectorEmpresarial && <Text style={styles.errorText}>{errors.sectorEmpresarial}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Correo Electronico:</Text>
            <TextInput
              style={[styles.input, errors.correo && styles.inputError]}
              keyboardType="email-address"
              value={correo}
              onChangeText={(text) => { setCorreo(text); setErrors({ ...errors, correo: null }); }}
              autoCapitalize="none"
            />
            {errors.correo && <Text style={styles.errorText}>{errors.correo}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Telefono:</Text>
            <TextInput
              style={[styles.input, errors.telefono && styles.inputError]}
              keyboardType="phone-pad"
              value={telefono}
              onChangeText={(text) => { 
                const numericValue = text.replace(/[^0-9]/g, '');
                setTelefono(numericValue); 
                setErrors({ ...errors, telefono: null }); 
              }}
            />
            {errors.telefono && <Text style={styles.errorText}>{errors.telefono}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Descripcion:</Text>
            <TextInput
              style={[styles.input, errors.descripcion && styles.inputError]}
              value={descripcion}
              onChangeText={(text) => { setDescripcion(text); setErrors({ ...errors, descripcion: null }); }}
            />
            {errors.descripcion && <Text style={styles.errorText}>{errors.descripcion}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Contraseña:</Text>
            <TextInput
              style={[styles.input, errors.contrasena && styles.inputError]}
              value={contrasena}
              onChangeText={(text) => { setContrasena(text); setErrors({ ...errors, contrasena: null }); }}
              secureTextEntry={true}
              autoCapitalize="none"
            />
            {errors.contrasena && <Text style={styles.errorText}>{errors.contrasena}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirmar Contraseña:</Text>
            <TextInput
              style={[styles.input, errors.confirmarContrasena && styles.inputError]}
              value={confirmarContrasena}
              onChangeText={(text) => { setConfirmarContrasena(text); setErrors({ ...errors, confirmarContrasena: null }); }}
              secureTextEntry={true}
              autoCapitalize="none"
            />
            {errors.confirmarContrasena && <Text style={styles.errorText}>{errors.confirmarContrasena}</Text>}
          </View>

          <Text style={styles.uploadLabel}>Subir Logo de la empresa:</Text>
          <TouchableOpacity
            style={[styles.uploadButton, errors.logo && styles.inputError, logoUri && styles.uploadButtonSuccess]}
            onPress={pickImage}
          >
            <AntDesign name="plus" size={24} color={logoUri ? "#ffffff" : "#475569"} />
          </TouchableOpacity>
          {logoUri && <Text style={styles.successText}>¡Logo seleccionado!</Text>}
          {errors.logo && <Text style={[styles.errorText, { marginBottom: 10 }]}>{errors.logo}</Text>}

          <View style={styles.termsMaster}>
            <View style={styles.termsContainer}>
              <TouchableOpacity
                style={[styles.checkbox, isChecked && styles.checkboxActive]}
                onPress={() => { setIsChecked(!isChecked); setErrors({ ...errors, terminos: null }); }}
              >
                {isChecked && <AntDesign name="check" size={10} color="#fff" />}
              </TouchableOpacity>
              <Text style={styles.termsText}>Acepto términos y condiciones</Text>
            </View>
            {errors.terminos && <Text style={[styles.errorText, { marginTop: -20, marginBottom: 25 }]}>{errors.terminos}</Text>}
          </View>

          <TouchableOpacity
            style={[styles.submitButton, loading && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.submitButtonText}>{loading ? 'Registrando...' : 'Registrar Empresa'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setCurrentScreen('login')}
          >
            <Text style={styles.backButtonText}>Volver al Login</Text>
          </TouchableOpacity>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Estilos visuales de todos los componentes (colores, bordes, tamaños)
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#020617',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  card: {
    width: '85%',
    backgroundColor: '#0f172a',
    borderRadius: 25,
    padding: 25,
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 15,
  },
  logoText: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 2,
    letterSpacing: 1,
  },
  logoUnderline: {
    width: 60,
    height: 1,
    backgroundColor: '#0891b2',
    marginTop: 2,
  },
  title: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 13,
    marginBottom: 25,
    textAlign: 'center',
    lineHeight: 18,
  },
  inputGroup: {
    width: '100%',
    marginBottom: 12,
  },
  label: {
    color: '#ffffff',
    fontSize: 12,
    marginBottom: 5,
    marginLeft: 5,
  },
  input: {
    backgroundColor: '#cbd5e1',
    borderRadius: 25,
    height: 40,
    paddingHorizontal: 20,
    fontSize: 16,
    color: '#0f172a',
  },
  inputError: {
    borderColor: '#ef4444',
    borderWidth: 1,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 10,
    marginLeft: 15,
    marginTop: 3,
  },
  successText: {
    color: '#10b981',
    fontSize: 10,
    marginBottom: 10,
  },
  pickerContainer: {
    backgroundColor: '#cbd5e1',
    borderRadius: 25,
    height: 40,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  picker: {
    height: 40,
    color: '#0f172a',
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  uploadLabel: {
    color: '#ffffff',
    fontSize: 12,
    marginTop: 5,
    marginBottom: 10,
  },
  uploadButton: {
    backgroundColor: '#e2e8f0',
    width: 60,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  uploadButtonSuccess: {
    backgroundColor: '#10b981',
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
  },
  termsMaster: {
    alignItems: 'center',
    width: '100%',
  },
  checkbox: {
    width: 14,
    height: 14,
    backgroundColor: '#e2e8f0',
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: '#0891b2',
  },
  termsText: {
    color: '#cbd5e1',
    fontSize: 10,
  },
  submitButton: {
    backgroundColor: '#0891b2',
    paddingVertical: 10,
    paddingHorizontal: 40,
    borderRadius: 20,
    width: '80%',
    alignItems: 'center',
    marginBottom: 15,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  backButton: {
    marginTop: 10,
    paddingVertical: 10,
  },
  backButtonText: {
    color: '#0891b2',
    fontSize: 14,
    fontWeight: 'bold',
  },
  dashboardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#020617',
  },
  welcomeText: {
    color: '#94a3b8',
    fontSize: 18,
    marginTop: 20,
  },
  companyNameText: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: '#0f172a',
    width: '90%',
    padding: 25,
    borderRadius: 20,
    marginBottom: 40,
  },
  infoLabel: {
    color: '#94a3b8',
    fontSize: 14,
    marginBottom: 10,
  },
  infoValue: {
    color: '#ffffff',
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
  },
  logoutButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

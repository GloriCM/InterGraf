//Se importa react y hook useState para manejar el estado de los componentes
import React, { useState } from 'react';
//Se importan componentes basicos de react native
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, SafeAreaView, StatusBar } from 'react-native';
//Se importan iconos desde expo
import { AntDesign, Ionicons } from '@expo/vector-icons';
//Se importa el componente Picker, para crear un selector desplegable 
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
//Se importa el array de ciudades, es un archivo externo
//Se importa el array de ciudades, es un archivo externo
import { colombianCities } from './cities';
//Se importa el cliente de Supabase pre-configurado
import { supabase } from './supabase';

//Componente principal de la aplicacion
export default function App() {
  //Estado que controla si el checkbox esta marcado
  const [isChecked, setIsChecked] = useState(false);
  //Estado que controla la ciudad seleccionada
  const [selectedCity, setSelectedCity] = useState('');
  
  // Estados para capturar toda la información del formulario
  const [razonSocial, setRazonSocial] = useState('');
  const [tipoDocumento, setTipoDocumento] = useState('');
  const [numeroDocumento, setNumeroDocumento] = useState('');
  const [direccion, setDireccion] = useState('');
  const [sectorEmpresarial, setSectorEmpresarial] = useState('');
  const [correo, setCorreo] = useState('');
  const [telefono, setTelefono] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [confirmarContrasena, setConfirmarContrasena] = useState('');
  const [logoUri, setLogoUri] = useState(null); // Estado para la imagen del logo
  const [loading, setLoading] = useState(false);
  
  // Estado para capturar qué campos tienen error
  const [errors, setErrors] = useState({});

  // Función para seleccionar la imagen
  const pickImage = async () => {
    // Pedimos permiso para acceder a la galería
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      alert("¡Necesitamos permiso para acceder a tus fotos!");
      return;
    }

    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true, // Permite recortar
      aspect: [1, 1], // Que sea cuadrada para un logo
      quality: 0.5, // Le bajamos la calidad (y por ende peso) a la mitad
    });

    if (!pickerResult.canceled) {
      setLogoUri(pickerResult.assets[0].uri);
      setErrors({...errors, logo: null}); // Quitamos error de logo
    }
  };

  // Función para procesar y enviar los datos a Supabase
  const handleSubmit = async () => {
    // Reiniciamos los errores en cada intento
    setErrors({});
    let newErrors = {};
    
    // 1. Campos vacíos obligatorios
    if (!razonSocial) newErrors.razonSocial = "Obligatorio";
    if (!tipoDocumento) newErrors.tipoDocumento = "Obligatorio";
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

    // 2. Validar NIT solo números
    if (numeroDocumento && !/^\d+$/.test(numeroDocumento)) {
      newErrors.numeroDocumento = "Solo números";
    }

    // 3. Validar Teléfono solo números
    if (telefono && !/^\d+$/.test(telefono)) {
      newErrors.telefono = "Solo números";
    }

    // 4. Validar formato de Correo Electrónico
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (correo && !emailRegex.test(correo)) {
      newErrors.correo = "Correo inválido";
    }

    // 5. Validar contraseña (min 6 chars, 2 numeros, 1 especial)
    if (contrasena) {
      const minLength = contrasena.length >= 6;
      const digitCount = (contrasena.match(/\d/g) || []).length;
      const specialCharRegex = /[!@#$%^&*(),.?":{}|<>\-=_+]/;
      
      if (!minLength || digitCount < 2 || !specialCharRegex.test(contrasena)) {
        newErrors.contrasena = "Mín. 6 chars, 2 números, 1 especial";
      }
    }

    // 6. Validar que las contraseñas coincidan
    if (contrasena && confirmarContrasena && contrasena !== confirmarContrasena) {
      newErrors.confirmarContrasena = "No coincide";
    }

    // 7. Términos y condiciones
    if (!isChecked) {
      newErrors.terminos = "Debes aceptar los términos";
    }
    
    // Si el objeto de errores tiene alguna propiedad, detener el submit
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);

    // 8. Comprobar que el correo no esté ya registrado en BD
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

    // 9. Subir la imagen a Supabase Storage
    let publicLogoUrl = null;
    
    try {
      // 9.1 Verificar tamaño de archivo base64 (2MB máximo aprox)
      const fileInfo = await FileSystem.getInfoAsync(logoUri);
      if (fileInfo.size > 2 * 1024 * 1024) { // límite manual de 2MB extra
        setLoading(false);
        setErrors({ logo: "La imagen debe pesar menos de 2MB" });
        return;
      }

      // Convertimos el URI local a Base64 y luego a ArrayBuffer (para Supabase en móvil)
      const base64 = await FileSystem.readAsStringAsync(logoUri, { encoding: 'base64' });
      const ext = logoUri.substring(logoUri.lastIndexOf(".") + 1) || 'jpg';
      const fileName = `${razonSocial.replace(/\s+/g, '')}_${Date.now()}.${ext}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('logos')
        .upload(fileName, decode(base64), { 
          contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`
        });

      if (uploadError) {
        throw uploadError;
      }

      // Obtener el enlace público del archivo recién subido
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
    
    // Inserción de la nueva empresa
    const { data, error } = await supabase
      .from('Usuarios_Registrados')
      .insert([
        { 
          razon_social: razonSocial,
          tipo_documento: tipoDocumento,
          numero_documento: numeroDocumento,
          direccion: direccion,
          ciudad: selectedCity,
          sector_empresarial: sectorEmpresarial,
          correo: correo,
          telefono: telefono,
          descripcion: descripcion,
          contrasena: contrasena, // ATENCIÓN: en un sistema real, NUNCA guardes las contraseñas en texto plano. Guárdalas mediante el sistema 'Supabase Auth' o usa un hash bcrypt.
          logo_url: publicLogoUrl, // Nueva columna en la base de datos
        }
      ]);

    setLoading(false);

    if (error) {
      console.error('Error insertando datos en Supabase:', error);
      alert("Hubo un error al registrar la empresa: " + error.message);
    } else {
      console.log("Datos insertados correctamente en Supabase");
      alert("¡Registro Exitoso! La empresa ha sido guardada.");
      // Limpiar formulario opcionalmente
      setRazonSocial('');
      setNumeroDocumento('');
      setCorreo('');
      setContrasena('');
      setConfirmarContrasena('');
      setLogoUri(null); // Reseteamos la imagen seleccionada
      setIsChecked(false);
    }
  };

  return (
    // Contenedor principal de la aplicacion
    <SafeAreaView style={styles.safeArea}>
      {/*Configuracion del estado de la barra de estado del telefono*/}
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
        {/*Permite desplazarse verticalmente si el contenido es mas grande que la pantalla*/}
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          {/*Tarjeta principal que contiene todo el formulario*/}
          <View style={styles.card}>

            {/*Contenedor del Logo*/}
            <View style={styles.logoContainer}>
              {/*Icono temporal*/}
              <Ionicons name="aperture" size={40} color="#06b6d4" />
                {/*Nombre de la app*/}
                <Text style={styles.logoText}> INTERGRAF</Text>
          </View>

    {/*Titulo del formulario*/}
    <Text style={styles.title}> Formulario de Afiliacion</Text>
      {/*Subtitulo del formulario*/}
      <Text style={styles.subtitle}> Validacion de la empresa</Text>

        {/*Campo de texto para la razon social*/}
        <View style={styles.inputGroup}>
            <Text style={styles.label}>Razon Social:</Text>
            <TextInput 
              style={[styles.input, errors.razonSocial && styles.inputError]} 
              value={razonSocial}
              onChangeText={(text) => { setRazonSocial(text); setErrors({...errors, razonSocial: null}); }} 
            />
            {errors.razonSocial && <Text style={styles.errorText}>{errors.razonSocial}</Text>}
          </View>

    {/*Campo de texto para el tipo de documento*/}
    <View style={styles.inputGroup}>
            <Text style={styles.label}>Tipo Documento:</Text>
            <TextInput 
              style={[styles.input, errors.tipoDocumento && styles.inputError]} 
              value={tipoDocumento}
              onChangeText={(text) => { setTipoDocumento(text); setErrors({...errors, tipoDocumento: null}); }} 
            />
            {errors.tipoDocumento && <Text style={styles.errorText}>{errors.tipoDocumento}</Text>}
          </View>

    {/*Campo de texto para el NIT*/}
    <View style={styles.inputGroup}>
            <Text style={styles.label}>NIT:</Text>
            <TextInput 
              style={[styles.input, errors.numeroDocumento && styles.inputError]} 
              value={numeroDocumento}
              onChangeText={(text) => { setNumeroDocumento(text); setErrors({...errors, numeroDocumento: null}); }} 
              keyboardType="numeric"
            />
            {errors.numeroDocumento && <Text style={styles.errorText}>{errors.numeroDocumento}</Text>}
          </View>

    {/*Campo de texto para la direccion*/}
    <View style={styles.inputGroup}>
            <Text style={styles.label}>Direccion:</Text>
            <TextInput 
              style={[styles.input, errors.direccion && styles.inputError]} 
              value={direccion}
              onChangeText={(text) => { setDireccion(text); setErrors({...errors, direccion: null}); }} 
            />
            {errors.direccion && <Text style={styles.errorText}>{errors.direccion}</Text>}
          </View>

    {/*Campo de texto para la ciudad*/}
    <View style={styles.inputGroup}>
            <Text style={styles.label}>Ciudad:</Text>
            <View style={[styles.pickerContainer, errors.ciudad && styles.inputError]}>
              <Picker
                selectedValue={selectedCity} 
                onValueChange={(itemValue) => { setSelectedCity(itemValue); setErrors({...errors, ciudad: null}); }} 
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

    {/*Campo de texto para el sector empresarial*/}
    <View style={styles.inputGroup}>
            <Text style={styles.label}>Sector Empresarial:</Text>
            <TextInput 
              style={[styles.input, errors.sectorEmpresarial && styles.inputError]} 
              value={sectorEmpresarial}
              onChangeText={(text) => { setSectorEmpresarial(text); setErrors({...errors, sectorEmpresarial: null}); }} 
            />
            {errors.sectorEmpresarial && <Text style={styles.errorText}>{errors.sectorEmpresarial}</Text>}
          </View>

    {/*Campo de texto para el correo electronico*/}
    <View style={styles.inputGroup}>
            <Text style={styles.label}>Correo Electronico:</Text>
            <TextInput 
              style={[styles.input, errors.correo && styles.inputError]} 
              keyboardType="email-address" 
              value={correo}
              onChangeText={(text) => { setCorreo(text); setErrors({...errors, correo: null}); }}
              autoCapitalize="none"
            />
            {errors.correo && <Text style={styles.errorText}>{errors.correo}</Text>}
          </View>

    {/*Campo de texto para el telefono*/}
    <View style={styles.inputGroup}>
            <Text style={styles.label}>Telefono:</Text>
            <TextInput 
              style={[styles.input, errors.telefono && styles.inputError]} 
              keyboardType="phone-pad" 
              value={telefono}
              onChangeText={(text) => { setTelefono(text); setErrors({...errors, telefono: null}); }}
            />
            {errors.telefono && <Text style={styles.errorText}>{errors.telefono}</Text>}
          </View>

    {/*Campo de texto para la descripcion*/}
    <View style={styles.inputGroup}>
            <Text style={styles.label}>Descripcion:</Text>
            <TextInput 
              style={[styles.input, errors.descripcion && styles.inputError]} 
              value={descripcion}
              onChangeText={(text) => { setDescripcion(text); setErrors({...errors, descripcion: null}); }}
            />
            {errors.descripcion && <Text style={styles.errorText}>{errors.descripcion}</Text>}
          </View>

    {/*Campo de texto para la Contraseña*/}
    <View style={styles.inputGroup}>
            <Text style={styles.label}>Contraseña:</Text>
            <TextInput 
              style={[styles.input, errors.contrasena && styles.inputError]} 
              value={contrasena}
              onChangeText={(text) => { setContrasena(text); setErrors({...errors, contrasena: null}); }}
              secureTextEntry={true}
              autoCapitalize="none"
            />
            {errors.contrasena && <Text style={styles.errorText}>{errors.contrasena}</Text>}
          </View>

    {/*Campo de texto para Confirmar Contraseña*/}
    <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirmar Contraseña:</Text>
            <TextInput 
              style={[styles.input, errors.confirmarContrasena && styles.inputError]} 
              value={confirmarContrasena}
              onChangeText={(text) => { setConfirmarContrasena(text); setErrors({...errors, confirmarContrasena: null}); }}
              secureTextEntry={true}
              autoCapitalize="none"
            />
            {errors.confirmarContrasena && <Text style={styles.errorText}>{errors.confirmarContrasena}</Text>}
          </View>

    {/*Campo de texto para subir el logo*/}
    <Text style={styles.uploadLabel}>Subir Logo de la empresa:</Text>
      <TouchableOpacity 
        style={[styles.uploadButton, errors.logo && styles.inputError, logoUri && styles.uploadButtonSuccess]} 
        onPress={pickImage}
      >
        <AntDesign name="plus" size={24} color={logoUri ? "#ffffff" : "#475569"} />
      </TouchableOpacity>
      {logoUri && <Text style={styles.successText}>¡Logo seleccionado!</Text>}
      {errors.logo && <Text style={[styles.errorText, {marginBottom: 10}]}>{errors.logo}</Text>}

  {/*Seccion de aceptacion de terminos y condiciones */}
  <View style={styles.termsMaster}>
    <View style={styles.termsContainer}>
      <TouchableOpacity
        style={[styles.checkbox, isChecked && styles.checkboxActive]}
        onPress={() => { setIsChecked(!isChecked); setErrors({...errors, terminos: null}); }}
      >
        {isChecked && <AntDesign name="check" size={10} color="#fff" />}
      </TouchableOpacity>

      <Text style={styles.termsText}>Acepto terminos y condiciones</Text>
    </View>
    {errors.terminos && <Text style={[styles.errorText, {marginTop: -20, marginBottom: 25}]}>{errors.terminos}</Text>}
  </View>

  {/*Boton de enviar*/}
  <TouchableOpacity 
    style={[styles.submitButton, loading && {opacity: 0.7}]} 
    onPress={handleSubmit}
    disabled={loading}
  >
    <Text style={styles.submitButtonText}>{loading ? 'Enviando...' : 'Ingresar'}</Text>
  </TouchableOpacity>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
//Definicio de todos los estilos visuales usando StyleSheet
//Control de colores, tamaños, posiciones y estilos de los componentes
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  card: {
    width: '85%',
    backgroundColor: '#1e293b',
    borderRadius: 25,
    padding: 25,
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 15,
  },
  logoText: {
    color: '#3b82f6',
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 2,
    letterSpacing: 1,
  },
  title: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
    textAlign: 'center',
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 12,
    marginBottom: 20,
    textAlign: 'center',
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
    borderRadius: 20,
    height: 35,
    paddingHorizontal: 15,
    fontSize: 14,
    color: '#0f172a',
    borderWidth: 1,
    borderColor: 'transparent',
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
    borderRadius: 20,
    height: 35,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  picker: {
    height: 35,
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
    backgroundColor: '#06b6d4',
  },
  termsText: {
    color: '#cbd5e1',
    fontSize: 10,
  },
  submitButton: {
    backgroundColor: '#06b6d4',
    paddingVertical: 10,
    paddingHorizontal: 40,
    borderRadius: 20,
    width: '60%',
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

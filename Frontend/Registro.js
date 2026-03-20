import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, SafeAreaView, StatusBar, Platform } from 'react-native';
import { AntDesign, Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { colombianCities } from './cities';
import { supabase } from './supabase';

export default function Registro({ onBack, onRegistrationSuccess }) {
  const [razonSocial, setRazonSocial] = useState('');
  const [numeroDocumento, setNumeroDocumento] = useState('');
  const [direccion, setDireccion] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [sectorEmpresarial, setSectorEmpresarial] = useState('');
  const [correo, setCorreo] = useState('');
  const [telefono, setTelefono] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [confirmarContrasena, setConfirmarContrasena] = useState('');
  const [logoUri, setLogoUri] = useState(null);
  const [isChecked, setIsChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const pickImage = async () => {
    // Pedimos permiso pero no bloqueamos si dice 'denied' porque en versiones recientes 
    // de Android/iOS el sistema abre el Photo Picker nativo sin necesitar permisos de almacenamiento completos.
    await ImagePicker.requestMediaLibraryPermissionsAsync();

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
        setErrors({ ...errors, logo: null });
      }
    } catch (err) {
      alert("Error al abrir la galería: " + err.message);
    }
  };

  const handleSubmit = async () => {
    setErrors({});
    let newErrors = {};

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
    if (!isChecked) newErrors.terminos = "Debes aceptar los términos";

    // Validar NIT alfanumérico
    if (numeroDocumento && !/^[a-zA-Z0-9]+$/.test(numeroDocumento)) {
      newErrors.numeroDocumento = "Solo alfanuméricos";
    }

    // Validar Teléfono entre 7 y 15 caracteres
    if (telefono && (!/^\d+$/.test(telefono) || telefono.length < 7 || telefono.length > 15)) {
      newErrors.telefono = "Entre 7 y 15 números";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (correo && !emailRegex.test(correo)) {
      newErrors.correo = "Correo inválido";
    }

    // Validar contraseña (min 7, max 15 chars, 1 numero, 1 especial)
    if (contrasena) {
      const isLengthValid = contrasena.length >= 7 && contrasena.length <= 15;
      const hasNumber = /\d/.test(contrasena);
      const specialCharRegex = /[!@#$%^&*(),.?":{}|<>\-=_+]/;

      if (!isLengthValid || !hasNumber || !specialCharRegex.test(contrasena)) {
        newErrors.contrasena = "7-15 chars, 1 número, 1 símbolo";
      }
    }

    if (contrasena && confirmarContrasena && contrasena !== confirmarContrasena) {
      newErrors.confirmarContrasena = "No coincide";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);

    // 1. Verificar duplicados de NIT en nuestra tabla
    const { data: existingNit, error: searchError } = await supabase
      .from('Usuarios_Registrados')
      .select('numero_documento')
      .eq('numero_documento', numeroDocumento)
      .maybeSingle();

    if (searchError) {
      setLoading(false);
      alert("Error al verificar datos.");
      return;
    }

    if (existingNit) {
      setLoading(false);
      setErrors({ numeroDocumento: "Este NIT/RUT ya está registrado" });
      return;
    }

    // 2. Subir el logo a Supabase Storage
    let publicLogoUrl = null;
    try {
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
      publicLogoUrl = publicUrlData.publicUrl;
    } catch (err) {
      setLoading(false);
      alert("Error subiendo logo: " + err.message);
      return;
    }

    // 3. Crear usuario en Supabase Auth (esto dispara el correo de verificación automáticamente)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: correo,
      password: contrasena,
    });

    if (authError) {
      setLoading(false);
      if (authError.message.includes('already registered')) {
        setErrors({ correo: "Este correo ya está registrado" });
      } else {
        alert("Error al crear cuenta: " + authError.message);
      }
      return;
    }

    // 4. Insertar los metadatos de la empresa en nuestra tabla, vinculando con el UUID de Auth
    const authUserId = authData.user?.id;

    const { data, error } = await supabase
      .from('Usuarios_Registrados')
      .insert([{
        auth_user_id: authUserId,
        razon_social: razonSocial,
        tipo_documento: 'NIT',
        numero_documento: numeroDocumento,
        direccion: direccion,
        ciudad: selectedCity,
        sector_empresarial: sectorEmpresarial,
        correo: correo,
        telefono: telefono,
        descripcion: descripcion,
        logo_url: publicLogoUrl,
        estado: 'Pendiente de verificación',
      }])
      .select().single();

    setLoading(false);

    if (error) {
      // Rollback: si el insert falla, eliminar el usuario de Auth para poder reintentar
      if (authUserId) {
        await supabase.auth.admin.deleteUser(authUserId).catch(() => {});
      }
      await supabase.auth.signOut();
      alert("Error al registrar empresa: " + error.message);
    } else {
      // Cerrar la sesión de Auth (el usuario debe verificar su correo primero)
      await supabase.auth.signOut();
      onRegistrationSuccess(data);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.logoContainer}>
            <Ionicons name="aperture" size={40} color="#0891b2" />
            <Text style={styles.logoText}> INTERGEA</Text>
          </View>
          <Text style={styles.title}>Formulario de Afiliación</Text>
          <Text style={styles.subtitle}>Validación de la empresa</Text>

          {/* Bait fields for aggressive browser autofill */}
          <View style={{ height: 0, overflow: 'hidden', opacity: 0, position: 'absolute' }}>
            <TextInput autoComplete="username" value="bait" />
            <TextInput secureTextEntry autoComplete="current-password" value="bait" />
          </View>

          {/* Campos del formulario */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Razón Social:</Text>
            <TextInput
              style={[styles.input, errors.razonSocial && styles.inputError]}
              value={razonSocial}
              maxLength={25}
              autoComplete="off"
              autoFocus={true}
              name={`rs_${Date.now()}`}
              onChangeText={(text) => {
                const filteredText = text.replace(/[^a-zA-Z0-9\sáéíóúÁÉÍÓÚñÑ]/g, '');
                setRazonSocial(filteredText);
                setErrors({ ...errors, razonSocial: null });
              }}
            />
            {errors.razonSocial && <Text style={styles.errorText}>{errors.razonSocial}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>NIT / RUT:</Text>
            <TextInput
              style={[styles.input, errors.numeroDocumento && styles.inputError]}
              value={numeroDocumento}
              autoComplete="off"
              name={`nd_${Date.now()}`}
              autoCapitalize="characters"
              onChangeText={(text) => { setNumeroDocumento(text); setErrors({ ...errors, numeroDocumento: null }); }}
            />
            {errors.numeroDocumento && <Text style={styles.errorText}>{errors.numeroDocumento}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Dirección Legal:</Text>
            <TextInput
              style={[styles.input, errors.direccion && styles.inputError]}
              value={direccion}
              autoComplete="off"
              name={`dir_${Date.now()}`}
              onChangeText={(text) => { setDireccion(text); setErrors({ ...errors, direccion: null }); }}
            />
            {errors.direccion && <Text style={styles.errorText}>{errors.direccion}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Ciudad:</Text>
            <View style={[styles.pickerContainer, errors.ciudad && styles.inputError]}>
              <Picker selectedValue={selectedCity} onValueChange={setSelectedCity} style={styles.picker}>
                <Picker.Item label="Seleccione una ciudad" value="" />
                {colombianCities.map((c, i) => <Picker.Item key={i} label={c} value={c} />)}
              </Picker>
            </View>
            {errors.ciudad && <Text style={styles.errorText}>{errors.ciudad}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Sector Empresarial:</Text>
            <View style={[styles.pickerContainer, errors.sectorEmpresarial && styles.inputError]}>
              <Picker
                selectedValue={sectorEmpresarial}
                onValueChange={(itemValue) => { setSectorEmpresarial(itemValue); setErrors({ ...errors, sectorEmpresarial: null }); }}
                style={styles.picker}
              >
                <Picker.Item label="Seleccione un sector" value="" />
                <Picker.Item label="Tecnología" value="Tecnología" />
                <Picker.Item label="Salud" value="Salud" />
                <Picker.Item label="Educación" value="Educación" />
                <Picker.Item label="Comercio" value="Comercio" />
                <Picker.Item label="Servicios" value="Servicios" />
                <Picker.Item label="Manufactura" value="Manufactura" />
                <Picker.Item label="Agropecuario" value="Agropecuario" />
                <Picker.Item label="Otro" value="Otro" />
              </Picker>
            </View>
            {errors.sectorEmpresarial && <Text style={styles.errorText}>{errors.sectorEmpresarial}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Correo:</Text>
            <TextInput
              style={[styles.input, errors.correo && styles.inputError]}
              value={correo}
              autoComplete="off"
              name={`em_${Date.now()}`}
              keyboardType="email-address"
              onChangeText={(text) => { setCorreo(text); setErrors({ ...errors, correo: null }); }}
            />
            {errors.correo && <Text style={styles.errorText}>{errors.correo}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Teléfono:</Text>
            <TextInput
              style={[styles.input, errors.telefono && styles.inputError]}
              value={telefono}
              autoComplete="off"
              name={`tel_${Date.now()}`}
              keyboardType="phone-pad"
              maxLength={15}
              onChangeText={(text) => { 
                const numericValue = text.replace(/[^0-9]/g, '');
                setTelefono(numericValue); 
                setErrors({ ...errors, telefono: null }); 
              }}
            />
            {errors.telefono && <Text style={styles.errorText}>{errors.telefono}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Descripción:</Text>
            <TextInput
              style={[styles.input, errors.descripcion && styles.inputError]}
              value={descripcion}
              autoComplete="off"
              name={`desc_${Date.now()}`}
              onChangeText={(text) => { setDescripcion(text); setErrors({ ...errors, descripcion: null }); }}
            />
            {errors.descripcion && <Text style={styles.errorText}>{errors.descripcion}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Crear Contraseña:</Text>
            <TextInput
              style={[styles.input, errors.contrasena && styles.inputError]}
              value={contrasena}
              secureTextEntry
              autoComplete="off"
              name={`pw_${Date.now()}`}
              onChangeText={(text) => { setContrasena(text); setErrors({ ...errors, contrasena: null }); }}
            />
            {errors.contrasena && <Text style={styles.errorText}>{errors.contrasena}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirmar Contraseña:</Text>
            <TextInput
              style={[styles.input, errors.confirmarContrasena && styles.inputError]}
              value={confirmarContrasena}
              secureTextEntry
              autoComplete="off"
              name={`cpw_${Date.now()}`}
              onChangeText={(text) => { setConfirmarContrasena(text); setErrors({ ...errors, confirmarContrasena: null }); }}
            />
            {errors.confirmarContrasena && <Text style={styles.errorText}>{errors.confirmarContrasena}</Text>}
          </View>

          <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
            <AntDesign name="plus" size={24} color={logoUri ? "#10b981" : "#475569"} />
          </TouchableOpacity>
          {errors.logo && <Text style={[styles.errorText, { marginBottom: 10 }]}>{errors.logo}</Text>}

          <View style={styles.termsMaster}>
            <TouchableOpacity 
              style={styles.termsContainer} 
              onPress={() => { setIsChecked(!isChecked); setErrors({ ...errors, terminos: null }); }}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, isChecked && styles.checkboxActive]}>
                {isChecked && <AntDesign name="check" size={14} color="#fff" />}
              </View>
              <Text style={styles.termsText}>Acepto términos y condiciones</Text>
            </TouchableOpacity>
            {errors.terminos && <Text style={[styles.errorText, { marginTop: -20, marginBottom: 25 }]}>{errors.terminos}</Text>}
          </View>

          <TouchableOpacity
            style={[styles.submitButton, loading && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.submitButtonText}>{loading ? 'Cargando...' : 'Registrar Empresa'}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onBack}>
            <Text style={styles.backButtonText}>Volver al Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#020617' },
  scrollContainer: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 },
  card: { width: '85%', backgroundColor: '#0f172a', borderRadius: 25, padding: 25, alignItems: 'center' },
  logoContainer: { alignItems: 'center', marginBottom: 15 },
  logoText: { color: '#94a3b8', fontSize: 10, fontWeight: 'bold' },
  title: { color: '#ffffff', fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
  subtitle: { color: '#94a3b8', fontSize: 13, marginBottom: 25 },
  inputGroup: { width: '100%', marginBottom: 12 },
  label: { color: '#ffffff', fontSize: 12, marginBottom: 5 },
  input: { backgroundColor: '#cbd5e1', borderRadius: 25, height: 40, paddingHorizontal: 20, fontSize: 16, color: '#0f172a' },
  inputError: { borderColor: '#ef4444', borderWidth: 1 },
  errorText: { color: '#ef4444', fontSize: 10, marginTop: 3, marginLeft: 10 },
  successText: { color: '#10b981', fontSize: 10, marginBottom: 10 },
  pickerContainer: { backgroundColor: '#cbd5e1', borderRadius: 25, height: 40, justifyContent: 'center', overflow: 'hidden' },
  picker: { height: 40, color: '#0f172a' },
  uploadButton: { backgroundColor: '#e2e8f0', width: 60, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  termsContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 25, paddingVertical: 10, paddingHorizontal: 15 },
  termsMaster: { alignItems: 'center', width: '100%' },
  checkbox: { width: 20, height: 20, borderRadius: 4, backgroundColor: '#e2e8f0', marginRight: 10, justifyContent: 'center', alignItems: 'center' },
  checkboxActive: { backgroundColor: '#0891b2' },
  termsText: { color: '#cbd5e1', fontSize: 13 },
  submitButton: { backgroundColor: '#0891b2', paddingVertical: 12, borderRadius: 20, width: '80%', alignItems: 'center', marginBottom: 15 },
  submitButtonText: { color: '#ffffff', fontWeight: 'bold' },
  backButtonText: { color: '#0891b2', fontWeight: 'bold' },
});

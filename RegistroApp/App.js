//Se importa react y hook useState para manejar el estado de los componentes
import React, { useState } from 'react';
//Se importan componentes basicos de react native
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, SafeAreaView, StatusBar } from 'react-native';
//Se importan iconos desde expo
import { AntDesign, Ionicons } from '@expo/vector-icons';
//Se importa el componente Picker, para crear un selector desplegable 
import { Picker } from '@react-native-picker/picker';
//Se importa el array de ciudades, es un archivo externo
import { colombianCities } from './cities';

export default function App() {
  const [isChecked, setIsChecked] = useState(false);
  const [selectedCity, setSelectedCity] = useState('');

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>

          {/* Logo Section */}
          <View style={styles.logoContainer}>
            {/* Using an icon as a placeholder for the logo */}
            <Ionicons name="aperture" size={40} color="#06b6d4" />
            <Text style={styles.logoText}>INTERGRAF</Text>
          </View>

          <Text style={styles.title}>Formulario de Afiliacion</Text>
          <Text style={styles.subtitle}>Validacion de la empresa</Text>

          {/* Form Fields */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Razon Social:</Text>
            <TextInput style={styles.input} />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Tipo Documento:</Text>
            <TextInput style={styles.input} />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Numero Documento:</Text>
            <TextInput style={styles.input} />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Direccion:</Text>
            <TextInput style={styles.input} />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Ciudad:</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedCity}
                onValueChange={(itemValue) => setSelectedCity(itemValue)}
                style={styles.picker}
              >
                <Picker.Item label="Seleccione una ciudad" value="" />
                {colombianCities.map((city, index) => (
                  <Picker.Item key={index} label={city} value={city} />
                ))}
              </Picker>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Sector Empresarial:</Text>
            <TextInput style={styles.input} />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Correo Electronico:</Text>
            <TextInput style={styles.input} keyboardType="email-address" />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Telefono:</Text>
            <TextInput style={styles.input} keyboardType="phone-pad" />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Descripcion:</Text>
            <TextInput style={styles.input} />
          </View>

          {/* Upload Logo Section */}
          <Text style={styles.uploadLabel}>Subir Logo de la empresa:</Text>
          <TouchableOpacity style={styles.uploadButton}>
            <AntDesign name="plus" size={24} color="#475569" />
          </TouchableOpacity>

          {/* Terms and Conditions */}
          <View style={styles.termsContainer}>
            <TouchableOpacity
              style={[styles.checkbox, isChecked && styles.checkboxActive]}
              onPress={() => setIsChecked(!isChecked)}
            >
              {isChecked && <AntDesign name="check" size={10} color="#fff" />}
            </TouchableOpacity>
            <Text style={styles.termsText}>Acepto terminos y condiciones</Text>
          </View>

          {/* Submit Button */}
          <TouchableOpacity style={styles.submitButton}>
            <Text style={styles.submitButtonText}>Ingresar</Text>
          </TouchableOpacity>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

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
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
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

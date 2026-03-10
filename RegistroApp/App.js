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

//Componente principal de la aplicacion
export default function App() {
  //Estado que controla si el checkbox esta marcado
  const [isChecked, setIsChecked] = useState(false);
  //Estado que controla la ciudad seleccionada
  const [selectedCity, setSelectedCity] = useState('');

  return (
    //Contenedor principal de la aplicacion
    <SafeAreaView style={styles.safeArea}>
      //Configuracion del estado de la barra de estado del telefono
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      //Permite desplazarse verticalmente si el contenido es mas grande que la pantalla
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        //Tarjeta principal que contiene todo el formulario
        <View style={styles.card}>

          {/*Contenedor del Logo*/}
          <View style={styles.logoContainer}>
            {/*Icono temporal*/}
            <Ionicons name="aperture" size={40} color="#06b6d4" />
            {/*Nombre de la app*/}
            <Text style={styles.logoText}>INTERGRAF</Text>
          </View>

          {/*Titulo del formulario*/}
          <Text style={styles.title}>Formulario de Afiliacion</Text>
          {/*Subtitulo del formulario*/}
          <Text style={styles.subtitle}>Validacion de la empresa</Text>

          {/*Campo de texto para la razon social*/}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Razon Social:</Text>
            <TextInput style={styles.input} />
          </View>

          {/*Campo de texto para el tipo de documento*/}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Tipo Documento:</Text>
            <TextInput style={styles.input} />
          </View>

          {/*Campo de texto para el numero de documento*/}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Numero Documento:</Text>
            <TextInput style={styles.input} />
          </View>

          {/*Campo de texto para la direccion*/}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Direccion:</Text>
            <TextInput style={styles.input} />
          </View>

          {/*Campo de texto para la ciudad*/}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Ciudad:</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedCity} //ciudad actualmente seleccionada
                onValueChange={(itemValue) => setSelectedCity(itemValue)} //actualiza la ciudad seleccionada
                style={styles.picker}
              >
                {/*Opcion por defecto*/}
                <Picker.Item label="Seleccione una ciudad" value="" />
                {/*Genera la lista de las ciudades*/}
                {colombianCities.map((city, index) => (
                  <Picker.Item key={index} label={city} value={city} />
                ))}
              </Picker>
            </View>
          </View>

          {/*Campo de texto para el sector empresarial*/}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Sector Empresarial:</Text>
            <TextInput style={styles.input} />
          </View>

          {/*Campo de texto para el correo electronico*/}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Correo Electronico:</Text>
            <TextInput style={styles.input} keyboardType="email-address" />
          </View>

          {/*Campo de texto para el telefono*/}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Telefono:</Text>
            <TextInput style={styles.input} keyboardType="phone-pad" />
          </View>

          {/*Campo de texto para la descripcion*/}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Descripcion:</Text>
            <TextInput style={styles.input} />
          </View>

          {/*Campo de texto para subir el logo*/}
          <Text style={styles.uploadLabel}>Subir Logo de la empresa:</Text>
          <TouchableOpacity style={styles.uploadButton}>
            <AntDesign name="plus" size={24} color="#475569" />
          </TouchableOpacity>

          {/*Seccion de aceptacion de terminos y condiciones */}
          <View style={styles.termsContainer}>
            <TouchableOpacity
              style={[styles.checkbox, isChecked && styles.checkboxActive]}//Cambia el color del checkbox si esta marcado
              onPress={() => setIsChecked(!isChecked)}//Cambia el estado del checkbox
            >
              {/*Muestra un check si el checkbox esta marcado*/}
              {isChecked && <AntDesign name="check" size={10} color="#fff" />}
            </TouchableOpacity>

            {/*Texto de terminos y condiciones*/}
            <Text style={styles.termsText}>Acepto terminos y condiciones</Text>
          </View>

          {/*Boton de enviar*/}
          <TouchableOpacity style={styles.submitButton}>
            <Text style={styles.submitButtonText}>Ingresar</Text>
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

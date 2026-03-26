import React, { useState } from 'react';
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
  KeyboardAvoidingView,
  Alert,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function Mensajeria({ onBack, onNavigate }) {
  // Estado para la vista: 'lista' (Conversaciones) o 'chat' (Mensajes de un pedido)
  const [vistaActiva, setVistaActiva] = useState('lista');
  const [conversacionActiva, setConversacionActiva] = useState(null);
  const [nuevoMensaje, setNuevoMensaje] = useState('');

  // Estados para la nueva conversación
  const [modalNuevaConvVisible, setModalNuevaConvVisible] = useState(false);
  const [nuevoPedidoId, setNuevoPedidoId] = useState('');
  const [nuevoDestinatario, setNuevoDestinatario] = useState('');

  // Datos mockeados de conversaciones asociadas a pedidos
  const [conversaciones, setConversaciones] = useState([
    {
      id: 1,
      pedidoId: 'PED-1024',
      contraparte: 'Proveedor Gráfico S.A.',
      rol: 'Proveedor',
      ultimoMensaje: 'Los afiches ya están en producción.',
      fecha: '10:30 AM',
      mensajes: [
        { id: 101, sender: 'me', text: 'Hola, ¿cómo va el pedido PED-1024?', time: '10:00 AM' },
        { id: 102, sender: 'other', text: 'Hola. Revisando tu orden ahora mismo.', time: '10:15 AM' },
        { id: 103, sender: 'other', text: 'Los afiches ya están en producción.', time: '10:30 AM' },
      ]
    },
    {
      id: 2,
      pedidoId: 'PED-0988',
      contraparte: 'Comprador Mayorista',
      rol: 'Comprador',
      ultimoMensaje: 'Perfecto, enviaré el comprobante pronto.',
      fecha: 'Ayer',
      mensajes: [
        { id: 201, sender: 'other', text: '¿Pueden ajustar el precio si llevo 1000 unidades?', time: 'Ayer, 3:00 PM' },
        { id: 202, sender: 'me', text: 'Sí, podemos dejarlo en $12 c/u.', time: 'Ayer, 3:15 PM' },
        { id: 203, sender: 'other', text: 'Perfecto, enviaré el comprobante pronto.', time: 'Ayer, 4:00 PM' },
      ]
    }
  ]);

  const abrirConversacion = (conv) => {
    setConversacionActiva(conv);
    setVistaActiva('chat');
  };

  const enviarMensaje = () => {
    if (!nuevoMensaje.trim()) return;
    
    // Verificación de límite de 300 caracteres
    if (nuevoMensaje.length > 300) {
      const msgError = 'El mensaje no puede superar los 300 caracteres.';
      Platform.OS === 'web' ? window.alert(msgError) : Alert.alert('Error', msgError);
      return;
    }

    const nuevoMsgObj = {
      id: Date.now(),
      sender: 'me',
      text: nuevoMensaje.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    // Actualizar la conversación activa en la lista
    const conversacionesActualizadas = conversaciones.map(c => {
      if (c.id === conversacionActiva.id) {
        return {
          ...c,
          ultimoMensaje: nuevoMsgObj.text,
          fecha: nuevoMsgObj.time,
          mensajes: [...c.mensajes, nuevoMsgObj]
        };
      }
      return c;
    });

    setConversaciones(conversacionesActualizadas);
    setConversacionActiva(conversacionesActualizadas.find(c => c.id === conversacionActiva.id));
    setNuevoMensaje('');
  };

  const simularAdjunto = () => {
    const msg = 'Funcionalidad para adjuntar archivos en progreso.';
    Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Adjuntos', msg);
  };

  const crearNuevaConversacion = () => {
    if (!nuevoPedidoId.trim() || !nuevoDestinatario.trim()) {
      const msgError = 'Por favor ingresa todos los campos requeridos.';
      Platform.OS === 'web' ? window.alert(msgError) : Alert.alert('Campos incompletos', msgError);
      return;
    }

    const nuevaConv = {
      id: Date.now(),
      pedidoId: nuevoPedidoId.trim().toUpperCase(),
      contraparte: nuevoDestinatario.trim(),
      rol: 'Proveedor', // Rol simulado para esta demo
      ultimoMensaje: 'Conversación iniciada',
      fecha: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      mensajes: [] // Inicia sin mensajes
    };

    setConversaciones([nuevaConv, ...conversaciones]);
    
    // Limpiar campos y cerrar modal
    setNuevoPedidoId('');
    setNuevoDestinatario('');
    setModalNuevaConvVisible(false);

    // Abrir el chat automáticamente
    abrirConversacion(nuevaConv);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER DE NAVEGACIÓN (Consistente con toda la app) */}
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
          
          <TouchableOpacity onPress={() => onNavigate && onNavigate('inventario')}>
            <Ionicons name="cube-outline" size={24} color="#64748b" style={{ marginHorizontal: 8 }} />
          </TouchableOpacity>

          <TouchableOpacity>
            <Ionicons name="chatbubble" size={24} color="#0ea5e9" style={{ marginHorizontal: 8 }} />
          </TouchableOpacity>

          <TouchableOpacity>
            <Ionicons name="person-circle-outline" size={30} color="#cbd5e1" style={{ marginHorizontal: 8 }} />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => onNavigate && onNavigate('login')}>
            <Ionicons name="log-out-outline" size={26} color="#f8fafc" style={{ marginLeft: 8 }} />
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.mainTitle}>Mensajes</Text>

      {/* CONTENEDOR PRINCIPAL BASADO EN LA IMAGEN */}
      <View style={styles.cardContainer}>
        {vistaActiva === 'lista' ? (
          <>
            <View style={styles.cardHeader}>
              <Text style={styles.cardHeaderTitle}>Conversaciones</Text>
            </View>
            <View style={styles.divider} />

            <ScrollView style={styles.listArea}>
              {conversaciones.map((conv) => (
                <TouchableOpacity 
                  key={conv.id} 
                  style={styles.convItem} 
                  onPress={() => abrirConversacion(conv)}
                >
                  <View style={styles.convAvatar}>
                    <Ionicons name="person" size={20} color="#64748b" />
                  </View>
                  <View style={styles.convBody}>
                    <View style={styles.convTopRow}>
                      <Text style={styles.convName}>{conv.contraparte}</Text>
                      <Text style={styles.convDate}>{conv.fecha}</Text>
                    </View>
                    <Text style={styles.convOrder}>Pedido: {conv.pedidoId}</Text>
                    <Text style={styles.convPreview} numberOfLines={1}>{conv.ultimoMensaje}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* BOTÓN FLOTANTE NUEVA CONVERSACIÓN */}
            <TouchableOpacity 
              style={styles.fabMensaje}
              onPress={() => setModalNuevaConvVisible(true)}
            >
              <Ionicons name="chatbubble-ellipses" size={28} color="#ffffff" />
            </TouchableOpacity>

            {/* MODAL PARA NUEVA CONVERSACIÓN */}
            <Modal
              animationType="slide"
              transparent={true}
              visible={modalNuevaConvVisible}
              onRequestClose={() => setModalNuevaConvVisible(false)}
            >
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Nueva Conversación</Text>
                    <TouchableOpacity onPress={() => setModalNuevaConvVisible(false)}>
                      <Ionicons name="close-circle" size={28} color="#94a3b8" />
                    </TouchableOpacity>
                  </View>
                  
                  <Text style={styles.modalLabel}>Destinatario / Contraparte:</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Ej. Diseño XYZ o Cliente Final"
                    placeholderTextColor="#64748b"
                    value={nuevoDestinatario}
                    onChangeText={setNuevoDestinatario}
                  />

                  <Text style={styles.modalLabel}>Asociar a Número de Pedido:</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Ej. PED-2055"
                    placeholderTextColor="#64748b"
                    value={nuevoPedidoId}
                    onChangeText={setNuevoPedidoId}
                    autoCapitalize="characters"
                  />

                  <TouchableOpacity style={styles.btnCrearConv} onPress={crearNuevaConversacion}>
                    <Text style={styles.btnCrearConvText}>Crear Chat</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>
          </>
        ) : (
          /* VISTA DE CHAT */
          <KeyboardAvoidingView 
            style={{ flex: 1 }} 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={styles.chatHeader}>
              <TouchableOpacity onPress={() => setVistaActiva('lista')} style={styles.backButton}>
                <Ionicons name="chevron-back" size={24} color="#0ea5e9" />
              </TouchableOpacity>
              <View>
                <Text style={styles.chatHeaderTitle}>{conversacionActiva?.contraparte}</Text>
                <Text style={styles.chatHeaderSubtitle}>Pedido: {conversacionActiva?.pedidoId} • Privado</Text>
              </View>
            </View>
            <View style={styles.divider} />

            <ScrollView style={styles.messagesArea} contentContainerStyle={{ paddingBottom: 20 }}>
              <Text style={styles.securityNotice}>Solo las partes involucradas en este pedido tienen acceso a esta conversación.</Text>
              {conversacionActiva?.mensajes.map((msg) => (
                <View 
                  key={msg.id} 
                  style={[
                    styles.messageBubble, 
                    msg.sender === 'me' ? styles.messageMine : styles.messageTheirs
                  ]}
                >
                  <Text style={styles.messageText}>{msg.text}</Text>
                  <Text style={styles.messageTime}>{msg.time}</Text>
                </View>
              ))}
            </ScrollView>

            {/* INPUT DE MENSAJE */}
            <View style={styles.inputContainer}>
              <TouchableOpacity style={styles.attachBtn} onPress={simularAdjunto}>
                <Ionicons name="attach" size={24} color="#64748b" />
              </TouchableOpacity>
              <TextInput
                style={styles.textInput}
                placeholder="Escribe un mensaje..."
                placeholderTextColor="#64748b"
                value={nuevoMensaje}
                onChangeText={setNuevoMensaje}
                maxLength={300}
                multiline
              />
              <TouchableOpacity 
                style={[styles.sendBtn, nuevoMensaje.trim() ? styles.sendBtnActive : null]} 
                onPress={enviarMensaje}
                disabled={!nuevoMensaje.trim()}
              >
                <Ionicons name="send" size={20} color={nuevoMensaje.trim() ? "#ffffff" : "#64748b"} />
              </TouchableOpacity>
            </View>
            <Text style={styles.charCount}>{nuevoMensaje.length}/300 caracteres</Text>
          </KeyboardAvoidingView>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617', // Color de fondo oscuro como en la imagen
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
    backgroundColor: 'transparent',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)', // Borde definido como en la imagen
  },
  mainTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  cardContainer: {
    flex: 1,
    backgroundColor: '#0f172a', // Fondo de la tarjeta algo mas claro que el fondo principal
    marginHorizontal: 20,
    marginBottom: 30,
    borderRadius: 30, // Bordes bien redondeados de la imagen
    borderWidth: 1,
    borderColor: '#e2e8f0', // Borde blanco/grisáceo para resaltar
    overflow: 'hidden',
  },
  cardHeader: {
    paddingVertical: 15,
    alignItems: 'center',
  },
  cardHeaderTitle: {
    color: '#e2e8f0',
    fontSize: 18,
    fontWeight: '300', // Texto delgado como en la imagen
  },
  divider: {
    height: 1,
    backgroundColor: '#e2e8f0', // Linea divisoria visible
    width: '100%',
  },
  listArea: {
    flex: 1,
    padding: 15,
  },
  convItem: {
    flexDirection: 'row',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    alignItems: 'center',
  },
  convAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  convBody: {
    flex: 1,
  },
  convTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  convName: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  convDate: {
    color: '#64748b',
    fontSize: 12,
  },
  convOrder: {
    color: '#0ea5e9',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  convPreview: {
    color: '#94a3b8',
    fontSize: 13,
  },
  // -- Estilos Chat --
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
  },
  backButton: {
    marginRight: 15,
  },
  chatHeaderTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  chatHeaderSubtitle: {
    color: '#94a3b8',
    fontSize: 12,
  },
  messagesArea: {
    flex: 1,
    padding: 15,
  },
  securityNotice: {
    color: '#64748b',
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 20,
    marginTop: 10,
    fontStyle: 'italic',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 15,
    marginBottom: 10,
  },
  messageMine: {
    alignSelf: 'flex-end',
    backgroundColor: '#0ea5e9',
    borderBottomRightRadius: 5,
  },
  messageTheirs: {
    alignSelf: 'flex-start',
    backgroundColor: '#1e293b',
    borderBottomLeftRadius: 5,
  },
  messageText: {
    color: '#ffffff',
    fontSize: 14,
  },
  messageTime: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 10,
    marginTop: 5,
    alignSelf: 'flex-end',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 5,
    backgroundColor: '#0f172a',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  attachBtn: {
    padding: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#1e293b',
    color: '#ffffff',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 10,
    maxHeight: 100,
    marginHorizontal: 10,
  },
  sendBtn: {
    padding: 10,
    borderRadius: 20,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnActive: {
    backgroundColor: '#0ea5e9',
  },
  charCount: {
    color: '#64748b',
    fontSize: 10,
    textAlign: 'right',
    paddingRight: 15,
    paddingBottom: 15,
  },
  // -- Estilos FAB --
  fabMensaje: {
    position: 'absolute',
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    right: 20,
    bottom: 25,
    backgroundColor: '#0ea5e9',
    borderRadius: 30,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 5,
  },
  // -- Estilos Modal --
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    backgroundColor: '#0f172a',
    borderRadius: 25,
    padding: 25,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalLabel: {
    color: '#e2e8f0',
    fontSize: 13,
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    color: '#ffffff',
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginBottom: 15,
  },
  btnCrearConv: {
    backgroundColor: '#0ea5e9',
    height: 45,
    borderRadius: 22.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  btnCrearConvText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
});

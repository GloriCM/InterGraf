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
  KeyboardAvoidingView,
  Alert,
  Modal,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from './supabase';

export default function Mensajeria({ onBack, onNavigate, userData }) {
  // Estado para la vista: 'lista' (Conversaciones) o 'chat' (Mensajes de un pedido)
  const [vistaActiva, setVistaActiva] = useState('lista');
  const [conversacionActiva, setConversacionActiva] = useState(null);
  const [nuevoMensaje, setNuevoMensaje] = useState('');
  const [mensajes, setMensajes] = useState([]);
  const [loading, setLoading] = useState(false);

  // Estados para la nueva conversación
  const [modalNuevaConvVisible, setModalNuevaConvVisible] = useState(false);
  const [nuevoPedidoId, setNuevoPedidoId] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [resultadosBusqueda, setResultadosBusqueda] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [destinatarioSeleccionado, setDestinatarioSeleccionado] = useState(null);

  // Datos de conversaciones reales de Supabase
  const [conversaciones, setConversaciones] = useState([]);

  // 1. Cargar conversaciones en las que participa el usuario
  const fetchConversaciones = async () => {
    if (!userData?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('conversaciones')
        .select('*')
        .or(`comprador_id.eq.${userData.id},vendedor_id.eq.${userData.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setConversaciones(data || []);
    } catch (error) {
      console.error('Error fetching conversaciones:', error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversaciones();
  }, [userData]);

  // 2. Gestionar mensajes y Realtime de la conversación activa
  useEffect(() => {
    if (!conversacionActiva || vistaActiva !== 'chat') return;

    // A. Cargar mensajes históricos
    const fetchMensajes = async () => {
      const { data, error } = await supabase
        .from('mensajes')
        .select('*')
        .eq('conversacion_id', conversacionActiva.id)
        .order('created_at', { ascending: true });

      if (data) setMensajes(data);
    };

    fetchMensajes();

    // B. Suscribirse a mensajes nuevos en TIEMPO REAL
    const canal = supabase
      .channel(`chat_${conversacionActiva.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'mensajes',
        filter: `conversacion_id=eq.${conversacionActiva.id}`
      }, (payload) => {
        setMensajes((current) => [...current, payload.new]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [conversacionActiva, vistaActiva]);

  const abrirConversacion = (conv) => {
    setConversacionActiva(conv);
    setMensajes([]); // Limpiar previo mientras carga
    setVistaActiva('chat');
  };

  const enviarMensaje = async () => {
    if (!nuevoMensaje.trim() || !conversacionActiva) return;
    
    if (nuevoMensaje.length > 300) {
      const msgError = 'El mensaje no puede superar los 300 caracteres.';
      Platform.OS === 'web' ? window.alert(msgError) : Alert.alert('Error', msgError);
      return;
    }

    const contenido = nuevoMensaje.trim();
    setNuevoMensaje(''); // Limpiar input rápido

    const { error } = await supabase
      .from('mensajes')
      .insert([{
        conversacion_id: conversacionActiva.id,
        remitente_id: userData.id,
        contenido: contenido
      }]);

    if (error) {
      console.error('Error enviando mensaje:', error.message);
      Alert.alert('Error', 'No se pudo enviar el mensaje.');
    }
  };

  const buscarUsuarios = async (texto) => {
    setBusqueda(texto);
    if (texto.length < 3) {
      setResultadosBusqueda([]);
      return;
    }

    setBuscando(true);
    try {
      const { data, error } = await supabase
        .from('Usuarios_Registrados')
        .select('auth_user_id, razon_social')
        .ilike('razon_social', `%${texto}%`)
        .neq('auth_user_id', userData?.id) // No buscarse a sí mismo
        .limit(10);

      if (error) throw error;
      setResultadosBusqueda(data || []);
    } catch (error) {
      console.error('Error buscando usuarios:', error.message);
    } finally {
      setBuscando(false);
    }
  };

  const seleccionarDestinatario = (user) => {
    setDestinatarioSeleccionado(user);
    setResultadosBusqueda([]);
    setBusqueda(user.razon_social);
  };

  const crearNuevaConversacion = async () => {
    if (!nuevoPedidoId.trim() || !destinatarioSeleccionado) {
      Alert.alert('Campos incompletos', 'Ingresa pedido y selecciona un destinatario.');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('conversaciones')
        .insert([{
          pedido_id: nuevoPedidoId.trim().toUpperCase(),
          comprador_id: userData.id,
          vendedor_id: destinatarioSeleccionado.auth_user_id
        }])
        .select()
        .single();

      if (error) throw error;

      setModalNuevaConvVisible(false);
      setNuevoPedidoId('');
      setBusqueda('');
      setDestinatarioSeleccionado(null);
      
      fetchConversaciones();
      abrirConversacion(data);
    } catch (error) {
      console.error('Error creando chat:', error.message);
      Alert.alert('Error', 'No se pudo iniciar la conversación.');
    }
  };

  const simularAdjunto = () => {
    Alert.alert('Adjuntos', 'Funcionalidad de archivos en desarrollo.');
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
        {loading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#0ea5e9" />
            <Text style={{ color: '#94a3b8', marginTop: 10 }}>Cargando chats...</Text>
          </View>
        ) : vistaActiva === 'lista' ? (
          <>
            <View style={styles.cardHeader}>
              <Text style={styles.cardHeaderTitle}>Conversaciones</Text>
            </View>
            <View style={styles.divider} />

            <ScrollView style={styles.listArea}>
              {conversaciones.length === 0 ? (
                <Text style={{ color: '#64748b', textAlign: 'center', marginTop: 40 }}>
                  No tienes conversaciones activas.
                </Text>
              ) : (
                conversaciones.map((conv) => (
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
                        <Text style={styles.convName}>Chat de Pedido</Text>
                        <Text style={styles.convDate}>
                          {new Date(conv.created_at).toLocaleDateString()}
                        </Text>
                      </View>
                      <Text style={styles.convOrder}>Pedido: {conv.pedido_id}</Text>
                      <Text style={styles.convPreview} numberOfLines={1}>Toca para ver los mensajes</Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
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
                  
                  <Text style={styles.modalLabel}>Buscar Empresa/Usuario:</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Escribe al menos 3 letras..."
                    placeholderTextColor="#64748b"
                    value={busqueda}
                    onChangeText={buscarUsuarios}
                  />

                  {buscando && <ActivityIndicator size="small" color="#0ea5e9" style={{ marginBottom: 10 }} />}

                  {resultadosBusqueda.length > 0 && (
                    <View style={styles.searchResultsContainer}>
                      {resultadosBusqueda.map((user) => (
                        <TouchableOpacity 
                          key={user.auth_user_id} 
                          style={styles.searchResultItem}
                          onPress={() => seleccionarDestinatario(user)}
                        >
                          <Ionicons name="person-outline" size={16} color="#94a3b8" />
                          <Text style={styles.searchResultText}>{user.razon_social}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                  
                  {destinatarioSeleccionado && (
                    <View style={styles.selectedUserBadge}>
                      <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                      <Text style={styles.selectedUserText}>Para: {destinatarioSeleccionado.razon_social}</Text>
                    </View>
                  )}

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
                <Text style={styles.chatHeaderTitle}>Chat de Pedido</Text>
                <Text style={styles.chatHeaderSubtitle}>Pedido: {conversacionActiva?.pedido_id} • Privado</Text>
              </View>
            </View>
            <View style={styles.divider} />

            <ScrollView style={styles.messagesArea} contentContainerStyle={{ paddingBottom: 20 }}>
              <Text style={styles.securityNotice}>Solo las partes involucradas en este pedido tienen acceso a esta conversación.</Text>
              {mensajes.map((msg) => (
                <View 
                  key={msg.id} 
                  style={[
                    styles.messageBubble, 
                    msg.remitente_id === userData?.id ? styles.messageMine : styles.messageTheirs
                  ]}
                >
                  <Text style={styles.messageText}>{msg.contenido}</Text>
                  <Text style={styles.messageTime}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
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
  searchResultsContainer: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    marginBottom: 15,
    maxHeight: 150,
    overflow: 'hidden',
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  searchResultText: {
    color: '#ffffff',
    fontSize: 14,
    marginLeft: 10,
  },
  selectedUserBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    padding: 10,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  selectedUserText: {
    color: '#10b981',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 8,
  },
});

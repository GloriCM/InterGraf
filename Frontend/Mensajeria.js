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
  ActivityIndicator,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from './supabase';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';

export default function Mensajeria({ onBack, onNavigate, userData, initialRecipientId, initialProductContext, initialMessageText, onClearInitialRecipient }) {
  // Estado para la vista: 'lista' (Conversaciones) o 'chat' (Mensajes de un pedido)
  const [vistaActiva, setVistaActiva] = useState('lista');
  const [conversacionActiva, setConversacionActiva] = useState(null);
  const [nuevoMensaje, setNuevoMensaje] = useState('');
  const [procesadoId, setProcesadoId] = useState(null); // Nuevo: Para evitar bucles infinitos con initialRecipientId
  const [mensajes, setMensajes] = useState([]);
  const [loading, setLoading] = useState(false);
  const loadingRef = React.useRef(false); // Ref para rastrear loading sin stale closures
  
  // Actualizar ref cuando cambie el estado
  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  // Estados para la nueva conversación
  const [modalNuevaConvVisible, setModalNuevaConvVisible] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [resultadosBusqueda, setResultadosBusqueda] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [destinatarioSeleccionado, setDestinatarioSeleccionado] = useState(null);

  // Estados para adjuntos (Ahora soporta múltiples)
  const [adjuntos, setAdjuntos] = useState([]); // Array de { id, uri, name, type, mimeType }
  const [enviando, setEnviando] = useState(false);
  const [mostrarOpcionesAdjunto, setMostrarOpcionesAdjunto] = useState(false);

  // Datos de conversaciones reales de Supabase
  const [conversaciones, setConversaciones] = useState([]);

  // 1. Cargar conversaciones en las que participa el usuario
  const fetchConversaciones = async (isSilent = false) => {
    if (!userData?.auth_user_id) return;
    if (!isSilent) setLoading(true);
    try {
      // Simplificamos la consulta para mayor compatibilidad con Web
      // Primero obtenemos todos los chats donde participamos
      const { data, error } = await supabase
        .from('conversaciones')
        .select('*')
        .or(`comprador_id.eq.${userData.auth_user_id},vendedor_id.eq.${userData.auth_user_id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filtramos por borrado en JS para evitar la sintaxis compleja de AND/OR en la query que falla en Web
      const chatsFiltrados = (data || []).filter(conv => {
        if (conv.comprador_id === userData.auth_user_id) return !conv.borrado_comprador;
        if (conv.vendedor_id === userData.auth_user_id) return !conv.borrado_vendedor;
        return false;
      });

      setConversaciones(chatsFiltrados);
    } catch (error) {
      console.error('Error fetching conversaciones:', error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversaciones();

    // Suscribirse a cambios en TIEMPO REAL
    let canalConv = supabase
      .channel('public:conversaciones')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'conversaciones'
      }, (payload) => {
        const conv = payload.new || payload.old;
        if (userData?.auth_user_id && (conv.comprador_id === userData.auth_user_id || conv.vendedor_id === userData.auth_user_id)) {
          console.log("DEBUG: Cambio detectado en conversaciones Realtime");
          fetchConversaciones();
        }
      })
      .subscribe((status) => {
        console.log("DEBUG: Estado canal conversaciones:", status);
      });

    // RESPALDO DE POLLING: Solo en Web para asegurar llegada si el socket parpadea
    let pollInterval = null;
    if (Platform.OS === 'web') {
      console.log("DEBUG: Iniciando Polling de respaldo (10s) para Web");
      pollInterval = setInterval(() => {
        // Solo recargamos si no hay una carga en curso (usando la ref para evitar stale closures)
        if (!loadingRef.current) {
          fetchConversaciones(true); // Carga SILENCIOSA
        }
      }, 10000);
    }

    return () => {
      if (canalConv) supabase.removeChannel(canalConv);
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [userData]);

  // Nuevo efecto para gestionar el inicio de un chat directo si viene de DetalleProducto
  useEffect(() => {
    // Si no tenemos ID, el usuario no está cargado o YA PROCESAMOS este ID, detenemos todo.
    if (!initialRecipientId || !userData?.auth_user_id || initialRecipientId === procesadoId) return;

    console.log("DEBUG [v1.4.0]: Procesando ID nuevo para evitar bucles:", initialRecipientId);
    setProcesadoId(initialRecipientId); // Marcar como en proceso inmediatamente
    
    // 1. Pre-llenar mensaje
    if (initialMessageText && typeof initialMessageText === 'string') {
      setNuevoMensaje(initialMessageText);
    } else if (initialProductContext) {
      setNuevoMensaje(`Hola, me interesa este producto: ${initialProductContext.nombre || initialProductContext.identificador}`);
    }

    // 2. Lógica de apertura
    const tratarDeAbrirChat = async () => {
      // Si la lista está cargando, esperamos la lista una vez (el cambio de loading volverá a disparar esto pero procesadoId lo frenará si es el mismo)
      if (loading && conversaciones.length === 0) {
        console.log("DEBUG: Esperando carga inicial de chats...");
        // Reseteamos procesadoId si queremos re-intentar al terminar carga, o mejor dejamos que termine.
        return; 
      }

      const compId = userData.auth_user_id;
      const convExistente = conversaciones.find(c => 
        (c.comprador_id === compId && c.vendedor_id === initialRecipientId) ||
        (c.comprador_id === initialRecipientId && c.vendedor_id === compId)
      );

      if (convExistente) {
        console.log("DEBUG: Abriendo chat existente ID:", convExistente.id);
        abrirConversacion(convExistente);
        // Limpiamos los parámetros globales tras éxito para que no haya rastro en App.js
        setTimeout(() => onClearInitialRecipient && onClearInitialRecipient(), 1000);
      } else {
        console.log("DEBUG: Creando/Buscando chat en servidor...");
        await prepararChatDirecto(initialRecipientId);
        setTimeout(() => onClearInitialRecipient && onClearInitialRecipient(), 1000);
      }
    };

    tratarDeAbrirChat();
  }, [initialRecipientId, procesadoId, conversaciones.length, loading, userData?.auth_user_id]);

  const prepararChatDirecto = async (recipientId) => {
    if (!userData?.auth_user_id) return;
    setLoading(true);
    try {
      // Verificamos si ya existe con una query OR simple (v1.3.5)
      const { data: convs, error: checkError } = await supabase
        .from('conversaciones')
        .select('*')
        .or(`comprador_id.eq.${userData.auth_user_id},vendedor_id.eq.${userData.auth_user_id}`);

      if (checkError) throw checkError;

      // Encontramos la exacta en JS
      const convExistente = (convs || []).find(c => 
        (c.comprador_id === userData.auth_user_id && c.vendedor_id === recipientId) ||
        (c.comprador_id === recipientId && c.vendedor_id === userData.auth_user_id)
      );

      if (convExistente) {
        fetchConversaciones();
        abrirConversacion(convExistente);
        return;
      }

      // 2. Si no existe, buscar el nombre del destinatario para validación (opcional pero ayuda)
      const { data: user, error: userError } = await supabase
        .from('Usuarios_Registrados')
        .select('razon_social, auth_user_id')
        .eq('auth_user_id', recipientId)
        .maybeSingle();
      
      if (userError) throw userError;

      // 3. Crear la conversación directamente
      const { data: newConvData, error: convError } = await supabase
        .from('conversaciones')
        .insert([{
          comprador_id: userData.auth_user_id,
          vendedor_id: recipientId,
          pedido_id: null
        }])
        .select();

      if (convError) throw convError;

      const newConv = newConvData[0];

      // Abrir el nuevo chat
      fetchConversaciones();
      abrirConversacion(newConv);
    } catch (error) {
      console.error('Error al iniciar chat directo:', error.message);
      Alert.alert('Error', 'No se pudo iniciar el chat con el proveedor. Es posible que ya exista una conversación activa o haya un problema de conexión.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Cargar mensajes de una conversación específica
  const fetchMensajes = async (isSilent = false) => {
    if (!conversacionActiva || !userData?.auth_user_id) return;
    if (!isSilent) setLoading(true);
    
    try {
      // Determinar si el usuario tiene una fecha de borrado para esta conv
      const esComprador = conversacionActiva.comprador_id === userData.auth_user_id;
      const fechaBorrado = esComprador ? conversacionActiva.fecha_borrado_comprador : conversacionActiva.fecha_borrado_vendedor;

      let query = supabase
        .from('mensajes')
        .select('*')
        .eq('conversacion_id', conversacionActiva.id);
      
      if (fechaBorrado) {
        query = query.gt('created_at', fechaBorrado);
      }

      const { data, error } = await query.order('created_at', { ascending: true });

      if (error) throw error;
      if (data) setMensajes(data);
    } catch (error) {
      console.error('Error fetching mensajes:', error.message);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  // 3. Gestionar mensajes y Realtime de la conversación activa
  useEffect(() => {
    if (!conversacionActiva || vistaActiva !== 'chat') return;

    fetchMensajes(); // Carga inicial NO silenciosa

    // B. Suscribirse a mensajes nuevos en TIEMPO REAL
    const canalMesa = supabase
      .channel(`chat_${conversacionActiva.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'mensajes',
        filter: `conversacion_id=eq.${conversacionActiva.id}`
      }, (payload) => {
        console.log("DEBUG: Mensaje recibido vía Realtime");
        setMensajes((current) => [...current, payload.new]);
      })
      .subscribe((status) => {
        console.log(`DEBUG: Estado canal chat_${conversacionActiva.id}:`, status);
      });

    // RESPALDO DE POLLING PARA MENSAJES (Web)
    let msgPollInterval = null;
    if (Platform.OS === 'web') {
      msgPollInterval = setInterval(() => {
        if (!loadingRef.current) {
          fetchMensajes(true); // Carga SILENCIOSA
        }
      }, 5000); // Polling más rápido (5s) cuando estamos dentro de un chat
    }

    return () => {
      supabase.removeChannel(canalMesa);
      if (msgPollInterval) clearInterval(msgPollInterval);
    };
  }, [conversacionActiva, vistaActiva]);

  const abrirConversacion = (conv) => {
    console.log("DEBUG: abriendoConversacion -> ID:", conv.id);
    setConversacionActiva(conv);
    setMensajes([]); 
    setVistaActiva('chat');
  };

  const enviarMensaje = async () => {
    if ((!nuevoMensaje.trim() && adjuntos.length === 0) || !conversacionActiva) return;
    
    if (nuevoMensaje.length > 300) {
      const msgError = 'El mensaje no puede superar los 300 caracteres.';
      Platform.OS === 'web' ? window.alert(msgError) : Alert.alert('Error', msgError);
      return;
    }

    setEnviando(true);
    const textoMensaje = nuevoMensaje.trim();
    const tempAdjuntos = [...adjuntos];

    try {
      // 1. Si no hay adjuntos, enviar solo texto
      if (tempAdjuntos.length === 0) {
        const { error } = await supabase
          .from('mensajes')
          .insert([{
            conversacion_id: conversacionActiva.id,
            remitente_id: userData.auth_user_id,
            contenido: textoMensaje
          }]);
        if (error) throw error;
      } else {
        // 2. Si hay adjuntos, procesar cada uno
        // Enviamos el texto en el primer mensaje de la tanda
        for (let i = 0; i < tempAdjuntos.length; i++) {
          const item = tempAdjuntos[i];
          
          // Obtener extensión de forma más segura usando el nombre o el tipo
          // Evitamos usar item.uri.split('.').pop() porque si la URI es un base64, rompe el nombre del archivo
          const extension = (item.name && item.name.includes('.') 
            ? item.name.split('.').pop().toLowerCase() 
            : (item.type === 'image' ? 'jpg' : 'pdf'));
          
          const fileName = `${userData.auth_user_id}-${Date.now()}-${i}.${extension}`;
          
          let fileData;
          if (Platform.OS === 'web') {
            const response = await fetch(item.uri);
            fileData = await response.blob();
          } else {
            // Si la URI ya es base64 (data:...), la usamos directamente
            if (item.uri && item.uri.startsWith('data:')) {
              const base64Data = item.uri.split(',')[1];
              fileData = decode(base64Data);
            } else {
              const base64 = await FileSystem.readAsStringAsync(item.uri, { encoding: FileSystem.EncodingType.Base64 });
              fileData = decode(base64);
            }
          }

          console.log(`DEBUG: Subiendo archivo ${i+1}/${tempAdjuntos.length}: ${fileName}`);
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('mensajes_adjuntos')
            .upload(fileName, fileData, { 
              contentType: item.mimeType || (item.type === 'image' ? `image/${extension}` : 'application/pdf'),
              upsert: true
            });

          if (uploadError) {
            console.error("DEEP ERROR DEBUG (Storage):", uploadError);
            throw uploadError;
          }

          const { data: urlData } = supabase.storage.from('mensajes_adjuntos').getPublicUrl(fileName);
          const publicUrl = urlData.publicUrl;

          // Insertar registro de mensaje para este archivo
          // El primer mensaje puede llevar el texto, los demás solo el archivo
          const { error: msgError } = await supabase
            .from('mensajes')
            .insert([{
              conversacion_id: conversacionActiva.id,
              remitente_id: userData.auth_user_id,
              contenido: i === 0 ? (textoMensaje || 'Archivo adjunto') : 'Archivo adjunto',
              adjunto_url: publicUrl
            }]);

          if (msgError) throw msgError;
        }
      }

      // Limpiar estados al tener éxito total
      setNuevoMensaje('');
      setAdjuntos([]);

      // 3. Re-activar la conversación para AMBOS (el remitente podría haberla borrado antes de enviar)
      console.log("DEBUG: Restaurando estado activo de la conversación ID:", conversacionActiva.id);
      await supabase.from('conversaciones').update({ 
        borrado_comprador: false, 
        borrado_vendedor: false,
        fecha_borrado_comprador: null,
        fecha_borrado_vendedor: null
      }).eq('id', conversacionActiva.id);

      // 4. Refrescar lista local para que el chat aparezca de nuevo si estaba filtrado
      fetchConversaciones(true);

    } catch (error) {
      console.error('Error enviando mensaje (Detallado):', error);
      const userMsg = error.message || 'Error desconocido al subir';
      Alert.alert('Error', `No se pudo enviar: ${userMsg}`);
    } finally {
      setEnviando(false);
    }
  };

  // --- Selección de Archivos (Múltiples) ---
  const seleccionarImagen = async () => {
    setMostrarOpcionesAdjunto(false);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsMultipleSelection: true, // Permitir varios si el dispositivo lo soporta
    });

    if (!result.canceled) {
      const nuevos = result.assets.map(asset => ({
        id: Date.now() + Math.random(),
        uri: asset.uri,
        name: asset.fileName || `imagen_${Date.now()}.jpg`,
        type: 'image',
        mimeType: 'image/jpeg'
      }));
      setAdjuntos([...adjuntos, ...nuevos]);
    }
  };

  const seleccionarDocumento = async () => {
    setMostrarOpcionesAdjunto(false);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
        multiple: true, // Permitir varios
      });

      if (!result.canceled) {
        const nuevos = result.assets.map(asset => ({
          id: Date.now() + Math.random(),
          uri: asset.uri,
          name: asset.name,
          type: 'pdf',
          mimeType: 'application/pdf'
        }));
        setAdjuntos([...adjuntos, ...nuevos]);
      }
    } catch (err) {
      console.error('Error seleccionando documento:', err);
    }
  };

  const quitarAdjunto = (id) => {
    setAdjuntos(adjuntos.filter(a => a.id !== id));
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
        .neq('auth_user_id', userData?.auth_user_id) // No buscarse a sí mismo
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
    if (!destinatarioSeleccionado) {
      Alert.alert('Campos incompletos', 'Selecciona un destinatario.');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('conversaciones')
        .insert([{
          comprador_id: userData.auth_user_id,
          vendedor_id: destinatarioSeleccionado.auth_user_id,
          pedido_id: null
        }])
        .select()
        .single();

      if (error) throw error;

      setModalNuevaConvVisible(false);
      setBusqueda('');
      setDestinatarioSeleccionado(null);
      
      fetchConversaciones();
      abrirConversacion(data);
    } catch (error) {
      console.error('Error creando chat:', error.message);
      Alert.alert('Error', 'No se pudo iniciar la conversación.');
    }
  };

  const eliminarConversacion = (conv) => {
    const msg = "¿Estás seguro de que quieres eliminar esta conversación? Esto solo la borrará para ti.";
    if (Platform.OS === 'web') {
      const confirmada = window.confirm(msg);
      if (confirmada) ejecutarEliminacion(conv);
    } else {
      Alert.alert(
        "Eliminar conversación",
        msg,
        [
          { text: "Cancelar", style: "cancel" },
          { 
            text: "Eliminar", 
            style: "destructive",
            onPress: () => ejecutarEliminacion(conv)
          }
        ]
      );
    }
  };

  const ejecutarEliminacion = async (conv) => {
    try {
      setLoading(true);
      const esComprador = conv.comprador_id === userData.auth_user_id;
      const columnaBorrado = esComprador ? 'borrado_comprador' : 'borrado_vendedor';
      const columnaFecha = esComprador ? 'fecha_borrado_comprador' : 'fecha_borrado_vendedor';

      const { error } = await supabase
        .from('conversaciones')
        .update({ 
          [columnaBorrado]: true,
          [columnaFecha]: new Date().toISOString() 
        })
        .eq('id', conv.id);

      if (error) throw error;

      fetchConversaciones(); // Recargar lista
      if (conversacionActiva?.id === conv.id) {
        setVistaActiva('lista');
        setConversacionActiva(null);
      }
    } catch (error) {
      console.error('Error eliminando conversación:', error.message);
      Alert.alert('Error', 'No se pudo eliminar la conversación.');
    } finally {
      setLoading(false);
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

          <TouchableOpacity onPress={() => onNavigate && onNavigate('perfil')}>
            <Ionicons name="person-circle-outline" size={30} color="#cbd5e1" style={{ marginHorizontal: 8 }} />
          </TouchableOpacity>

          <TouchableOpacity>
            <Ionicons name="chatbubble" size={24} color="#0ea5e9" style={{ marginHorizontal: 8 }} />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => onNavigate && onNavigate('pedidos_vendedor')}>
            <Ionicons name="receipt-outline" size={24} color="#64748b" style={{ marginHorizontal: 8 }} />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => onNavigate && onNavigate('login')}>
            <Ionicons name="log-out-outline" size={26} color="#f8fafc" style={{ marginLeft: 8 }} />
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.mainTitle}>Mensajes</Text>

      {/* CONTENEDOR PRINCIPAL BASADO EN LA IMAGEN */}
      <View style={styles.cardContainer}>
        {(loading && conversaciones.length === 0) ? (
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
                  <View key={conv.id} style={styles.convItem}>
                    <TouchableOpacity 
                      style={styles.convBodyInner} 
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
                        <Text style={styles.convOrder}>{conv.pedido_id ? `Pedido: ${conv.pedido_id}` : 'Chat Directo'}</Text>
                        <Text style={styles.convPreview} numberOfLines={1}>Toca para ver los mensajes</Text>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={styles.convDots}
                      onPress={() => eliminarConversacion(conv)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="ellipsis-vertical" size={20} color="#64748b" />
                    </TouchableOpacity>
                  </View>
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

                  <TouchableOpacity style={styles.btnCrearConv} onPress={crearNuevaConversacion}>
                    <Text style={styles.btnCrearConvText}>Abrir Chat</Text>
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
                <Text style={styles.chatHeaderSubtitle}>{conversacionActiva?.pedido_id ? `Pedido: ${conversacionActiva.pedido_id}` : 'Conversación Privada'}</Text>
              </View>
            </View>
            <View style={styles.divider} />

            <ScrollView style={styles.messagesArea} contentContainerStyle={{ paddingBottom: 20 }}>
              <Text style={styles.securityNotice}>Solo las partes involucradas en este pedido tienen acceso a esta conversación.</Text>
               {mensajes.map((msg) => {
                 const esImagen = msg.adjunto_url && (msg.adjunto_url.toLowerCase().endsWith('.jpg') || msg.adjunto_url.toLowerCase().endsWith('.jpeg') || msg.adjunto_url.toLowerCase().endsWith('.png') || msg.adjunto_url.toLowerCase().endsWith('.webp'));
                 const esPdf = msg.adjunto_url && msg.adjunto_url.toLowerCase().endsWith('.pdf');

                 return (
                   <View 
                     key={msg.id} 
                     style={[
                       styles.messageBubble, 
                       msg.remitente_id === userData?.auth_user_id ? styles.messageMine : styles.messageTheirs
                     ]}
                   >
                     {esImagen && (
                       <TouchableOpacity onPress={() => Platform.OS === 'web' ? window.open(msg.adjunto_url) : Alert.alert('Ver imagen', 'Función de vista previa en desarrollo.')}>
                         <Image source={{ uri: msg.adjunto_url }} style={styles.messageImage} resizeMode="cover" />
                       </TouchableOpacity>
                     )}

                     {esPdf && (
                       <TouchableOpacity 
                        style={styles.pdfBadge} 
                        onPress={() => Platform.OS === 'web' ? window.open(msg.adjunto_url) : Alert.alert('PDF', 'Abriendo documento...')}
                       >
                         <Ionicons name="document-text" size={24} color="#ef4444" />
                         <Text style={styles.pdfText}>Ver Documento PDF</Text>
                       </TouchableOpacity>
                     )}

                     <Text style={styles.messageText}>{msg.contenido}</Text>
                     <Text style={styles.messageTime}>
                       {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                     </Text>
                   </View>
                 );
               })}
            </ScrollView>

            {/* INPUT DE MENSAJE */}
             {/* PREVISUALIZACIÓN DE ADJUNTOS (Múltiples) */}
             {adjuntos.length > 0 && (
               <ScrollView 
                horizontal 
                style={styles.previewContainer} 
                contentContainerStyle={styles.previewContentContainer}
               >
                 {adjuntos.map((item) => (
                   <View key={item.id} style={styles.previewBox}>
                      {item.type === 'image' ? (
                        <Ionicons name="image" size={16} color="#0ea5e9" />
                      ) : (
                        <Ionicons name="document-text" size={16} color="#ef4444" />
                      )}
                      <Text style={styles.previewName} numberOfLines={1}>{item.name}</Text>
                      <TouchableOpacity onPress={() => quitarAdjunto(item.id)}>
                        <Ionicons name="close-circle" size={18} color="#ef4444" />
                      </TouchableOpacity>
                   </View>
                 ))}
                 {enviando && <ActivityIndicator size="small" color="#0ea5e9" style={{ marginLeft: 10 }} />}
               </ScrollView>
             )}

             {/* INPUT DE MENSAJE */}
             <View style={styles.inputContainer}>
               <TouchableOpacity 
                style={styles.attachBtn} 
                onPress={() => setMostrarOpcionesAdjunto(!mostrarOpcionesAdjunto)}
               >
                 <Ionicons name="attach" size={24} color={adjuntos.length > 0 ? "#0ea5e9" : "#64748b"} />
               </TouchableOpacity>

               {mostrarOpcionesAdjunto && (
                 <View style={styles.attachMenu}>
                   <TouchableOpacity style={styles.attachOption} onPress={seleccionarImagen}>
                     <Ionicons name="image" size={20} color="#0ea5e9" />
                     <Text style={styles.attachOptionText}>Imagen</Text>
                   </TouchableOpacity>
                   <TouchableOpacity style={styles.attachOption} onPress={seleccionarDocumento}>
                     <Ionicons name="document-text" size={20} color="#ef4444" />
                     <Text style={styles.attachOptionText}>PDF</Text>
                   </TouchableOpacity>
                 </View>
               )}

               <TextInput
                 style={styles.textInput}
                 placeholder="Escribe un mensaje..."
                 placeholderTextColor="#64748b"
                 value={nuevoMensaje}
                 onChangeText={setNuevoMensaje}
                 maxLength={300}
                 multiline
                 editable={!enviando}
               />
               <TouchableOpacity 
                 style={[styles.sendBtn, ((String(nuevoMensaje || "").trim()) || adjuntos.length > 0) ? styles.sendBtnActive : null]} 
                 onPress={enviarMensaje}
                 disabled={(!(String(nuevoMensaje || "").trim()) && adjuntos.length === 0) || enviando}
               >
                 {enviando ? (
                   <ActivityIndicator size="small" color="#ffffff" />
                 ) : (
                   <Ionicons name="send" size={20} color={((String(nuevoMensaje || "").trim()) || adjuntos.length > 0) ? "#ffffff" : "#64748b"} />
                 )}
               </TouchableOpacity>
             </View>
             <Text style={styles.charCount}>{String(nuevoMensaje || "").length}/300 caracteres</Text>
             <Text style={styles.versionTag}>v1.3.9 - InterGea (Crash Logic Guard)</Text>
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
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  convBodyInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  convDots: {
    padding: 10,
    marginLeft: 5,
    zIndex: 10,
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
  // -- Nuevos Estilos Adjuntos --
  previewContainer: {
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    maxHeight: 60,
  },
  previewContentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  previewBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginRight: 10,
    maxWidth: 200,
  },
  previewName: {
    color: '#ffffff',
    fontSize: 12,
    marginHorizontal: 8,
    flexShrink: 1,
  },
  attachMenu: {
    position: 'absolute',
    bottom: 60,
    left: 15,
    backgroundColor: '#1e293b',
    borderRadius: 15,
    padding: 10,
    borderWidth: 1,
    borderColor: '#334155',
    zIndex: 100,
  },
  attachOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  attachOptionText: {
    color: '#ffffff',
    fontSize: 14,
    marginLeft: 10,
  },
  messageImage: {
    width: 200,
    height: 150,
    borderRadius: 10,
    marginBottom: 8,
  },
  pdfBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 10,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  pdfText: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 10,
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
  versionTag: {
    color: '#334155',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 5
  }
});

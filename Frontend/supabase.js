import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Platform } from 'react-native'

// Condicional para Polyfills: Solo en móviles nativos.
if (Platform.OS !== 'web') {
  require('react-native-url-polyfill/auto');
}

// URL de tu proyecto de Supabase
const supabaseUrl = 'https://nklkgtkqglzxklhlddsc.supabase.co'
// Clave anon key (Pública) de tu proyecto de Supabase
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rbGtndGtxZ2x6eGtsaGxkZHNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzMTU2NjcsImV4cCI6MjA4ODg5MTY2N30.vopIeuGp-xkGotWXbIQ3IGLzOvqprNHtisv07cwK2vw'

/**
 * CLIENTE SUPABASE (v1.3.3)
 * DIAGNÓSTICO WEB: Desactivamos temporalmente la persistencia automática en web
 * para descartar bloqueos por cookies o tokens corruptos en el navegador.
 */
const isWeb = Platform.OS === 'web';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: isWeb ? undefined : AsyncStorage, 
    autoRefreshToken: !isWeb, 
    persistSession: !isWeb,    
    detectSessionInUrl: !isWeb,
  },
})

if (isWeb) {
  console.log("Supabase Client inicializado en WEB (v1.3.3). Modo simplificado.");
}

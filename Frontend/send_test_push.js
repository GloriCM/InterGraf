const token = 'ExponentPushToken[jaKKzQGd71Y7JAqur8iWIQ]';

async function testPush() {
  console.log("Enviando push directo de prueba a Expo para el token:", token);
  try {
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: token,
        sound: 'default',
        title: '🔔 Notificación de Prueba Directa',
        body: '¡Esta es una prueba directa desde la consola!',
        data: { test: true },
      }),
    });
    
    const json = await res.json();
    console.log("RESPUESTA COMPLETA DE EXPO PUSH SERVICE:");
    console.log(JSON.stringify(json, null, 2));
  } catch (err) {
    console.error("Error al enviar push:", err);
  }
}
testPush();

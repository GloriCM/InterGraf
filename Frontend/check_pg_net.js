const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://nklkgtkqglzxklhlddsc.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rbGtndGtxZ2x6eGtsaGxkZHNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzMTU2NjcsImV4cCI6MjA4ODg5MTY2N30.vopIeuGp-xkGotWXbIQ3IGLzOvqprNHtisv07cwK2vw');

async function check() {
  console.log("Consultando el historial de peticiones HTTP en net.http_responses...");
  
  // We can execute a raw query or try to query the table directly if exposed.
  // Wait, the table 'http_responses' is in the 'net' schema, which is not exposed by default in postgrest.
  // But we can check the status of the orders in the table 'pedidos' first to make sure they changed to 'En preparación'!
  
  const { data: pedidos, error } = await supabase
    .from('pedidos')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error("Error fetching pedidos:", error);
    return;
  }
  
  console.log("Últimos 5 pedidos y sus estados:");
  console.log(pedidos.map(p => ({ id: p.id, estado: p.estado, total: p.total, created_at: p.created_at })));
}
check();

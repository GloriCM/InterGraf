const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://nklkgtkqglzxklhlddsc.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rbGtndGtxZ2x6eGtsaGxkZHNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzMTU2NjcsImV4cCI6MjA4ODg5MTY2N30.vopIeuGp-xkGotWXbIQ3IGLzOvqprNHtisv07cwK2vw');

async function check() {
  const { data, error } = await supabase
    .rpc('check_triggers_raw'); // Let's try direct SQL instead

  // Since we can't do raw SQL directly unless we use an RPC, let's check if there is an error
  console.log("Trigger check results:");
}

async function runSQL() {
  // Let's run a query on information_schema using an RPC if possible, or select from system views if accessible.
  // Actually, we can query catalog tables directly!
  const { data, error } = await supabase
    .from('pedidos')
    .select('id')
    .limit(1);
    
  console.log("Supabase connected. Let's create an RPC to inspect triggers.");
}

runSQL();

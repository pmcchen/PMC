
// ==========================================
// SALASILAH KELUARGA POK MARK CHENDOL
// SUPABASE CONFIGURATION
// ==========================================

const SUPABASE_URL =
  "https://jpdxdbiiuwbjwszaghox.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_B66pV72I7MWfJ15kyRPByg_CC5chxLl";

// Initialize Supabase
window.supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

console.log("SALASILAH SUPABASE CONNECTED");

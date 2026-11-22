
const SUPABASE_URL = "https://jpdxdbiiuwbjwszaghox.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_B66pV72I7MWfJ15kyRPByg_CC5chxLl";

if (!window.supabase) {
  console.error("Supabase SDK belum dimuatkan.");
} else {
  window.supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
  );

  console.log("SALASILAH POK MARK CHENDOL: Supabase connected.");
}

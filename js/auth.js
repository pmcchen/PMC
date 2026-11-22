
const db = window.supabaseClient;

// DAFTAR AKAUN AHLI KELUARGA
window.daftarAkaun = async function (nama, email, password) {
  const { data, error } = await db.auth.signUp({
    email,
    password,
    options: {
      data: {
        nama_pengguna: nama
      }
    }
  });

  if (error) throw error;

  return data;
};

// LOG MASUK
window.logMasuk = async function (email, password) {
  const { data, error } = await db.auth.signInWithPassword({
    email,
    password
  });

  if (error) throw error;

  const { data: profil, error: profilError } = await db
    .from("pengguna_keluarga")
    .select("nama_pengguna, peranan, status_akaun")
    .eq("user_id", data.user.id)
    .single();

  if (profilError || !profil) {
    await db.auth.signOut();
    throw new Error("Profil ahli tidak dapat disahkan.");
  }

  if (profil.status_akaun === "MENUNGGU") {
    await db.auth.signOut();
    throw new Error("Akaun anda masih menunggu kelulusan pentadbir.");
  }

  if (profil.status_akaun === "DITOLAK") {
    await db.auth.signOut();
    throw new Error("Pendaftaran akaun anda tidak diluluskan.");
  }

  if (profil.status_akaun !== "DILULUSKAN") {
    await db.auth.signOut();
    throw new Error("Status akaun tidak sah.");
  }

window.location.href = "dashboard.html";

  return profil;
};

// LOG KELUAR
window.logKeluar = async function () {
  const { error } = await db.auth.signOut();

  if (error) throw error;

  window.location.href = "login.html";
};

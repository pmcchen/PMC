
(function () {
  "use strict";

  function dapatkanDB() {
    if (!window.supabaseClient) {
      throw new Error("Sambungan Supabase belum tersedia.");
    }

    return window.supabaseClient;
  }

  // PENDAFTARAN AKAUN
  window.daftarAkaun = async function (nama, email, password) {
    const db = dapatkanDB();

    const { data, error } = await db.auth.signUp({
      email: email,
      password: password,
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
    const db = dapatkanDB();

    const { data, error } = await db.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (error) throw error;

    const { data: profil, error: profilError } = await db
      .from("pengguna_keluarga")
      .select("nama_pengguna, peranan, status_akaun")
      .eq("user_id", data.user.id)
      .single();

    if (profilError || !profil) {
      await db.auth.signOut();
      throw new Error(
        "Profil pengguna tidak dijumpai. Sila hubungi pentadbir."
      );
    }

    if (profil.status_akaun !== "DILULUSKAN") {
      await db.auth.signOut();

      if (profil.status_akaun === "MENUNGGU") {
        throw new Error(
          "Akaun anda masih menunggu kelulusan pentadbir."
        );
      }

      throw new Error(
        "Akaun anda belum diluluskan untuk mengakses sistem."
      );
    }

    window.location.href = "dashboard.html";

    return profil;
  };

  // LOG KELUAR
  window.logKeluar = async function () {
    const db = dapatkanDB();

    const { error } = await db.auth.signOut();

    if (error) throw error;

    window.location.href = "login.html";
  };

  console.log("Auth.js berjaya dimuatkan.");
})();

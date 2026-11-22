
window.sahkanAkses = async function (perananDiperlukan = null) {
  const db = window.supabaseClient;

  const { data: sessionData, error: sessionError } =
    await db.auth.getSession();

  if (sessionError || !sessionData.session) {
    window.location.replace("login.html");
    return null;
  }

  const user = sessionData.session.user;

  const { data: profil, error: profilError } = await db
    .from("pengguna_keluarga")
    .select("nama_pengguna, peranan, status_akaun")
    .eq("user_id", user.id)
    .single();

  if (
    profilError ||
    !profil ||
    profil.status_akaun !== "DILULUSKAN"
  ) {
    await db.auth.signOut();
    window.location.replace("login.html");
    return null;
  }

  if (perananDiperlukan && profil.peranan !== perananDiperlukan) {
    window.location.replace("dashboard.html");
    return null;
  }

  window.currentFamilyUser = {
    id: user.id,
    email: user.email,
    nama: profil.nama_pengguna,
    peranan: profil.peranan,
    status: profil.status_akaun
  };

  return window.currentFamilyUser;
};

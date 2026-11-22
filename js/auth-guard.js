const { data: profil, error: profilError } = await db
  .from("pengguna_keluarga")
  .select("nama_pengguna, peranan, status_akaun")
  .eq("user_id", user.id)
  .single();

if (profilError) {
  console.error("RALAT PROFIL:", profilError);
}

if (
  profilError ||
  !profil ||
  profil.status_akaun !== "DILULUSKAN"
) {
  await db.auth.signOut();
  window.location.replace("login.html");
  return null;
}


(async function () {
  const db = window.supabaseClient;
  const mesej = document.getElementById("mesej");

  function selamat(teks) {
    return String(teks ?? "").replace(/[&<>"']/g, function (c) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      }[c];
    });
  }

  const pengguna = await window.sahkanAkses();

  if (!pengguna) return;

  document.getElementById("namaPengguna").textContent =
    pengguna.nama || pengguna.email;

  document.getElementById("perananPengguna").textContent =
    "Peranan: " + pengguna.peranan;

  document.getElementById("btnKeluar").addEventListener(
    "click",
    async function () {
      try {
        await window.logKeluar();
      } catch (error) {
        mesej.textContent = error.message;
      }
    }
  );

  const { data: ahli, error } = await db
    .from("ahli_keluarga")
    .select("id, nama_penuh, generasi, status_hidup")
    .order("nama_penuh", { ascending: true });

  if (error) {
    mesej.textContent =
      "Tidak dapat memuatkan data keluarga: " + error.message;
    document.getElementById("senaraiAhli").textContent =
      "Data tidak dapat dipaparkan.";
    return;
  }

  const rekod = ahli || [];
  const generasi = new Set(
    rekod.map(a => a.generasi).filter(g => g !== null)
  );

  document.getElementById("jumlahAhli").textContent = rekod.length;
  document.getElementById("jumlahGenerasi").textContent =
    generasi.size;
  document.getElementById("jumlahDipaparkan").textContent =
    Math.min(rekod.length, 8);

  const senarai = document.getElementById("senaraiAhli");

  if (rekod.length === 0) {
    senarai.textContent = "Belum ada rekod ahli keluarga.";
    return;
  }

  senarai.innerHTML = rekod.slice(0, 8).map(a => `
    <div class="member">
      <div>
        <strong>${selamat(a.nama_penuh)}</strong><br>
        <small>Generasi ${selamat(a.generasi ?? "Belum ditetapkan")}</small>
      </div>
      <span class="tag">${selamat(a.status_hidup || "Tidak diketahui")}</span>
    </div>
  `).join("");
})();

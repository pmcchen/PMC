
(function () {
  "use strict";

  async function mulaDashboard() {
    const db = window.supabaseClient;
    const mesej = document.getElementById("mesej");
    const senarai = document.getElementById("senaraiAhli");

    function paparkan(id, nilai) {
      const elemen = document.getElementById(id);
      if (elemen) elemen.textContent = nilai;
    }

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

    try {
      if (!db) {
        throw new Error("Supabase Client tidak dijumpai.");
      }

      if (typeof window.sahkanAkses !== "function") {
        throw new Error("Fungsi auth-guard.js tidak dimuatkan.");
      }

      const pengguna = await window.sahkanAkses();

      if (!pengguna) return;

      paparkan(
        "namaPengguna",
        pengguna.nama || pengguna.email || "Ahli Keluarga"
      );

      paparkan("perananPengguna", "Peranan: " + pengguna.peranan);

      const butangKeluar = document.getElementById("btnKeluar");

      if (butangKeluar) {
        butangKeluar.addEventListener("click", async function () {
          try {
            await window.logKeluar();
          } catch (error) {
            mesej.textContent = error.message;
          }
        });
      }

      mesej.textContent = "Sedang mendapatkan rekod keluarga...";
      senarai.textContent = "Memuatkan data...";

      const { data: ahli, error } = await db
        .from("ahli_keluarga")
        .select("id, nama_penuh, generasi, status_hidup")
        .order("nama_penuh", { ascending: true });

      if (error) {
        console.error("RALAT SUPABASE:", error);
        throw new Error(
          "Gagal membaca data ahli keluarga: " + error.message
        );
      }

      const rekod = ahli || [];

      const generasi = new Set(
        rekod
          .map(a => a.generasi)
          .filter(g => g !== null && g !== undefined)
      );

      paparkan("jumlahAhli", rekod.length);
      paparkan("jumlahGenerasi", generasi.size);
      paparkan("jumlahDipaparkan", Math.min(rekod.length, 8));

      if (rekod.length === 0) {
        senarai.textContent = "Tiada rekod ahli keluarga dijumpai.";
        mesej.textContent = "Pertanyaan berjaya tetapi tiada rekod diterima.";
        return;
      }

      senarai.innerHTML = rekod.slice(0, 8).map(a => `
        <div class="member">
          <div>
            <strong>${selamat(a.nama_penuh)}</strong><br>
            <small>Generasi ${selamat(
              a.generasi ?? "Belum ditetapkan"
            )}</small>
          </div>
          <span class="tag">${selamat(
            a.status_hidup || "Tidak diketahui"
          )}</span>
        </div>
      `).join("");

      mesej.textContent =
        "Data keluarga berjaya dimuatkan.";

      console.log("DASHBOARD BERJAYA:", {
        jumlahAhli: rekod.length,
        jumlahGenerasi: generasi.size,
        rekod: rekod
      });

    } catch (error) {
      console.error("RALAT DASHBOARD:", error);

      paparkan("jumlahAhli", "!");
      paparkan("jumlahGenerasi", "!");
      paparkan("jumlahDipaparkan", "!");

      if (senarai) {
        senarai.textContent = "Data tidak dapat dipaparkan.";
      }

      if (mesej) {
        mesej.textContent = error.message;
      }
    }
  }

  mulaDashboard();
})();

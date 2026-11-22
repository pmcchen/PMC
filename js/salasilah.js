
(function () {
  "use strict";

  const db = window.supabaseClient;

  const paparan = document.getElementById("paparanSalasilah");
  const mesej = document.getElementById("mesej");
  const carian = document.getElementById("carianAhli");
  const modal = document.getElementById("modalAhli");
  const maklumat = document.getElementById("maklumatAhli");

  let ahliSemua = [];
  let hubunganAnak = [];
  let hubunganPasangan = [];

  function elemen(tag, kelas, teks) {
    const e = document.createElement(tag);
    if (kelas) e.className = kelas;
    if (teks !== undefined) e.textContent = teks;
    return e;
  }

  function kadAhli(ahli) {
    const kad = elemen("div", "person");
    const avatar = elemen("div", "avatar",
      ahli.jantina === "LELAKI" ? "♂" : "♀");

    const nama = elemen("strong", "", ahli.nama_penuh);
    const generasi = elemen("small", "",
      "Generasi " + (ahli.generasi || "Belum ditetapkan"));

    kad.append(avatar, nama, generasi);

    if (ahli.status_hidup === "MENINGGAL") {
      kad.append(elemen("small", "", "Allahyarham / Allahyarhamah"));
    }

    kad.addEventListener("click", () => bukaProfil(ahli));

    return kad;
  }

  function bukaProfil(ahli) {
    maklumat.replaceChildren();

    maklumat.append(
      elemen("h3", "", ahli.nama_penuh),
      elemen("p", "", "Jantina: " + (ahli.jantina || "Belum direkodkan")),
      elemen("p", "", "Generasi: " + (ahli.generasi || "Belum ditetapkan")),
      elemen("p", "", "Status: " + (ahli.status_hidup || "Tidak diketahui")),
      elemen("p", "", "Tempat asal: " + (ahli.tempat_asal || "Belum direkodkan"))
    );

    modal.style.display = "flex";
  }

  document.getElementById("tutupModal").addEventListener("click", () => {
    modal.style.display = "none";
  });

  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.style.display = "none";
  });

  function pasanganBagi(id) {
    const rekod = hubunganPasangan.find(r =>
      r.pasangan_1 === id || r.pasangan_2 === id
    );

    if (!rekod) return null;

    return rekod.pasangan_1 === id
      ? rekod.pasangan_2
      : rekod.pasangan_1;
  }

  function susunAnak(a, b) {
    return (a.susunan_kelahiran ?? 9999) -
      (b.susunan_kelahiran ?? 9999);
  }

  function binaKadPasangan(ids) {
    const bekas = elemen("div", "parents");

    const unik = [...new Set(ids)];
    unik.forEach((id, index) => {
      const ahli = ahliSemua.find(a => a.id === id);
      if (!ahli) return;

      if (index > 0) {
        bekas.append(elemen("span", "spouse-label", "♥"));
      }

      bekas.append(kadAhli(ahli));
    });

    return bekas;
  }

  function binaSalasilah() {
    paparan.replaceChildren();

    const hubunganParent = new Set(
      hubunganAnak.map(r => r.id_anak)
    );

    const generasi = [...new Set(
      ahliSemua.map(a => a.generasi).filter(Boolean)
    )].sort((a, b) => a - b);

    // Paparan generasi pertama / ahli tanpa rekod ibu bapa
    const akar = ahliSemua.filter(a => !hubunganParent.has(a.id));
    const akarDiproses = new Set();

    if (akar.length) {
      const seksyen = elemen("section", "generation");
      seksyen.append(
        elemen("h2", "generation-title", "Generasi " + (generasi[0] || 1))
      );

      akar.forEach(a => {
        if (akarDiproses.has(a.id)) return;

        const kumpulan = elemen("div", "family-group");
        const idPasangan = pasanganBagi(a.id);
        const ids = [a.id];

        if (idPasangan && !akarDiproses.has(idPasangan)) {
          ids.push(idPasangan);
          akarDiproses.add(idPasangan);
        }

        akarDiproses.add(a.id);
        kumpulan.append(binaKadPasangan(ids));
        seksyen.append(kumpulan);
      });

      paparan.append(seksyen);
    }

    // Kumpulkan anak mengikut pasangan ibu bapa
    const kumpulanKeluarga = new Map();

    hubunganAnak.forEach(h => {
      const ibuBapa = pasanganBagi(h.id_ibubapa);
      const ids = [h.id_ibubapa];

      if (ibuBapa) ids.push(ibuBapa);

      const kunci = [...new Set(ids)].sort().join("|");

      if (!kumpulanKeluarga.has(kunci)) {
        kumpulanKeluarga.set(kunci, {
          ibuBapa: ids,
          anak: []
        });
      }

      kumpulanKeluarga.get(kunci).anak.push(h);
    });

    const senaraiKumpulan = [...kumpulanKeluarga.values()];

    senaraiKumpulan.sort((a, b) => {
      const ahliA = ahliSemua.find(x => x.id === a.ibuBapa[0]);
      const ahliB = ahliSemua.find(x => x.id === b.ibuBapa[0]);
      return (ahliA?.generasi || 0) - (ahliB?.generasi || 0);
    });

    const seksyenMengikutGenerasi = new Map();

    senaraiKumpulan.forEach(kumpulan => {
      kumpulan.anak.sort(susunAnak);

      const anakPertama = ahliSemua.find(
        a => a.id === kumpulan.anak[0]?.id_anak
      );

      const nomborGenerasi = anakPertama?.generasi || 2;

      if (!seksyenMengikutGenerasi.has(nomborGenerasi)) {
        const seksyen = elemen("section", "generation");
        seksyen.append(
          elemen("h2", "generation-title",
            "Generasi " + nomborGenerasi)
        );
        seksyenMengikutGenerasi.set(nomborGenerasi, seksyen);
      }

      const seksyen = seksyenMengikutGenerasi.get(nomborGenerasi);
      const keluarga = elemen("div", "family-group");

      keluarga.append(binaKadPasangan(kumpulan.ibuBapa));
      keluarga.append(elemen("div", "connector"));

      const bekasAnak = elemen("div", "children");

      kumpulan.anak.forEach(h => {
        const anak = ahliSemua.find(a => a.id === h.id_anak);
        if (anak) bekasAnak.append(kadAhli(anak));
      });

      keluarga.append(bekasAnak);
      seksyen.append(keluarga);
    });

    seksyenMengikutGenerasi.forEach(seksyen => {
      paparan.append(seksyen);
    });

    if (!ahliSemua.length) {
      mesej.textContent = "Tiada rekod ahli keluarga ditemui.";
    } else {
      mesej.textContent =
        "Jumlah ahli: " + ahliSemua.length +
        " · Hubungan ibu bapa dan anak: " + hubunganAnak.length;
    }
  }

  async function muatSalasilah() {
    try {
      if (!db) throw new Error("Supabase Client tidak tersedia.");

      const akses = await window.sahkanAkses();
      if (!akses) return;

      const [ahli, anak, pasangan] = await Promise.all([
        db.from("ahli_keluarga")
          .select("id,nama_penuh,jantina,generasi,status_hidup,tempat_asal")
          .order("generasi", { ascending: true })
          .order("nama_penuh", { ascending: true }),

        db.from("hubungan_ibubapa_anak")
          .select("id_ibubapa,id_anak,susunan_kelahiran"),

        db.from("hubungan_pasangan")
          .select("pasangan_1,pasangan_2")
      ]);

      if (ahli.error) throw ahli.error;
      if (anak.error) throw anak.error;
      if (pasangan.error) throw pasangan.error;

      ahliSemua = ahli.data || [];
      hubunganAnak = anak.data || [];
      hubunganPasangan = pasangan.data || [];

      binaSalasilah();

    } catch (error) {
      console.error("RALAT SALASILAH:", error);
      mesej.textContent = "Gagal memuatkan salasilah: " + error.message;
    }
  }

  carian.addEventListener("input", () => {
    const kata = carian.value.trim().toLowerCase();

    document.querySelectorAll(".person").forEach(kad => {
      const nama = kad.querySelector("strong")?.textContent || "";
      kad.style.display = nama.toLowerCase().includes(kata)
        ? ""
        : "none";
    });
  });

  muatSalasilah();
})();

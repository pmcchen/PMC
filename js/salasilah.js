
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

  function cariAhli(id) {
    return ahliSemua.find(a => a.id === id);
  }

  function kadAhli(ahli) {
    const kad = elemen("div", "person");
    kad.dataset.nama = ahli.nama_penuh.toLowerCase();

    const avatar = elemen(
      "div",
      "avatar",
      ahli.jantina === "LELAKI" ? "♂" : "♀"
    );

    kad.append(
      avatar,
      elemen("strong", "", ahli.nama_penuh),
      elemen("small", "", "Generasi " + (ahli.generasi || "-"))
    );

    if (ahli.status_hidup === "MENINGGAL") {
      kad.append(elemen("small", "", "Telah meninggal dunia"));
    }

    kad.addEventListener("click", () => bukaProfil(ahli));

    return kad;
  }

  function bukaProfil(ahli) {
    maklumat.replaceChildren();

    maklumat.append(
      elemen("h3", "", ahli.nama_penuh),
      elemen("p", "", "Jantina: " + (ahli.jantina || "-")),
      elemen("p", "", "Generasi: " + (ahli.generasi || "-")),
      elemen("p", "", "Status: " + (ahli.status_hidup || "-")),
      elemen("p", "", "Tempat asal: " + (ahli.tempat_asal || "-"))
    );

    modal.style.display = "flex";
  }

  document.getElementById("tutupModal").addEventListener("click", () => {
    modal.style.display = "none";
  });

  modal.addEventListener("click", e => {
    if (e.target === modal) modal.style.display = "none";
  });

  // Cari pasangan seseorang
  function pasanganBagi(id) {
    const rekod = hubunganPasangan.find(r =>
      r.pasangan_1 === id || r.pasangan_2 === id
    );

    if (!rekod) return null;

    return rekod.pasangan_1 === id
      ? rekod.pasangan_2
      : rekod.pasangan_1;
  }

  // Kumpulkan ibu bapa bagi setiap anak.
  // Dua rekod ibu dan bapa tidak akan menggandakan anak.
  function kumpulKeluarga() {
    const keluarga = new Map();

    hubunganAnak.forEach(h => {
      if (!keluarga.has(h.id_anak)) {
        keluarga.set(h.id_anak, {
          idAnak: h.id_anak,
          ibuBapa: [],
          susunan: h.susunan_kelahiran
        });
      }

      const rekod = keluarga.get(h.id_anak);

      if (!rekod.ibuBapa.includes(h.id_ibubapa)) {
        rekod.ibuBapa.push(h.id_ibubapa);
      }

      if (
        rekod.susunan == null &&
        h.susunan_kelahiran != null
      ) {
        rekod.susunan = h.susunan_kelahiran;
      }
    });

    return [...keluarga.values()];
  }

  // Bentuk pasangan ibu bapa yang sama untuk setiap anak.
  function kunciIbuBapa(ids) {
    const semua = [...ids];

    // Jika hanya satu hubungan ibu/bapa direkodkan,
    // cuba dapatkan pasangannya daripada jadual pasangan.
    if (semua.length === 1) {
      const pasangan = pasanganBagi(semua[0]);

      if (pasangan) semua.push(pasangan);
    }

    return [...new Set(semua)].sort();
  }

  // Paparkan generasi pertama: ahli yang tiada rekod ibu bapa.

function paparGenerasiPertama(ahliAkar, seksyen) {
  const sudahPapar = new Set();

  ahliAkar.forEach(ahli => {
    if (sudahPapar.has(ahli.id)) return;

    const kumpulan = elemen("div", "family-group");
    const barisPasangan = elemen("div", "parents-row");

    const pasangan = pasanganBagi(ahli.id);

    barisPasangan.append(kadAhli(ahli));
    sudahPapar.add(ahli.id);

    if (pasangan && !sudahPapar.has(pasangan)) {
      const dataPasangan = cariAhli(pasangan);

      if (dataPasangan) {
        barisPasangan.append(
          elemen("span", "spouse-label", "♥")
        );

        barisPasangan.append(kadAhli(dataPasangan));
        sudahPapar.add(pasangan);
      }
    }

    kumpulan.append(barisPasangan);
    seksyen.append(kumpulan);
  });
}

  // Paparkan generasi anak. Set ID memastikan setiap anak sekali sahaja.
  function paparGenerasiAnak(nomborGenerasi, ahliGenerasi, semuaKeluarga, seksyen) {
    const idGenerasi = new Set(ahliGenerasi.map(a => a.id));
    const kumpulanPaparan = new Map();

    semuaKeluarga.forEach(k => {
      if (!idGenerasi.has(k.idAnak)) return;

      const idsIbuBapa = kunciIbuBapa(k.ibuBapa);
      const kunci = idsIbuBapa.join("|");

      if (!kumpulanPaparan.has(kunci)) {
        kumpulanPaparan.set(kunci, {
          ibuBapa: idsIbuBapa,
          anak: []
        });
      }

      kumpulanPaparan.get(kunci).anak.push(k);
    });

    const sudahPapar = new Set();

    kumpulanPaparan.forEach(kumpulan => {
      const ahliIbuBapa = kumpulan.ibuBapa
        .map(cariAhli)
        .filter(Boolean);

      const namaIbuBapa = ahliIbuBapa
        .map(a => a.nama_penuh)
        .join(" & ");

      const keluarga = elemen("div", "family-group");

      if (namaIbuBapa) {
        keluarga.append(
          elemen("small", "", "Anak kepada: " + namaIbuBapa)
        );
      }

      keluarga.append(elemen("div", "connector"));

      const bekasAnak = elemen("div", "children");

      kumpulan.anak.sort((a, b) =>
        (a.susunan ?? 9999) - (b.susunan ?? 9999)
      );

      kumpulan.anak.forEach(rekod => {
        if (sudahPapar.has(rekod.idAnak)) return;

        const ahli = cariAhli(rekod.idAnak);

        if (ahli) {
          bekasAnak.append(kadAhli(ahli));
          sudahPapar.add(rekod.idAnak);
        }
      });

      keluarga.append(bekasAnak);
      seksyen.append(keluarga);
    });

    // Ahli yang tiada hubungan ibu bapa tetap dipaparkan sekali.
    ahliGenerasi.forEach(ahli => {
      if (sudahPapar.has(ahli.id)) return;

      const keluarga = elemen("div", "family-group");
      keluarga.append(kadAhli(ahli));
      seksyen.append(keluarga);
      sudahPapar.add(ahli.id);
    });
  }

  function binaSalasilah() {
    paparan.replaceChildren();

    const idAdaIbuBapa = new Set(
      hubunganAnak.map(h => h.id_anak)
    );

    const generasi = [...new Set(
      ahliSemua.map(a => a.generasi).filter(g => g != null)
    )].sort((a, b) => a - b);

    const semuaKeluarga = kumpulKeluarga();

    generasi.forEach(nombor => {
      const ahliGenerasi = ahliSemua.filter(
        a => a.generasi === nombor
      );

      const seksyen = elemen("section", "generation");

      seksyen.append(
        elemen("h2", "generation-title", "Generasi " + nombor)
      );

      if (nombor === generasi[0]) {
        const akar = ahliGenerasi.filter(
          a => !idAdaIbuBapa.has(a.id)
        );

        paparGenerasiPertama(akar, seksyen);
      } else {
        paparGenerasiAnak(
          nombor,
          ahliGenerasi,
          semuaKeluarga,
          seksyen
        );
      }

      paparan.append(seksyen);
    });

    mesej.textContent =
      "Jumlah ahli keluarga: " + ahliSemua.length +
      " | Jumlah generasi: " + generasi.length;
  }

  async function muatSalasilah() {
    try {
      if (!db) {
        throw new Error("Supabase Client tidak tersedia.");
      }

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
      mesej.textContent =
        "Gagal memuatkan salasilah: " + error.message;
    }
  }

  carian.addEventListener("input", () => {
    const kata = carian.value.trim().toLowerCase();

    document.querySelectorAll(".person").forEach(kad => {
      kad.style.display =
        kad.dataset.nama.includes(kata) ? "" : "none";
    });
  });

  muatSalasilah();
})();

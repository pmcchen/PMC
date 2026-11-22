
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

  // Cari semua pasangan seseorang.
  function pasanganBagi(id) {
    return hubunganPasangan.filter(r =>
      r.pasangan_1 === id || r.pasangan_2 === id
    ).map(r => {
      const idPasangan = r.pasangan_1 === id
        ? r.pasangan_2
        : r.pasangan_1;

      return {
        ahli: cariAhli(idPasangan),
        status: r.status_hubungan,
        tarikh: r.tarikh_perkahwinan
      };
    }).filter(r => r.ahli);
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

  // Paparkan maklumat ahli dan pasangan apabila kad diklik.
  function bukaProfil(ahli) {
    maklumat.replaceChildren();

    maklumat.append(
      elemen("h3", "", ahli.nama_penuh),
      elemen("p", "", "Jantina: " + (ahli.jantina || "-")),
      elemen("p", "", "Generasi: " + (ahli.generasi || "-")),
      elemen("p", "", "Status: " + (ahli.status_hidup || "-")),
      elemen("p", "", "Tempat asal: " + (ahli.tempat_asal || "-"))
    );

    const senaraiPasangan = pasanganBagi(ahli.id);

    if (senaraiPasangan.length > 0) {
      maklumat.append(
        elemen("h3", "", "Maklumat Pasangan")
      );

      senaraiPasangan.forEach(rekod => {
        const bahagian = elemen("div", "");
        bahagian.style.padding = "10px 0";
        bahagian.style.borderTop = "1px solid #d9c7a6";

        bahagian.append(
          elemen("p", "", "♥ " + rekod.ahli.nama_penuh),
          elemen(
            "p",
            "",
            "Status hubungan: " + (rekod.status || "-")
          )
        );

        if (rekod.tarikh) {
          bahagian.append(
            elemen("p", "", "Tarikh perkahwinan: " + rekod.tarikh)
          );
        }

        maklumat.append(bahagian);
      });
    } else {
      maklumat.append(
        elemen("p", "", "Maklumat pasangan belum direkodkan.")
      );
    }

    modal.style.display = "flex";
  }

  document.getElementById("tutupModal").addEventListener("click", () => {
    modal.style.display = "none";
  });

  modal.addEventListener("click", e => {
    if (e.target === modal) modal.style.display = "none";
  });

  // Kumpulkan hanya hubungan ibu bapa-anak BIOLOGI.
  function kumpulKeluarga() {
    const keluarga = new Map();

    hubunganAnak
      .filter(h => h.jenis_hubungan === "BIOLOGI")
      .forEach(h => {
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

  // Bentuk kunci berdasarkan ibu bapa BIOLOGI yang benar-benar direkodkan.
  // Tidak lagi menambah pasangan secara automatik.
  function kunciIbuBapa(ids) {
    return [...new Set(ids)].sort();
  }

  // Paparkan generasi pertama: datuk dan nenek.
  function paparGenerasiPertama(ahliAkar, seksyen) {
    const sudahPapar = new Set();

    ahliAkar.forEach(ahli => {
      if (sudahPapar.has(ahli.id)) return;

      const kumpulan = elemen("div", "family-group");
      const barisPasangan = elemen("div", "parents-row");

      const pasangan = pasanganBagi(ahli.id);

      barisPasangan.append(kadAhli(ahli));
      sudahPapar.add(ahli.id);

      if (pasangan.length > 0) {
        pasangan.forEach(rekod => {
          if (sudahPapar.has(rekod.ahli.id)) return;

          barisPasangan.append(
            elemen("span", "spouse-label", "♥")
          );

          barisPasangan.append(kadAhli(rekod.ahli));
          sudahPapar.add(rekod.ahli.id);
        });
      }

      kumpulan.append(barisPasangan);
      seksyen.append(kumpulan);
    });
  }

  // Paparkan hanya anak yang mempunyai hubungan BIOLOGI.
  function paparGenerasiAnak(
    nomborGenerasi,
    ahliGenerasi,
    semuaKeluarga,
    seksyen
  ) {
    const idGenerasi = new Set(ahliGenerasi.map(a => a.id));
    const kumpulanPaparan = new Map();

    semuaKeluarga.forEach(k => {
      if (!idGenerasi.has(k.idAnak)) return;

      const idsIbuBapa = kunciIbuBapa(k.ibuBapa);

      if (idsIbuBapa.length === 0) return;

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

      if (bekasAnak.children.length > 0) {
        keluarga.append(bekasAnak);
        seksyen.append(keluarga);
      }
    });

    // Jangan paparkan ahli tanpa hubungan BIOLOGI sebagai keturunan.
    const belumAdaHubungan = ahliGenerasi.filter(
      ahli => !sudahPapar.has(ahli.id)
    );

    if (belumAdaHubungan.length > 0) {
      const nota = elemen(
        "p",
        "",
        belumAdaHubungan.length +
        " rekod ahli tidak dipaparkan kerana hubungan BIOLOGI belum direkodkan."
      );

      nota.style.textAlign = "center";
      nota.style.color = "#887b6d";
      nota.style.fontSize = "12px";

      seksyen.append(nota);
    }
  }

  function binaSalasilah() {
    paparan.replaceChildren();

    const hubunganBiologi = hubunganAnak.filter(
      h => h.jenis_hubungan === "BIOLOGI"
    );

    const idAdaIbuBapa = new Set(
      hubunganBiologi.map(h => h.id_anak)
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
          .select("id_ibubapa,id_anak,jenis_hubungan,susunan_kelahiran"),

        db.from("hubungan_pasangan")
          .select("pasangan_1,pasangan_2,status_hubungan,tarikh_perkahwinan")
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

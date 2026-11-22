
(function () {
  "use strict";

  const db = window.supabaseClient;

  const paparan = document.getElementById("paparanSalasilah");
  const mesej = document.getElementById("mesej");
  const carian = document.getElementById("carianAhli");
  const modal = document.getElementById("modalAhli");
  const maklumat = document.getElementById("maklumatAhli");

  let ahliSemua = [];
  let ahliPasangan = [];
  let hubunganAnak = [];
  let hubunganPasangan = [];
  let hubunganPasanganLuar = [];

  function elemen(tag, kelas, teks) {
    const e = document.createElement(tag);

    if (kelas) e.className = kelas;
    if (teks !== undefined) e.textContent = teks;

    return e;
  }

  function cariAhli(id) {
    return ahliSemua.find(a => a.id === id);
  }

  function cariPasangan(id) {
    return ahliPasangan.find(a => a.id === id);
  }

  // Cari semua pasangan seseorang daripada kedua-dua jadual.
  function pasanganBagi(id) {
    const senarai = [];

    // Pasangan yang kedua-duanya ahli keturunan asal.
    hubunganPasangan
      .filter(r => r.pasangan_1 === id || r.pasangan_2 === id)
      .forEach(r => {
        const idPasangan = r.pasangan_1 === id
          ? r.pasangan_2
          : r.pasangan_1;

        const ahli = cariAhli(idPasangan);

        if (ahli) {
          senarai.push({
            ahli,
            sumber: "ahli_keluarga",
            status: r.status_hubungan,
            tarikh: r.tarikh_perkahwinan
          });
        }
      });

    // Pasangan yang berada di luar keturunan asal.
    hubunganPasanganLuar
      .filter(r => r.id_ahli_keluarga === id)
      .forEach(r => {
        const ahli = cariPasangan(r.id_ahli_pasangan);

        if (ahli) {
          senarai.push({
            ahli,
            sumber: "ahli_pasangan",
            status: r.status_hubungan,
            tarikh: r.tarikh_perkahwinan
          });
        }
      });

    return senarai;
  }

  function kadAhli(ahli) {
    const kad = elemen("div", "person");

    kad.dataset.nama = (ahli.nama_penuh || "").toLowerCase();

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

  // Kad pasangan luar keturunan.
  function kadPasangan(ahli) {
    const kad = elemen("div", "person");

    kad.dataset.nama = (ahli.nama_penuh || "").toLowerCase();

    kad.append(
      elemen(
        "div",
        "avatar",
        ahli.jantina === "LELAKI" ? "♂" : "♀"
      ),
      elemen("strong", "", ahli.nama_penuh),
      elemen("small", "", "Pasangan luar keturunan")
    );

    if (ahli.status_hidup === "MENINGGAL") {
      kad.append(elemen("small", "", "Telah meninggal dunia"));
    }

    kad.addEventListener("click", () => bukaProfilPasangan(ahli));

    return kad;
  }

  // Paparan maklumat pasangan.
  function paparMaklumatPasangan(senaraiPasangan) {
    if (senaraiPasangan.length === 0) {
      maklumat.append(
        elemen("p", "", "Maklumat pasangan belum direkodkan.")
      );
      return;
    }

    maklumat.append(
      elemen("h3", "", "Maklumat Pasangan")
    );

    senaraiPasangan.forEach(rekod => {
      const bahagian = elemen("div", "");

      bahagian.style.padding = "10px 0";
      bahagian.style.borderTop = "1px solid #d9c7a6";

      bahagian.append(
        elemen("p", "", "♥ " + rekod.ahli.nama_penuh),
        elemen("p", "", "Sumber rekod: " + (
          rekod.sumber === "ahli_pasangan"
            ? "Pasangan luar keturunan"
            : "Ahli keturunan asal"
        )),
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

      if (rekod.ahli.status_hidup === "MENINGGAL") {
        bahagian.append(
          elemen("p", "", "Status pasangan: Telah meninggal dunia")
        );
      }

      maklumat.append(bahagian);
    });
  }

  // Profil ahli keturunan asal.
  function bukaProfil(ahli) {
    maklumat.replaceChildren();

    maklumat.append(
      elemen("h3", "", ahli.nama_penuh),
      elemen("p", "", "Jantina: " + (ahli.jantina || "-")),
      elemen("p", "", "Generasi: " + (ahli.generasi || "-")),
      elemen("p", "", "Status: " + (ahli.status_hidup || "-")),
      elemen("p", "", "Tempat asal: " + (ahli.tempat_asal || "-"))
    );

    paparMaklumatPasangan(pasanganBagi(ahli.id));

    modal.style.display = "flex";
  }

  // Profil individu pasangan luar keturunan.
  function bukaProfilPasangan(ahli) {
    maklumat.replaceChildren();

    maklumat.append(
      elemen("h3", "", ahli.nama_penuh),
      elemen("p", "", "Kategori: Pasangan luar keturunan"),
      elemen("p", "", "Jantina: " + (ahli.jantina || "-")),
      elemen("p", "", "Status: " + (ahli.status_hidup || "-")),
      elemen("p", "", "Tempat asal: " + (ahli.tempat_asal || "-"))
    );

    if (ahli.tarikh_lahir) {
      maklumat.append(
        elemen("p", "", "Tarikh lahir: " + ahli.tarikh_lahir)
      );
    }

    if (ahli.tarikh_meninggal) {
      maklumat.append(
        elemen("p", "", "Tarikh meninggal: " + ahli.tarikh_meninggal)
      );
    }

    modal.style.display = "flex";
  }

  document.getElementById("tutupModal").addEventListener("click", () => {
    modal.style.display = "none";
  });

  modal.addEventListener("click", e => {
    if (e.target === modal) {
      modal.style.display = "none";
    }
  });

  // Tukar rekod ibu/bapa kepada format sumber yang seragam.
  function sumberIbuBapa(h) {
    if (h.id_ibubapa) {
      return {
        id: h.id_ibubapa,
        sumber: "ahli_keluarga"
      };
    }

    if (h.id_ibubapa_pasangan) {
      return {
        id: h.id_ibubapa_pasangan,
        sumber: "ahli_pasangan"
      };
    }

    return null;
  }

  function kunciSumber(sumber) {
    return sumber.sumber + ":" + sumber.id;
  }

  function namaSumber(sumber) {
    if (sumber.sumber === "ahli_pasangan") {
      const ahli = cariPasangan(sumber.id);
      return ahli ? ahli.nama_penuh : null;
    }

    const ahli = cariAhli(sumber.id);
    return ahli ? ahli.nama_penuh : null;
  }

  // Kumpulkan hanya hubungan BIOLOGI.
  // Ibu/bapa boleh datang daripada ahli_keluarga atau ahli_pasangan.
  function kumpulKeluarga() {
    const keluarga = new Map();

    hubunganAnak
      .filter(h => h.jenis_hubungan === "BIOLOGI")
      .forEach(h => {
        const ibuBapa = sumberIbuBapa(h);

        if (!ibuBapa) return;

        if (!keluarga.has(h.id_anak)) {
          keluarga.set(h.id_anak, {
            idAnak: h.id_anak,
            ibuBapa: [],
            susunan: h.susunan_kelahiran
          });
        }

        const rekod = keluarga.get(h.id_anak);
        const kunci = kunciSumber(ibuBapa);

        if (!rekod.ibuBapa.some(p => kunciSumber(p) === kunci)) {
          rekod.ibuBapa.push(ibuBapa);
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

  function kunciIbuBapa(ids) {
    return ids
      .map(kunciSumber)
      .sort()
      .join("|");
  }

  // Paparkan generasi pertama.
  function paparGenerasiPertama(ahliAkar, seksyen) {
    const sudahPapar = new Set();

    ahliAkar.forEach(ahli => {
      if (sudahPapar.has(ahli.id)) return;

      const kumpulan = elemen("div", "family-group");
      const barisPasangan = elemen("div", "parents-row");

      barisPasangan.append(kadAhli(ahli));
      sudahPapar.add(ahli.id);

      const pasangan = pasanganBagi(ahli.id);

      pasangan.forEach(rekod => {
        const idPasangan = rekod.ahli.id;

        if (sudahPapar.has(idPasangan)) return;

        barisPasangan.append(
          elemen("span", "spouse-label", "♥")
        );

        if (rekod.sumber === "ahli_pasangan") {
          barisPasangan.append(kadPasangan(rekod.ahli));
        } else {
          barisPasangan.append(kadAhli(rekod.ahli));
          sudahPapar.add(idPasangan);
        }
      });

      kumpulan.append(barisPasangan);
      seksyen.append(kumpulan);
    });
  }

  // Paparkan generasi anak berdasarkan ibu bapa BIOLOGI.
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

      if (!idsIbuBapa) return;

      if (!kumpulanPaparan.has(idsIbuBapa)) {
        kumpulanPaparan.set(idsIbuBapa, {
          ibuBapa: k.ibuBapa,
          anak: []
        });
      }

      kumpulanPaparan.get(idsIbuBapa).anak.push(k);
    });

    const sudahPapar = new Set();

    kumpulanPaparan.forEach(kumpulan => {
      const namaIbuBapa = kumpulan.ibuBapa
        .map(namaSumber)
        .filter(Boolean)
        .join(" & ");

      const keluarga = elemen("div", "family-group");

      if (namaIbuBapa) {
        keluarga.append(
          elemen("small", "", "Anak BIOLOGI kepada: " + namaIbuBapa)
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

    // Ahli yang belum mempunyai hubungan BIOLOGI tidak dipaparkan.
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
      ahliSemua
        .map(a => a.generasi)
        .filter(g => g != null)
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

      const [
        ahli,
        pasanganLuar,
        anak,
        pasangan,
        pasanganLuarHubungan
      ] = await Promise.all([
        db.from("ahli_keluarga")
          .select("id,nama_penuh,jantina,generasi,status_hidup,tempat_asal")
          .order("generasi", { ascending: true })
          .order("nama_penuh", { ascending: true }),

        db.from("ahli_pasangan")
          .select("id,nama_penuh,jantina,tarikh_lahir,tarikh_meninggal,status_hidup,tempat_asal"),

        db.from("hubungan_ibubapa_anak")
          .select("id_ibubapa,id_ibubapa_pasangan,id_anak,jenis_hubungan,susunan_kelahiran"),

        db.from("hubungan_pasangan")
          .select("pasangan_1,pasangan_2,status_hubungan,tarikh_perkahwinan"),

        db.from("hubungan_pasangan_luar")
          .select("id_ahli_keluarga,id_ahli_pasangan,status_hubungan,tarikh_perkahwinan")
      ]);

      if (ahli.error) throw ahli.error;
      if (pasanganLuar.error) throw pasanganLuar.error;
      if (anak.error) throw anak.error;
      if (pasangan.error) throw pasangan.error;
      if (pasanganLuarHubungan.error) throw pasanganLuarHubungan.error;

      ahliSemua = ahli.data || [];
      ahliPasangan = pasanganLuar.data || [];
      hubunganAnak = anak.data || [];
      hubunganPasangan = pasangan.data || [];
      hubunganPasanganLuar = pasanganLuarHubungan.data || [];

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

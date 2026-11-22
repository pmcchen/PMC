
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

  // Simpan laluan generasi untuk fungsi Kembali.
  let sejarahPaparan = [];
  let paparanSemasa = null;

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

  function cariSumber(sumber) {
    if (!sumber) return null;

    return sumber.sumber === "ahli_pasangan"
      ? cariPasangan(sumber.id)
      : cariAhli(sumber.id);
  }

  function kunciSumber(sumber) {
    return sumber.sumber + ":" + sumber.id;
  }

  function namaSumber(sumber) {
    const ahli = cariSumber(sumber);
    return ahli ? ahli.nama_penuh : "Tidak diketahui";
  }

  // =====================================================
  // PASANGAN
  // =====================================================

  function pasanganBagi(sumber) {
    const senarai = [];
    const sudahPapar = new Set();

    if (sumber.sumber === "ahli_keluarga") {

      // Pasangan yang kedua-duanya ahli keturunan asal.
      hubunganPasangan
        .filter(r =>
          r.pasangan_1 === sumber.id ||
          r.pasangan_2 === sumber.id
        )
        .forEach(r => {
          const idPasangan = r.pasangan_1 === sumber.id
            ? r.pasangan_2
            : r.pasangan_1;

          const ahli = cariAhli(idPasangan);

          if (ahli && !sudahPapar.has(idPasangan)) {
            senarai.push({
              ahli,
              sumber: "ahli_keluarga",
              status: r.status_hubungan,
              tarikh: r.tarikh_perkahwinan
            });

            sudahPapar.add(idPasangan);
          }
        });

      // Pasangan luar keturunan.
      hubunganPasanganLuar
        .filter(r => r.id_ahli_keluarga === sumber.id)
        .forEach(r => {
          const ahli = cariPasangan(r.id_ahli_pasangan);

          if (ahli && !sudahPapar.has(ahli.id)) {
            senarai.push({
              ahli,
              sumber: "ahli_pasangan",
              status: r.status_hubungan,
              tarikh: r.tarikh_perkahwinan
            });

            sudahPapar.add(ahli.id);
          }
        });

    } else {

      // Jika individu ialah pasangan luar keturunan,
      // cari ahli keluarga yang menjadi pasangannya.
      hubunganPasanganLuar
        .filter(r => r.id_ahli_pasangan === sumber.id)
        .forEach(r => {
          const ahli = cariAhli(r.id_ahli_keluarga);

          if (ahli && !sudahPapar.has(ahli.id)) {
            senarai.push({
              ahli,
              sumber: "ahli_keluarga",
              status: r.status_hubungan,
              tarikh: r.tarikh_perkahwinan
            });

            sudahPapar.add(ahli.id);
          }
        });
    }

    return senarai;
  }

  // =====================================================
  // MODAL PROFIL
  // =====================================================

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
        elemen(
          "p",
          "",
          "Sumber rekod: " + (
            rekod.sumber === "ahli_pasangan"
              ? "Pasangan luar keturunan"
              : "Ahli keturunan asal"
          )
        ),
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

  function bukaProfil(ahli) {
    maklumat.replaceChildren();

    maklumat.append(
      elemen("h3", "", ahli.nama_penuh),
      elemen("p", "", "Jantina: " + (ahli.jantina || "-")),
      elemen("p", "", "Generasi: " + (ahli.generasi || "-")),
      elemen("p", "", "Status: " + (ahli.status_hidup || "-")),
      elemen("p", "", "Tempat asal: " + (ahli.tempat_asal || "-"))
    );

    paparMaklumatPasangan(
      pasanganBagi({
        id: ahli.id,
        sumber: "ahli_keluarga"
      })
    );

    modal.style.display = "flex";
  }

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

    paparMaklumatPasangan({
      ...pasanganBagi({
        id: ahli.id,
        sumber: "ahli_pasangan"
      })
    });

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

  // =====================================================
  // KAD AHLI DAN PASANGAN
  // =====================================================

  function ciptaKad(ahli, sumber, label) {
    const kad = elemen("div", "person");

    kad.dataset.nama = (ahli.nama_penuh || "").toLowerCase();

    const avatar = elemen(
      "div",
      "avatar",
      ahli.jantina === "LELAKI" ? "♂" : "♀"
    );

    const nama = elemen("strong", "", ahli.nama_penuh);

    kad.append(avatar, nama);

    if (label) {
      kad.append(elemen("small", "", label));
    } else if (sumber.sumber === "ahli_keluarga") {
      kad.append(
        elemen("small", "", "Generasi " + (ahli.generasi || "-"))
      );
    } else {
      kad.append(
        elemen("small", "", "Pasangan luar keturunan")
      );
    }

    if (ahli.status_hidup === "MENINGGAL") {
      kad.append(
        elemen("small", "", "Telah meninggal dunia")
      );
    }

    // Butang profil berasingan daripada fungsi keturunan.
    const butangProfil = elemen("button", "profile-info-btn", "ⓘ");

    butangProfil.type = "button";
    butangProfil.title = "Lihat maklumat profil";

    butangProfil.style.cssText = `
      display:block;
      margin:8px auto 0;
      padding:4px 12px;
      border:1px solid #00a9ff;
      border-radius:20px;
      background:transparent;
      color:#00a9ff;
      cursor:pointer;
      font-size:13px;
      font-weight:bold;
    `;

    butangProfil.addEventListener("click", e => {
      e.stopPropagation();

      if (sumber.sumber === "ahli_pasangan") {
        bukaProfilPasangan(ahli);
      } else {
        bukaProfil(ahli);
      }
    });

    kad.append(butangProfil);

    // Klik kad membuka generasi seterusnya.
    kad.style.cursor = "pointer";

    kad.addEventListener("click", () => {
      bukaKeturunan(sumber);
    });

    return kad;
  }

  // =====================================================
  // HUBUNGAN IBU BAPA DAN ANAK
  // =====================================================

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

        if (!rekod.ibuBapa.some(p =>
          kunciSumber(p) === kunci
        )) {
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

  // =====================================================
  // PAPARAN AWAL - GENERASI PERTAMA
  // =====================================================

  function paparGenerasiPertama() {
    paparan.replaceChildren();

    const generasi = elemen("section", "generation");

    generasi.append(
      elemen("h2", "generation-title", "Generasi Pertama")
    );

    const nota = elemen(
      "p",
      "",
      "Klik kad ahli untuk melihat generasi anak-anak. Tekan ⓘ untuk melihat profil."
    );

    nota.style.textAlign = "center";
    nota.style.marginBottom = "20px";

    generasi.append(nota);

    const adaIbuBapa = new Set(
      hubunganAnak
        .filter(h => h.jenis_hubungan === "BIOLOGI")
        .map(h => h.id_anak)
    );

    const akar = ahliSemua.filter(
      a => !adaIbuBapa.has(a.id)
    );

    const sudahPapar = new Set();

    akar.forEach(ahli => {
      if (sudahPapar.has(ahli.id)) return;

      const keluarga = elemen("div", "family-group");
      const baris = elemen("div", "parents-row");

      const sumber = {
        id: ahli.id,
        sumber: "ahli_keluarga"
      };

      baris.append(ciptaKad(ahli, sumber));
      sudahPapar.add(ahli.id);

      pasanganBagi(sumber).forEach(rekod => {
        const kunci = kunciSumber({
          id: rekod.ahli.id,
          sumber: rekod.sumber
        });

        if (sudahPapar.has(kunci)) return;

        baris.append(
          elemen("span", "spouse-label", "♥")
        );

        baris.append(
          ciptaKad(
            rekod.ahli,
            {
              id: rekod.ahli.id,
              sumber: rekod.sumber
            },
            "Pasangan"
          )
        );

        sudahPapar.add(kunci);
      });

      keluarga.append(baris);
      generasi.append(keluarga);
    });

    paparan.append(generasi);

    mesej.textContent =
      "Jumlah ahli keluarga: " + ahliSemua.length +
      " | Jumlah generasi: " +
      new Set(ahliSemua.map(a => a.generasi)).size;

    tapisCarian();
  }

  // =====================================================
  // PAPAR KETURUNAN AHLI YANG DIPILIH
  // =====================================================

  function bukaKeturunan(sumber) {
    const ahli = cariSumber(sumber);

    if (!ahli) {
      mesej.textContent = "Maklumat ahli tidak ditemui.";
      return;
    }

    sejarahPaparan.push(paparanSemasa);

    paparanSemasa = {
      id: sumber.id,
      sumber: sumber.sumber
    };

    paparKeturunan();
  }

  function paparKeturunan() {
    if (!paparanSemasa) {
      paparGenerasiPertama();
      return;
    }

    paparan.replaceChildren();

    const sumber = paparanSemasa;
    const ahli = cariSumber(sumber);

    if (!ahli) return;

    const generasi = elemen("section", "generation");

    // Butang kembali.
    const barNavigasi = elemen("div", "");

    barNavigasi.style.cssText = `
      display:flex;
      justify-content:flex-start;
      margin-bottom:18px;
    `;

    const butangKembali = elemen(
      "button",
      "",
      "← Kembali"
    );

    butangKembali.type = "button";
    butangKembali.style.cssText = `
      padding:9px 18px;
      border:1px solid #00a9ff;
      border-radius:8px;
      background:#06182b;
      color:#00d9ff;
      cursor:pointer;
      font-weight:bold;
    `;

    butangKembali.addEventListener("click", kembaliGenerasi);

    barNavigasi.append(butangKembali);
    generasi.append(barNavigasi);

    generasi.append(
      elemen("h2", "generation-title", "Keturunan " + ahli.nama_penuh)
    );

    // Paparan ahli yang dipilih bersama pasangan.
    const tajuk = elemen("div", "family-group");
    const barisPasangan = elemen("div", "parents-row");

    barisPasangan.append(
      ciptaKad(ahli, sumber, "Ahli dipilih")
    );

    pasanganBagi(sumber).forEach(rekod => {
      barisPasangan.append(
        elemen("span", "spouse-label", "♥")
      );

      barisPasangan.append(
        ciptaKad(
          rekod.ahli,
          {
            id: rekod.ahli.id,
            sumber: rekod.sumber
          },
          "Pasangan"
        )
      );
    });

    tajuk.append(barisPasangan);
    generasi.append(tajuk);

    const semuaKeluarga = kumpulKeluarga();
    const kunciDipilih = kunciSumber(sumber);

    // Cari kumpulan keluarga yang mempunyai ahli dipilih
    // sebagai salah seorang ibu atau bapa BIOLOGI.
    const kumpulanPaparan = new Map();

    semuaKeluarga.forEach(k => {
      const adaDipilih = k.ibuBapa.some(
        p => kunciSumber(p) === kunciDipilih
      );

      if (!adaDipilih) return;

      const kunci = kunciIbuBapa(k.ibuBapa);

      if (!kumpulanPaparan.has(kunci)) {
        kumpulanPaparan.set(kunci, {
          ibuBapa: k.ibuBapa,
          anak: []
        });
      }

      kumpulanPaparan.get(kunci).anak.push(k);
    });

    let jumlahAnak = 0;

    kumpulanPaparan.forEach(kumpulan => {
      const keluarga = elemen("div", "family-group");

      // Paparkan pasangan bagi kumpulan anak tersebut.
      const namaIbuBapa = kumpulan.ibuBapa
        .map(namaSumber)
        .filter(Boolean)
        .join(" & ");

      keluarga.append(
        elemen(
          "small",
          "",
          "Anak BIOLOGI kepada: " + namaIbuBapa
        )
      );

      keluarga.append(
        elemen("div", "connector")
      );

      const bekasAnak = elemen("div", "children");

      kumpulan.anak.sort((a, b) =>
        (a.susunan ?? 9999) - (b.susunan ?? 9999)
      );

      kumpulan.anak.forEach(rekod => {
        const anak = cariAhli(rekod.idAnak);

        if (!anak) return;

        bekasAnak.append(
          ciptaKad(
            anak,
            {
              id: anak.id,
              sumber: "ahli_keluarga"
            }
          )
        );

        jumlahAnak++;
      });

      if (bekasAnak.children.length > 0) {
        keluarga.append(bekasAnak);
        generasi.append(keluarga);
      }
    });

    if (jumlahAnak === 0) {
      const nota = elemen(
        "p",
        "",
        "Belum ada rekod anak BIOLOGI untuk ahli ini."
      );

      nota.style.cssText = `
        text-align:center;
        padding:25px 10px;
        color:#887b6d;
      `;

      generasi.append(nota);
    }

    paparan.append(generasi);

    mesej.textContent =
      "Ahli dipilih: " + ahli.nama_penuh +
      " | Jumlah anak BIOLOGI: " + jumlahAnak;

    tapisCarian();
  }

  function kembaliGenerasi() {
    paparanSemasa = sejarahPaparan.length
      ? sejarahPaparan.pop()
      : null;

    if (paparanSemasa) {
      paparKeturunan();
    } else {
      paparGenerasiPertama();
    }
  }

  // =====================================================
  // CARIAN
  // =====================================================

  function tapisCarian() {
    const kata = carian.value.trim().toLowerCase();

    paparan.querySelectorAll(".person").forEach(kad => {
      kad.style.display =
        (kad.dataset.nama || "").includes(kata) ? "" : "none";
    });
  }

  carian.addEventListener("input", tapisCarian);

  // =====================================================
  // MUAT DATA SUPABASE
  // =====================================================

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
      if (pasanganLuarHubungan.error) {
        throw pasanganLuarHubungan.error;
      }

      ahliSemua = ahli.data || [];
      ahliPasangan = pasanganLuar.data || [];
      hubunganAnak = anak.data || [];
      hubunganPasangan = pasangan.data || [];
      hubunganPasanganLuar = pasanganLuarHubungan.data || [];

      sejarahPaparan = [];
      paparanSemasa = null;

      paparGenerasiPertama();

    } catch (error) {
      console.error("RALAT SALASILAH:", error);

      mesej.textContent =
        "Gagal memuatkan salasilah: " + error.message;
    }
  }

  muatSalasilah();

})();

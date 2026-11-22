
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

  let sejarahPaparan = [];
  let paparanSemasa = null;

  // Cache URL gambar supaya tidak perlu jana semula setiap kali.
  const gambarCache = new Map();

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
  // GAMBAR PROFIL - SUPABASE STORAGE
  // =====================================================

  async function dapatkanUrlGambar(gambarUrl) {
    if (!gambarUrl) return null;

    if (/^https?:\/\//i.test(gambarUrl)) {
      return gambarUrl;
    }

    if (gambarCache.has(gambarUrl)) {
      return gambarCache.get(gambarUrl);
    }

    try {
      const { data, error } = await db.storage
        .from("gambar-profil")
        .createSignedUrl(gambarUrl, 3600);

      if (error) throw error;

      const url = data?.signedUrl || null;
      gambarCache.set(gambarUrl, url);

      return url;

    } catch (error) {
      console.warn("Gagal mendapatkan gambar:", gambarUrl, error);
      return null;
    }
  }

  async function muatSemuaGambar() {
    const semua = [
      ...ahliSemua,
      ...ahliPasangan
    ];

    await Promise.all(
      semua.map(async ahli => {
        ahli._gambarPaparan = await dapatkanUrlGambar(
          ahli.gambar_url
        );
      })
    );
  }

  function paparGambarKecil(ahli) {
    if (ahli._gambarPaparan) {
      const img = elemen("img", "salasilah-thumb");

      img.src = ahli._gambarPaparan;
      img.alt = "Gambar " + ahli.nama_penuh;
      img.loading = "lazy";

      img.style.cssText = `
        width:54px;
        height:62px;
        object-fit:cover;
        border-radius:9px;
        display:block;
        margin:0 auto 8px;
        border:1px solid #00a9ff;
      `;

      return img;
    }

    const avatar = elemen(
      "div",
      "avatar",
      ahli.jantina === "LELAKI" ? "♂" : "♀"
    );

    return avatar;
  }

  // =====================================================
  // TARIKH DAN UMUR
  // =====================================================

  function tarikhObjek(nilai) {
    if (!nilai) return null;

    const bahagian = String(nilai).substring(0, 10).split("-");

    if (bahagian.length !== 3) return null;

    const tahun = Number(bahagian[0]);
    const bulan = Number(bahagian[1]);
    const hari = Number(bahagian[2]);

    if (!tahun || !bulan || !hari) return null;

    const tarikh = new Date(tahun, bulan - 1, hari);

    if (
      tarikh.getFullYear() !== tahun ||
      tarikh.getMonth() !== bulan - 1 ||
      tarikh.getDate() !== hari
    ) {
      return null;
    }

    return tarikh;
  }

  function formatTarikh(nilai) {
    const tarikh = tarikhObjek(nilai);

    if (!tarikh) return "-";

    const hari = String(tarikh.getDate()).padStart(2, "0");
    const bulan = String(tarikh.getMonth() + 1).padStart(2, "0");

    return hari + "-" + bulan + "-" + tarikh.getFullYear();
  }

  function kiraUmur(tarikhLahir, tarikhAkhir = null) {
    const lahir = tarikhObjek(tarikhLahir);

    if (!lahir) return null;

    const akhir = tarikhAkhir
      ? tarikhObjek(tarikhAkhir)
      : new Date();

    if (!akhir || akhir < lahir) return null;

    let umur = akhir.getFullYear() - lahir.getFullYear();

    const belumSambutHariLahir =
      akhir.getMonth() < lahir.getMonth() ||
      (
        akhir.getMonth() === lahir.getMonth() &&
        akhir.getDate() < lahir.getDate()
      );

    if (belumSambutHariLahir) umur--;

    return umur;
  }

  // =====================================================
  // PASANGAN
  // =====================================================

  function pasanganBagi(sumber) {
    const senarai = [];
    const sudahPapar = new Set();

    if (sumber.sumber === "ahli_keluarga") {

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
  // PROFIL INDIVIDU SAHAJA
  // =====================================================

  function bukaProfil(ahli, sumber) {
    maklumat.replaceChildren();

    const bekasProfil = elemen("div", "profil-salasilah");

    bekasProfil.style.cssText = `
      text-align:center;
      padding:10px;
    `;

    // Gambar standard profil.
    if (ahli._gambarPaparan) {
      const gambar = elemen("img", "profil-gambar-standard");

      gambar.src = ahli._gambarPaparan;
      gambar.alt = "Gambar " + ahli.nama_penuh;

      gambar.style.cssText = `
        width:150px;
        height:170px;
        object-fit:cover;
        border-radius:12px;
        border:2px solid #00a9ff;
        margin:0 auto 15px;
        display:block;
      `;

      bekasProfil.append(gambar);

    } else {
      const tiadaGambar = elemen(
        "div",
        "profil-tiada-gambar",
        ahli.jantina === "LELAKI" ? "♂" : "♀"
      );

      tiadaGambar.style.cssText = `
        width:150px;
        height:170px;
        margin:0 auto 15px;
        border-radius:12px;
        display:flex;
        align-items:center;
        justify-content:center;
        font-size:55px;
        background:#e8edf2;
        color:#65758b;
      `;

      bekasProfil.append(tiadaGambar);
    }

    bekasProfil.append(
      elemen("h3", "", ahli.nama_penuh)
    );

    const statusMeninggal =
      ahli.status_hidup === "MENINGGAL";

    const umur = kiraUmur(
      ahli.tarikh_lahir,
      statusMeninggal ? ahli.tarikh_meninggal : null
    );

    const butiran = elemen("div", "");

    butiran.style.cssText = `
      text-align:left;
      margin-top:15px;
      line-height:1.8;
    `;

    function tambahButiran(label, nilai) {
      const baris = elemen("p", "");
      const tajuk = elemen("strong", "", label + ": ");

      baris.append(tajuk);
      baris.append(document.createTextNode(nilai || "-"));

      butiran.append(baris);
    }

    tambahButiran(
      "Jantina",
      ahli.jantina || "-"
    );

    if (sumber.sumber === "ahli_keluarga") {
      tambahButiran(
        "Generasi",
        ahli.generasi ? String(ahli.generasi) : "-"
      );
    } else {
      tambahButiran("Kategori", "Pasangan");
    }

    tambahButiran(
      "Status",
      statusMeninggal
        ? "Telah meninggal dunia"
        : (ahli.status_hidup || "-")
    );

    tambahButiran(
      "Tarikh lahir",
      formatTarikh(ahli.tarikh_lahir)
    );

    tambahButiran(
      statusMeninggal
        ? "Tarikh kematian"
        : "Umur",
      statusMeninggal
        ? formatTarikh(ahli.tarikh_meninggal)
        : (
          umur === null
            ? "Tidak diketahui"
            : umur + " tahun"
        )
    );

    if (statusMeninggal) {
      tambahButiran(
        "Umur ketika meninggal dunia",
        umur === null
          ? "Tidak diketahui"
          : umur + " tahun"
      );
    }

    tambahButiran(
      "Tempat asal",
      ahli.tempat_asal || "-"
    );

    bekasProfil.append(butiran);
    maklumat.append(bekasProfil);

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
  // KAD AHLI
  // =====================================================

  function ciptaKad(ahli, sumber, label = "") {
    const kad = elemen("div", "person");

    kad.dataset.nama = (ahli.nama_penuh || "").toLowerCase();

    kad.style.cursor = "pointer";
    kad.style.position = "relative";

    kad.append(
      paparGambarKecil(ahli),
      elemen("strong", "", ahli.nama_penuh)
    );

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

    const butangProfil = elemen(
      "button",
      "profile-info-btn",
      "ⓘ"
    );

    butangProfil.type = "button";
    butangProfil.title = "Lihat profil individu ini";

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
      bukaProfil(ahli, sumber);
    });

    kad.append(butangProfil);

    kad.addEventListener("click", () => {
      bukaKeturunan(sumber);
    });

    return kad;
  }

  function tambahAhliDanPasangan(bekas, ahli, sumber) {
    bekas.append(
      ciptaKad(ahli, sumber)
    );

    pasanganBagi(sumber).forEach(rekod => {
      bekas.append(
        elemen("span", "spouse-label", "♥")
      );

      bekas.append(
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
  }

  // =====================================================
  // HUBUNGAN BIOLOGI
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
  // PAPARAN AWAL: GENERASI 1 DAN GENERASI 2
  // =====================================================

  function paparGenerasiAwal() {
    paparan.replaceChildren();

    const semuaKeluarga = kumpulKeluarga();

    const generasiTersedia = [...new Set(
      ahliSemua
        .map(a => a.generasi)
        .filter(g => g != null)
    )].sort((a, b) => a - b);

    if (!generasiTersedia.length) {
      mesej.textContent = "Tiada rekod generasi ditemui.";
      return;
    }

    const genPertama = generasiTersedia[0];
    const genKedua = generasiTersedia[1];

    // Generasi 1.
    const seksyen1 = elemen("section", "generation");

    seksyen1.append(
      elemen("h2", "generation-title", "Generasi " + genPertama)
    );

    const nota = elemen(
      "p",
      "",
      "Klik kad untuk melihat keturunan. Klik ⓘ untuk melihat profil."
    );

    nota.style.textAlign = "center";
    seksyen1.append(nota);

    const ahliGen1 = ahliSemua.filter(
      a => a.generasi === genPertama
    );

    const sudahPapar1 = new Set();

    ahliGen1.forEach(ahli => {
      if (sudahPapar1.has(ahli.id)) return;

      const keluarga = elemen("div", "family-group");
      const baris = elemen("div", "parents-row");

      const sumber = {
        id: ahli.id,
        sumber: "ahli_keluarga"
      };

      tambahAhliDanPasangan(baris, ahli, sumber);

      sudahPapar1.add(ahli.id);

      pasanganBagi(sumber).forEach(r => {
        if (r.sumber === "ahli_keluarga") {
          sudahPapar1.add(r.ahli.id);
        }
      });

      keluarga.append(baris);
      seksyen1.append(keluarga);
    });

    paparan.append(seksyen1);

    // Generasi 2.
    if (genKedua !== undefined) {
      const seksyen2 = elemen("section", "generation");

      seksyen2.append(
        elemen("h2", "generation-title", "Generasi " + genKedua)
      );

      const ahliGen2 = ahliSemua.filter(
        a => a.generasi === genKedua
      );

      const idGen2 = new Set(ahliGen2.map(a => a.id));
      const kumpulanPaparan = new Map();
      const sudahPapar2 = new Set();

      semuaKeluarga.forEach(k => {
        if (!idGen2.has(k.idAnak)) return;

        const kunci = kunciIbuBapa(k.ibuBapa);

        if (!kumpulanPaparan.has(kunci)) {
          kumpulanPaparan.set(kunci, {
            ibuBapa: k.ibuBapa,
            anak: []
          });
        }

        kumpulanPaparan.get(kunci).anak.push(k);
      });

      kumpulanPaparan.forEach(kumpulan => {
        const keluarga = elemen("div", "family-group");

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
          const ahli = cariAhli(rekod.idAnak);

          if (!ahli || sudahPapar2.has(ahli.id)) return;

const baris = elemen("div", "parents-row");

baris.append(
  ciptaKad(
    ahli,
    {
      id: ahli.id,
      sumber: "ahli_keluarga"
    }
  )
);

bekasAnak.append(baris);
sudahPapar2.add(ahli.id);
        });

        if (bekasAnak.children.length) {
          keluarga.append(bekasAnak);
          seksyen2.append(keluarga);
        }
      });

      // Rekod Generasi 2 yang belum mempunyai hubungan BIOLOGI.
      const belumAdaHubungan = ahliGen2.filter(
        a => !sudahPapar2.has(a.id)
      );

      if (belumAdaHubungan.length) {
        const keluarga = elemen("div", "family-group");
        const bekas = elemen("div", "children");

        keluarga.append(
          elemen(
            "small",
            "",
            "Rekod Generasi " + genKedua +
            " yang belum mempunyai hubungan BIOLOGI"
          )
        );

        belumAdaHubungan.forEach(ahli => {
const baris = elemen("div", "parents-row");

baris.append(
  ciptaKad(
    ahli,
    {
      id: ahli.id,
      sumber: "ahli_keluarga"
    }
  )
);

bekas.append(baris);
        });

        keluarga.append(bekas);
        seksyen2.append(keluarga);
      }

      paparan.append(seksyen2);
    }

    mesej.textContent =
      "Jumlah ahli keluarga: " + ahliSemua.length +
      " | Jumlah generasi: " + generasiTersedia.length;

    tapisCarian();
  }

  // =====================================================
  // PAPAR KETURUNAN GENERASI SETERUSNYA
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
      paparGenerasiAwal();
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

    // Individu dipilih bersama pasangan.
    const kumpulanInduk = elemen("div", "family-group");
    const barisInduk = elemen("div", "parents-row");

    tambahAhliDanPasangan(
      barisInduk,
      ahli,
      sumber
    );

    kumpulanInduk.append(barisInduk);
    generasi.append(kumpulanInduk);

    const semuaKeluarga = kumpulKeluarga();
    const kunciDipilih = kunciSumber(sumber);

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

        const barisAnak = elemen("div", "parents-row");

        tambahAhliDanPasangan(
          barisAnak,
          anak,
          {
            id: anak.id,
            sumber: "ahli_keluarga"
          }
        );

        bekasAnak.append(barisAnak);
        jumlahAnak++;
      });

      if (bekasAnak.children.length) {
        keluarga.append(bekasAnak);
        generasi.append(keluarga);
      }
    });

    if (jumlahAnak === 0) {
      const nota = elemen(
        "p",
        "",
        "Belum ada rekod anak BIOLOGI untuk individu ini."
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
      "Individu dipilih: " + ahli.nama_penuh +
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
      paparGenerasiAwal();
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
          .select(`
            id,
            nama_penuh,
            jantina,
            generasi,
            status_hidup,
            tempat_asal,
            tarikh_lahir,
            tarikh_meninggal,
            gambar_url
          `)
          .order("generasi", { ascending: true })
          .order("nama_penuh", { ascending: true }),

        db.from("ahli_pasangan")
          .select(`
            id,
            nama_penuh,
            jantina,
            tarikh_lahir,
            tarikh_meninggal,
            status_hidup,
            tempat_asal,
            gambar_url
          `),

        db.from("hubungan_ibubapa_anak")
          .select(`
            id_ibubapa,
            id_ibubapa_pasangan,
            id_anak,
            jenis_hubungan,
            susunan_kelahiran
          `),

        db.from("hubungan_pasangan")
          .select(`
            pasangan_1,
            pasangan_2,
            status_hubungan,
            tarikh_perkahwinan
          `),

        db.from("hubungan_pasangan_luar")
          .select(`
            id_ahli_keluarga,
            id_ahli_pasangan,
            status_hubungan,
            tarikh_perkahwinan
          `)
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

      await muatSemuaGambar();

      paparGenerasiAwal();

    } catch (error) {
      console.error("RALAT SALASILAH:", error);

      mesej.textContent =
        "Gagal memuatkan salasilah: " + error.message;
    }
  }

  muatSalasilah();

})();

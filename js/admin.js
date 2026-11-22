
(function () {
    "use strict";

    const db = window.supabaseClient;

    let senaraiCadangan = [];
    let cadanganDipilih = null;

    const el = (id) => document.getElementById(id);

    function paparMesej(teks, jenis = "info") {
        const mesej = el("mesej");
        if (!mesej) return;

        mesej.textContent = teks;
        mesej.style.color =
            jenis === "error" ? "#a83d32" :
            jenis === "success" ? "#287a45" : "#493522";
    }

    function buatElemen(tag, teks = "", kelas = "") {
        const node = document.createElement(tag);
        node.textContent = teks;
        if (kelas) node.className = kelas;
        return node;
    }

    async function semakAdmin() {
        if (!db) {
            throw new Error("Sambungan Supabase tidak dijumpai.");
        }

        if (typeof window.sahkanAkses !== "function") {
            throw new Error("Fungsi pengesahan akses tidak dijumpai.");
        }

        const pengguna = await window.sahkanAkses("ADMIN");

        if (!pengguna) return false;

        return true;
    }

    async function muatCadangan() {
        paparMesej("Memuatkan senarai cadangan...");

        const { data, error } = await db
            .from("cadangan_kemaskini")
            .select(`
                id,
                user_id,
                jenis_cadangan,
                id_ahli,
                data_cadangan,
                catatan,
                status_cadangan,
                created_at
            `)
            .eq("status_cadangan", "MENUNGGU")
            .order("created_at", { ascending: false });

        if (error) {
            console.error(error);
            paparMesej(
                "Gagal memuatkan cadangan: " + error.message,
                "error"
            );
            return;
        }

        senaraiCadangan = data || [];

        const tbody = el("senaraiCadangan");
        tbody.replaceChildren();

        if (senaraiCadangan.length === 0) {
            const tr = document.createElement("tr");
            const td = buatElemen(
                "td",
                "Tiada cadangan menunggu semakan."
            );
            td.colSpan = 5;
            tr.appendChild(td);
            tbody.appendChild(tr);

            paparMesej("Semua cadangan telah disemak.");
            return;
        }

        senaraiCadangan.forEach((item) => {
            const tr = document.createElement("tr");
            const data = item.data_cadangan || {};

            const nama = data.nama_penuh || "Nama tidak diketahui";
            const tarikh = item.created_at
                ? new Date(item.created_at).toLocaleString("ms-MY")
                : "-";

            tr.appendChild(buatElemen("td", nama));
            tr.appendChild(buatElemen("td", item.jenis_cadangan));
            tr.appendChild(buatElemen("td", tarikh));

            const tdStatus = document.createElement("td");
            tdStatus.appendChild(
                buatElemen("span", item.status_cadangan, "status")
            );
            tr.appendChild(tdStatus);

            const tdTindakan = document.createElement("td");

            const btnButiran = buatElemen(
                "button",
                "Butiran",
                "butiran"
            );
            btnButiran.type = "button";
            btnButiran.addEventListener("click", () => {
                paparButiran(item.id);
            });

            tdTindakan.appendChild(btnButiran);
            tr.appendChild(tdTindakan);

            tbody.appendChild(tr);
        });

        paparMesej(
            senaraiCadangan.length + " cadangan menunggu semakan."
        );
    }

    async function dapatkanUrlGambar(path) {
        if (!path) return null;

        // Jika data sudah mengandungi URL penuh
        if (/^https?:\/\//i.test(path)) {
            return path;
        }

        const { data, error } = await db.storage
            .from("gambar-profil")
            .createSignedUrl(path, 3600);

        if (error) {
            console.error("Gagal mendapatkan gambar:", error);
            return null;
        }

        return data?.signedUrl || null;
    }

    async function paparButiran(id) {
        const item = senaraiCadangan.find(x => x.id === id);
        if (!item) return;

        cadanganDipilih = item;

        const panel = el("panelButiran");
        const kandungan = el("butiranCadangan");

        panel.hidden = false;
        kandungan.replaceChildren();

        const data = item.data_cadangan || {};
        const hubungan = data.hubungan || {};

        kandungan.appendChild(
            buatElemen("h3", data.nama_penuh || "-")
        );

        const senaraiMaklumat = [
            ["Jantina", data.jantina],
            ["Tarikh lahir", data.tarikh_lahir],
            ["Tarikh meninggal", data.tarikh_meninggal],
            ["Status hidup", data.status_hidup],
            ["Tempat lahir", data.tempat_lahir],
            ["Tempat asal", data.tempat_asal],
            ["Pekerjaan", data.pekerjaan],
            ["Generasi", data.generasi],
            ["Jenis hubungan", hubungan.jenis],
            ["ID ahli rujukan", hubungan.id_ahli_rujukan],
            ["Susunan kelahiran", hubungan.susunan_kelahiran],
            ["Catatan ahli", data.catatan],
            ["Catatan penghantar", item.catatan],
            ["Tarikh penghantaran", item.created_at
                ? new Date(item.created_at).toLocaleString("ms-MY")
                : "-"]
        ];

        const jadual = document.createElement("table");

        senaraiMaklumat.forEach(([label, nilai]) => {
            const tr = document.createElement("tr");
            tr.appendChild(buatElemen("th", label));
            tr.appendChild(buatElemen(
                "td",
                nilai === null || nilai === undefined || nilai === ""
                    ? "-"
                    : String(nilai)
            ));
            jadual.appendChild(tr);
        });

        kandungan.appendChild(jadual);

        // Paparan gambar profil
        const pathGambar = data.gambar_url;

        if (pathGambar) {
            kandungan.appendChild(
                buatElemen("h3", "Gambar Profil")
            );

            const statusGambar = buatElemen(
                "p",
                "Memuatkan gambar..."
            );
            kandungan.appendChild(statusGambar);

            const url = await dapatkanUrlGambar(pathGambar);

            if (cadanganDipilih?.id !== id) return;

            if (url) {
                const gambar = document.createElement("img");
                gambar.src = url;
                gambar.alt = "Gambar " + (data.nama_penuh || "ahli");
                gambar.style.maxWidth = "220px";
                gambar.style.maxHeight = "260px";
                gambar.style.objectFit = "cover";
                gambar.style.borderRadius = "10px";
                gambar.style.display = "block";
                gambar.style.margin = "10px 0";

                statusGambar.replaceWith(gambar);
            } else {
                statusGambar.textContent =
                    "Gambar tidak dapat dipaparkan. Semak akses Storage.";
            }
        }

        // Butang keputusan
        const ruangButang = document.createElement("div");
        ruangButang.style.marginTop = "20px";

        const btnLulus = buatElemen(
            "button",
            "Luluskan Cadangan",
            "lulus"
        );
        btnLulus.type = "button";
        btnLulus.addEventListener("click", () => {
            prosesCadangan(id, "DILULUSKAN");
        });

        const btnTolak = buatElemen(
            "button",
            "Tolak Cadangan",
            "tolak"
        );
        btnTolak.type = "button";
        btnTolak.addEventListener("click", () => {
            prosesCadangan(id, "DITOLAK");
        });

        const btnTutup = buatElemen(
            "button",
            "Tutup",
            "butiran"
        );
        btnTutup.type = "button";
        btnTutup.addEventListener("click", () => {
            panel.hidden = true;
            cadanganDipilih = null;
        });

        ruangButang.append(btnLulus, btnTolak, btnTutup);
        kandungan.appendChild(ruangButang);

        panel.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }

    async function prosesCadangan(id, keputusan) {
        const item = senaraiCadangan.find(x => x.id === id);
        if (!item) return;

        const nama = item.data_cadangan?.nama_penuh || "ahli ini";

        const pengesahan = confirm(
            keputusan === "DILULUSKAN"
                ? "Adakah anda pasti mahu meluluskan cadangan " + nama + "?"
                : "Adakah anda pasti mahu menolak cadangan " + nama + "?"
        );

        if (!pengesahan) return;

        let catatan = null;

        if (keputusan === "DITOLAK") {
            catatan = prompt(
                "Masukkan sebab penolakan (pilihan):"
            );
        }

        paparMesej("Sedang memproses keputusan...");

        const { data, error } = await db.rpc(
            "proses_cadangan_tambah_ahli",
            {
                p_id_cadangan: id,
                p_keputusan: keputusan,
                p_catatan_semakan: catatan
            }
        );

        if (error) {
            console.error(error);
            paparMesej(
                "Gagal memproses cadangan: " + error.message,
                "error"
            );
            return;
        }

        if (!data || data.berjaya !== true) {
            paparMesej(
                "Sistem tidak mengesahkan keputusan.",
                "error"
            );
            return;
        }

        el("panelButiran").hidden = true;
        cadanganDipilih = null;

        paparMesej(
            keputusan === "DILULUSKAN"
                ? "Cadangan berjaya diluluskan dan ahli telah dimasukkan."
                : "Cadangan berjaya ditolak.",
            "success"
        );

        await muatCadangan();
    }

    async function mula() {
        try {
            const dibenarkan = await semakAdmin();

            if (!dibenarkan) return;

            await muatCadangan();

        } catch (error) {
            console.error(error);
            paparMesej(
                error.message || "Ralat semasa membuka panel admin.",
                "error"
            );
        }
    }

    document.addEventListener("DOMContentLoaded", mula);

})();


(() => {
    "use strict";

    const db = window.supabaseClient;

    const form = document.getElementById("formCadangan");
    const mesej = document.getElementById("mesej");
    const inputGambar = document.getElementById("gambar");
    const photoPreview = document.getElementById("photoPreview");
    const photoPlaceholder = document.getElementById("photoPlaceholder");
    const jenisHubungan = document.getElementById("jenisHubungan");

    const rujukanWrap = document.getElementById("rujukanWrap");
    const ahliRujukan = document.getElementById("ahliRujukan");

    const rujukanKeduaWrap =
        document.getElementById("rujukanKeduaWrap");
    const ahliRujukanKedua =
        document.getElementById("ahliRujukanKedua");

    const susunanWrap = document.getElementById("susunanWrap");
    const btnHantar = document.getElementById("btnHantar");

    let pengguna = null;
    let gambarDipilih = null;
    let senaraiAhli = [];
    let senaraiPasangan = [];

    function paparMesej(teks, jenis) {
        mesej.textContent = teks;
        mesej.className = jenis;
        mesej.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });
    }

    function nilai(id) {
        const elemen = document.getElementById(id);
        return elemen ? elemen.value.trim() : "";
    }

    function kemasKiniJenisHubungan() {
        const jenis = jenisHubungan.value;
        const perluRujukan = jenis !== "BELUM_PASTI";
        const perluRujukanKedua = jenis === "ANAK_KEPADA";

        rujukanWrap.hidden = !perluRujukan;
        rujukanKeduaWrap.hidden = !perluRujukanKedua;
        susunanWrap.hidden = !perluRujukanKedua;

        ahliRujukan.required = perluRujukan;
        ahliRujukanKedua.required = false;

        document.getElementById("susunan").required = false;
    }

    async function muatSenaraiAhli() {
        ahliRujukan.innerHTML =
            '<option value="">Memuatkan senarai ahli...</option>';

        const { data, error } = await db
            .from("ahli_keluarga")
            .select("id, nama_penuh, generasi")
            .order("nama_penuh", { ascending: true });

        if (error) {
            console.error("Ralat senarai ahli:", error);
            ahliRujukan.innerHTML =
                '<option value="">Tidak dapat memuatkan senarai ahli</option>';
            throw error;
        }

        senaraiAhli = data || [];

        ahliRujukan.innerHTML =
            '<option value="">-- Pilih ahli keluarga --</option>';

        senaraiAhli.forEach(ahli => {
            const option = document.createElement("option");
            option.value = ahli.id;
            option.textContent = ahli.nama_penuh;
            ahliRujukan.appendChild(option);
        });
    }

    async function muatSenaraiPasangan() {
        ahliRujukanKedua.innerHTML =
            '<option value="">Memuatkan senarai ibu/bapa...</option>';

        const [
            { data: ahliData, error: ahliError },
            { data: pasanganData, error: pasanganError }
        ] = await Promise.all([
            db
                .from("ahli_keluarga")
                .select("id, nama_penuh")
                .order("nama_penuh", { ascending: true }),

            db
                .from("ahli_pasangan")
                .select("id, nama_penuh")
                .order("nama_penuh", { ascending: true })
        ]);

        if (ahliError) throw ahliError;
        if (pasanganError) throw pasanganError;

        senaraiPasangan = [
            ...(ahliData || []).map(ahli => ({
                id: ahli.id,
                nama_penuh: ahli.nama_penuh,
                sumber: "ahli_keluarga"
            })),

            ...(pasanganData || []).map(ahli => ({
                id: ahli.id,
                nama_penuh: ahli.nama_penuh,
                sumber: "ahli_pasangan"
            }))
        ];

        senaraiPasangan.sort((a, b) =>
            a.nama_penuh.localeCompare(b.nama_penuh, "ms")
        );

        ahliRujukanKedua.innerHTML =
            '<option value="">-- Tiada / Belum diketahui --</option>';

        senaraiPasangan.forEach(ahli => {
            const option = document.createElement("option");

            option.value = `${ahli.sumber}:${ahli.id}`;
            option.textContent =
                `${ahli.nama_penuh} (${ahli.sumber === "ahli_pasangan"
                    ? "Pasangan luar salasilah"
                    : "Ahli keluarga"})`;

            ahliRujukanKedua.appendChild(option);
        });
    }

    function pratontonGambar() {
        const fail = inputGambar.files[0];

        gambarDipilih = null;
        photoPreview.style.display = "none";
        photoPlaceholder.style.display = "flex";

        if (!fail) return;

        const jenisDibenarkan = [
            "image/jpeg",
            "image/png",
            "image/webp"
        ];

        if (!jenisDibenarkan.includes(fail.type)) {
            inputGambar.value = "";
            paparMesej(
                "Format gambar tidak dibenarkan. Gunakan JPG, PNG atau WEBP.",
                "error"
            );
            return;
        }

        if (fail.size > 5 * 1024 * 1024) {
            inputGambar.value = "";
            paparMesej("Saiz gambar melebihi had 5MB.", "error");
            return;
        }

        gambarDipilih = fail;

        const url = URL.createObjectURL(fail);
        photoPreview.src = url;
        photoPreview.style.display = "block";
        photoPlaceholder.style.display = "none";
        mesej.className = "";
    }

    async function muatNaikGambar(userId) {
        if (!gambarDipilih) return null;

        const sambungan = gambarDipilih.type === "image/png"
            ? "png"
            : gambarDipilih.type === "image/webp"
                ? "webp"
                : "jpg";

        const namaFail =
            Date.now() + "-" +
            Math.random().toString(36).slice(2, 10) +
            "." + sambungan;

        const laluan = `${userId}/${namaFail}`;

        const { error } = await db.storage
            .from("gambar-profil")
            .upload(laluan, gambarDipilih, {
                cacheControl: "3600",
                upsert: false,
                contentType: gambarDipilih.type
            });

        if (error) throw error;

        return laluan;
    }

    function kiraGenerasi(jenis, ahliDipilih) {
        if (!ahliDipilih || ahliDipilih.generasi == null) {
            return null;
        }

        const generasi = Number(ahliDipilih.generasi);

        if (jenis === "ANAK_KEPADA") return generasi + 1;
        if (jenis === "IBU_BAPA_KEPADA") return generasi - 1;
        if (jenis === "PASANGAN_KEPADA") return generasi;

        return null;
    }

    function binaDataCadangan(laluanGambar) {
        const jenis = jenisHubungan.value;
        const idRujukan = ahliRujukan.value;

        const ahliDipilih = senaraiAhli.find(
            ahli => ahli.id === idRujukan
        );

        const generasi = kiraGenerasi(jenis, ahliDipilih);

        let idRujukanKedua = null;
        let sumberRujukanKedua = null;

        if (
            jenis === "ANAK_KEPADA" &&
            ahliRujukanKedua.value
        ) {
            const bahagian =
                ahliRujukanKedua.value.split(":");

            sumberRujukanKedua = bahagian[0];
            idRujukanKedua = bahagian[1];
        }

        return {
            nama_penuh: nilai("nama_penuh"),
            jantina: nilai("jantina") || null,
            tarikh_lahir: nilai("tarikh_lahir") || null,
            tarikh_meninggal: nilai("tarikh_meninggal") || null,
            status_hidup: nilai("status_hidup") || "HIDUP",
            tempat_lahir: nilai("tempat_lahir") || null,
            tempat_asal: nilai("tempat_asal") || null,
            pekerjaan: nilai("pekerjaan") || null,
            gambar_url: laluanGambar,
            catatan: nilai("catatan") || null,
            generasi: generasi,

            hubungan: {
                jenis: jenis,
                id_ahli_rujukan: idRujukan || null,

                id_ahli_rujukan_kedua:
                    idRujukanKedua,

                sumber_ahli_rujukan_kedua:
                    sumberRujukanKedua,

                susunan_kelahiran:
                    jenis === "ANAK_KEPADA" && nilai("susunan")
                        ? Number(nilai("susunan"))
                        : null
            }
        };
    }

    async function hantarCadangan(event) {
        event.preventDefault();

        if (!pengguna || !pengguna.id) {
            paparMesej(
                "Sesi pengguna tidak sah. Sila log masuk semula.",
                "error"
            );
            return;
        }

        if (!nilai("nama_penuh")) {
            paparMesej("Nama penuh wajib diisi.", "error");
            return;
        }

        const jenis = jenisHubungan.value;

        if (jenis !== "BELUM_PASTI" && !ahliRujukan.value) {
            paparMesej(
                "Sila pilih ahli keluarga untuk hubungan yang dicadangkan.",
                "error"
            );
            return;
        }

        if (
            jenis === "ANAK_KEPADA" &&
            ahliRujukanKedua.value
        ) {
            const bahagian =
                ahliRujukanKedua.value.split(":");

            const sumber = bahagian[0];
            const idKedua = bahagian[1];

            if (
                !["ahli_keluarga", "ahli_pasangan"].includes(sumber) ||
                !idKedua
            ) {
                paparMesej(
                    "Pilihan ibu/bapa kedua tidak sah.",
                    "error"
                );
                return;
            }

            if (idKedua === ahliRujukan.value) {
                paparMesej(
                    "Ibu/bapa pertama dan kedua tidak boleh orang yang sama.",
                    "error"
                );
                return;
            }
        }

        const susunan = nilai("susunan");

        if (
            jenis === "ANAK_KEPADA" &&
            susunan &&
            (
                !Number.isInteger(Number(susunan)) ||
                Number(susunan) < 1
            )
        ) {
            paparMesej(
                "Susunan kelahiran mesti nombor bulat bermula daripada 1.",
                "error"
            );
            return;
        }

        if (
            nilai("status_hidup") === "MENINGGAL" &&
            nilai("tarikh_lahir") &&
            nilai("tarikh_meninggal") &&
            nilai("tarikh_meninggal") < nilai("tarikh_lahir")
        ) {
            paparMesej(
                "Tarikh meninggal tidak boleh lebih awal daripada tarikh lahir.",
                "error"
            );
            return;
        }

        btnHantar.disabled = true;
        btnHantar.textContent = "Sedang menghantar...";

        try {
            const laluanGambar =
                await muatNaikGambar(pengguna.id);

            const dataCadangan =
                binaDataCadangan(laluanGambar);

            const { error } = await db
                .from("cadangan_kemaskini")
                .insert({
                    user_id: pengguna.id,
                    jenis_cadangan: "TAMBAH_AHLI",
                    data_cadangan: dataCadangan,
                    catatan: nilai("catatan") || null,
                    status_cadangan: "MENUNGGU"
                });

            if (error) throw error;

            paparMesej(
                "Cadangan berjaya dihantar. Maklumat ahli akan disemak oleh pentadbir sebelum dimasukkan ke dalam salasilah.",
                "success"
            );

            form.reset();
            gambarDipilih = null;
            photoPreview.style.display = "none";
            photoPlaceholder.style.display = "flex";

            kemasKiniJenisHubungan();

        } catch (error) {
            console.error("Ralat hantar cadangan:", error);

            paparMesej(
                "Cadangan tidak berjaya dihantar: " +
                (error.message || "Sila cuba semula."),
                "error"
            );
        } finally {
            btnHantar.disabled = false;
            btnHantar.textContent = "Hantar Cadangan";
        }
    }

    async function mula() {
        if (!db) {
            paparMesej(
                "Supabase belum disambungkan. Semak supabase-config.js.",
                "error"
            );
            return;
        }

        if (typeof window.sahkanAkses !== "function") {
            paparMesej(
                "Fail auth-guard.js tidak berjaya dimuatkan.",
                "error"
            );
            return;
        }

        try {
            pengguna = await window.sahkanAkses();

            if (!pengguna) return;

            await muatSenaraiAhli();
            await muatSenaraiPasangan();

            jenisHubungan.addEventListener(
                "change",
                kemasKiniJenisHubungan
            );

            inputGambar.addEventListener(
                "change",
                pratontonGambar
            );

            form.addEventListener(
                "submit",
                hantarCadangan
            );

            kemasKiniJenisHubungan();

        } catch (error) {
            console.error(error);

            paparMesej(
                "Tidak dapat memulakan borang: " + error.message,
                "error"
            );
        }
    }

    document.addEventListener("DOMContentLoaded", mula);
})();

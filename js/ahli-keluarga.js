
(function () {
    "use strict";

    const db = window.supabaseClient;

    let semuaAhli = [];
    let ahliDipilih = null;
    let penggunaSemasa = null;

    const el = id => document.getElementById(id);

    function mesej(teks, jenis = "info") {
        const node = el("mesej");
        if (!node) return;

        node.textContent = teks;
        node.style.color =
            jenis === "error" ? "#a83d32" :
            jenis === "success" ? "#287a45" : "#493522";
    }

    function teksAman(tag, teks, kelas = "") {
        const node = document.createElement(tag);
        node.textContent = teks ?? "";
        if (kelas) node.className = kelas;
        return node;
    }

    function formatTarikh(tarikh) {
        if (!tarikh) return "-";

        const bahagian = tarikh.split("-");
        if (bahagian.length !== 3) return tarikh;

        return `${bahagian[2]}-${bahagian[1]}-${bahagian[0]}`;
    }

    function bolehUrus(ahli) {
        if (!penggunaSemasa) return false;

        // Admin boleh mengurus semua rekod
        if (penggunaSemasa.peranan === "ADMIN") return true;

        // Ahli biasa hanya boleh mengurus rekod miliknya sendiri
        return (
            ahli.created_by === penggunaSemasa.id &&
            ahli.rekod_asal === false
        );
    }

    async function semakAkses() {
        if (!db) {
            throw new Error("Sambungan Supabase tidak dijumpai.");
        }

        if (typeof window.sahkanAkses !== "function") {
            throw new Error("Fungsi pengesahan akses tidak dijumpai.");
        }

        penggunaSemasa = await window.sahkanAkses();

        if (!penggunaSemasa) return false;

        return true;
    }


async function muatAhli() {
    mesej("Memuatkan senarai ahli...");

    const [
        { data: dataAhli, error: errorAhli },
        { data: dataPasangan, error: errorPasangan },
        { data: dataKeturunan, error: errorKeturunan }
    ] = await Promise.all([
        db.from("ahli_keluarga")
            .select(`
                id,
                nama_penuh,
                jantina,
                tarikh_lahir,
                tarikh_meninggal,
                status_hidup,
                tempat_lahir,
                tempat_asal,
                pekerjaan,
                gambar_url,
                catatan,
                generasi,
                created_by,
                rekod_asal
            `)
            .order("generasi", { ascending: true })
            .order("nama_penuh", { ascending: true }),

        db.from("hubungan_pasangan")
            .select("pasangan_1, pasangan_2"),

        db.from("hubungan_ibubapa_anak")
            .select("id_ibubapa, id_ibubapa_pasangan, id_anak")
    ]);

    if (errorAhli) {
        console.error(errorAhli);
        mesej("Gagal memuatkan ahli: " + errorAhli.message, "error");
        return;
    }

    if (errorPasangan) {
        console.error(errorPasangan);
        mesej("Gagal memuatkan hubungan pasangan: " + errorPasangan.message, "error");
        return;
    }

    if (errorKeturunan) {
        console.error(errorKeturunan);
        mesej("Gagal memuatkan hubungan keturunan: " + errorKeturunan.message, "error");
        return;
    }

    const semuaRekod = dataAhli || [];
    const senaraiPasangan = dataPasangan || [];
    const senaraiKeturunan = dataKeturunan || [];

    // Kenal pasti individu yang mempunyai hubungan pasangan.
    const idPasangan = new Set();

    senaraiPasangan.forEach(h => {
        if (h.pasangan_1) idPasangan.add(h.pasangan_1);
        if (h.pasangan_2) idPasangan.add(h.pasangan_2);
    });

    // Kenal pasti individu yang mempunyai hubungan keturunan.
    const idKeturunan = new Set();

    senaraiKeturunan.forEach(h => {
        if (h.id_ibubapa) idKeturunan.add(h.id_ibubapa);
        if (h.id_ibubapa_pasangan) idKeturunan.add(h.id_ibubapa_pasangan);
        if (h.id_anak) idKeturunan.add(h.id_anak);
    });

    // Pasangan sahaja tanpa hubungan keturunan
    // tidak dimasukkan dalam senarai ahli keluarga.
    semuaAhli = semuaRekod.filter(ahli => {
        const pasanganSahaja =
            idPasangan.has(ahli.id) &&
            !idKeturunan.has(ahli.id);

        return !pasanganSahaja;
    });

    binaPilihanGenerasi();
    paparSenarai();

    mesej(
        `${semuaAhli.length} rekod ahli keluarga berjaya dimuatkan.`,
        "success"
    );
}


    function binaPilihanGenerasi() {
        const pilih = el("tapisGenerasi");
        const nilaiLama = pilih.value;

        pilih.replaceChildren();

        pilih.appendChild(
            teksAman("option", "Semua Generasi")
        );
        pilih.options[0].value = "";

        const generasi = [
            ...new Set(
                semuaAhli
                    .map(a => a.generasi)
                    .filter(g => g !== null && g !== undefined)
            )
        ].sort((a, b) => a - b);

        generasi.forEach(g => {
            const option = teksAman("option", `Generasi ${g}`);
            option.value = String(g);
            pilih.appendChild(option);
        });

        pilih.value = nilaiLama;
    }

    function paparSenarai() {
        const tbody = el("senaraiAhli");
        tbody.replaceChildren();

        const carian = el("carian").value.trim().toLowerCase();
        const generasi = el("tapisGenerasi").value;

        const hasil = semuaAhli.filter(ahli => {
            const padanNama = (ahli.nama_penuh || "")
                .toLowerCase()
                .includes(carian);

            const padanGenerasi =
                !generasi ||
                String(ahli.generasi) === generasi;

            return padanNama && padanGenerasi;
        });

        if (!hasil.length) {
            const tr = document.createElement("tr");
            const td = teksAman("td", "Tiada ahli dijumpai.");
            td.colSpan = 5;
            tr.appendChild(td);
            tbody.appendChild(tr);
            return;
        }

        hasil.forEach(ahli => {
            const tr = document.createElement("tr");

            tr.appendChild(
                teksAman("td", ahli.nama_penuh)
            );

            tr.appendChild(
                teksAman(
                    "td",
                    ahli.generasi
                        ? `Generasi ${ahli.generasi}`
                        : "Belum ditetapkan"
                )
            );

            tr.appendChild(
                teksAman("td", ahli.status_hidup || "-")
            );

            tr.appendChild(
                teksAman(
                    "td",
                    ahli.rekod_asal
                        ? "Rekod Asal"
                        : "Rekod Pengguna",
                    ahli.rekod_asal
                        ? "status-asal"
                        : "status-pengguna"
                )
            );

            const tindakan = document.createElement("td");

            const btnProfil = teksAman(
                "button",
                "Profil",
                "btn-utama"
            );
            btnProfil.type = "button";
            btnProfil.addEventListener("click", () => {
                paparProfil(ahli.id);
            });

            tindakan.appendChild(btnProfil);

            if (bolehUrus(ahli)) {
                const btnEdit = teksAman(
                    "button",
                    "Edit",
                    "btn-edit"
                );
                btnEdit.type = "button";
                btnEdit.addEventListener("click", () => {
                    bukaEdit(ahli.id);
                });

                const btnPadam = teksAman(
                    "button",
                    "Padam",
                    "btn-padam"
                );
                btnPadam.type = "button";
                btnPadam.addEventListener("click", () => {
                    padamAhli(ahli.id);
                });

                tindakan.append(btnEdit, btnPadam);
            }

            tr.appendChild(tindakan);
            tbody.appendChild(tr);
        });
    }

    async function urlGambar(path) {
        if (!path) return null;

        if (/^https?:\/\//i.test(path)) {
            return path;
        }

        const { data, error } = await db.storage
            .from("gambar-profil")
            .createSignedUrl(path, 3600);

        if (error) {
            console.error("Ralat gambar:", error);
            return null;
        }

        return data?.signedUrl || null;
    }


    let previewObjectUrl = null;

    function paparPratontonGambar() {
        const input = el("editGambar");
        const preview = el("previewEditGambar");
        const fail = input.files?.[0];

        if (previewObjectUrl) {
            URL.revokeObjectURL(previewObjectUrl);
            previewObjectUrl = null;
        }

        if (!fail) {
            preview.src = "";
            preview.style.display = "none";
            return;
        }

        const jenisDibenarkan = [
            "image/jpeg",
            "image/png",
            "image/webp"
        ];

        if (!jenisDibenarkan.includes(fail.type)) {
            alert("Sila pilih gambar JPG, PNG atau WEBP sahaja.");
            input.value = "";
            preview.src = "";
            preview.style.display = "none";
            return;
        }

        if (fail.size > 5 * 1024 * 1024) {
            alert("Saiz gambar melebihi 5MB.");
            input.value = "";
            preview.src = "";
            preview.style.display = "none";
            return;
        }

        previewObjectUrl = URL.createObjectURL(fail);
        preview.src = previewObjectUrl;
        preview.style.display = "block";
    }

    async function muatNaikGambar(fail, idAhli) {
        if (!fail) return null;

        const jenisFail = {
            "image/jpeg": "jpg",
            "image/png": "png",
            "image/webp": "webp"
        };

        const sambungan = jenisFail[fail.type];

        if (!sambungan) {
            throw new Error("Format gambar tidak disokong.");
        }

        if (fail.size > 5 * 1024 * 1024) {
            throw new Error("Saiz gambar tidak boleh melebihi 5MB.");
        }

        const namaFail =
            `${penggunaSemasa.id}/${idAhli}/` +
            `${Date.now()}-${Math.random().toString(36).slice(2)}.${sambungan}`;

        const { data, error } = await db.storage
            .from("gambar-profil")
            .upload(namaFail, fail, {
                contentType: fail.type,
                upsert: false
            });

        if (error) {
            throw new Error("Gagal memuat naik gambar: " + error.message);
        }

        return data.path;
    }




    
    async function paparProfil(id) {
        const ahli = semuaAhli.find(a => a.id === id);
        if (!ahli) return;

        ahliDipilih = ahli;

        const panel = el("panelProfil");
        const kandungan = el("butiranProfil");

        panel.hidden = false;
        kandungan.replaceChildren();

        const susun = document.createElement("div");
        susun.className = "profil";

        const gambar = document.createElement("img");
        gambar.alt = "Gambar profil " + ahli.nama_penuh;
        gambar.src = "";

        const maklumat = document.createElement("div");

        maklumat.appendChild(
            teksAman("h3", ahli.nama_penuh)
        );

        const senarai = [
            ["Jantina", ahli.jantina],
            ["Tarikh lahir", formatTarikh(ahli.tarikh_lahir)],
            ["Tarikh meninggal", formatTarikh(ahli.tarikh_meninggal)],
            ["Status hidup", ahli.status_hidup],
            ["Generasi", ahli.generasi],
            ["Tempat lahir", ahli.tempat_lahir],
            ["Tempat asal", ahli.tempat_asal],
            ["Pekerjaan", ahli.pekerjaan],
            ["Catatan", ahli.catatan],
            ["Jenis rekod", ahli.rekod_asal ? "Rekod Asal" : "Rekod Pengguna"]
        ];

        senarai.forEach(([label, nilai]) => {
            const p = document.createElement("p");
            const strong = teksAman("strong", label + ": ");
            p.append(strong, document.createTextNode(
                nilai === null || nilai === undefined || nilai === ""
                    ? "-"
                    : String(nilai)
            ));
            maklumat.appendChild(p);
        });

        susun.append(gambar, maklumat);
        kandungan.appendChild(susun);

        if (ahli.gambar_url) {
            const url = await urlGambar(ahli.gambar_url);

            if (ahliDipilih?.id !== id) return;

            if (url) {
                gambar.src = url;
            } else {
                gambar.alt = "Gambar tidak dapat dimuatkan";
            }
        }

        if (bolehUrus(ahli)) {
            const btn = teksAman("button", "Edit Maklumat", "btn-edit");
            btn.type = "button";
            btn.addEventListener("click", () => bukaEdit(id));
            kandungan.appendChild(btn);
        }

        const tutup = teksAman("button", "Tutup", "btn-utama");
        tutup.type = "button";
        tutup.style.marginLeft = "8px";
        tutup.addEventListener("click", () => {
            panel.hidden = true;
            ahliDipilih = null;
        });

        kandungan.appendChild(tutup);

        panel.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }

    function bukaEdit(id) {
        const ahli = semuaAhli.find(a => a.id === id);
        if (!ahli) return;

        if (!bolehUrus(ahli)) {
            alert("Anda tidak mempunyai kebenaran mengedit rekod ini.");
            return;
        }

        ahliDipilih = ahli;

        el("editId").value = ahli.id;
        el("editNama").value = ahli.nama_penuh || "";
        el("editJantina").value = ahli.jantina || "";
        el("editLahir").value = ahli.tarikh_lahir || "";
        el("editStatus").value = ahli.status_hidup || "HIDUP";
        el("editMeninggal").value = ahli.tarikh_meninggal || "";
        el("editGenerasi").value = ahli.generasi ?? "";
        el("editTempatLahir").value = ahli.tempat_lahir || "";
        el("editTempatAsal").value = ahli.tempat_asal || "";
        el("editPekerjaan").value = ahli.pekerjaan || "";
        el("editCatatan").value = ahli.catatan || "";
        
        el("editGambar").value = "";
        el("previewEditGambar").src = "";
        el("previewEditGambar").style.display = "none";

        if (previewObjectUrl) {
            URL.revokeObjectURL(previewObjectUrl);
            previewObjectUrl = null;
        }

        el("panelEdit").hidden = false;

        el("panelEdit").scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }

    async function simpanEdit(event) {
        event.preventDefault();

        const id = el("editId").value;
        const ahli = semuaAhli.find(a => a.id === id);

        if (!ahli || !bolehUrus(ahli)) {
            alert("Akses mengedit rekod ini tidak dibenarkan.");
            return;
        }

        const nama = el("editNama").value.trim();

        if (!nama) {
            alert("Nama penuh wajib diisi.");
            return;
        }

        const status = el("editStatus").value;
        const tarikhMeninggal = el("editMeninggal").value;

        if (status === "MENINGGAL" && !tarikhMeninggal) {
            if (!confirm(
                "Tarikh meninggal belum diisi. Teruskan simpan?"
            )) return;
        }

        const perubahan = {
            nama_penuh: nama,
            jantina: el("editJantina").value || null,
            tarikh_lahir: el("editLahir").value || null,
            status_hidup: status,
            tarikh_meninggal: tarikhMeninggal || null,
            generasi: el("editGenerasi").value
                ? Number(el("editGenerasi").value)
                : null,
            tempat_lahir: el("editTempatLahir").value.trim() || null,
            tempat_asal: el("editTempatAsal").value.trim() || null,
            pekerjaan: el("editPekerjaan").value.trim() || null,
            catatan: el("editCatatan").value.trim() || null,
            updated_at: new Date().toISOString()
        };

        if (
            perubahan.generasi !== null &&
            (!Number.isInteger(perubahan.generasi) ||
             perubahan.generasi < 1)
        ) {
            alert("Nombor generasi tidak sah.");
            return;
        }

        if (perubahan.status_hidup !== "MENINGGAL") {
            perubahan.tarikh_meninggal = null;
        }

        const butang = el("formEdit").querySelector(
            'button[type="submit"]'
        );

        butang.disabled = true;
        butang.textContent = "Menyimpan...";


        let gambarBaharu = null;

        try {
            const failGambar = el("editGambar").files?.[0];

            if (failGambar) {
                butang.textContent = "Memuat naik gambar...";

                gambarBaharu = await muatNaikGambar(
                    failGambar,
                    id
                );

                perubahan.gambar_url = gambarBaharu;
            }

            butang.textContent = "Menyimpan maklumat...";

            const { error } = await db
                .from("ahli_keluarga")
                .update(perubahan)
                .eq("id", id);

            if (error) {
                // Padam gambar baharu jika kemas kini database gagal
                if (gambarBaharu) {
                    await db.storage
                        .from("gambar-profil")
                        .remove([gambarBaharu]);
                }

                throw error;
            }

            el("panelEdit").hidden = true;

            el("editGambar").value = "";

            if (previewObjectUrl) {
                URL.revokeObjectURL(previewObjectUrl);
                previewObjectUrl = null;
            }

            await muatAhli();

            const ahliTerkini = semuaAhli.find(a => a.id === id);

            if (ahliTerkini) {
                paparProfil(id);
            }

            alert("Maklumat dan gambar ahli berjaya dikemas kini.");

        } catch (error) {
            console.error(error);
            alert("Gagal mengemas kini: " + error.message);

        } finally {
            butang.disabled = false;
            butang.textContent = "Simpan Perubahan";
        }

        el("panelEdit").hidden = true;

        await muatAhli();

        const ahliTerkini = semuaAhli.find(a => a.id === id);

        if (ahliTerkini) {
            paparProfil(id);
        }

        alert("Maklumat ahli berjaya dikemas kini.");
    }

    async function padamAhli(id) {
        const ahli = semuaAhli.find(a => a.id === id);
        if (!ahli) return;

        if (!bolehUrus(ahli)) {
            alert("Anda tidak mempunyai kebenaran memadam rekod ini.");
            return;
        }

        const sah = confirm(
            `Adakah anda pasti mahu memadam rekod ${ahli.nama_penuh}?\n\n` +
            "Tindakan ini tidak boleh dibatalkan."
        );

        if (!sah) return;

        const { error } = await db
            .from("ahli_keluarga")
            .delete()
            .eq("id", id);

        if (error) {
            console.error(error);
            alert(
                "Gagal memadam rekod: " + error.message +
                "\n\nJika ahli mempunyai hubungan keluarga, hubungan itu " +
                "mungkin perlu diuruskan oleh admin terlebih dahulu."
            );
            return;
        }

        el("panelProfil").hidden = true;
        el("panelEdit").hidden = true;
        ahliDipilih = null;

        await muatAhli();

        alert("Rekod ahli berjaya dipadam.");
    }

    async function mula() {
        try {
            const dibenarkan = await semakAkses();

            if (!dibenarkan) return;

            el("carian").addEventListener("input", paparSenarai);
            el("tapisGenerasi").addEventListener("change", paparSenarai);

            el("btnMuatSemula").addEventListener("click", muatAhli);

            el("formEdit").addEventListener("submit", simpanEdit);
            el("editGambar").addEventListener(
    "change",
    paparPratontonGambar
);
            el("btnBatalEdit").addEventListener("click", () => {
                el("panelEdit").hidden = true;
            });

            await muatAhli();

        } catch (error) {
            console.error(error);
            mesej(
                error.message || "Ralat membuka pengurusan ahli.",
                "error"
            );
        }
    }

    document.addEventListener("DOMContentLoaded", mula);

})();

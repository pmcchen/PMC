
(function () {
    "use strict";

    const db = window.supabaseClient;

    let semuaAhli = [];
    let semuaIbubapa = [];
    let semuaPasangan = [];
    let penggunaSemasa = null;

    const el = id => document.getElementById(id);

    function mesej(teks, jenis = "info") {
        const node = el("mesej");
        node.textContent = teks;
        node.style.color =
            jenis === "error" ? "#a83d32" :
            jenis === "success" ? "#287a45" : "#493522";
    }

    function selamat(teks) {
        return teks === null || teks === undefined ? "" : String(teks);
    }

    function namaAhli(id) {
        return semuaAhli.find(a => a.id === id)?.nama_penuh || "Tidak diketahui";
    }

    function pilihanAhli(selectId, nilai = "") {
        const pilih = el(selectId);
        pilih.replaceChildren();

        const awal = document.createElement("option");
        awal.value = "";
        awal.textContent = "Pilih ahli keluarga";
        pilih.appendChild(awal);

        semuaAhli.forEach(ahli => {
            const option = document.createElement("option");
            option.value = ahli.id;
            option.textContent = ahli.nama_penuh;
            pilih.appendChild(option);
        });

        pilih.value = nilai || "";
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

        if (penggunaSemasa.peranan !== "ADMIN") {
            alert("Halaman ini hanya untuk ADMIN.");
            location.replace("dashboard.html");
            return false;
        }

        return true;
    }

    async function muatAhli() {
        const { data, error } = await db
            .from("ahli_keluarga")
            .select("id,nama_penuh,generasi")
            .order("nama_penuh");

        if (error) throw error;

        semuaAhli = data || [];

        [
            "pilihIbubapa",
            "pilihAnak",
            "pilihPasangan1",
            "pilihPasangan2"
        ].forEach(id => pilihanAhli(id));
    }

    async function muatHubunganIbubapa() {
        const { data, error } = await db
            .from("hubungan_ibubapa_anak")
            .select(`
                id,
                id_ibubapa,
                id_anak,
                jenis_hubungan,
                susunan_kelahiran,
                catatan
            `);

        if (error) throw error;

        semuaIbubapa = data || [];
        paparIbubapa();
    }

    async function muatHubunganPasangan() {
        const { data, error } = await db
            .from("hubungan_pasangan")
            .select(`
                id,
                pasangan_1,
                pasangan_2,
                status_hubungan,
                tarikh_perkahwinan,
                tarikh_perpisahan,
                catatan
            `);

        if (error) throw error;

        semuaPasangan = data || [];
        paparPasangan();
    }

    function paparIbubapa() {
        const tbody = el("senaraiIbubapa");
        tbody.replaceChildren();

        const carian = el("carianIbubapa").value.trim().toLowerCase();

        const hasil = semuaIbubapa.filter(h => {
            return (
                namaAhli(h.id_ibubapa).toLowerCase().includes(carian) ||
                namaAhli(h.id_anak).toLowerCase().includes(carian)
            );
        });

        if (!hasil.length) {
            const tr = document.createElement("tr");
            const td = document.createElement("td");
            td.colSpan = 5;
            td.textContent = "Tiada rekod hubungan.";
            tr.appendChild(td);
            tbody.appendChild(tr);
            return;
        }

        hasil.forEach(h => {
            const tr = document.createElement("tr");

            [
                namaAhli(h.id_ibubapa),
                namaAhli(h.id_anak),
                h.jenis_hubungan || "-",
                h.susunan_kelahiran ?? "-"
            ].forEach(nilai => {
                const td = document.createElement("td");
                td.textContent = selamat(nilai);
                tr.appendChild(td);
            });

            const tindakan = document.createElement("td");

            const edit = document.createElement("button");
            edit.type = "button";
            edit.className = "btn-edit";
            edit.textContent = "Edit";
            edit.addEventListener("click", () => bukaEditIbubapa(h));

            const padam = document.createElement("button");
            padam.type = "button";
            padam.className = "btn-padam";
            padam.textContent = "Padam";
            padam.addEventListener("click", () => padamIbubapa(h));

            tindakan.append(edit, padam);
            tr.appendChild(tindakan);
            tbody.appendChild(tr);
        });
    }

    function paparPasangan() {
        const tbody = el("senaraiPasangan");
        tbody.replaceChildren();

        const carian = el("carianPasangan").value.trim().toLowerCase();

        const hasil = semuaPasangan.filter(h => {
            return (
                namaAhli(h.pasangan_1).toLowerCase().includes(carian) ||
                namaAhli(h.pasangan_2).toLowerCase().includes(carian)
            );
        });

        if (!hasil.length) {
            const tr = document.createElement("tr");
            const td = document.createElement("td");
            td.colSpan = 5;
            td.textContent = "Tiada rekod pasangan.";
            tr.appendChild(td);
            tbody.appendChild(tr);
            return;
        }

        hasil.forEach(h => {
            const tr = document.createElement("tr");

            [
                namaAhli(h.pasangan_1),
                namaAhli(h.pasangan_2),
                h.status_hubungan || "-",
                h.tarikh_perkahwinan || "-"
            ].forEach(nilai => {
                const td = document.createElement("td");
                td.textContent = selamat(nilai);
                tr.appendChild(td);
            });

            const tindakan = document.createElement("td");

            const edit = document.createElement("button");
            edit.type = "button";
            edit.className = "btn-edit";
            edit.textContent = "Edit";
            edit.addEventListener("click", () => bukaEditPasangan(h));

            const padam = document.createElement("button");
            padam.type = "button";
            padam.className = "btn-padam";
            padam.textContent = "Padam";
            padam.addEventListener("click", () => padamPasangan(h));

            tindakan.append(edit, padam);
            tr.appendChild(tindakan);
            tbody.appendChild(tr);
        });
    }

    function resetIbubapa() {
        el("ibubapaId").value = "";
        el("formIbubapa").reset();
        el("btnSimpanIbubapa").textContent = "Simpan Hubungan";
    }

    function resetPasangan() {
        el("pasanganId").value = "";
        el("formPasangan").reset();
        el("btnSimpanPasangan").textContent = "Simpan Pasangan";
    }

    function bukaEditIbubapa(h) {
        el("ibubapaId").value = h.id;
        el("pilihIbubapa").value = h.id_ibubapa;
        el("pilihAnak").value = h.id_anak;
        el("jenisHubungan").value = h.jenis_hubungan || "BIOLOGI";
        el("susunanKelahiran").value = h.susunan_kelahiran ?? "";
        el("catatanIbubapa").value = h.catatan || "";

        el("btnSimpanIbubapa").textContent = "Kemas Kini Hubungan";
        el("bahagianIbubapa").scrollIntoView({ behavior: "smooth" });
    }

    function bukaEditPasangan(h) {
        el("pasanganId").value = h.id;
        el("pilihPasangan1").value = h.pasangan_1;
        el("pilihPasangan2").value = h.pasangan_2;
        el("statusHubungan").value = h.status_hubungan || "BERKAHWIN";
        el("tarikhPerkahwinan").value = h.tarikh_perkahwinan || "";
        el("tarikhPerpisahan").value = h.tarikh_perpisahan || "";
        el("catatanPasangan").value = h.catatan || "";

        el("btnSimpanPasangan").textContent = "Kemas Kini Pasangan";
        el("bahagianPasangan").scrollIntoView({ behavior: "smooth" });
    }

    async function simpanIbubapa(event) {
        event.preventDefault();

        const id = el("ibubapaId").value;
        const ibubapa = el("pilihIbubapa").value;
        const anak = el("pilihAnak").value;
        const susunan = el("susunanKelahiran").value;

        if (!ibubapa || !anak) {
            alert("Sila pilih ibu/bapa dan anak.");
            return;
        }

        if (ibubapa === anak) {
            alert("Ahli tidak boleh menjadi ibu/bapa kepada dirinya sendiri.");
            return;
        }

        const perubahan = {
            id_ibubapa: ibubapa,
            id_anak: anak,
            jenis_hubungan: el("jenisHubungan").value,
            susunan_kelahiran: susunan ? Number(susunan) : null,
            catatan: el("catatanIbubapa").value.trim() || null
        };

        if (
            perubahan.susunan_kelahiran !== null &&
            (!Number.isInteger(perubahan.susunan_kelahiran) ||
             perubahan.susunan_kelahiran < 1)
        ) {
            alert("Susunan kelahiran mesti nombor 1 atau lebih.");
            return;
        }

        const pendua = semuaIbubapa.find(h =>
            h.id_ibubapa === ibubapa &&
            h.id_anak === anak &&
            h.id !== id
        );

        if (pendua) {
            alert("Hubungan ibu/bapa dan anak ini sudah wujud.");
            return;
        }

        const butang = el("btnSimpanIbubapa");
        butang.disabled = true;

        try {
            const hasil = id
                ? await db.from("hubungan_ibubapa_anak")
                    .update(perubahan).eq("id", id)
                : await db.from("hubungan_ibubapa_anak")
                    .insert(perubahan);

            if (hasil.error) throw hasil.error;

            resetIbubapa();
            await muatHubunganIbubapa();

            mesej("Hubungan ibu bapa dan anak berjaya disimpan.", "success");

        } catch (error) {
            console.error(error);
            mesej("Gagal menyimpan hubungan: " + error.message, "error");
            alert(error.message);

        } finally {
            butang.disabled = false;
        }
    }

    async function simpanPasangan(event) {
        event.preventDefault();

        const id = el("pasanganId").value;
        const pertama = el("pilihPasangan1").value;
        const kedua = el("pilihPasangan2").value;

        if (!pertama || !kedua) {
            alert("Sila pilih kedua-dua pasangan.");
            return;
        }

        if (pertama === kedua) {
            alert("Seseorang tidak boleh menjadi pasangan dirinya sendiri.");
            return;
        }

        const pendua = semuaPasangan.find(h => {
            const sama =
                (h.pasangan_1 === pertama && h.pasangan_2 === kedua) ||
                (h.pasangan_1 === kedua && h.pasangan_2 === pertama);

            return sama && h.id !== id;
        });

        if (pendua) {
            alert("Hubungan pasangan ini sudah wujud.");
            return;
        }

        const perubahan = {
            pasangan_1: pertama,
            pasangan_2: kedua,
            status_hubungan: el("statusHubungan").value,
            tarikh_perkahwinan: el("tarikhPerkahwinan").value || null,
            tarikh_perpisahan: el("tarikhPerpisahan").value || null,
            catatan: el("catatanPasangan").value.trim() || null
        };

        const butang = el("btnSimpanPasangan");
        butang.disabled = true;

        try {
            const hasil = id
                ? await db.from("hubungan_pasangan")
                    .update(perubahan).eq("id", id)
                : await db.from("hubungan_pasangan")
                    .insert(perubahan);

            if (hasil.error) throw hasil.error;

            resetPasangan();
            await muatHubunganPasangan();

            mesej("Hubungan pasangan berjaya disimpan.", "success");

        } catch (error) {
            console.error(error);
            mesej("Gagal menyimpan pasangan: " + error.message, "error");
            alert(error.message);

        } finally {
            butang.disabled = false;
        }
    }

    async function padamIbubapa(h) {
        if (!confirm(
            `Padam hubungan ${namaAhli(h.id_ibubapa)} → ${namaAhli(h.id_anak)}?`
        )) return;

        const { error } = await db
            .from("hubungan_ibubapa_anak")
            .delete()
            .eq("id", h.id);

        if (error) {
            alert("Gagal memadam: " + error.message);
            return;
        }

        await muatHubunganIbubapa();
        mesej("Hubungan berjaya dipadam.", "success");
    }

    async function padamPasangan(h) {
        if (!confirm(
            `Padam hubungan ${namaAhli(h.pasangan_1)} dan ${namaAhli(h.pasangan_2)}?`
        )) return;

        const { error } = await db
            .from("hubungan_pasangan")
            .delete()
            .eq("id", h.id);

        if (error) {
            alert("Gagal memadam: " + error.message);
            return;
        }

        await muatHubunganPasangan();
        mesej("Hubungan pasangan berjaya dipadam.", "success");
    }

    function tukarTab(tab) {
        const ibubapa = tab === "ibubapa";

        el("bahagianIbubapa").classList.toggle("hidden", !ibubapa);
        el("bahagianPasangan").classList.toggle("hidden", ibubapa);

        el("tabIbubapa").className =
            ibubapa ? "tab-aktif" : "tab-biasa";

        el("tabPasangan").className =
            ibubapa ? "tab-biasa" : "tab-aktif";
    }

    async function mula() {
        try {
            const dibenarkan = await semakAkses();
            if (!dibenarkan) return;

            el("tabIbubapa").addEventListener("click", () => tukarTab("ibubapa"));
            el("tabPasangan").addEventListener("click", () => tukarTab("pasangan"));

            el("formIbubapa").addEventListener("submit", simpanIbubapa);
            el("formPasangan").addEventListener("submit", simpanPasangan);

            el("btnBatalIbubapa").addEventListener("click", resetIbubapa);
            el("btnBatalPasangan").addEventListener("click", resetPasangan);

            el("carianIbubapa").addEventListener("input", paparIbubapa);
            el("carianPasangan").addEventListener("input", paparPasangan);

            await muatAhli();
            await muatHubunganIbubapa();
            await muatHubunganPasangan();

            mesej(
                "Pengurusan hubungan keluarga berjaya dimuatkan.",
                "success"
            );

        } catch (error) {
            console.error(error);
            mesej(
                "Ralat memuatkan pengurusan hubungan: " + error.message,
                "error"
            );
        }
    }

    document.addEventListener("DOMContentLoaded", mula);

})();

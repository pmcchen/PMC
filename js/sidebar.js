
(() => {
    "use strict";

    function binaSidebar() {
        const kandungan = document.querySelector(".app-content");

        if (!kandungan) {
            console.warn("Elemen .app-content tidak dijumpai.");
            return;
        }

        // Elakkan sidebar berganda
        if (document.getElementById("sidebar")) return;

        const sidebarHTML = `
            <aside class="sidebar" id="sidebar">

                <div class="sidebar-brand">
                    <div class="brand-logo">م</div>

                    <h2>
                        SALASILAH KELUARGA<br>
                        POK MARK CHENDOL
                    </h2>

                    <p>Arkib dan Warisan Keluarga</p>

                    <div class="brand-decoration">
                        ✦ ━ ✦ ━ ✦
                    </div>
                </div>

                <div class="menu-label">Menu Utama</div>

                <nav class="sidebar-menu">

                    <a href="dashboard.html" class="nav-link">
                        <span class="nav-icon">⌂</span>
                        Dashboard
                    </a>

                    <a href="salasilah.html" class="nav-link">
                        <span class="nav-icon">🌳</span>
                        Pohon Salasilah
                    </a>

                    <a href="ahli-keluarga.html" class="nav-link">
                        <span class="nav-icon">♧</span>
                        Ahli Keluarga
                    </a>

                    <a href="sejarah-keluarga.html" class="nav-link">
                        <span class="nav-icon">📜</span>
                        Sejarah Keluarga
                    </a>

                    <a href="galeri.html" class="nav-link">
                        <span class="nav-icon">▧</span>
                        Galeri Keluarga
                    </a>

                    <a href="cadangan.html" class="nav-link">
                        <span class="nav-icon">✍</span>
                        Cadangan Maklumat
                    </a>

                    <div class="menu-label">Pengurusan</div>

                    <a href="pengurusan-ahli.html" class="nav-link">
                        <span class="nav-icon">♙</span>
                        Pengurusan Ahli
                    </a>

                    <a href="pengurusan-hubungan.html" class="nav-link">
                        <span class="nav-icon">⌘</span>
                        Pengurusan Hubungan
                    </a>

                    <a href="admin.html" class="nav-link">
                        <span class="nav-icon">⚜</span>
                        Pentadbiran
                    </a>

                </nav>

                <div class="sidebar-bottom">
                    ✦ Warisan Keluarga, Amanah Generasi ✦
                </div>

            </aside>

            <div
                class="sidebar-overlay"
                id="sidebarOverlay"
            ></div>
        `;

        kandungan.insertAdjacentHTML("beforebegin", sidebarHTML);

        const sidebar = document.getElementById("sidebar");
        const overlay = document.getElementById("sidebarOverlay");

        // Butang menu mobile
        const topbarTitle = document.querySelector(".topbar-title");

        let btnMenu = document.getElementById("btnMenu");

        if (topbarTitle && !btnMenu) {
            btnMenu = document.createElement("button");
            btnMenu.id = "btnMenu";
            btnMenu.className = "mobile-menu-btn";
            btnMenu.type = "button";
            btnMenu.setAttribute("aria-label", "Buka menu");
            btnMenu.setAttribute("aria-expanded", "false");
            btnMenu.textContent = "☰";

            topbarTitle.insertBefore(
                btnMenu,
                topbarTitle.firstChild
            );
        }

        function bukaMenu() {
            sidebar.classList.add("open");
            overlay.classList.add("show");

            if (btnMenu) {
                btnMenu.setAttribute("aria-expanded", "true");
            }
        }

        function tutupMenu() {
            sidebar.classList.remove("open");
            overlay.classList.remove("show");

            if (btnMenu) {
                btnMenu.setAttribute("aria-expanded", "false");
            }
        }

        if (btnMenu) {
            btnMenu.addEventListener("click", () => {
                if (sidebar.classList.contains("open")) {
                    tutupMenu();
                } else {
                    bukaMenu();
                }
            });
        }

        overlay.addEventListener("click", tutupMenu);

        sidebar.querySelectorAll(".nav-link").forEach(link => {
            link.addEventListener("click", tutupMenu);
        });

        document.addEventListener("keydown", event => {
            if (event.key === "Escape") {
                tutupMenu();
            }
        });

        // Tentukan menu aktif mengikut nama fail
        const halamanSemasa = (
            window.location.pathname.split("/").pop() || "dashboard.html"
        ).toLowerCase();

        sidebar.querySelectorAll(".nav-link").forEach(link => {
            const halamanLink = link
                .getAttribute("href")
                .split("/")
                .pop()
                .toLowerCase();

            if (halamanLink === halamanSemasa) {
                link.classList.add("active");
                link.setAttribute("aria-current", "page");
            }
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", binaSidebar);
    } else {
        binaSidebar();
    }
})();

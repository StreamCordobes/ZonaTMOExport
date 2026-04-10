(async function () {
    let allItems = [];

    const delay = (ms) => new Promise(r => setTimeout(r, ms));

    const listas = [
        { url: "https://zonatmo.nakamasweb.com/profile/read",      titulo: "Leído" },
        { url: "https://zonatmo.nakamasweb.com/profile/pending",   titulo: "Pendiente" },
        { url: "https://zonatmo.nakamasweb.com/profile/follow",    titulo: "Siguiendo" },
        { url: "https://zonatmo.nakamasweb.com/profile/wish",      titulo: "Deseado" },
        { url: "https://zonatmo.nakamasweb.com/profile/have",      titulo: "Tengo" },
        { url: "https://zonatmo.nakamasweb.com/profile/abandoned", titulo: "Abandonado" },
    ];

    // Recorre siblings después de un h5 hasta el siguiente h5
    function getSpansAfterH5(h5El) {
        const result = [];
        let sibling = h5El.nextElementSibling;
        while (sibling && sibling.tagName !== "H5") {
            if (sibling.classList.contains("badge-transparent")) {
                result.push(sibling.textContent.trim());
            }
            sibling = sibling.nextElementSibling;
        }
        return result;
    }

    for (const lista of listas) {
        console.log(`\n📂 Procesando lista: ${lista.titulo}`);
        let page = 1;

        while (true) {
            console.log(`  Página: ${page}`);

            const response = await fetch(`${lista.url}?page=${page}`);
            if (!response.ok) break;

            const html = await response.text();
            const doc = new DOMParser().parseFromString(html, "text/html");

            const items = [...doc.querySelectorAll(".element.proyect-item")];
            if (items.length === 0) break;

            for (const item of items) {
                const title =
                    item.querySelector(".thumbnail-title h4.text-truncate")?.getAttribute("title")?.trim() ||
                    "Sin título";

                const link = item.querySelector("a")?.href || "#";

                const styleTag = item.querySelector("style");
                let imageUrl = "Sin imagen";
                if (styleTag) {
                    const match = styleTag.textContent.match(/background-image:\s*url\(['"]?(.*?)['"]?\);/);
                    if (match) imageUrl = match[1];
                }

                let progreso = "0/0";
                let demografia = "—";
                let demografiaClase = "";
                let tipo = "—";
                let tipoClase = "";
                let tituloOficial = "—";
                let titulosAlternativos = [];
                let sinonimos = [];
                let intentos = 0;
                let success = false;

                while (intentos < 3 && !success) {
                    try {
                        console.log(`  Entrando a: ${title} (Intento ${intentos + 1})`);

                        const mangaRes = await fetch(link);
                        if (mangaRes.status === 429) {
                            console.warn("⚠️ Rate limit, esperando...");
                            await delay(3000);
                            intentos++;
                            continue;
                        }

                        const mangaHtml = await mangaRes.text();
                        const mangaDoc = new DOMParser().parseFromString(mangaHtml, "text/html");

                        // Título oficial
                        const tituloEl = mangaDoc.querySelector("h1.element-title");
                        if (tituloEl) {
                            // Quitar el <small> del año
                            const small = tituloEl.querySelector("small");
                            if (small) small.remove();
                            tituloOficial = tituloEl.textContent.trim();
                        }

                        // Títulos alternativos y sinónimos
                        const h5s = [...mangaDoc.querySelectorAll("h5.element-subtitle")];
                        for (const h5 of h5s) {
                            const texto = h5.textContent.trim();
                            if (texto === "Títulos alternativos") {
                                titulosAlternativos = getSpansAfterH5(h5);
                            } else if (texto === "Sinónimos") {
                                sinonimos = getSpansAfterH5(h5);
                            }
                        }

                        // Demografía
                        const demDiv = mangaDoc.querySelector(".demography");
                        if (demDiv) {
                            demografia = demDiv.textContent.trim();
                            demografiaClase = [...demDiv.classList].find(c => c !== "demography") || "";
                        }

                        // Tipo
                        const tipoEl = mangaDoc.querySelector(".book-type");
                        if (tipoEl) {
                            tipo = tipoEl.textContent.trim();
                            tipoClase = [...tipoEl.classList].find(c => c.startsWith("bg-")) || "";
                        }

                        // Capítulos
                        const chapterElements = [...mangaDoc.querySelectorAll("li.upload-link")];
                        const totalCaps = new Set();
                        const leidosCaps = new Set();

                        chapterElements.forEach(el => {
                            const titleEl = el.querySelector(".btn-collapse");
                            if (!titleEl) return;
                            const match = titleEl.textContent.match(/Cap[íi]tulo\s+(\d+(?:\.\d+)?)/i);
                            if (match) {
                                const numeroBase = Math.floor(parseFloat(match[1]));
                                totalCaps.add(numeroBase);
                                if (el.querySelector(".chapter-viewed-icon.viewed")) {
                                    leidosCaps.add(numeroBase);
                                }
                            }
                        });

                        const minCap = Math.min(...totalCaps);
                        const total = totalCaps.size - (minCap === 0 ? 1 : 0);
                        const leidos = leidosCaps.size - (minCap === 0 && leidosCaps.has(0) ? 1 : 0);

                        progreso = `${leidos}/${total}`;
                        console.log(`  ${title}: ${progreso} [${demografia}] [${tipo}]`);
                        success = true;
                        await delay(1200);

                    } catch (err) {
                        console.error(`Error en ${title}`, err);
                        intentos++;
                        await delay(2000);
                    }
                }

                allItems.push({ title, link, imageUrl, progreso, lista: lista.titulo, demografia, demografiaClase, tipo, tipoClase, tituloOficial, titulosAlternativos, sinonimos });
            }

            page++;
        }
    }

    console.log("Generando HTML...");

    const secciones = listas.map(l => ({
        titulo: l.titulo,
        items: allItems.filter(i => i.lista === l.titulo)
    })).filter(s => s.items.length > 0);

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <title>Mi Lista de Manga</title>
        <style>
            body { background:#121212; color:#fff; font-family:Arial; text-align:center; }
            h1 { margin-top: 30px; }
            h2 { margin-top: 40px; color: #1e90ff; }
            table { width:90%; margin:auto; border-collapse:collapse; background:#222; }
            th, td { padding:10px; border:1px solid #444; vertical-align:middle; }
            td.titles { text-align:left; }
            a { color:#1e90ff; }
            img { width:60px; height:80px; }
            .badge {
                display: inline-block;
                padding: 3px 10px;
                border-radius: 12px;
                font-size: 12px;
                font-weight: bold;
                color: #fff;
            }
            .title-main { font-weight: bold; font-size: 14px; }
            .title-alt, .title-syn { font-size: 11px; color: #aaa; display: block; margin-top: 3px; }
            .title-label { font-size: 10px; color: #666; text-transform: uppercase; margin-top: 6px; display: block; }
            /* Género */
            .shounen  { background: rgba(255,165,0,.75); }
            .shoujo   { background: rgba(221,148,161,.75); }
            .seinen   { background: rgba(255,0,0,.75); }
            .josei    { background: rgba(128,0,128,.75); }
            .kodomo   { background: rgba(64,224,208,.75); }
            /* Tipo */
            .bg-manga     { background: #7986cb; }
            .bg-manhwa    { background: #81c784; }
            .bg-manhua    { background: #8d6e63; }
            .bg-novel     { background: #e57373; }
            .bg-one_shot  { background: #f06292; }
            .bg-doujinshi { background: #ffb74d; }
            .bg-oel       { background: #ba68c8; }
        </style>
    </head>
    <body>
    <h1>Mi Lista de Manga</h1>
    ${secciones.map(s => `
        <h2>${s.titulo} (${s.items.length})</h2>
        <table>
            <thead>
                <tr><th>Imagen</th><th>Título</th><th>Género</th><th>Tipo</th><th>Progreso</th></tr>
            </thead>
            <tbody>
                ${s.items.map(item => `
                    <tr>
                        <td><img src="${item.imageUrl}"></td>
                        <td class="titles">
                            <span class="title-main"><a href="${item.link}" target="_blank">${item.tituloOficial}</a></span>
                            ${item.titulosAlternativos.length > 0 ? `
                                <span class="title-label">Títulos alternativos</span>
                                ${item.titulosAlternativos.map(t => `<span class="title-alt">• ${t}</span>`).join("")}
                            ` : ""}
                            ${item.sinonimos.length > 0 ? `
                                <span class="title-label">Sinónimos</span>
                                ${item.sinonimos.map(t => `<span class="title-syn">• ${t}</span>`).join("")}
                            ` : ""}
                        </td>
                        <td><span class="badge ${item.demografiaClase}">${item.demografia}</span></td>
                        <td><span class="badge ${item.tipoClase}">${item.tipo}</span></td>
                        <td>${item.progreso}</td>
                    </tr>
                `).join("")}
            </tbody>
        </table>
    `).join("")}
    </body>
    </html>
    `;

    const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Mi Lista de Manga.html";
    a.click();
    URL.revokeObjectURL(url);

    console.log("✅ Archivo generado!");
})();

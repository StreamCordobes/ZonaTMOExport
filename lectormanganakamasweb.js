(async function () {
    let allItems = [];
    let page = 1;
    const baseUrl = window.location.href.split('?')[0];
    const seleccionTitulo = document.querySelector("h2.text-primary, h1")?.textContent.trim() || "Mi Lista de Manga";

    console.log(`%c 📑 EXPORTANDO LISTA DEFINITIVA: ${seleccionTitulo}`, "color: #00ff00; font-weight: bold;");

    while (true) {
        console.log(`%c Buscando en página ${page}...`, "color: #1e90ff;");

        try {
            const response = await fetch(`${baseUrl}?page=${page}`);
            if (!response.ok) break;

            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            // Seleccionamos las tarjetas de manga
            const items = [...doc.querySelectorAll(".element, .card, .thumbnail")];
            let encontradosEnPagina = 0;

            items.forEach(item => {
                const linkElement = item.querySelector("a[href*='/library/manga/']");
                
                if (linkElement) {
                    const title = linkElement.getAttribute("title")?.trim() || 
                                  item.querySelector(".text-truncate")?.textContent.trim() || 
                                  "Sin título";
                    
                    const link = linkElement.getAttribute("href");

                    // Solo guardamos si tiene título y no está repetido
                    if (title !== "Sin título" && !allItems.some(i => i.link === link)) {
                        allItems.push({ title, link });
                        encontradosEnPagina++;
                    }
                }
            });

            if (encontradosEnPagina === 0) {
                console.log("%c Fin de la lista alcanzado.", "color: #ffa500;");
                break;
            }

            console.log(`✅ Página ${page}: ${encontradosEnPagina} mangas guardados.`);
            page++;
            
            // Pausa de seguridad para evitar bloqueos
            await new Promise(r => setTimeout(r, 400));

        } catch (error) {
            console.error("Error en la descarga:", error);
            break;
        }
    }

    if (allItems.length === 0) {
        alert("No se encontró nada. Asegúrate de estar en una de tus listas (Leídos, Siguiendo, etc.)");
        return;
    }

    // --- GENERACIÓN DEL ARCHIVO HTML FINAL ---
    const htmlContent = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <title>Respaldo TMO - ${seleccionTitulo}</title>
        <style>
            body { 
                background: #0f0f0f; 
                color: #ffffff; 
                font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; 
                padding: 40px; 
                line-height: 1.6;
            }
            .container { max-width: 800px; margin: auto; }
            h1 { 
                color: #1e90ff; 
                border-bottom: 2px solid #333; 
                padding-bottom: 15px; 
                text-transform: uppercase;
                letter-spacing: 1px;
            }
            .stats { color: #888; font-size: 0.9em; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; background: #1a1a1a; border-radius: 8px; overflow: hidden; }
            th { background: #222; color: #1e90ff; padding: 15px; text-align: left; font-size: 14px; }
            td { padding: 15px; border-bottom: 1px solid #2a2a2a; }
            tr:last-child td { border-bottom: none; }
            tr:hover { background: #252525; }
            a { 
                color: #ffffff; 
                text-decoration: none; 
                background: #1e90ff; 
                padding: 6px 12px; 
                border-radius: 4px; 
                font-size: 12px; 
                font-weight: bold;
                transition: 0.2s;
            }
            a:hover { background: #007acc; }
            .manga-name { font-size: 16px; font-weight: 500; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>${seleccionTitulo}</h1>
            <p class="stats">Total de títulos recuperados: <strong>${allItems.length}</strong></p>
            <table>
                <thead>
                    <tr>
                        <th>Título del Manga</th>
                        <th style="text-align: right;">Acceso</th>
                    </tr>
                </thead>
                <tbody>
                    ${allItems.map(i => `
                        <tr>
                            <td class="manga-name">${i.title}</td>
                            <td style="text-align: right;"><a href="${i.link}" target="_blank">IR AL MANGA</a></td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        </div>
    </body>
    </html>`;

    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Backup_${seleccionTitulo.replace(/\s+/g, '_')}.html`;
    a.click();
    
    console.log("%c ✨ ¡LISTO! Archivo generado correctamente.", "color: #00ff00; font-size: 14px;");
})();
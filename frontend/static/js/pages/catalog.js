import * as kitsu from "../kitsu.js";
import { $, esc, cardHTML, skeletonCards, GENRES, genreName } from "../ui.js";

export default async function catalog(root, params) {
    const q = (params.get("q") || "").trim();
    const genre = params.get("genre");
    const status = params.get("status");

    const title = $("[data-title]", root);
    const eyebrow = $("[data-eyebrow]", root);
    const count = $("[data-count]", root);
    const grid = $("[data-grid]", root);
    const more = $("[data-more]", root);

    let load;
    if (q) {
        eyebrow.textContent = "Busca";
        title.innerHTML = `Resultados para <q>${esc(q)}</q>`;
        document.title = `${q} · AnimeHub`;
        load = (offset) => kitsu.search(q, { offset });
        const input = document.querySelector("#search-input");
        if (input) input.value = q;
    } else if (genre) {
        eyebrow.textContent = "Gênero";
        title.textContent = genreName(genre) ?? genre.replace(/-/g, " ");
        document.title = `${title.textContent} · AnimeHub`;
        load = (offset) => kitsu.byCategory(genre, { offset });
    } else if (status === "current") {
        eyebrow.textContent = "Agora";
        title.textContent = "Em exibição";
        load = (offset) => kitsu.popular({ offset, status: "current" });
    } else {
        load = (offset) => kitsu.popular({ offset });
    }

    $("[data-chips]", root).innerHTML = [["", "Todos"], ...GENRES].map(([slug, name]) => {
        const href = slug ? `/catalog?genre=${slug}` : "/catalog";
        const active = (slug || null) === (genre || null) && !q && !status;
        return `<li><a class="chip" href="${href}"${active ? ' aria-current="page"' : ""}>${esc(name)}</a></li>`;
    }).join("");

    let offset = 0, total = 0;
    const seen = new Set();

    async function page() {
        more.disabled = true;
        more.textContent = "Carregando…";
        if (offset === 0) grid.innerHTML = skeletonCards(12);
        try {
            const res = await load(offset);
            if (!root.isConnected) return;
            if (offset === 0) grid.innerHTML = "";
            total = res.total;
            offset += res.items.length;
            const fresh = res.items.filter(a => !seen.has(a.id) && seen.add(a.id));
            grid.insertAdjacentHTML("beforeend", fresh.map(a => cardHTML(a)).join(""));

            if (!grid.children.length) {
                grid.innerHTML = `<li class="empty">
                    <h2>Nada encontrado</h2>
                    <p>${q ? "Tente o nome em inglês ou em japonês (romaji). Ex: <em>Kimetsu no Yaiba</em>." : "Não há títulos aqui ainda."}</p>
                </li>`;
            }
            count.textContent = total ? `${total.toLocaleString("pt-BR")} ${total === 1 ? "título" : "títulos"}` : "";
            more.hidden = offset >= total || res.items.length === 0;
        } catch {
            if (offset === 0) grid.innerHTML = `<li class="empty"><h2>Não deu para carregar</h2><p>Confira sua conexão e tente de novo.</p></li>`;
            more.hidden = false;
        } finally {
            more.disabled = false;
            more.textContent = "Carregar mais";
        }
    }

    more.onclick = page;
    page();
}

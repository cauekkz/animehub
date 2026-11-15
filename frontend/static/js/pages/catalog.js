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
        eyebrow.textContent = "Search";
        title.innerHTML = `Results for <q>${esc(q)}</q>`;
        document.title = `${q} · AnimeHub`;
        load = (offset) => kitsu.search(q, { offset });
        const input = document.querySelector("#search-input");
        if (input) input.value = q;
    } else if (genre) {
        eyebrow.textContent = "Genre";
        title.textContent = genreName(genre) ?? genre.replace(/-/g, " ");
        document.title = `${title.textContent} · AnimeHub`;
        load = (offset) => kitsu.byCategory(genre, { offset });
    } else if (status === "current") {
        eyebrow.textContent = "Now";
        title.textContent = "Airing now";
        load = (offset) => kitsu.popular({ offset, status: "current" });
    } else {
        load = (offset) => kitsu.popular({ offset });
    }

    $("[data-chips]", root).innerHTML = [["", "All"], ...GENRES].map(([slug, name]) => {
        const href = slug ? `/catalog?genre=${slug}` : "/catalog";
        const active = (slug || null) === (genre || null) && !q && !status;
        return `<li><a class="chip" href="${href}"${active ? ' aria-current="page"' : ""}>${esc(name)}</a></li>`;
    }).join("");

    let offset = 0, total = 0;
    const seen = new Set();

    async function page() {
        more.disabled = true;
        more.textContent = "Loading…";
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
                    <h2>Nothing found</h2>
                    <p>${q ? "Try the English or Japanese (romaji) title. E.g. <em>Kimetsu no Yaiba</em>." : "There are no titles here yet."}</p>
                </li>`;
            }
            count.textContent = total ? `${total.toLocaleString("en-US")} ${total === 1 ? "title" : "titles"}` : "";
            more.hidden = offset >= total || res.items.length === 0;
        } catch {
            if (offset === 0) grid.innerHTML = `<li class="empty"><h2>Couldn't load this</h2><p>Check your connection and try again.</p></li>`;
            more.hidden = false;
        } finally {
            more.disabled = false;
            more.textContent = "Load more";
        }
    }

    more.onclick = page;
    page();
}

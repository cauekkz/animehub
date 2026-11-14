import * as kitsu from "./kitsu.js";
import { session, watchlist, progress } from "./api.js";

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

export const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

const ICONS = {
    play: '<path d="M7 4.5v15l12.5-7.5z" fill="currentColor" stroke="none"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    left: '<path d="m15 18-6-6 6-6"/>',
    right: '<path d="m9 18 6-6-6-6"/>',
    star: '<path d="m12 3.5 2.6 5.3 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.7 1-5.8-4.3-4.1 5.9-.8z" fill="currentColor" stroke="none"/>',
    external: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
    film: '<rect x="3" y="4" width="18" height="16" rx="1"/><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
};
export const icon = (name, cls = "") =>
    `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] ?? ""}</svg>`;

export function ageBadge(rating) {
    const map = { G: ["L", "l"], PG: ["12", "12"], R: ["16", "16"], R18: ["18", "18"] };
    const [label, cls] = map[rating] ?? [null, null];
    if (!label) return "";
    const title = label === "L" ? "Livre para todos os públicos" : `Não recomendado para menores de ${label} anos`;
    return `<span class="age age-${cls}" title="${title}">${label}</span>`;
}

const SUBTYPES = { TV: "Série", movie: "Filme", OVA: "OVA", ONA: "ONA", special: "Especial", music: "Clipe" };
const STATUS = { current: "Em exibição", finished: "Finalizado", upcoming: "Em breve", tba: "A anunciar", unreleased: "Não lançado" };

export function metaLine(anime, { long = false } = {}) {
    const parts = [];
    if (anime.year) parts.push(anime.year);
    if (anime.subtype) parts.push(SUBTYPES[anime.subtype] ?? anime.subtype);
    if (anime.episodeCount && anime.subtype !== "movie") parts.push(`${anime.episodeCount} ep.`);
    if (long && anime.status) parts.push(STATUS[anime.status] ?? anime.status);
    return parts.map(p => `<span>${esc(p)}</span>`).join("");
}

const known = new Map();
export function remember(anime) {
    if (anime?.id) known.set(String(anime.id), { ...known.get(String(anime.id)), ...anime });
    return anime;
}
export const recall = (id) => known.get(String(id));

export function cardHTML(anime, { rank } = {}) {
    remember(anime);
    const poster = anime.poster
        ? `<img src="${esc(anime.poster)}" alt="" loading="lazy" decoding="async" width="284" height="402" onerror="this.remove()">`
        : "";
    return `
    <li class="card${rank ? " card-ranked" : ""}">
        ${rank ? `<span class="rank" aria-hidden="true">${rank}</span>` : ""}
        <button type="button" class="card-hit" data-open-anime="${esc(anime.id)}">
            <span class="card-poster">${poster}<span class="card-fallback" aria-hidden="true">${esc(anime.title)}</span></span>
            <span class="card-title">${esc(anime.title)}</span>
            <span class="card-meta">
                ${anime.year ? `<span>${esc(anime.year)}</span>` : ""}
                ${anime.rating ? `<span class="score">${icon("star")}${esc(anime.rating)}</span>` : ""}
            </span>
        </button>
    </li>`;
}

export function skeletonCards(n = 8) {
    return Array.from({ length: n }, () => `
    <li class="card is-skeleton" aria-hidden="true">
        <span class="card-poster"></span>
        <span class="sk-line"></span><span class="sk-line short"></span>
    </li>`).join("");
}

export function continueCardHTML(item) {
    const pct = item.episode_count ? Math.min(100, Math.round((item.episode / item.episode_count) * 100)) : null;
    const img = item.cover || item.poster;
    return `
    <li class="card card-wide">
        <a class="card-hit" href="/watch?id=${encodeURIComponent(item.anime_id)}&ep=${item.episode}">
            <span class="card-poster">
                ${img ? `<img src="${esc(img)}" alt="" loading="lazy" decoding="async" onerror="this.remove()">` : ""}
                <span class="card-play">${icon("play")}</span>
                ${pct !== null ? `<span class="progress" role="img" aria-label="${pct}% assistido"><span style="width:${pct}%"></span></span>` : ""}
            </span>
            <span class="card-title">${esc(item.title)}</span>
            <span class="card-meta"><span class="mono">EP ${String(item.episode).padStart(2, "0")}</span>${item.episode_count ? `<span>de ${item.episode_count}</span>` : ""}</span>
        </a>
        <button type="button" class="card-remove" data-remove-progress="${esc(item.anime_id)}" aria-label="Tirar ${esc(item.title)} de Continuar assistindo">${icon("close")}</button>
    </li>`;
}

export function createRail({ id, title, href, load, max = 60, ranked = false, eager = false }) {
    const section = document.createElement("section");
    section.className = "rail";
    section.setAttribute("aria-labelledby", `rail-${id}`);
    section.innerHTML = `
        <header class="rail-head">
            <h2 id="rail-${id}">${esc(title)}</h2>
            ${href ? `<a class="rail-more" href="${href}">Ver tudo ${icon("right")}</a>` : ""}
        </header>
        <div class="rail-viewport">
            <button class="rail-arrow prev" type="button" aria-label="Voltar fileira ${esc(title)}" hidden>${icon("left")}</button>
            <ul class="rail-track${ranked ? " is-ranked" : ""}">${skeletonCards(8)}</ul>
            <button class="rail-arrow next" type="button" aria-label="Avançar fileira ${esc(title)}">${icon("right")}</button>
        </div>`;

    const track = $(".rail-track", section);
    const prev = $(".prev", section);
    const next = $(".next", section);
    let offset = 0, total = Infinity, loading = false, started = false, count = 0;

    async function more() {
        if (loading || offset >= Math.min(total, max)) return;
        loading = true;
        try {
            const { items, total: t } = await load(offset);
            const first = offset === 0;
            if (first && items.length === 0) { section.remove(); return; }
            total = items.length ? (t ?? items.length) : offset;
            if (first) track.innerHTML = "";
            track.insertAdjacentHTML("beforeend", items.map(a => cardHTML(a, { rank: ranked ? ++count : 0 })).join(""));
            offset += items.length;
            updateArrows();
        } catch (err) {
            if (offset === 0) {
                track.innerHTML = `<li class="rail-error">Não deu para carregar esta fileira. <button type="button" class="link">Tentar de novo</button></li>`;
                $(".link", track).onclick = () => { track.innerHTML = skeletonCards(8); more(); };
            }
        } finally {
            loading = false;
        }
    }

    function updateArrows() {
        const max = track.scrollWidth - track.clientWidth;
        prev.hidden = track.scrollLeft <= 4;
        next.hidden = track.scrollLeft >= max - 4;
    }

    const page = (dir) => track.scrollBy({ left: dir * track.clientWidth * 0.9, behavior: reducedMotion() ? "auto" : "smooth" });
    prev.onclick = () => page(-1);
    next.onclick = () => page(1);

    track.addEventListener("scroll", () => {
        updateArrows();
        if (track.scrollLeft + track.clientWidth > track.scrollWidth - track.clientWidth * 0.75) more();
    }, { passive: true });

    const start = () => { if (!started) { started = true; more(); } };
    if (eager) start();
    else {
        const io = new IntersectionObserver((entries) => {
            if (entries.some(e => e.isIntersecting)) { io.disconnect(); start(); }
        }, { rootMargin: "400px 0px" });
        io.observe(section);
    }

    return section;
}

export function toast(message, { tone = "default", timeout = 3500 } = {}) {
    const box = $("[data-toasts]");
    const el = document.createElement("div");
    el.className = `toast toast-${tone}`;
    el.setAttribute("role", tone === "error" ? "alert" : "status");
    el.textContent = message;
    box.appendChild(el);
    requestAnimationFrame(() => el.classList.add("is-in"));
    setTimeout(() => {
        el.classList.remove("is-in");
        setTimeout(() => el.remove(), 250);
    }, timeout);
}

export async function bindListButton(btn, anime) {
    const paint = (saved) => {
        btn.dataset.saved = saved;
        btn.setAttribute("aria-pressed", saved);
        btn.innerHTML = saved ? `${icon("check")}<span>Na sua lista</span>` : `${icon("plus")}<span>Minha lista</span>`;
    };
    paint(await watchlist.has(anime.id).catch(() => false));

    btn.onclick = async () => {
        if (!session.loggedIn) {
            toast("Entre na sua conta para salvar animes");
            window.navigate(`/login?next=${encodeURIComponent(location.pathname + location.search)}`);
            return;
        }
        const saved = btn.dataset.saved === "true";
        btn.disabled = true;
        try {
            if (saved) await watchlist.remove(anime.id);
            else await watchlist.add(anime);
            paint(!saved);
            toast(saved ? "Removido da sua lista" : "Salvo na sua lista");
        } catch (err) {
            toast(err.message, { tone: "error" });
        } finally {
            btn.disabled = false;
        }
    };
}

const modal = () => $("#anime-modal");

function modalHTML(a, { loadingExtras }) {
    const backdrop = a.cover || a.posterLarge || a.poster;
    return `
    <button class="icon-btn modal-close" type="button" aria-label="Fechar" data-close-modal>${icon("close")}</button>
    <div class="modal-hero">
        ${backdrop ? `<img class="modal-backdrop" src="${esc(backdrop)}" alt="" decoding="async">` : ""}
        <div class="modal-trailer" hidden></div>
    </div>
    <div class="modal-content">
        <div class="modal-poster">${a.posterLarge || a.poster ? `<img src="${esc(a.posterLarge || a.poster)}" alt="Pôster de ${esc(a.title)}">` : ""}</div>
        <div class="modal-main">
            <p class="meta">${ageBadge(a.ageRating)}${metaLine(a, { long: true })}</p>
            <h2 id="modal-title" class="modal-title">${esc(a.title)}</h2>
            ${a.altTitle && a.altTitle !== a.title ? `<p class="alt-title" lang="ja">${esc(a.altTitle)}</p>` : ""}
            ${a.rating ? `<p class="score-big">${icon("star")}<strong>${esc(a.rating)}</strong><span>/10 no Kitsu</span></p>` : ""}
            <div class="actions">
                <a class="btn btn-primary" href="/watch?id=${encodeURIComponent(a.id)}" data-watch>${icon("play")}<span>Assistir</span></a>
                <button class="btn btn-ghost" type="button" data-list-btn>${icon("plus")}<span>Minha lista</span></button>
                ${a.youtube ? `<button class="btn btn-ghost" type="button" data-trailer>${icon("film")}<span>Trailer</span></button>` : ""}
            </div>
            <p class="synopsis">${esc(a.synopsis || "Sem sinopse disponível.")}</p>
            <div class="modal-extras">${loadingExtras ? `<span class="sk-line"></span><span class="sk-line short"></span>` : ""}</div>
        </div>
    </div>`;
}

function extrasHTML(a) {
    const genres = (a.categories ?? []).slice(0, 8).map(c =>
        `<li><a class="chip" href="/catalog?genre=${encodeURIComponent(c.slug)}">${esc(c.title)}</a></li>`).join("");
    const streams = (a.streams ?? []).map(s =>
        `<li><a class="stream" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.site)}${icon("external")}</a></li>`).join("");
    return `
        ${genres ? `<div class="extras-block"><h3 class="eyebrow">Gêneros</h3><ul class="chips">${genres}</ul></div>` : ""}
        <div class="extras-block"><h3 class="eyebrow">Onde assistir</h3>
            ${streams ? `<ul class="streams">${streams}</ul>` : `<p class="muted">Ainda não temos links oficiais para este título.</p>`}
        </div>`;
}

export async function openAnime(id) {
    const dialog = modal();
    const body = $("[data-modal-body]", dialog);
    const quick = recall(id);

    body.innerHTML = quick ? modalHTML(quick, { loadingExtras: true }) : `<div class="modal-loading"><span class="spinner" aria-label="Carregando"></span></div>`;
    if (!dialog.open) dialog.showModal();
    dialog.scrollTop = 0;

    let anime;
    try {
        anime = remember(await kitsu.details(id));
    } catch {
        if (!quick) body.innerHTML = `<button class="icon-btn modal-close" type="button" aria-label="Fechar" data-close-modal>${icon("close")}</button><p class="modal-error">Não foi possível carregar este anime.</p>`;
        else $(".modal-extras", body).innerHTML = `<p class="muted">Não foi possível carregar os detalhes.</p>`;
        return;
    }
    if (!dialog.open) return;

    if (!quick) body.innerHTML = modalHTML(anime, { loadingExtras: false });
    $(".modal-extras", body).innerHTML = extrasHTML(anime);

    if (session.loggedIn) {
        progress.all().then(list => {
            const p = list.find(i => String(i.anime_id) === String(anime.id));
            const watch = $("[data-watch]", body);
            if (p && watch) {
                watch.href = `/watch?id=${encodeURIComponent(anime.id)}&ep=${p.episode}`;
                $("span", watch).textContent = `Continuar EP ${p.episode}`;
            }
        }).catch(() => {});
    }

    bindListButton($("[data-list-btn]", body), anime);

    const trailerBtn = $("[data-trailer]", body);
    if (trailerBtn) trailerBtn.onclick = () => {
        const box = $(".modal-trailer", body);
        const open = box.hidden;
        box.hidden = !open;
        box.innerHTML = open ? youtubeEmbed(anime.youtube, anime.title, { autoplay: true }) : "";
        trailerBtn.setAttribute("aria-pressed", open);
    };
}

export function youtubeEmbed(videoId, title, { autoplay = false } = {}) {
    const src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?rel=0&modestbranding=1${autoplay ? "&autoplay=1" : ""}`;
    return `<iframe src="${src}" title="Trailer de ${esc(title)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
}

export function closeModal() {
    const dialog = modal();
    if (dialog.open) dialog.close();
}

export function initModal() {
    const dialog = modal();
    dialog.addEventListener("click", (e) => {
        if (e.target === dialog || e.target.closest("[data-close-modal]")) dialog.close();
    });
    dialog.addEventListener("close", () => {
        $("[data-modal-body]", dialog).innerHTML = "";
    });
    document.addEventListener("click", (e) => {
        const trigger = e.target.closest("[data-open-anime]");
        if (trigger) openAnime(trigger.dataset.openAnime);
    });
}

export const GENRES = [
    ["action", "Ação"], ["adventure", "Aventura"], ["comedy", "Comédia"], ["drama", "Drama"],
    ["fantasy", "Fantasia"], ["romance", "Romance"], ["isekai", "Isekai"], ["mystery", "Mistério"],
    ["horror", "Terror"], ["psychological", "Psicológico"], ["sci-fi", "Ficção científica"],
    ["slice-of-life", "Slice of life"], ["sports", "Esportes"], ["supernatural", "Sobrenatural"], ["mecha", "Mecha"],
];
export const genreName = (slug) => GENRES.find(([s]) => s === slug)?.[1];

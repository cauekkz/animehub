import * as kitsu from "../kitsu.js";
import { session, progress } from "../api.js";
import { $, $$, esc, icon, ageBadge, metaLine, bindListButton, remember, toast } from "../ui.js";
import { mountPlayer } from "../player.js";

const PAGE = 20;

function streamsHTML(anime, ep) {
    if (!anime.streams.length) {
        return `<p class="muted small">Ainda não temos link oficial para este título. Procure no serviço de streaming que você assina.</p>`;
    }
    return anime.streams.map((s, i) => `
        <a class="btn ${i === 0 ? "btn-accent" : "btn-ghost"}" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">
            ${icon("play")}<span>${anime.subtype === "movie" ? "Assistir" : `Assistir EP ${ep}`} ${i === 0 ? "na" : "no"} ${esc(s.site)}</span>${icon("external", "i-sm")}
        </a>`).join("");
}

function gateHTML(anime) {
    const img = anime?.cover || anime?.posterLarge;
    const next = encodeURIComponent(location.pathname + location.search);
    return `
    <div class="gate">
        ${img ? `<img class="gate-bg" src="${esc(img)}" alt="">` : ""}
        <div class="gate-card">
            <p class="eyebrow">${anime ? esc(anime.title) : "AnimeHub"}</p>
            <h1>Entre para assistir</h1>
            <p class="muted">Com uma conta, o AnimeHub lembra o episódio em que você parou e guarda sua lista.</p>
            <div class="actions">
                <a class="btn btn-primary" href="/login?next=${next}">Entrar</a>
                <a class="btn btn-ghost" href="/signup?next=${next}">Criar conta</a>
            </div>
        </div>
    </div>`;
}

export default async function watch(root, params) {
    const box = $("[data-watch]", root);
    const id = params.get("id");

    if (!id || !/^\d+$/.test(id)) {
        box.innerHTML = `<div class="empty page-narrow"><h1>Anime não encontrado</h1><p>Escolha um título no <a href="/catalog">catálogo</a>.</p></div>`;
        return;
    }

    let anime;
    try {
        anime = remember(await kitsu.details(id));
    } catch {
        box.innerHTML = `<div class="empty page-narrow"><h1>Não deu para carregar</h1><p>Confira sua conexão e <a href="${location.pathname + location.search}">tente de novo</a>.</p></div>`;
        return;
    }
    if (!root.isConnected) return;
    document.title = `${anime.title} · AnimeHub`;

    if (!session.loggedIn) {
        box.innerHTML = gateHTML(anime);
        return;
    }

    const isMovie = anime.subtype === "movie";
    let ep = Math.max(1, parseInt(params.get("ep"), 10) || 1);
    if (anime.episodeCount) ep = Math.min(ep, anime.episodeCount);

    box.innerHTML = `
        <div class="watch-top">
            <div class="stage" data-stage></div>

            <aside class="watch-side">
                <button type="button" class="watch-anime" data-open-anime="${esc(anime.id)}">
                    ${anime.poster ? `<img src="${esc(anime.poster)}" alt="">` : ""}
                    <span><strong>${esc(anime.title)}</strong><small class="meta">${ageBadge(anime.ageRating)}${metaLine(anime)}</small></span>
                </button>

                <div class="ep-now" data-ep-now aria-live="polite"></div>

                <div class="ep-nav" ${isMovie ? "hidden" : ""}>
                    <button class="btn btn-ghost btn-sm" type="button" data-step="-1">${icon("left")}<span>Anterior</span></button>
                    <button class="btn btn-ghost btn-sm" type="button" data-step="1"><span>Próximo</span>${icon("right")}</button>
                </div>

                <div class="watch-cta" data-streams></div>
                <button class="btn btn-ghost btn-block" type="button" data-list-btn></button>

                <p class="legal small">O AnimeHub não hospeda episódios. Os links levam às plataformas oficiais, que licenciam e pagam os estúdios.</p>
            </aside>
        </div>

        <section class="episodes" aria-labelledby="eps-title" ${isMovie ? "hidden" : ""}>
            <header class="rail-head">
                <h2 id="eps-title">Episódios</h2>
                <label class="range-select" hidden>
                    <span class="sr-only">Faixa de episódios</span>
                    <select data-range></select>
                </label>
            </header>
            <ol class="ep-list" data-ep-list></ol>
        </section>`;

    bindListButton($("[data-list-btn]", box), anime);

    const list = $("[data-ep-list]", box);
    const rangeSel = $("[data-range]", box);
    const now = $("[data-ep-now]", box);
    let total = anime.episodeCount || 0;
    let pageEps = [];
    let pageOffset = -1;
    let nowEp = null;
    const stage = $("[data-stage]", box);
    let stopPlayer = null;
    let playerEp = null;

    const fakeEps = (from, to) => Array.from({ length: to - from }, (_, i) => ({ number: from + i + 1 }));

    async function loadPage(offset) {
        if (offset === pageOffset) return;
        pageOffset = offset;
        list.innerHTML = Array.from({ length: 6 }, () => `<li class="ep is-skeleton"><span class="ep-thumb"></span><span class="sk-line"></span></li>`).join("");
        try {
            const res = await kitsu.episodes(anime.id, { offset, limit: PAGE });
            total = Math.max(total, res.total);
            pageEps = res.items.length ? res.items : fakeEps(offset, Math.min(offset + PAGE, total || 1));
        } catch {
            pageEps = fakeEps(offset, Math.min(offset + PAGE, total || 1));
        }
        if (!root.isConnected || offset !== pageOffset) return;
        renderRanges();
        renderList();
    }

    function renderRanges() {
        const label = $(".range-select", box);
        if (total <= PAGE) { label.hidden = true; return; }
        label.hidden = false;
        if (rangeSel.options.length !== Math.ceil(total / PAGE)) {
            rangeSel.innerHTML = Array.from({ length: Math.ceil(total / PAGE) }, (_, i) =>
                `<option value="${i * PAGE}">EP ${i * PAGE + 1}–${Math.min((i + 1) * PAGE, total)}</option>`).join("");
        }
        rangeSel.value = String(pageOffset);
    }

    function renderList() {
        list.innerHTML = pageEps.map(e => `
            <li class="ep${e.number === ep ? " is-current" : ""}">
                <a href="/watch?id=${encodeURIComponent(anime.id)}&ep=${e.number}" data-ep="${e.number}" ${e.number === ep ? 'aria-current="true"' : ""}>
                    <span class="ep-thumb">
                        ${e.thumbnail ? `<img src="${esc(e.thumbnail)}" alt="" loading="lazy" decoding="async" onerror="this.remove()">` : ""}
                        <span class="ep-num mono">${String(e.number).padStart(2, "0")}</span>
                        ${e.number === ep ? `<span class="ep-badge">Atual</span>` : ""}
                    </span>
                    <span class="ep-title">${esc(e.title || `Episódio ${e.number}`)}</span>
                    ${e.length ? `<span class="ep-len muted small">${e.length} min</span>` : ""}
                </a>
            </li>`).join("");
        renderNow();
    }

    function renderNow() {
        const found = pageEps.find(x => x.number === ep);
        if (found) nowEp = found;
        const e = nowEp?.number === ep ? nowEp : null;
        now.innerHTML = isMovie
            ? `<p class="eyebrow">Filme</p><h1 class="ep-heading">${esc(anime.title)}</h1><p class="ep-synopsis">${esc(anime.synopsis)}</p>`
            : `<p class="eyebrow mono">Episódio ${String(ep).padStart(2, "0")}${total ? ` de ${total}` : ""}</p>
               <h1 class="ep-heading">${esc(e?.title || `Episódio ${ep}`)}</h1>
               ${e?.synopsis ? `<p class="ep-synopsis">${esc(e.synopsis)}</p>` : ""}`;
        $("[data-streams]", box).innerHTML = streamsHTML(anime, ep);
        renderPlayer(e);
        $("[data-step='-1']", box).disabled = ep <= 1;
        $("[data-step='1']", box).disabled = Boolean(total) && ep >= total;
    }

    function renderPlayer(e) {
        if (playerEp === ep) return;
        playerEp = ep;
        stopPlayer?.();
        stopPlayer = mountPlayer(stage, {
            anime,
            ep,
            poster: e?.thumbnail || anime.cover || anime.posterLarge,
            onEnded: () => { if (!isMovie && (!total || ep < total)) go(ep + 1); },
        });
    }

    async function go(n, { push = true } = {}) {
        ep = n;
        if (push) history.pushState(null, "", `/watch?id=${encodeURIComponent(anime.id)}&ep=${ep}`);
        const offset = Math.floor((ep - 1) / PAGE) * PAGE;
        if (offset !== pageOffset) await loadPage(offset);
        else renderList();
        progress.save(anime, ep).catch((err) => {
            if (err.status !== 401) toast("Não foi possível salvar seu progresso", { tone: "error" });
        });
    }

    list.addEventListener("click", (e) => {
        const a = e.target.closest("[data-ep]");
        if (!a || e.metaKey || e.ctrlKey) return;
        e.preventDefault();
        e.stopPropagation();
        go(Number(a.dataset.ep));
        $(".watch-side", box).scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
    $$("[data-step]", box).forEach(b => b.addEventListener("click", () => go(ep + Number(b.dataset.step))));
    rangeSel.addEventListener("change", () => loadPage(Number(rangeSel.value)));

    await go(ep, { push: false });
    return () => stopPlayer?.();
}

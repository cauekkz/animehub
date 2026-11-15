import * as kitsu from "../kitsu.js";
import { session, progress } from "../api.js";
import { $, $$, esc, icon, ageBadge, metaLine, bindListButton, remember, toast } from "../ui.js";
import { mountPlayer } from "../player.js";

const PAGE = 20;

function streamsHTML(anime, ep) {
    if (!anime.streams.length) {
        return `<p class="muted small">We don't have an official link for this title yet. Check the streaming service you subscribe to.</p>`;
    }
    return anime.streams.map((s, i) => `
        <a class="btn ${i === 0 ? "btn-accent" : "btn-ghost"}" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">
            ${icon("play")}<span>${anime.subtype === "movie" ? "Watch" : `Watch EP ${ep}`} on ${esc(s.site)}</span>${icon("external", "i-sm")}
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
            <h1>Log in to watch</h1>
            <p class="muted">With an account, AnimeHub remembers the episode you stopped at and keeps your list.</p>
            <div class="actions">
                <a class="btn btn-primary" href="/login?next=${next}">Log in</a>
                <a class="btn btn-ghost" href="/signup?next=${next}">Create account</a>
            </div>
        </div>
    </div>`;
}

export default async function watch(root, params) {
    const box = $("[data-watch]", root);
    const id = params.get("id");

    if (!id || !/^\d+$/.test(id)) {
        box.innerHTML = `<div class="empty page-narrow"><h1>Anime not found</h1><p>Pick a title from the <a href="/catalog">catalog</a>.</p></div>`;
        return;
    }

    let anime;
    try {
        anime = remember(await kitsu.details(id));
    } catch {
        box.innerHTML = `<div class="empty page-narrow"><h1>Couldn't load this</h1><p>Check your connection and <a href="${location.pathname + location.search}">try again</a>.</p></div>`;
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
                    <button class="btn btn-ghost btn-sm" type="button" data-step="-1">${icon("left")}<span>Previous</span></button>
                    <button class="btn btn-ghost btn-sm" type="button" data-step="1"><span>Next</span>${icon("right")}</button>
                </div>

                <div class="watch-cta" data-streams></div>
                <button class="btn btn-ghost btn-block" type="button" data-list-btn></button>

                <p class="legal small">AnimeHub doesn't host episodes. The links go to the official platforms, which license and pay the studios.</p>
            </aside>
        </div>

        <section class="episodes" aria-labelledby="eps-title" ${isMovie ? "hidden" : ""}>
            <header class="rail-head">
                <h2 id="eps-title">Episodes</h2>
                <label class="range-select" hidden>
                    <span class="sr-only">Episode range</span>
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
                        ${e.number === ep ? `<span class="ep-badge">Current</span>` : ""}
                    </span>
                    <span class="ep-title">${esc(e.title || `Episode ${e.number}`)}</span>
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
            ? `<p class="eyebrow">Movie</p><h1 class="ep-heading">${esc(anime.title)}</h1><p class="ep-synopsis">${esc(anime.synopsis)}</p>`
            : `<p class="eyebrow mono">Episode ${String(ep).padStart(2, "0")}${total ? ` of ${total}` : ""}</p>
               <h1 class="ep-heading">${esc(e?.title || `Episode ${ep}`)}</h1>
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
            if (err.status !== 401) toast("Couldn't save your progress", { tone: "error" });
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

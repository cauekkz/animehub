import * as kitsu from "../kitsu.js";
import { session, progress } from "../api.js";
import { $, $$, esc, icon, ageBadge, metaLine, createRail, continueCardHTML, remember, reducedMotion, toast } from "../ui.js";

const HERO_POOL = [
    ["akame-ga-kill", 8270], ["another", 6462], ["attack-on-titan", 7442], ["berserk", 24],
    ["black-clover", 13209], ["blue-lock", 44973], ["Boku-no-Hero-Academia", 11469], ["chainsaw-man", 43806],
    ["dan-da-dan", 48269], ["death-note", 1376], ["demon-slayer", 41370], ["dr.-stone", 42080],
    ["Dungeon-Meshi", 46320], ["fire-force", 42068], ["horimiya", 43545], ["jujutsu-kaisen", 42765],
    ["kaijuu-8-gou", 46300], ["konosuba", 10941], ["Kusuriya-no-Hitorigoto", 47083], ["mashle", 46229],
    ["monster", 10], ["nanatsu-no-taizai", 8699], ["naruto-2001", 11], ["naruto-shippuden", 1555],
    ["one-piece", 12], ["oshi-no-ko", 46170], ["plastic-memories", 9538], ["re-zero", 11209],
    ["sakamoto-days", 48915], ["soul-eater", 3128], ["summer-time-rendering", 44032], ["THE-PROMISED-NEVERLAND", 41312],
    ["tokyo-ghoul", 8271], ["tomodachi-game", 45401], ["undead-unluck", 46415], ["uzumaki", 42525],
    ["witchwatch", 49136], ["Yozakura-san-Chi-no-Daisakusen", 46869], ["Tate-no-Yuusha-no-Nariagari", 13593],
    ["Shigurui", 2007], ["Elfen-Lied", 201], ["gantz", 351],
];

const RAILS = [
    ["action", "Action"], ["romance", "Romance"], ["comedy", "Comedy"], ["adventure", "Adventure"],
    ["isekai", "Isekai"], ["mystery", "Mystery"], ["horror", "Horror"], ["drama", "Drama"],
    ["sports", "Sports"], ["psychological", "Psychological"],
];

const SLIDE_MS = 9000;

function pickRandom(list, n) {
    const copy = [...list];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy.slice(0, n);
}

function preload(src) {
    return new Promise((resolve) => {
        if (!src) return resolve(false);
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = src;
    });
}

async function setupHero(root) {
    const hero = $(".hero", root);
    const media = $("[data-hero-media]", root);
    const body = $("[data-hero-body]", root);
    const pager = $("[data-hero-pager]", root);

    const picks = pickRandom(HERO_POOL, 5);
    let slides;
    try {
        const animes = await kitsu.byIds(picks.map(([, id]) => id));
        slides = picks
            .map(([logo, id]) => ({ logo, anime: animes.find(a => String(a.id) === String(id)) }))
            .filter(s => s.anime && s.anime.cover);
    } catch {
        slides = [];
    }
    if (!root.isConnected) return () => {};
    if (!slides.length) {
        hero.classList.add("is-empty");
        body.innerHTML = `<h1 class="hero-fallback">Your next anime is right here.</h1>`;
        return () => {};
    }
    slides.forEach(s => remember(s.anime));

    pager.innerHTML = slides.map((s, i) => `
        <button type="button" role="tab" aria-label="${esc(s.anime.title)}" aria-selected="false" data-slide="${i}">
            <span class="mono">${String(i + 1).padStart(2, "0")}</span><span class="bar"><span></span></span>
        </button>`).join("");

    let current = -1, timer = null, paused = false;

    async function show(i) {
        if (i === current) return;
        current = i;
        const { logo, anime } = slides[i];
        const logoSrc = `/img/animes-logo/${encodeURIComponent(logo)}.png`;
        const [, hasLogo] = await Promise.all([preload(anime.cover), preload(logoSrc)]);
        if (current !== i || !root.isConnected) return;

        const img = document.createElement("img");
        img.src = anime.cover;
        img.alt = "";
        img.className = "hero-img";
        media.appendChild(img);
        requestAnimationFrame(() => img.classList.add("is-in"));
        $$(".hero-img", media).slice(0, -1).forEach(old => {
            old.classList.remove("is-in");
            setTimeout(() => old.remove(), 700);
        });

        body.classList.remove("is-in");
        body.innerHTML = `
            ${hasLogo
                ? `<h1 class="hero-logo"><img src="${logoSrc}" alt="${esc(anime.title)}"></h1>`
                : `<h1 class="hero-title">${esc(anime.title)}</h1>`}
            <p class="hero-meta">${ageBadge(anime.ageRating)}${metaLine(anime)}${anime.rating ? `<span class="score">${icon("star")}${anime.rating}</span>` : ""}</p>
            <p class="hero-synopsis">${esc(anime.synopsis)}</p>
            <div class="actions">
                <a class="btn btn-primary btn-lg" href="/watch?id=${encodeURIComponent(anime.id)}">${icon("play")}<span>Watch</span></a>
                <button class="btn btn-ghost btn-lg" type="button" data-open-anime="${esc(anime.id)}">${icon("info")}<span>More info</span></button>
            </div>`;
        requestAnimationFrame(() => body.classList.add("is-in"));

        $$("[data-slide]", pager).forEach((b, j) => {
            b.setAttribute("aria-selected", j === i);
            b.classList.toggle("is-active", j === i);
        });
        pager.style.setProperty("--slide-ms", `${SLIDE_MS}ms`);
        schedule();
    }

    function schedule() {
        clearTimeout(timer);
        if (paused || reducedMotion()) return;
        timer = setTimeout(() => show((current + 1) % slides.length), SLIDE_MS);
    }

    pager.addEventListener("click", (e) => {
        const b = e.target.closest("[data-slide]");
        if (b) show(Number(b.dataset.slide));
    });
    const pause = () => { paused = true; hero.classList.add("is-paused"); clearTimeout(timer); };
    const resume = () => { paused = false; hero.classList.remove("is-paused"); schedule(); };
    hero.addEventListener("mouseenter", pause);
    hero.addEventListener("mouseleave", resume);
    hero.addEventListener("focusin", pause);
    hero.addEventListener("focusout", (e) => { if (!hero.contains(e.relatedTarget)) resume(); });
    const onVisibility = () => (document.hidden ? pause() : resume());
    document.addEventListener("visibilitychange", onVisibility);

    show(0);

    return () => {
        clearTimeout(timer);
        document.removeEventListener("visibilitychange", onVisibility);
    };
}

async function continueRail(container) {
    if (!session.loggedIn) return;
    let items;
    try { items = await progress.all(); } catch { return; }
    if (!items.length || !container.isConnected) return;

    const name = (session.user?.name || "").split(" ")[0];
    const section = document.createElement("section");
    section.className = "rail rail-continue";
    section.setAttribute("aria-labelledby", "rail-continue");
    section.innerHTML = `
        <header class="rail-head"><h2 id="rail-continue">Continue watching${name ? `, ${esc(name)}` : ""}</h2></header>
        <div class="rail-viewport"><ul class="rail-track">${items.map(continueCardHTML).join("")}</ul></div>`;

    section.addEventListener("click", async (e) => {
        const btn = e.target.closest("[data-remove-progress]");
        if (!btn) return;
        try {
            await progress.remove(btn.dataset.removeProgress);
            const li = btn.closest("li");
            li.remove();
            if (!$("li", section)) section.remove();
        } catch (err) {
            toast(err.message, { tone: "error" });
        }
    });

    container.prepend(section);
}

export default async function home(root) {
    const rails = $("[data-rails]", root);

    rails.append(createRail({
        id: "trending",
        title: "Trending now",
        ranked: true,
        eager: true,
        max: 10,
        load: async () => ({ items: await kitsu.trending(10), total: 10 }),
    }));
    rails.append(createRail({
        id: "airing",
        title: "Airing now",
        href: "/catalog?status=current",
        eager: true,
        load: (offset) => kitsu.popular({ offset, status: "current" }),
    }));
    for (const [slug, title] of RAILS) {
        rails.append(createRail({
            id: slug,
            title,
            href: `/catalog?genre=${slug}`,
            load: (offset) => kitsu.byCategory(slug, { offset }),
        }));
    }

    continueRail(rails);
    const heroCleanup = setupHero(root);
    return () => heroCleanup.then(fn => fn());
}

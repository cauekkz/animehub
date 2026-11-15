import { session, auth } from "./api.js";
import { $, $$, esc, initModal, closeModal, GENRES, toast } from "./ui.js";

import home from "./pages/home.js";
import catalog from "./pages/catalog.js";
import watch from "./pages/watch.js";
import list from "./pages/list.js";
import { login, signup } from "./pages/auth.js";

const routes = {
    "/": { html: "home", init: home, title: "AnimeHub", nav: "home" },
    "/catalog": { html: "catalog", init: catalog, title: "Catalog", nav: "catalog" },
    "/watch": { html: "watch", init: watch, title: "Watch" },
    "/list": { html: "list", init: list, title: "My list", nav: "list" },
    "/login": { html: "login", init: login, title: "Log in" },
    "/signup": { html: "signup", init: signup, title: "Create account" },
};
const aliases = { "/home": "/", "/player": "/watch" };

const htmlCache = new Map();
async function fetchPage(name) {
    if (!htmlCache.has(name)) {
        htmlCache.set(name, fetch(`/pages/${name}.html`).then(r => {
            if (!r.ok) throw new Error(r.status);
            return r.text();
        }));
    }
    return htmlCache.get(name);
}

const app = $("#app");
let cleanup = null;
let renderId = 0;

async function render() {
    const id = ++renderId;
    let path = location.pathname.replace(/\/+$/, "") || "/";
    if (aliases[path]) {
        path = aliases[path];
        history.replaceState(null, "", path + location.search);
    }
    const route = routes[path];

    if (typeof cleanup === "function") cleanup();
    cleanup = null;
    closeModal();
    closeDrawer();

    $$("[data-nav]").forEach(a => a.dataset.nav === route?.nav
        ? a.setAttribute("aria-current", "page")
        : a.removeAttribute("aria-current"));
    document.body.dataset.page = route?.html ?? "404";

    let html;
    try {
        html = await fetchPage(route?.html ?? "404");
    } catch {
        html = `<section class="page-narrow empty"><h1>No connection</h1><p>Couldn't load the page.</p></section>`;
    }
    if (id !== renderId) return;

    app.innerHTML = html;
    document.title = route?.title && route.title !== "AnimeHub" ? `${route.title} · AnimeHub` : "AnimeHub";
    window.scrollTo(0, 0);

    if (route) {
        try {
            cleanup = await route.init(app, new URLSearchParams(location.search));
        } catch (err) {
            console.error(err);
            toast("Something went wrong opening this page", { tone: "error" });
        }
    }
    updateHeader();
}

export function navigate(url, { replace = false } = {}) {
    const target = new URL(url, location.origin);
    if (target.origin !== location.origin) { location.href = url; return; }
    if (replace) history.replaceState(null, "", target.pathname + target.search);
    else history.pushState(null, "", target.pathname + target.search);
    render();
}
window.navigate = navigate;

document.addEventListener("click", (e) => {
    const a = e.target.closest("a[href]");
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (a.target === "_blank" || a.hasAttribute("download")) return;
    const url = new URL(a.href, location.origin);
    if (url.origin !== location.origin || url.pathname.startsWith("/api/")) return;
    e.preventDefault();
    if (url.pathname === location.pathname && url.search === location.search && !url.hash) {
        closeModal(); closeDrawer();
        return;
    }
    navigate(url.pathname + url.search);
});
window.addEventListener("popstate", render);

const header = $(".site-header");
const onScroll = () => { header.dataset.scrolled = window.scrollY > 24; };
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

$("[data-search]").addEventListener("submit", (e) => {
    e.preventDefault();
    const q = $("#search-input").value.trim();
    navigate(q ? `/catalog?q=${encodeURIComponent(q)}` : "/catalog");
    $("#search-input").blur();
});
document.addEventListener("keydown", (e) => {
    if (e.key === "/" && !e.target.closest("input, textarea, select, [contenteditable]")) {
        e.preventDefault();
        $("#search-input").focus();
    }
});

const genreLinks = GENRES.map(([slug, name]) => `<li><a href="/catalog?genre=${slug}" data-genre="${slug}">${esc(name)}</a></li>`).join("");
$("[data-genre-bar]").innerHTML = genreLinks;
$("[data-genre-list]").innerHTML = genreLinks;

const drawer = $("#drawer");
const burger = $("[data-action='open-drawer']");
function openDrawer() {
    drawer.hidden = false;
    burger.setAttribute("aria-expanded", "true");
    requestAnimationFrame(() => drawer.classList.add("is-open"));
    document.body.style.overflow = "hidden";
    $(".drawer-panel a, .drawer-panel button", drawer)?.focus();
}
function closeDrawer() {
    if (drawer.hidden) return;
    drawer.classList.remove("is-open");
    burger.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
    setTimeout(() => { drawer.hidden = true; }, 220);
}
burger.addEventListener("click", openDrawer);
$$("[data-action='close-drawer']").forEach(b => b.addEventListener("click", closeDrawer));

const accountBtn = $("[data-action='toggle-account']");
const accountMenu = $(".account-menu .menu");
function setAccountMenu(open) {
    accountMenu.hidden = !open;
    accountBtn.setAttribute("aria-expanded", open);
}
accountBtn.addEventListener("click", (e) => { e.stopPropagation(); setAccountMenu(accountMenu.hidden); });
document.addEventListener("click", (e) => { if (!e.target.closest(".account-menu")) setAccountMenu(false); });
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        if (!accountMenu.hidden) { setAccountMenu(false); accountBtn.focus(); }
        closeDrawer();
    }
});

$$("[data-action='logout']").forEach(b => b.addEventListener("click", () => {
    session.clear();
    setAccountMenu(false);
    toast("You've logged out");
    navigate("/");
}));

function updateHeader() {
    const user = session.user;
    $$("[data-guest]").forEach(el => (el.hidden = Boolean(user)));
    $$("[data-user]").forEach(el => (el.hidden = !user));
    if (user) {
        $$("[data-user-name]").forEach(el => (el.textContent = user.name));
        $$("[data-user-email]").forEach(el => (el.textContent = user.email));
        $("[data-user-initial]").textContent = (user.name || "?").trim()[0].toUpperCase();
    }
    const genre = new URLSearchParams(location.search).get("genre");
    $$("[data-genre]").forEach(a => a.toggleAttribute("aria-current", location.pathname === "/catalog" && a.dataset.genre === genre));
}
session.onChange(updateHeader);

if (session.loggedIn) {
    auth.me().then(user => session.set(session.token, user)).catch(() => {});
}

initModal();
render();


const TOKEN_KEY = "ah_token";
const USER_KEY = "ah_user";
const listeners = new Set();

function readStorage(key) {
    try { return localStorage.getItem(key); } catch { return null; }
}
function writeStorage(key, value) {
    try {
        if (value === null) localStorage.removeItem(key);
        else localStorage.setItem(key, value);
    } catch {}
}

export const session = {
    get token() { return readStorage(TOKEN_KEY); },
    get user() {
        try { return JSON.parse(readStorage(USER_KEY)); } catch { return null; }
    },
    get loggedIn() { return Boolean(this.token); },

    set(token, user) {
        writeStorage(TOKEN_KEY, token);
        writeStorage(USER_KEY, JSON.stringify(user));
        listeners.forEach(fn => fn(user));
    },
    clear() {
        writeStorage(TOKEN_KEY, null);
        writeStorage(USER_KEY, null);
        listeners.forEach(fn => fn(null));
    },
    onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
};

export class ApiError extends Error {
    constructor(message, status, fields) {
        super(message);
        this.status = status;
        this.fields = fields ?? null;
    }
}

export async function api(path, { method = "GET", body, query } = {}) {
    const url = new URL(`/api/${path}`, location.origin);
    if (query) Object.entries(query).forEach(([k, v]) => url.searchParams.set(k, v));

    const headers = { Accept: "application/json" };
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (session.token) headers.Authorization = `Bearer ${session.token}`;

    let res;
    try {
        res = await fetch(url, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
    } catch {
        throw new ApiError("No connection to the server", 0);
    }

    let json = null;
    try { json = await res.json(); } catch {}

    if (!res.ok || json?.status !== "success") {
        if (res.status === 401 && session.token) session.clear();
        const fields = json?.data && typeof json.data === "object" && !Array.isArray(json.data) ? json.data : null;
        throw new ApiError(json?.error_message || `Error ${res.status}`, res.status, fields);
    }

    return json.data;
}

export const auth = {
    login: (email, password) => api("login", { method: "POST", body: { email, password } }),
    signup: (data) => api("signup", { method: "POST", body: data }),
    me: () => api("me"),
};

export const watchlist = {
    _ids: null,
    async all() {
        const items = await api("list");
        this._ids = new Set(items.map(i => String(i.anime_id)));
        return items;
    },
    async has(id) {
        if (!session.loggedIn) return false;
        if (!this._ids) await this.all().catch(() => (this._ids = new Set()));
        return this._ids.has(String(id));
    },
    async add(anime) {
        await api("list", { method: "POST", body: { anime_id: anime.id, title: anime.title, poster: anime.posterLarge || anime.poster } });
        this._ids?.add(String(anime.id));
    },
    async remove(id) {
        await api("list", { method: "DELETE", query: { anime_id: id } });
        this._ids?.delete(String(id));
    },
    reset() { this._ids = null; },
};

export const progress = {
    all: () => api("progress"),
    save: (anime, episode) => api("progress", {
        method: "POST",
        body: {
            anime_id: anime.id,
            title: anime.title,
            poster: anime.posterLarge || anime.poster,
            cover: anime.cover,
            episode,
            episode_count: anime.episodeCount,
        },
    }),
    remove: (id) => api("progress", { method: "DELETE", query: { anime_id: id } }),
};

session.onChange(() => watchlist.reset());

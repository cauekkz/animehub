
const BASE = "https://kitsu.app/api/edge";
const LIST_FIELDS = "titles,canonicalTitle,posterImage,coverImage,startDate,subtype,averageRating,ageRating,episodeCount,status,synopsis,youtubeVideoId";

const cache = new Map();

function buildUrl(path, params = {}) {
    const url = new URL(BASE + path);
    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, value);
    }
    return url.toString();
}

async function request(path, params, { retries = 2 } = {}) {
    const url = buildUrl(path, params);
    if (cache.has(url)) return cache.get(url);

    const promise = (async () => {
        for (let attempt = 0; ; attempt++) {
            const res = await fetch(url, { headers: { Accept: "application/vnd.api+json" } });
            if (res.ok) return res.json();
            if ((res.status === 429 || res.status >= 500) && attempt < retries) {
                await new Promise(r => setTimeout(r, 800 * (attempt + 1)));
                continue;
            }
            throw new Error(`Kitsu responded ${res.status}`);
        }
    })();

    cache.set(url, promise);
    promise.catch(() => cache.delete(url));
    return promise;
}

export function normalize(item) {
    if (!item) return null;
    const a = item.attributes ?? {};
    const t = a.titles ?? {};
    const poster = a.posterImage ?? {};
    const cover = a.coverImage ?? {};
    const rating = a.averageRating ? Number(a.averageRating) / 10 : null;

    return {
        id: item.id,
        title: t.en || t.en_us || a.canonicalTitle || t.en_jp || t.ja_jp || "Untitled",
        altTitle: t.ja_jp || t.en_jp || "",
        romaji: t.en_jp || a.canonicalTitle || "",
        synopsis: (a.synopsis || "").split(/\n\n|\(Source:/)[0].trim(),
        poster: poster.small || poster.medium || poster.original || null,
        posterLarge: poster.large || poster.medium || poster.original || null,
        cover: cover.large || cover.original || null,
        coverSmall: cover.small || cover.large || null,
        year: a.startDate ? a.startDate.slice(0, 4) : null,
        subtype: a.subtype || null,
        status: a.status || null,
        episodeCount: a.episodeCount || null,
        rating: rating ? rating.toFixed(1) : null,
        ageRating: a.ageRating || null,
        youtube: a.youtubeVideoId || null,
    };
}

const listParams = (limit, offset) => ({
    "fields[anime]": LIST_FIELDS,
    "page[limit]": limit,
    "page[offset]": offset,
});

export async function trending(limit = 10) {
    const json = await request("/trending/anime", { limit, "fields[anime]": LIST_FIELDS });
    return json.data.map(normalize);
}

export async function byCategory(slug, { offset = 0, limit = 20, sort = "-userCount" } = {}) {
    const json = await request("/anime", {
        "filter[categories]": slug,
        sort,
        ...listParams(limit, offset),
    });
    return { items: json.data.map(normalize), total: json.meta?.count ?? 0 };
}

export async function popular({ offset = 0, limit = 20, sort = "-userCount", status } = {}) {
    const json = await request("/anime", { sort, "filter[status]": status, ...listParams(limit, offset) });
    return { items: json.data.map(normalize), total: json.meta?.count ?? 0 };
}

export async function search(text, { offset = 0, limit = 20 } = {}) {
    const json = await request("/anime", { "filter[text]": text, ...listParams(limit, offset) });
    return { items: json.data.map(normalize), total: json.meta?.count ?? 0 };
}

export async function byIds(ids) {
    const json = await request("/anime", {
        "filter[id]": ids.join(","),
        "page[limit]": Math.min(ids.length, 20),
        "fields[anime]": LIST_FIELDS,
    });
    const map = new Map(json.data.map(item => [item.id, normalize(item)]));
    return ids.map(id => map.get(String(id))).filter(Boolean);
}

export async function details(id) {
    const json = await request(`/anime/${encodeURIComponent(id)}`, {
        include: "categories,streamingLinks,streamingLinks.streamer",
        "fields[categories]": "title,slug",
        "fields[streamingLinks]": "url,streamer",
        "fields[streamers]": "siteName",
    });

    const included = json.included ?? [];
    const streamers = new Map(
        included.filter(i => i.type === "streamers").map(i => [i.id, i.attributes.siteName])
    );

    const anime = normalize(json.data);
    anime.categories = included
        .filter(i => i.type === "categories")
        .map(i => ({ title: i.attributes.title, slug: i.attributes.slug }));
    anime.streams = included
        .filter(i => i.type === "streamingLinks")
        .map(i => ({
            url: i.attributes.url.startsWith("http") ? i.attributes.url : `https://${i.attributes.url}`,
            site: streamers.get(i.relationships?.streamer?.data?.id) || "Official site",
        }))
        .filter(s => /^https?:\/\//.test(s.url));

    return anime;
}

export async function episodes(animeId, { offset = 0, limit = 20 } = {}) {
    const json = await request(`/anime/${encodeURIComponent(animeId)}/episodes`, {
        sort: "number",
        "page[limit]": limit,
        "page[offset]": offset,
        "fields[episodes]": "number,canonicalTitle,titles,synopsis,thumbnail,length,airdate",
    });

    return {
        total: json.meta?.count ?? 0,
        items: json.data.map(ep => {
            const a = ep.attributes;
            return {
                id: ep.id,
                number: a.number,
                title: a.canonicalTitle || a.titles?.en_us || a.titles?.en_jp || null,
                synopsis: (a.synopsis || "").split(/\n\n|\(Source:/)[0].trim(),
                thumbnail: a.thumbnail?.original || null,
                length: a.length || null,
                airdate: a.airdate || null,
            };
        }),
    };
}

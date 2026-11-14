
import { esc, icon, youtubeEmbed } from "./ui.js";

export async function getEpisodeSource(anime, ep) {
    return null;
}

const isHttp = (url) => {
    try { return ["http:", "https:"].includes(new URL(url, location.origin).protocol); }
    catch { return false; }
};
const guessType = (url) => (/\.(mp4|webm|ogv|m4v)(\?|#|$)/i.test(url) ? "video" : "iframe");

export function playerLoadingHTML() {
    return `<div class="stage-frame player-loading"><span class="spinner" aria-label="Carregando episódio"></span></div>`;
}

export function playerHTML(source, { anime, ep, poster }) {
    const label = anime.subtype === "movie" ? anime.title : `${anime.title} · Episódio ${ep}`;
    const type = source.type || guessType(source.url);

    const frame = type === "video"
        ? `<video class="player-video" src="${esc(source.url)}" ${poster ? `poster="${esc(poster)}"` : ""}
                 controls playsinline preload="metadata" aria-label="${esc(label)}" data-player-video></video>`
        : `<iframe src="${esc(source.url)}" title="${esc(label)}"
                   allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen
                   referrerpolicy="strict-origin-when-cross-origin"></iframe>`;

    return `<div class="stage-frame">${frame}</div>
            <p class="stage-label">${icon("play")} ${esc(label)}</p>`;
}

export function playerEmptyHTML({ anime, ep, poster }) {
    const isMovie = anime.subtype === "movie";
    return `
        <div class="stage-frame player-empty">
            ${poster ? `<img src="${esc(poster)}" alt="" onerror="this.remove()">` : ""}
            <div class="player-empty-body">
                <span class="player-empty-icon">${icon("play")}</span>
                <p class="player-empty-title">${isMovie ? "Filme" : `Episódio ${ep}`} ainda sem vídeo</p>
                <p class="player-empty-text">Quando a fonte estiver ligada, o player aparece aqui.</p>
                ${anime.youtube ? `<button class="btn btn-ghost btn-sm" type="button" data-play-trailer>${icon("film")}<span>Ver trailer</span></button>` : ""}
            </div>
        </div>`;
}

export function trailerHTML(anime) {
    return `<div class="stage-frame">${youtubeEmbed(anime.youtube, anime.title, { autoplay: true })}</div>
            <p class="stage-label">${icon("film")} Trailer oficial</p>`;
}

export function mountPlayer(stage, { anime, ep, poster, onEnded }) {
    let cancelled = false;
    stage.innerHTML = playerLoadingHTML();

    (async () => {
        let source = null;
        try { source = await getEpisodeSource(anime, ep); }
        catch (err) { console.error("Fonte do episódio falhou:", err); }
        if (cancelled || !stage.isConnected) return;

        if (source?.url && isHttp(source.url)) {
            stage.innerHTML = playerHTML(source, { anime, ep, poster });
            const video = stage.querySelector("[data-player-video]");
            if (video && onEnded) video.addEventListener("ended", onEnded);
        } else {
            stage.innerHTML = playerEmptyHTML({ anime, ep, poster });
            stage.querySelector("[data-play-trailer]")?.addEventListener("click", () => {
                stage.innerHTML = trailerHTML(anime);
            });
        }
    })();

    return () => { cancelled = true; };
}

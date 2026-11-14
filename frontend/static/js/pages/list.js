import { session, watchlist } from "../api.js";
import { $, cardHTML, skeletonCards } from "../ui.js";

export default async function list(root) {
    const grid = $("[data-grid]", root);
    const count = $("[data-count]", root);

    if (!session.loggedIn) {
        grid.innerHTML = `<li class="empty">
            <h2>Entre para ver sua lista</h2>
            <p>Salve animes para assistir depois e eles aparecem aqui.</p>
            <div class="actions"><a class="btn btn-primary" href="/login?next=/list">Entrar</a><a class="btn btn-ghost" href="/signup">Criar conta</a></div>
        </li>`;
        return;
    }

    grid.innerHTML = skeletonCards(6);

    async function refresh() {
        let items;
        try {
            items = await watchlist.all();
        } catch (err) {
            grid.innerHTML = `<li class="empty"><h2>Não deu para carregar</h2><p>${err.message}</p></li>`;
            return;
        }
        if (!root.isConnected) return;
        count.textContent = items.length ? `${items.length} ${items.length === 1 ? "título" : "títulos"}` : "";
        grid.innerHTML = items.length
            ? items.map(i => cardHTML({ id: i.anime_id, title: i.title, poster: i.poster, posterLarge: i.poster })).join("")
            : `<li class="empty">
                <h2>Sua lista está vazia</h2>
                <p>Abra qualquer anime e toque em <strong>Minha lista</strong> para guardar aqui.</p>
                <div class="actions"><a class="btn btn-primary" href="/catalog">Explorar o catálogo</a></div>
               </li>`;
    }

    const dialog = document.querySelector("#anime-modal");
    const onClose = () => refresh();
    dialog.addEventListener("close", onClose);

    await refresh();
    return () => dialog.removeEventListener("close", onClose);
}

import { session, watchlist } from "../api.js";
import { $, cardHTML, skeletonCards } from "../ui.js";

export default async function list(root) {
    const grid = $("[data-grid]", root);
    const count = $("[data-count]", root);

    if (!session.loggedIn) {
        grid.innerHTML = `<li class="empty">
            <h2>Log in to see your list</h2>
            <p>Save anime to watch later and they show up here.</p>
            <div class="actions"><a class="btn btn-primary" href="/login?next=/list">Log in</a><a class="btn btn-ghost" href="/signup">Create account</a></div>
        </li>`;
        return;
    }

    grid.innerHTML = skeletonCards(6);

    async function refresh() {
        let items;
        try {
            items = await watchlist.all();
        } catch (err) {
            grid.innerHTML = `<li class="empty"><h2>Couldn't load this</h2><p>${err.message}</p></li>`;
            return;
        }
        if (!root.isConnected) return;
        count.textContent = items.length ? `${items.length} ${items.length === 1 ? "title" : "titles"}` : "";
        grid.innerHTML = items.length
            ? items.map(i => cardHTML({ id: i.anime_id, title: i.title, poster: i.poster, posterLarge: i.poster })).join("")
            : `<li class="empty">
                <h2>Your list is empty</h2>
                <p>Open any anime and tap <strong>My list</strong> to save it here.</p>
                <div class="actions"><a class="btn btn-primary" href="/catalog">Explore the catalog</a></div>
               </li>`;
    }

    const dialog = document.querySelector("#anime-modal");
    const onClose = () => refresh();
    dialog.addEventListener("close", onClose);

    await refresh();
    return () => dialog.removeEventListener("close", onClose);
}

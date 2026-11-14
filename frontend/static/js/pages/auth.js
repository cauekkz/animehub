import * as kitsu from "../kitsu.js";
import { session, auth } from "../api.js";
import { $, $$, esc, toast } from "../ui.js";

function nextUrl(params) {
    const next = params.get("next") || "/";
    return next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

async function paintArt(root) {
    const art = $("[data-auth-art]", root);
    try {
        const items = await kitsu.trending(12);
        if (!root.isConnected) return;
        art.innerHTML = items.filter(a => a.poster).map((a, i) =>
            `<img src="${esc(a.poster)}" alt="" loading="lazy" style="--i:${i}">`).join("");
    } catch {}
}

function setFieldError(form, name, message) {
    const input = form.elements[name];
    const out = $(`#${name}-error`, form);
    if (!input || !out) return;
    out.hidden = !message;
    out.textContent = message || "";
    input.setAttribute("aria-invalid", Boolean(message));
    const describedBy = new Set((input.getAttribute("aria-describedby") || "").split(" ").filter(Boolean));
    message ? describedBy.add(out.id) : describedBy.delete(out.id);
    input.setAttribute("aria-describedby", [...describedBy].join(" "));
}

function setup(root, params, { validate, submit, successMessage }) {
    const form = $("[data-form]", root);
    const formError = $("[data-form-error]", root);
    const button = $("button[type=submit]", form);
    const next = nextUrl(params);

    if (session.loggedIn) {
        window.navigate(next, { replace: true });
        return;
    }

    paintArt(root);
    $$("[data-keep-next]", root).forEach(a => {
        if (next !== "/") a.href += `?next=${encodeURIComponent(next)}`;
    });

    $$("[data-reveal]", root).forEach(btn => btn.addEventListener("click", () => {
        const input = form.elements[btn.dataset.reveal];
        const show = input.type === "password";
        input.type = show ? "text" : "password";
        btn.textContent = show ? "Ocultar" : "Mostrar";
        btn.setAttribute("aria-pressed", show);
        btn.setAttribute("aria-label", show ? "Ocultar senha" : "Mostrar senha");
    }));

    form.addEventListener("focusout", (e) => {
        const name = e.target.name;
        if (!name || !e.target.value) return;
        const errors = validate(Object.fromEntries(new FormData(form)));
        setFieldError(form, name, errors[name]);
    });
    form.addEventListener("input", (e) => {
        if (e.target.getAttribute("aria-invalid") === "true") {
            const errors = validate(Object.fromEntries(new FormData(form)));
            if (!errors[e.target.name]) setFieldError(form, e.target.name, null);
        }
    });

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        formError.hidden = true;
        const data = Object.fromEntries(new FormData(form));
        const errors = validate(data);

        [...form.elements].forEach(el => el.name && setFieldError(form, el.name, errors[el.name]));
        const firstInvalid = Object.keys(errors)[0];
        if (firstInvalid) {
            form.elements[firstInvalid].focus();
            return;
        }

        button.disabled = true;
        const label = button.textContent;
        button.innerHTML = `<span class="spinner spinner-sm" aria-hidden="true"></span><span>Aguarde…</span>`;
        try {
            const { token, user } = await submit(data);
            session.set(token, user);
            toast(successMessage(user));
            window.navigate(next, { replace: true });
        } catch (err) {
            if (err.fields) {
                Object.entries(err.fields).forEach(([name, msg]) => setFieldError(form, name, msg));
                const first = Object.keys(err.fields)[0];
                form.elements[first]?.focus();
            }
            if (!err.fields || err.status === 401) {
                formError.textContent = err.message;
                formError.hidden = false;
            }
        } finally {
            button.disabled = false;
            button.textContent = label;
        }
    });
}

const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v || "");

export function login(root, params) {
    setup(root, params, {
        validate: (d) => {
            const errors = {};
            if (!emailOk(d.email)) errors.email = "Digite um email válido";
            if (!d.password) errors.password = "Digite sua senha";
            return errors;
        },
        submit: (d) => auth.login(d.email.trim(), d.password),
        successMessage: (u) => `Oi, ${u.name.split(" ")[0]}!`,
    });
}

export function signup(root, params) {
    setup(root, params, {
        validate: (d) => {
            const errors = {};
            if ((d.name || "").trim().length < 3) errors.name = "O nome precisa ter pelo menos 3 letras";
            if (!emailOk(d.email)) errors.email = "Digite um email válido";
            if ((d.password || "").length < 8) errors.password = "A senha precisa ter pelo menos 8 caracteres";
            if (d.conf_password !== d.password) errors.conf_password = "As senhas não são iguais";
            return errors;
        },
        submit: (d) => auth.signup({ name: d.name.trim(), email: d.email.trim(), password: d.password, conf_password: d.conf_password }),
        successMessage: (u) => `Conta criada. Bem-vindo, ${u.name.split(" ")[0]}!`,
    });
}

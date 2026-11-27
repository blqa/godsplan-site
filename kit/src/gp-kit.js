/*
 * God's Plan · kit de interfaz compartido por godsplan.dev, rig.godsplan.dev y godstap.godsplan.dev
 *
 * Usa, compiladas desde su código fuente en GitHub (ver kit/README.md):
 *   - Motion (motiondivision/motion)      → aparición al bajar, barra de progreso, frase por palabras
 *     (animateMini, inView y scroll: la versión ligera que anima con el motor del navegador)
 *   - Embla Carousel (davidjerleke)       → tarjetas deslizables en celular
 *   - Floating UI (floating-ui/floating-ui) → globos de ayuda anclados
 * Y piezas propias con el mismo comportamiento que:
 *   - cmdk (dip/cmdk)                     → buscador con Ctrl/⌘ + K
 *   - Sonner (emilkowalski/sonner)        → avisos emergentes apilados
 * Los íconos son de Lucide (ISC). Todo respeta "reducir movimiento".
 */
import { animateMini as animate, inView, scroll } from "framer-motion/dom";
import EmblaCarousel from "embla-carousel";
import { computePosition, autoUpdate, offset, flip, shift, arrow } from "@floating-ui/dom";

const doc = document.documentElement;
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const fine = window.matchMedia("(pointer: fine)").matches;
const EASE = [0.16, 1, 0.3, 1]; // la misma curva --gp-ease-out de los sitios
const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

// Íconos de Lucide que usa el kit (trazo 2px, extremos redondeados)
const LUCIDE = {
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.34-4.34"/>',
  enter: '<path d="M20 4v7a4 4 0 0 1-4 4H4"/><path d="m9 10-5 5 5 5"/>',
  out: '<path d="M7 7h10v10"/><path d="M7 17 17 7"/>',
  copy: '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  arrow: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
};
const icon = (name, cls = "gpk-ic") =>
  `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${LUCIDE[name] || ""}</svg>`;
const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const norm = (t) => String(t).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/* ------------------------------------------------------------------ Avisos (estilo Sonner) */
let toaster;
export function toast(message, { type = "success", duration = 4000 } = {}) {
  if (!toaster) {
    toaster = document.createElement("ol");
    toaster.className = "gpk-toaster";
    toaster.setAttribute("aria-live", "polite");
    toaster.setAttribute("role", "status");
    document.body.appendChild(toaster);
  }
  const li = document.createElement("li");
  li.className = `gpk-toast gpk-toast--${type}`;
  li.innerHTML = `${icon(type === "success" ? "check" : "info", "gpk-toast__ic")}<span>${esc(message)}</span><button type="button" class="gpk-toast__x" aria-label="Cerrar aviso">${icon("x")}</button>`;
  toaster.prepend(li);
  const close = () => {
    if (!li.isConnected) return;
    if (reduce) return li.remove();
    animate(li, { opacity: 0, transform: "translateY(12px) scale(0.96)" }, { duration: 0.2 }).finished.then(() => li.remove());
  };
  li.querySelector("button").addEventListener("click", close);
  if (!reduce) animate(li, { opacity: [0, 1], transform: ["translateY(24px) scale(0.96)", "translateY(0) scale(1)"] }, { duration: 0.45, ease: EASE });
  // Solo se ven 3 a la vez, como en Sonner
  [...toaster.children].slice(3).forEach((n) => n.remove());
  setTimeout(close, duration);
  return li;
}
window.gpToast = toast;

async function copyText(text, okMsg) {
  try {
    await navigator.clipboard.writeText(text);
    toast(okMsg || "Copiado");
  } catch {
    toast("No se pudo copiar. Selecciónalo y cópialo a mano.", { type: "info" });
  }
}
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-copy]");
  if (!b) return;
  e.preventDefault();
  copyText(b.getAttribute("data-copy"), b.getAttribute("data-copy-msg"));
});

/* ------------------------------------------------------------------ Barra de progreso de lectura */
(function progress() {
  if (doc.hasAttribute("data-no-progress")) return;
  const bar = document.createElement("div");
  bar.className = "gpk-progress";
  bar.setAttribute("aria-hidden", "true");
  document.body.appendChild(bar);
  scroll((p) => { bar.style.transform = `scaleX(${p})`; });
})();

/* ------------------------------------------------------------------ Aparición al bajar (Motion) */
(function reveal() {
  const root = document.querySelector(".estudio");
  const vh = window.innerHeight;
  const items = [...document.querySelectorAll("[data-reveal]")];
  const done = (el) => {
    el.classList.add("is-in");
    el.style.removeProperty("opacity");
    el.style.removeProperty("transform");
    el.style.removeProperty("transition");
  };
  if (reduce) { items.forEach(done); return; }
  const fresh = [];
  items.forEach((el) => {
    const hidden = getComputedStyle(el).opacity === "0";
    // En GodsTap el HTML llega visible: lo que ya está a la vista no se esconde
    if (!hidden && el.getBoundingClientRect().top < vh * 0.94) done(el);
    else fresh.push(el);
  });
  if (root) root.classList.add("fx");
  fresh.forEach((el) => {
    inView(el, () => {
      if (el.closest("[data-carousel].is-on")) return done(el);
      const d = parseFloat(getComputedStyle(el).getPropertyValue("--d")) || 0;
      el.style.transition = "none";
      animate(el, { opacity: [0, 1], transform: ["translateY(28px)", "translateY(0)"] }, { duration: 0.85, delay: d * 0.09, ease: EASE })
        .finished.then(() => done(el));
    }, { margin: "0px 0px -6% 0px", amount: 0.12 });
  });
})();

/* ------------------------------------------------------------------ Frase que se enciende al bajar (Motion scroll) */
(function words() {
  const el = document.querySelector("[data-words]");
  if (!el || reduce) return;
  const run = () => {
    const ws = el.querySelectorAll(".w");
    if (!ws.length) return;
    scroll((p) => {
      const n = Math.round(p * ws.length);
      ws.forEach((w, i) => w.classList.toggle("on", i < n));
    }, { target: el, offset: ["start 0.85", "end 0.5"] });
  };
  // La portada de godsplan.dev parte la frase en palabras antes de cargar el kit
  if (el.querySelector(".w")) run();
  else requestAnimationFrame(run);
})();

/* ------------------------------------------------------------------ Tarjetas deslizables en celular (Embla) */
document.querySelectorAll("[data-carousel]").forEach((viewport) => {
  const mq = window.matchMedia("(max-width: 640px)");
  const dots = document.createElement("div");
  dots.className = "gpk-dots";
  dots.setAttribute("role", "group");
  dots.setAttribute("aria-label", "Elegir tarjeta");
  viewport.after(dots);
  // La fila se arma antes de crear Embla para que mida las tarjetas ya acomodadas
  viewport.classList.toggle("is-on", mq.matches);
  const embla = EmblaCarousel(viewport, {
    align: "start",
    containScroll: "trimSnaps",
    duration: reduce ? 0 : 25,
    breakpoints: { "(min-width: 641px)": { active: false } },
  });
  const paint = () => {
    const on = mq.matches;
    dots.hidden = !on;
    if (!on) return;
    viewport.querySelectorAll("[data-reveal]").forEach((n) => n.classList.add("is-in"));
    const snaps = embla.scrollSnapList();
    if (dots.children.length !== snaps.length) {
      dots.innerHTML = snaps.map((_, i) => `<button type="button" class="gpk-dot" aria-label="Tarjeta ${i + 1} de ${snaps.length}"></button>`).join("");
      [...dots.children].forEach((b, i) => b.addEventListener("click", () => embla.scrollTo(i)));
    }
    const sel = embla.selectedScrollSnap();
    [...dots.children].forEach((b, i) => b.setAttribute("aria-current", i === sel ? "true" : "false"));
  };
  mq.addEventListener("change", () => { viewport.classList.toggle("is-on", mq.matches); embla.reInit(); paint(); });
  embla.on("reInit", paint).on("select", paint).on("resize", paint);
  paint();
});

/* ------------------------------------------------------------------ Globos de ayuda (Floating UI) */
(function tooltips() {
  const targets = document.querySelectorAll("[data-tip]");
  if (!targets.length) return;
  const tip = document.createElement("div");
  tip.className = "gpk-tip";
  tip.id = "gpk-tip";
  tip.setAttribute("role", "tooltip");
  tip.innerHTML = '<span class="gpk-tip__txt"></span><span class="gpk-tip__arrow"></span>';
  document.body.appendChild(tip);
  const txt = tip.querySelector(".gpk-tip__txt");
  const arr = tip.querySelector(".gpk-tip__arrow");
  let stop = null;
  let current = null;
  const place = (el) =>
    computePosition(el, tip, { placement: el.getAttribute("data-tip-place") || "bottom", middleware: [offset(10), flip(), shift({ padding: 8 }), arrow({ element: arr })] })
      .then(({ x, y, placement, middlewareData }) => {
        Object.assign(tip.style, { left: `${x}px`, top: `${y}px` });
        const side = { top: "bottom", right: "left", bottom: "top", left: "right" }[placement.split("-")[0]];
        const a = middlewareData.arrow || {};
        Object.assign(arr.style, { left: a.x != null ? `${a.x}px` : "", top: a.y != null ? `${a.y}px` : "", right: "", bottom: "", [side]: "-4px" });
      });
  const show = (el) => {
    current = el;
    txt.textContent = el.getAttribute("data-tip");
    el.setAttribute("aria-describedby", "gpk-tip");
    tip.classList.add("is-on");
    stop?.();
    stop = autoUpdate(el, tip, () => place(el));
  };
  const hide = () => {
    if (current) current.removeAttribute("aria-describedby");
    current = null;
    tip.classList.remove("is-on");
    stop?.();
    stop = null;
  };
  targets.forEach((el) => {
    if (fine) {
      el.addEventListener("pointerenter", () => show(el));
      el.addEventListener("pointerleave", hide);
    }
    el.addEventListener("focus", () => show(el));
    el.addEventListener("blur", hide);
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") hide(); });
})();

/* ------------------------------------------------------------------ Buscador con Ctrl/⌘ + K (estilo cmdk) */
(function commandMenu() {
  const data = document.getElementById("gp-cmdk");
  if (!data) return;
  let items = [];
  try { items = JSON.parse(data.textContent); } catch { return; }
  const kbd = isMac ? "⌘K" : "Ctrl K";
  document.querySelectorAll("[data-cmdk-kbd]").forEach((k) => { k.textContent = kbd; });

  const dlg = document.createElement("dialog");
  dlg.className = "gpk-cmdk";
  dlg.setAttribute("aria-label", "Buscar en el sitio");
  dlg.innerHTML = `
    <div class="gpk-cmdk__box">
      <label class="gpk-cmdk__search">${icon("search")}
        <input type="text" role="combobox" aria-expanded="true" aria-controls="gpk-cmdk-list" aria-autocomplete="list" autocomplete="off" spellcheck="false" placeholder="Busca un servicio, un producto o una acción…">
        <kbd>Esc</kbd>
      </label>
      <div class="gpk-cmdk__list" id="gpk-cmdk-list" role="listbox" aria-label="Resultados"></div>
      <p class="gpk-cmdk__foot"><span>${icon("enter")} abrir</span><span>↑ ↓ moverte</span><span>Esc cerrar</span></p>
    </div>`;
  document.body.appendChild(dlg);
  const input = dlg.querySelector("input");
  const list = dlg.querySelector(".gpk-cmdk__list");
  let shown = [];
  let active = 0;

  const score = (it, q) => {
    if (!q) return 1;
    const hay = norm(`${it.label} ${it.group || ""} ${it.keywords || ""} ${it.hint || ""}`);
    const label = norm(it.label);
    const terms = q.split(/\s+/).filter(Boolean);
    if (!terms.every((t) => hay.includes(t))) return 0;
    return (label.startsWith(terms[0]) ? 3 : 0) + (label.includes(q) ? 2 : 0) + 1;
  };
  const render = () => {
    const q = norm(input.value.trim());
    shown = items.map((it, i) => ({ it, i, s: score(it, q) })).filter((r) => r.s > 0);
    if (q) shown.sort((a, b) => b.s - a.s || a.i - b.i);
    active = Math.min(active, Math.max(0, shown.length - 1));
    if (!shown.length) {
      list.innerHTML = `<p class="gpk-cmdk__empty">Sin resultados para “${esc(input.value)}”.</p>`;
      input.removeAttribute("aria-activedescendant");
      return;
    }
    let html = "";
    let group = null;
    shown.forEach((r, n) => {
      if (!q && r.it.group !== group) {
        group = r.it.group;
        html += `<p class="gpk-cmdk__group" role="presentation">${esc(group || "")}</p>`;
      }
      const ext = r.it.href && /^https?:|^mailto:/.test(r.it.href) && !r.it.href.includes(location.host);
      html += `<div class="gpk-cmdk__item" role="option" id="gpk-opt-${n}" data-n="${n}" aria-selected="${n === active}">
        <span class="gpk-cmdk__label">${esc(r.it.label)}</span>
        ${r.it.hint ? `<span class="gpk-cmdk__hint">${esc(r.it.hint)}</span>` : ""}
        ${icon(r.it.action ? "copy" : ext ? "out" : "arrow")}
      </div>`;
    });
    list.innerHTML = html;
    input.setAttribute("aria-activedescendant", `gpk-opt-${active}`);
  };
  const move = (d) => {
    if (!shown.length) return;
    active = (active + d + shown.length) % shown.length;
    list.querySelectorAll(".gpk-cmdk__item").forEach((n) => n.setAttribute("aria-selected", String(+n.dataset.n === active)));
    input.setAttribute("aria-activedescendant", `gpk-opt-${active}`);
    list.querySelector(`[data-n="${active}"]`)?.scrollIntoView({ block: "nearest" });
  };
  const run = (n) => {
    const it = shown[n]?.it;
    if (!it) return;
    close();
    if (it.action && it.action.startsWith("copy:")) return copyText(it.action.slice(5), it.toast || "Copiado");
    if (!it.href) return;
    const ext = /^https?:/.test(it.href) && !it.href.includes(location.host);
    if (ext) window.open(it.href, "_blank", "noopener");
    else location.href = it.href;
  };
  const open = () => {
    if (dlg.open) return;
    input.value = "";
    active = 0;
    render();
    dlg.showModal();
    input.focus();
    if (!reduce) animate(dlg.firstElementChild, { opacity: [0, 1], transform: ["translateY(-8px) scale(0.97)", "translateY(0) scale(1)"] }, { duration: 0.3, ease: EASE });
  };
  const close = () => { if (dlg.open) dlg.close(); };

  input.addEventListener("input", () => { active = 0; render(); });
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); move(1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); move(-1); }
    else if (e.key === "Enter") { e.preventDefault(); run(active); }
  });
  list.addEventListener("click", (e) => { const o = e.target.closest(".gpk-cmdk__item"); if (o) run(+o.dataset.n); });
  list.addEventListener("pointermove", (e) => {
    const o = e.target.closest(".gpk-cmdk__item");
    if (o && +o.dataset.n !== active) { active = +o.dataset.n; move(0); }
  });
  dlg.addEventListener("click", (e) => { if (e.target === dlg) close(); });
  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); dlg.open ? close() : open(); }
  });
  document.querySelectorAll("[data-cmdk-open]").forEach((b) => b.addEventListener("click", open));
})();

/* ------------------------------------------------------------------ Bordes animados (estilo Magic UI) */
document.querySelectorAll("[data-beam], [data-shine]").forEach((el) => {
  if (getComputedStyle(el).position === "static") el.style.position = "relative";
  if (el.hasAttribute("data-beam")) {
    const s = document.createElement("span");
    s.className = "gpk-beam";
    s.setAttribute("aria-hidden", "true");
    s.style.setProperty("--gpk-r", getComputedStyle(el).borderTopLeftRadius || "24px");
    s.innerHTML = "<i></i>";
    el.appendChild(s);
  }
  if (el.hasAttribute("data-shine")) {
    const s = document.createElement("span");
    s.className = "gpk-shine";
    s.setAttribute("aria-hidden", "true");
    el.appendChild(s);
  }
});

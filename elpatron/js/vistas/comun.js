/* =========================================================
   KIT COMÚN DE LAS VERSIONES 2D (v1, v2, v3)
   - HUD mínimo arriba, dock abajo y cajón lateral con los menús de siempre
   - Mapa vivo con zoom/arrastre y paneles contextuales (plazas y convoyes)
   - Vigilante de eventos (redadas, ataques, traiciones, cuentas...) para animar las vistas
   No cambia ninguna mecánica: solo llama a las funciones del motor (Core.*).
   ========================================================= */
const VK = {
    ver: window.EP_VERSION,
    listeners: [],
    extraDock: [],

    init(opts = {}) {
        document.body.classList.add('vmode', 'vmode-' + this.ver);
        this.extraDock = opts.dock || [];
        // escenario de fondo (cada versión pone aquí su canvas)
        this.stage = document.createElement('div');
        this.stage.id = 'v-stage';
        document.body.appendChild(this.stage);
        this.buildHud();
        this.buildDock();
        this.buildDrawer();
        this.panelEl = document.createElement('div');
        this.panelEl.id = 'v-panel'; this.panelEl.className = 'v-panel hidden';
        document.body.appendChild(this.panelEl);
        this.flashEl = document.createElement('div');
        this.flashEl.id = 'v-flash';
        document.body.appendChild(this.flashEl);
        // el escenario solo se ve con la partida corriendo
        const start = Core.Game.start.bind(Core.Game);
        Core.Game.start = () => { this.quiet = true; start(); this.quiet = false; this.closeDrawer(); document.body.classList.add('v-running'); this.buildDock(); if (opts.onStart) opts.onStart(); };
        if (Core.Game.running) { document.body.classList.add('v-running'); if (opts.onStart) opts.onStart(); }
        // abrir menús = abrir el cajón
        const nav = UI.nav.bind(UI);
        UI.nav = id => { nav(id); if (UI.current === id && !this.quiet) { document.body.classList.add('drawer-open'); setText('v-drawer-title', (VIEWS.find(v => v.id === id) || {}).name || ''); if (id === 'war') setTimeout(() => Core.War.resize(), 260); } };
        document.addEventListener('keydown', e => { if (e.key === 'Escape') { this.closeDrawer(); this.closePanel(); } });
        setInterval(() => { if (Core.Game.running) { this.renderHud(); this.watch(); if (this.panelRefresh) this.panelRefresh(); } }, 500);
        setInterval(() => this.buildDock(), 3000);
    },

    /* ---------- Selector de versiones (pantalla de inicio) ---------- */
    VERSIONS: [{ id: 'clasica', name: 'Clásica', path: '' }, { id: 'v1', name: 'Mapa Vivo', path: 'v1/' }, { id: 'v2', name: 'El Rancho', path: 'v2/' }, { id: 'v3', name: 'Híbrido', path: 'v3/' }],
    versionBar(cur) {
        document.querySelectorAll('#version-pick .vp-card').forEach(a => {
            const v = this.VERSIONS.find(x => x.id === a.dataset.ver);
            a.href = '../' + v.path;
            a.classList.toggle('on', v.id === cur);
        });
    },

    /* ---------- HUD mínimo ---------- */
    buildHud() {
        const h = document.createElement('div');
        h.id = 'v-hud';
        h.innerHTML = `<div class="vh-me" id="vh-me"></div>
            <div class="vh-money"><span title="Dinero sucio">💵 <b id="vh-dirty">0</b></span><span title="Dinero limpio">🏦 <b id="vh-clean">0</b></span><span title="Offshore" class="vh-off">🌴 <b id="vh-off">0</b></span></div>
            <div class="vh-heat" title="Búsqueda"><div id="vh-heat-fill"></div><span id="vh-heat-txt">0</span></div>
            <div class="vh-chips" id="vh-chips"></div>
            <div class="vh-btns"><button onclick="Sfx.toggle()" title="Sonido">🔊</button><button onclick="Core.Game.togglePause()" title="Pausa">⏸</button><button onclick="Core.Cloud.openSlots()" title="Partidas">💾</button><a href="../" title="Versión clásica">↩</a></div>`;
        document.body.appendChild(h);
    },
    renderHud() {
        const S = State, r = Config.ranks[S.rank] || Config.ranks[0];
        setHTML('vh-me', `${Core.Me.emblem()} <b style="color:${Core.Me.color()}">${Core.Me.alias()}</b> <span class="vh-rank" style="color:${r.color};border-color:${r.color}">${r.name}</span>`);
        setText('vh-dirty', fmt(S.money.dirty)); setText('vh-clean', fmt(S.money.clean)); setText('vh-off', fmt(S.money.offshore));
        const hp = clamp(S.heat / S.heatCap * 100, 0, 100);
        const f = $('vh-heat-fill'); if (f) { f.style.width = hp + '%'; f.style.background = hp > 80 ? '#f33' : hp > 50 ? '#fb0' : '#c5a059'; }
        setText('vh-heat-txt', `${Math.floor(S.heat)}/${S.heatCap}`);
        const chips = [];
        if (S.incoming.length) chips.push(`<button class="vh-chip red" onclick="VK.focusAttack()">⚔️ ${S.incoming.length}</button>`);
        if ((S.vendettas || []).length) chips.push(`<button class="vh-chip red" onclick="UI.nav('cuentas')">🩸 ${S.vendettas.length}</button>`);
        if (S.golpes && S.golpes.active) chips.push(`<button class="vh-chip" onclick="UI.nav('golpes')">🎯 ${fmtTime(S.golpes.active.left)}</button>`);
        if (S.escape && S.escape.started) chips.push(`<button class="vh-chip" onclick="UI.nav('ending')">🕵️ ${Math.floor(S.escape.fbi)}</button>`);
        const c = Core.War.cushion(); if (Math.min(c.sic, c.eli) < 2) chips.push(`<button class="vh-chip red" onclick="UI.nav('war')">💸 nómina</button>`);
        const ch = Core.Story && State.mode === 'story' && Config.story[State.story.chapter];
        if (ch) { const [v, m] = Core.Story.progress(); chips.push(`<button class="vh-chip gold" onclick="UI.nav('story')" title="${ch.goal}">📖 ${State.story.chapter + 1}: ${Math.floor(v / m * 100)}%</button>`); }
        setHTML('vh-chips', chips.join(''));
    },
    focusAttack() { const i = State.incoming[0]; if (i && this.onFocus) this.onFocus(i.target); else UI.nav('war'); },

    /* ---------- Dock ---------- */
    buildDock() {
        let d = $('v-dock');
        if (!d) { d = document.createElement('nav'); d.id = 'v-dock'; document.body.appendChild(d); }
        const open = VIEWS.filter(v => Core.Unlocks.isOpen(v.id));
        const key = this.extraDock.map(x => x.id).join() + open.map(v => v.id).join();
        if (d.dataset.key === key) return;
        d.dataset.key = key;
        d.innerHTML = this.extraDock.map(x => `<button class="vd-btn vd-extra" onclick="${x.onclick}"><span>${x.icon}</span><small>${x.label}</small></button>`).join('') +
            open.map(v => `<button class="vd-btn" data-view="${v.id}" onclick="UI.nav('${v.id}')"><span>${v.icon}</span><small>${v.short || v.name}</small></button>`).join('');
    },

    /* ---------- Cajón con los menús de siempre ---------- */
    buildDrawer() {
        const main = $('main');
        const bar = document.createElement('div');
        bar.className = 'v-drawer-bar';
        bar.innerHTML = `<b id="v-drawer-title"></b><button onclick="VK.closeDrawer()">✕ CERRAR</button>`;
        main.insertBefore(bar, main.firstChild);
    },
    closeDrawer() { document.body.classList.remove('drawer-open'); },

    /* ---------- Panel contextual ---------- */
    panel(html, x, y, refresh) {
        const p = this.panelEl;
        p.innerHTML = `<button class="vp-x" onclick="VK.closePanel()">✕</button>` + html;
        p.classList.remove('hidden');
        const w = Math.min(320, window.innerWidth - 20), hgt = p.offsetHeight || 260;
        p.style.left = clamp(x + 14, 10, window.innerWidth - w - 10) + 'px';
        p.style.top = clamp(y - 20, 60, window.innerHeight - hgt - 80) + 'px';
        this.panelRefresh = refresh ? () => { if (!p.classList.contains('hidden')) { const sc = p.scrollTop; p.innerHTML = `<button class="vp-x" onclick="VK.closePanel()">✕</button>` + refresh(); p.scrollTop = sc; } } : null;
    },
    closePanel() { this.panelEl.classList.add('hidden'); this.panelRefresh = null; },

    /* ---------- Avisos grandes sobre la vista ---------- */
    flash(txt, color = '#f44') {
        const f = this.flashEl;
        f.textContent = txt; f.style.color = color;
        f.classList.remove('show'); void f.offsetWidth; f.classList.add('show');
    },

    /* ---------- Vigilante de eventos ---------- */
    on(fn) { this.listeners.push(fn); },
    emit(type, data) { this.listeners.forEach(fn => { try { fn(type, data); } catch (e) { console.warn(e); } }); },
    snap: null,
    watch() {
        const S = State;
        const now = {
            raids: S.stats.raids || 0, lts: S.lieutenants.length, inc: S.incoming.map(i => i.id).join(),
            ven: (S.vendettas || []).map(v => v.id), golpe: S.golpes && S.golpes.active ? S.golpes.active.id : null,
            conq: S.stats.conquests || 0, lost: S.stats.lostTerritories || 0, ship: S.stats.shipments || 0,
            kids: S.family.kids.length, spouse: S.family.spouse, chapter: S.story.chapter, seiz: S.stats.seizures || 0, hij: S.stats.hijacked || 0
        };
        const o = this.snap; this.snap = now;
        if (!o) return;
        if (now.raids > o.raids) { this.emit('raid'); this.flash('🚨 ¡REDADA!', '#5af'); }
        if (now.inc && now.inc !== o.inc && S.incoming.length > (o.inc ? o.inc.split(',').length : 0)) { const i = S.incoming[S.incoming.length - 1]; this.emit('attack', i); this.flash(`⚔️ ATACAN ${Config.territories[i.target].name.toUpperCase()}`); }
        if (now.lts < o.lts) { this.emit('betray'); }
        now.ven.filter(id => !o.ven.includes(id)).forEach(id => { const v = S.vendettas.find(x => x.id === id); this.emit('vendetta', v); this.flash('🩸 ' + v.title); });
        if (now.golpe && now.golpe !== o.golpe) this.emit('golpe', now.golpe);
        if (!now.golpe && o.golpe) this.emit('golpeEnd', o.golpe);
        if (now.conq > o.conq) { this.emit('conquest'); this.flash('🏴 ¡PLAZA CONQUISTADA!', '#c5a059'); }
        if (now.lost > o.lost) { this.emit('lost'); this.flash('💀 PERDISTE UNA PLAZA'); }
        if (now.ship > o.ship) this.emit('ship', now.ship - o.ship);
        if (now.hij > o.hij) { this.emit('hijack'); this.flash('🚚 ¡ASALTARON UN CONVOY!'); }
        if (now.seiz > o.seiz) this.emit('seizure');
        if (now.kids > o.kids) { this.emit('baby'); this.flash('👶 ¡NACIÓ UN HIJO!', '#c5a059'); }
        if (now.chapter > o.chapter) this.emit('chapter');
    },

    /* ---------- Canvas que llena su contenedor ---------- */
    canvas(parent) {
        const c = document.createElement('canvas');
        parent.appendChild(c);
        const o = { c, ctx: c.getContext('2d'), W: 0, H: 0, dpr: 1 };
        o.fit = () => { o.dpr = Math.min(2, window.devicePixelRatio || 1); o.W = c.width = Math.max(1, parent.clientWidth * o.dpr); o.H = c.height = Math.max(1, parent.clientHeight * o.dpr); };
        window.addEventListener('resize', o.fit); o.fit();
        return o;
    }
};

/* =========================================================
   MAPA VIVO: el mapa del motor con cámara (zoom/arrastre) y paneles al tocar
   ========================================================= */
class MapLive {
    constructor(surface, opts = {}) {
        this.sf = surface; this.cam = { z: opts.z || 1, cx: 300, cy: 215 };
        this.opts = opts;
        const c = surface.c;
        let down = null, pts = new Map(), pinch = 0;
        c.addEventListener('pointerdown', e => { c.setPointerCapture(e.pointerId); pts.set(e.pointerId, e); down = { x: e.clientX, y: e.clientY, cx: this.cam.cx, cy: this.cam.cy, moved: false }; });
        c.addEventListener('pointermove', e => {
            if (!pts.has(e.pointerId)) return;
            pts.set(e.pointerId, e);
            if (pts.size === 2) {
                const [a, b] = [...pts.values()], d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
                if (pinch) this.zoomBy(d / pinch); pinch = d; if (down) down.moved = true; return;
            }
            if (!down) return;
            const dx = e.clientX - down.x, dy = e.clientY - down.y;
            if (Math.abs(dx) + Math.abs(dy) > 6) down.moved = true;
            if (down.moved) { const s = this.scale() / surface.dpr; this.cam.cx = down.cx - dx / s; this.cam.cy = down.cy - dy / s; this.clampCam(); }
        });
        const up = e => { pts.delete(e.pointerId); if (pts.size < 2) pinch = 0; if (down && !down.moved && pts.size === 0) this.click(e); if (!pts.size) down = null; };
        c.addEventListener('pointerup', up); c.addEventListener('pointercancel', up);
        c.addEventListener('wheel', e => { e.preventDefault(); this.zoomBy(e.deltaY < 0 ? 1.15 : 1 / 1.15); }, { passive: false });
    }
    scale() { return Math.min(this.sf.W / 600, this.sf.H / 430) * this.cam.z; }
    view() { const s = this.scale(); return { ox: this.sf.W / 2 - this.cam.cx * s, oy: this.sf.H / 2 - this.cam.cy * s, sx: s, sy: s, label: 0.8 / Math.sqrt(this.cam.z) }; }
    zoomBy(f) { this.cam.z = clamp(this.cam.z * f, this.opts.minZ || 0.8, this.opts.maxZ || 4); this.clampCam(); if (this.opts.onZoom) this.opts.onZoom(this.cam.z); }
    clampCam() { this.cam.cx = clamp(this.cam.cx, 0, 600); this.cam.cy = clamp(this.cam.cy, 0, 430); }
    focus(id, z) { const t = Config.territories[id]; this.cam.cx = t.x; this.cam.cy = t.y; if (z) this.cam.z = z; }
    toMap(e) {
        const r = this.sf.c.getBoundingClientRect(), v = this.view();
        return { x: ((e.clientX - r.left) * this.sf.dpr - v.ox) / v.sx, y: ((e.clientY - r.top) * this.sf.dpr - v.oy) / v.sy };
    }
    draw(alpha = 1) {
        const ctx = this.sf.ctx, v = this.view();
        ctx.save(); ctx.globalAlpha = alpha;
        ctx.fillStyle = '#040706'; ctx.fillRect(0, 0, this.sf.W, this.sf.H);
        Core.War.renderMap(ctx, v);
        this.overlay(ctx, v);
        ctx.restore();
    }
    // flechas de ataques en camino y fuego donde hostigas
    overlay(ctx, v) {
        const s = Math.min(v.sx, v.sy), X = x => v.ox + x * v.sx, Y = y => v.oy + y * v.sy, t = Core.War.t;
        State.incoming.forEach(i => {
            const T = Config.territories[i.target];
            const src = Core.War.neighbors(i.target).map(n => Config.territories[n]).find(c => State.territories[c.id].owner !== 'player') || { x: T.x - 40, y: T.y - 40 };
            const p = 1 - i.left / i.total;
            ctx.strokeStyle = 'rgba(255,60,60,0.9)'; ctx.lineWidth = 3 * s; ctx.setLineDash([6 * s, 5 * s]); ctx.lineDashOffset = -t * 40;
            ctx.beginPath(); ctx.moveTo(X(src.x), Y(src.y)); ctx.lineTo(X(T.x), Y(T.y)); ctx.stroke(); ctx.setLineDash([]);
            const hx = src.x + (T.x - src.x) * p, hy = src.y + (T.y - src.y) * p;
            ctx.font = `${16 * s}px sans-serif`; ctx.textAlign = 'center'; ctx.fillText('⚔️', X(hx), Y(hy));
            ctx.font = `bold ${11 * s}px monospace`; ctx.fillStyle = '#f66'; ctx.fillText(`${Math.ceil(i.left)}s`, X(T.x), Y(T.y) - 24 * s);
        });
        (State.armyOps || []).filter(o => o.type === 'harass').forEach(o => {
            State.territories.filter(x => x.owner === o.rid).forEach(x => { const c = Config.territories[x.id]; ctx.font = `${12 * s}px sans-serif`; ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 6 + x.id); ctx.fillText('🔥', X(c.x) + 12 * s, Y(c.y) - 12 * s); ctx.globalAlpha = 1; });
        });
    }
    click(e) {
        const m = this.toMap(e), z = this.cam.z;
        const r = Core.War.routeAt(m.x, m.y, 14 / Math.sqrt(z));
        if (r) return VK.panel(MapLive.routeHTML(r), e.clientX, e.clientY, () => MapLive.routeHTML(r));
        const id = Core.War.pickAt(m.x, m.y, 26 / Math.sqrt(z));
        if (id === null) return VK.closePanel();
        Sfx.click();
        Core.War.selected = id;
        VK.panel(MapLive.plazaHTML(id), e.clientX, e.clientY, () => MapLive.plazaHTML(id));
    }

    /* ---------- paneles contextuales ---------- */
    static plazaHTML(id) {
        const W = Core.War, c = Config.territories[id], t = State.territories[id], mine = t.owner === 'player';
        const color = mine ? Core.Me.color() : Config.rivals[t.owner].color, owner = mine ? Core.Me.cartel() : Config.rivals[t.owner].name;
        const inc = State.incoming.find(i => i.target === id), P = State.stats.playTime;
        let h = `<h3 style="color:${color}">${c.hq ? '👑 ' : ''}${c.name}</h3><div class="tiny" style="color:${color}">● ${owner}</div><div class="chip green">${c.bonus.text}</div>`;
        if (inc) h += `<div class="red tiny" style="margin-top:6px;">⚔️ ATAQUE EN CAMINO: ${fmt(inc.power)} de fuerza · ${Math.ceil(inc.left)}s</div>`;
        if (mine) {
            const st = W.status(id), th = W.threat(id);
            h += `<div class="row-between" style="margin-top:8px;"><span>DEFENSA</span><b class="gold">${fmt(W.defenseOf(id))}</b></div>
                ${th ? `<div class="row-between tiny"><span>Ataque rival máx.</span><span style="color:${st.color}">~${fmt(th)} · ${st.txt}</span></div>` : '<div class="tiny green">Sin frontera: nadie la puede atacar.</div>'}
                <div class="tiny">🔫 ${fmt(t.troops)} sicarios · 🎖️ ${fmt(t.elite || 0)} élite <span class="muted">(libres ${fmt(State.army)} / ${fmt(State.elite)})</span></div>
                <div class="tiny">${W.flags(t).replace(/<[^>]+>/g, '') || ''} ${(t.unstableUntil || 0) > P ? '<span class="red">Inestable</span>' : ''}</div>
                <div class="vp-btns">
                    <button onclick="Core.War.move(${id},'sic',50)">+50 🔫</button><button onclick="Core.War.move(${id},'eli',5)">+5 🎖️</button>
                    <button onclick="Core.War.move(${id},'sic','-all'); Core.War.move(${id},'eli','-all')">↩ Vaciar</button>
                    ${id !== Config.baseId ? `<button onclick="Core.War.shield(${id})" ${(t.shieldCd || 0) > P ? 'disabled' : ''}>🛡️ Blindar $${fmt(W.plazaCost(1.5))}</button>
                    <button onclick="Core.War.toggleRetreat(${id})">🏃 Repliegue: ${t.retreat ? 'SÍ' : 'NO'}</button>
                    ${(t.unstableUntil || 0) > P ? `<button onclick="Core.War.stabilize(${id})">🤝 Estabilizar</button>` : ''}` : ''}
                </div>`;
        } else {
            const adj = W.neighbors(id).some(n => State.territories[n].owner === 'player');
            W.plan = W.plan || { sic: null, eli: null, keep: 0.5 };
            const p = W.planned(), ch = W.chance(W.power(p.sic, p.eli), W.enemyDefense(id));
            h += `<div class="row-between" style="margin-top:8px;"><span>DEFENSA ENEMIGA</span><b class="red">${fmt(W.enemyDefense(id))}</b></div>`;
            if (c.hq) h += `<div class="tiny gold">🏰 Asedio: fase ${W.siegePhase(id)}/3</div>`;
            if (!adj) h += '<div class="tiny red">Sin frontera: conquista una vecina primero.</div>';
            else if (W.hqLocked(id)) h += '<div class="tiny red">🔒 Primero quítale sus otras plazas.</div>';
            else h += `<div class="tiny">Con tu reserva (${fmt(p.sic)} 🔫 + ${fmt(p.eli)} 🎖️): <b class="${ch >= 0.75 ? 'green' : ch >= 0.45 ? 'gold' : 'red'}">${Math.round(ch * 100)}%</b></div>
                <div class="vp-btns"><button class="red" onclick="Core.War.select(${id}); Core.War.launchAttack()">⚔️ ATACAR</button></div>`;
        }
        h += `<div class="vp-btns"><button onclick="UI.nav('war'); Core.War.select(${id})">⚙️ Panel completo</button></div>`;
        return h;
    }
    static routeHTML(r) {
        const V = Config.vehicles[r.type], live = State.routes.includes(r);
        if (!live) return '<h3>Convoy</h3><p class="tiny muted">Ya llegó (o lo perdiste).</p>';
        const ef = Core.War.escortFactor();
        return `<h3>${V.icon} ${r.name}</h3>
            <div class="tiny">${V.name} · ruta ${['', 'local', 'nacional', 'frontera', 'internacional'][r.dist] || r.dist}</div>
            <div class="row-between"><span>Carga</span><b>${fmt(r.amount)} kg ${Config.products[r.prod] ? Config.products[r.prod].name : ''}</b></div>
            <div class="row-between"><span>Valor</span><b class="gold">$${fmt(r.val || 0)}</b></div>
            <div class="row-between"><span>Avance</span><b>${Math.floor(r.progress)}%</b></div>
            <div class="row-between tiny"><span>Riesgo de decomiso</span><span>${Math.round(Core.Logistics.seizureChance(r.dist) * 100)}%</span></div>
            <div class="row-between tiny"><span>Escolta</span><span>${Math.round(ef * 100)}%</span></div>
            <div class="vp-btns"><button onclick="Core.War.startOp('escort', 0.1)">🚚 Escoltar (+10% reserva)</button><button onclick="UI.nav('logistics')">📦 Logística</button></div>`;
    }
}

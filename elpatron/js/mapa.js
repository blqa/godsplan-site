/* =========================================================
   MAPA (sección propia: mapa grande + info del estado a un lado)
   - El mismo mapa del menú Guerra (Core.War.renderMap) con zoom y arrastre
   - Convoyes moviéndose, frentes, ataques en camino con flecha y cuenta regresiva
   - Toca una plaza o un convoy: panel rápido para actuar sin cambiar de menú
   - 3 tamaños: oculto (solo una barra), chico y grande
   ========================================================= */
Core.LiveMap = {
    SIZES: { off: 0, sm: 250, lg: 420 },
    KEY: 'elpatron_livemap',
    size: 'sm',
    cam: { z: 1, cx: 300, cy: 215 },
    ready: false,

    init() {
        if (this.ready) return; this.ready = true;
        this.size = 'lg';
        this.box = $('live-map');
        this.wrap = $('lm-canvas-wrap');
        this.c = $('lm-canvas');
        this.ctx = this.c.getContext('2d');
        this.panelEl = $('lm-panel');
        this.applySize();
        window.addEventListener('resize', () => this.fit());
        this.bindPointer();
        this.closePanel();
        const loop = () => { this.draw(); requestAnimationFrame(loop); };
        requestAnimationFrame(loop);
        setInterval(() => { this.bar(); if (this.panelRefresh) this.panelRefresh(); }, 500);
    },
    visible() { return this.ready && UI.current === 'mapa' && Core.Game.running && !document.hidden; },
    setSize() { }, // (antes había tamaños; ahora el mapa vive en su propia sección)
    applySize() {
        setTimeout(() => this.fit(), 30);
    },
    // en el menú Guerra no hace falta (ya tiene su mapa grande)
    onNav(id) { if (id === 'mapa') setTimeout(() => this.fit(), 30); },
    fit() {
        if (!this.c) return;
        this.dpr = Math.min(2, window.devicePixelRatio || 1);
        this.c.width = Math.max(1, this.wrap.clientWidth * this.dpr);
        this.c.height = Math.max(1, this.wrap.clientHeight * this.dpr);
    },

    /* ---------- cámara ---------- */
    // en pantallas anchas el país se estira un poco a lo ancho (hasta 1.7x) para llenar el espacio
    scales() {
        const fy = Math.min(this.c.height / 430, this.c.width / 600), fx = Math.min(this.c.width / 600, fy * 1.7);
        return { sx: fx * this.cam.z, sy: fy * this.cam.z };
    },
    scale() { return this.scales().sy; },
    view() {
        const { sx, sy } = this.scales();
        // puntos y nombres siempre legibles: ni diminutos en el mapa chico ni enormes con zoom
        const eff = clamp(sy / Math.sqrt(this.cam.z), 1.0 * this.dpr, 1.45 * this.dpr);
        return { ox: this.c.width / 2 - this.cam.cx * sx, oy: this.c.height / 2 - this.cam.cy * sy, sx, sy, label: eff / Math.min(sx, sy) };
    },
    zoomBy(f) { this.cam.z = clamp(this.cam.z * f, 1, 4.5); this.clampCam(); },
    clampCam() { const m = 0.5 / this.cam.z; this.cam.cx = clamp(this.cam.cx, 300 - 600 * m, 300 + 600 * m); this.cam.cy = clamp(this.cam.cy, 215 - 430 * m, 215 + 430 * m); },
    center() { this.cam = { z: 1, cx: 300, cy: 215 }; this.closePanel(); },
    focus(id, z) { const t = Config.territories[id]; this.cam.cx = t.x; this.cam.cy = t.y; this.cam.z = Math.max(this.cam.z, z || 2); if (UI.current !== 'mapa') UI.nav('mapa'); },
    toMap(e) { const r = this.c.getBoundingClientRect(), v = this.view(); return { x: ((e.clientX - r.left) * this.dpr - v.ox) / v.sx, y: ((e.clientY - r.top) * this.dpr - v.oy) / v.sy }; },
    bindPointer() {
        const c = this.c; let down = null; const pts = new Map(); let pinch = 0;
        c.addEventListener('pointerdown', e => { c.setPointerCapture(e.pointerId); pts.set(e.pointerId, e); down = { x: e.clientX, y: e.clientY, cx: this.cam.cx, cy: this.cam.cy, moved: false }; });
        c.addEventListener('pointermove', e => {
            if (!pts.has(e.pointerId)) { this.hover(e); return; }
            pts.set(e.pointerId, e);
            if (pts.size === 2) { const [a, b] = [...pts.values()], d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY); if (pinch) this.zoomBy(d / pinch); pinch = d; if (down) down.moved = true; return; }
            if (!down) return;
            const dx = e.clientX - down.x, dy = e.clientY - down.y;
            if (Math.abs(dx) + Math.abs(dy) > 6) down.moved = true;
            if (down.moved) { const k = this.scales(); this.cam.cx = down.cx - dx * this.dpr / k.sx; this.cam.cy = down.cy - dy * this.dpr / k.sy; this.clampCam(); }
        });
        const up = e => { pts.delete(e.pointerId); if (pts.size < 2) pinch = 0; if (down && !down.moved && !pts.size) this.click(e); if (!pts.size) down = null; };
        c.addEventListener('pointerup', up); c.addEventListener('pointercancel', up);
        // la rueda hace zoom solo con el mapa grande o con Ctrl, para no estorbar al bajar la página
        c.addEventListener('wheel', e => { e.preventDefault(); this.zoomBy(e.deltaY < 0 ? 1.15 : 1 / 1.15); }, { passive: false });
    },
    hover(e) { const m = this.toMap(e), z = this.cam.z, id = Core.War.stateAt(m.x, m.y); Core.War.hoverId = id; this.c.style.cursor = (id !== null || Core.War.routeAt(m.x, m.y, 12 / Math.sqrt(z))) ? 'pointer' : 'grab'; },

    /* ---------- dibujo ---------- */
    draw() {
        if (!this.visible()) return;
        if (!this.c.width || this.c.width !== Math.round(this.wrap.clientWidth * this.dpr)) this.fit();
        const ctx = this.ctx, v = this.view();
        ctx.fillStyle = '#050807'; ctx.fillRect(0, 0, this.c.width, this.c.height);
        Core.War.renderMap(ctx, v);
        this.overlay(ctx, v);
    },
    overlay(ctx, v) {
        const s = Math.min(v.sx, v.sy) * v.label, X = x => v.ox + x * v.sx, Y = y => v.oy + y * v.sy, t = Core.War.t;
        State.incoming.forEach(i => {
            const T = Config.territories[i.target];
            const src = Core.War.neighbors(i.target).map(n => Config.territories[n]).find(c => State.territories[c.id].owner !== 'player') || { x: T.x - 40, y: T.y - 40 };
            const p = 1 - i.left / i.total, hx = src.x + (T.x - src.x) * p, hy = src.y + (T.y - src.y) * p;
            ctx.strokeStyle = 'rgba(255,60,60,0.9)'; ctx.lineWidth = 3 * s; ctx.setLineDash([6 * s, 5 * s]); ctx.lineDashOffset = -t * 40;
            ctx.beginPath(); ctx.moveTo(X(src.x), Y(src.y)); ctx.lineTo(X(T.x), Y(T.y)); ctx.stroke(); ctx.setLineDash([]); ctx.lineDashOffset = 0;
            ctx.textAlign = 'center'; ctx.font = `${16 * s}px sans-serif`; ctx.fillText('⚔️', X(hx), Y(hy));
            ctx.font = `bold ${12 * s}px monospace`; ctx.fillStyle = '#ff6b6b'; ctx.fillText(`${Math.ceil(i.left)}s`, X(T.x), Y(T.y) - 24 * s);
        });
        (State.armyOps || []).filter(o => o.type === 'harass').forEach(o => {
            State.territories.filter(x => x.owner === o.rid).forEach(x => { const c = Config.territories[x.id]; ctx.font = `${12 * s}px sans-serif`; ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 6 + x.id); ctx.fillText('🔥', X(c.x) + 12 * s, Y(c.y) - 12 * s); ctx.globalAlpha = 1; });
        });
    },
    // barra de arriba del mapa: qué está pasando
    bar() {
        if (!this.ready || !Core.Game.running) return;
        const S = State, bits = [];
        bits.push(`<span style="color:${Core.Me.color()}">●</span> ${Core.War.owned().length}/${Config.territories.length} estados`);
        if (S.routes.length) bits.push(`🚚 ${S.routes.length} en ruta`);
        if (S.incoming.length) bits.push(`<span class="red lm-blink">⚔️ ${S.incoming.length} ataque${S.incoming.length > 1 ? 's' : ''}</span>`);
        if (Core.Unlocks.isOpen('war')) { const d = Core.War.owned().filter(t => Core.War.status(t.id).key === 'danger').length; if (d) bits.push(`<span class="red">⚠️ ${d} en peligro</span>`); }
        setHTML('lm-info', bits.join(' · '));
        setHTML('lm-legend', `<span><i style="background:${Core.Me.color()}"></i>${Core.Me.cartel()} (tú)</span>` + Object.values(Config.rivals).map(C => `<span><i style="background:${C.color}"></i>${C.name}${State.rivals[C.id].defeated ? ' ☠️' : ''}</span>`).join(''));
    },

    /* ---------- toques ---------- */
    click(e) {
        const m = this.toMap(e), z = this.cam.z;
        const r = Core.War.routeAt(m.x, m.y, 12 / Math.sqrt(z));
        if (r) { Sfx.click(); return this.panel(() => this.routeHTML(r), e); }
        const id = Core.War.pickAt(m.x, m.y, 14 / Math.sqrt(z));
        if (id === null) return this.closePanel();
        Sfx.click();
        Core.War.selected = id;
        this.panel(() => this.plazaHTML(id), e);
    },
    panel(fn, e) {
        const p = this.panelEl;
        const render = () => { const sc = p.scrollTop; p.innerHTML = `<button class="lm-x" onclick="Core.LiveMap.closePanel()">✕</button>` + fn(); p.scrollTop = sc; };
        render();
        p.classList.remove('hidden');
        if (window.innerWidth <= 900) p.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        this.panelRefresh = (force) => { const el = document.activeElement; if (force || !(p.contains(el) && /INPUT|SELECT|TEXTAREA/.test(el.tagName))) render(); };
    },
    closePanel() { if (this.panelEl) this.panelEl.innerHTML = `<div class="lm-empty"><b>🗺️</b>Toca cualquier estado del mapa para ver su capital, quién lo controla, su bono y con quién colinda.<br><br>Tienes que conquistar los <b style="display:inline;font-size:1em">32</b>.</div>`; this.panelRefresh = null; Core.War.selected = UI.current === 'war' ? Core.War.selected : null; },
    act(code) { try { code(); } catch (e) { console.warn(e); } if (this.panelRefresh) this.panelRefresh(true); },

    plazaHTML(id) {
        const W = Core.War, c = Config.territories[id], t = State.territories[id], mine = t.owner === 'player', war = Core.Unlocks.isOpen('war');
        const color = mine ? Core.Me.color() : Config.rivals[t.owner].color, owner = mine ? Core.Me.cartel() : `${Config.rivals[t.owner].name} · ${Config.rivals[t.owner].leader}`;
        const inc = State.incoming.find(i => i.target === id), P = State.stats.playTime;
        const nb = W.neighbors(id).map(n => Config.territories[n].name).join(', ');
        let h = `<div class="lm-h" style="border-color:${color}"><b style="color:${color}">${c.hq ? '👑 ' : ''}${c.name}</b><small>📍 ${c.cap} · ${owner}</small></div>
            <div class="lm-chip">🎁 ${c.bonus.text}</div>
            <p class="lm-note">🧭 Colinda con: ${nb}</p>`;
        const lb = W.lastBattle;
        if (W.battling && W.battling.id === id) h += `<div class="lm-alert">⚔️ TU GENTE ESTÁ PELEANDO AQUÍ…</div>`;
        else if (lb && lb.id === id && performance.now() - lb.at < 25000) h += lb.won
            ? `<div class="lm-win"><b>${lb.phase ? '✔ FASE ' + lb.phase + ' GANADA' : '🏆 ¡ESTADO CONQUISTADO!'}</b>Bajas: ${lb.sicLost} 🔫${lb.eliLost ? ' · ' + lb.eliLost + ' 🎖️' : ''}${lb.loot ? `<br>Se quedan ${lb.gs} 🔫 ${lb.ge ? '+ ' + lb.ge + ' 🎖️ ' : ''}a cuidarlo · 💰 Botín $${fmt(lb.loot)}` : ''}</div>`
            : `<div class="lm-lose"><b>💀 ATAQUE FALLIDO</b>Bajas: ${lb.sicLost} 🔫${lb.eliLost ? ' · ' + lb.eliLost + ' 🎖️' : ''}. Junta más gente y vuelve a intentar.</div>`;
        if (inc) h += `<div class="lm-alert">⚔️ ATAQUE EN CAMINO · ${fmt(inc.power)} de fuerza · ${Math.ceil(inc.left)}s</div>`;
        if (mine) {
            if (id === Config.baseId) return h + `<p class="lm-note">🏠 Tu base. Los cárteles nunca la atacan: no necesita tropas.</p>`;
            const st = W.status(id), th = W.threat(id);
            h += `<div class="lm-stats">
                    <div><small>DEFENSA</small><b class="gold">${fmt(W.defenseOf(id))}</b></div>
                    <div><small>ESTADO</small><b style="color:${st.color}">${st.txt}</b></div>
                    <div><small>🔫 AQUÍ</small><b>${fmt(t.troops)}</b></div>
                    <div><small>🎖️ AQUÍ</small><b>${fmt(t.elite || 0)}</b></div>
                </div>
                <p class="lm-note">${th ? `Lo más fuerte que te pueden mandar aquí: ~${fmt(th)}. ${W.defenseOf(id) >= th ? '✔ Aguanta.' : '⚠️ Manda más gente.'}` : 'Ningún cártel colinda: no la pueden atacar.'}</p>`;
            if (war) {
                const unst = (t.unstableUntil || 0) > P, cd = (t.shieldCd || 0) > P;
                h += `<div class="lm-lbl">Mover gente (libres: ${fmt(State.army)} 🔫 · ${fmt(State.elite)} 🎖️)</div>
                    <div class="lm-btns">
                        <button onclick="Core.LiveMap.act(()=>Core.War.move(${id},'sic',10))">+10 🔫</button>
                        <button onclick="Core.LiveMap.act(()=>Core.War.move(${id},'sic',50))">+50 🔫</button>
                        <button onclick="Core.LiveMap.act(()=>Core.War.move(${id},'eli',5))">+5 🎖️</button>
                        <button onclick="Core.LiveMap.act(()=>{Core.War.move(${id},'sic','-all');Core.War.move(${id},'eli','-all')})">↩ Sacar a todos</button>
                    </div>
                    <div class="lm-lbl">Tácticas</div>
                    <div class="lm-btns">
                        <button onclick="Core.LiveMap.act(()=>Core.War.shield(${id}))" ${cd ? 'disabled' : ''}>🛡️ ${(t.shieldUntil || 0) > P ? 'Blindada ' + fmtTime(t.shieldUntil - P) : cd ? 'Recargando' : 'Blindar $' + fmt(W.plazaCost(1.5))}</button>
                        <button class="${t.retreat ? 'on' : ''}" onclick="Core.LiveMap.act(()=>Core.War.toggleRetreat(${id}))">🏃 Repliegue ${t.retreat ? 'SÍ' : 'NO'}</button>
                        ${unst ? `<button onclick="Core.LiveMap.act(()=>Core.War.stabilize(${id}))">🤝 Estabilizar $${fmt(W.plazaCost(0.8))}</button>` : ''}
                    </div>`;
            }
        } else {
            const adj = W.neighbors(id).some(n => State.territories[n].owner === 'player');
            h += `<div class="lm-stats"><div><small>DEFENSA</small><b class="red">${fmt(W.enemyDefense(id))}</b></div><div><small>PODER DEL CÁRTEL</small><b>${fmt(State.rivals[t.owner].power)}</b></div></div>`;
            if (c.hq) h += `<p class="lm-note">🏰 Guarida del jefe · asedio fase ${W.siegePhase(id)}/3</p>`;
            if (!war) h += `<p class="lm-note">🔒 Podrás atacar plazas desde el capítulo ${Core.Unlocks.chapterFor('war')}.</p>`;
            else if (!adj) h += `<p class="lm-note">Sin frontera: primero conquista una plaza vecina.</p>`;
            else if (W.hqLocked(id)) h += `<p class="lm-note">🔒 Primero quítale todas sus otras plazas.</p>`;
            else if (!(W.battling && W.battling.id === id)) {
                const fr = W.forceFrac || 1; W.setForce(fr);
                const p = W.planned(), my = W.power(p.sic, p.eli), ch = W.chance(my, W.enemyDefense(id));
                const col = ch >= 0.75 ? 'green' : ch >= 0.45 ? 'gold' : 'red', keep = W.plan.keep || 0.5;
                h += `<div class="lm-lbl">¿Cuánta gente mandas? (libres: ${fmt(State.army)} 🔫 · ${fmt(State.elite)} 🎖️)</div>
                    <div class="lm-btns">${[0.25, 0.5, 0.75, 1].map(f => `<button class="${fr === f ? 'on' : ''}" onclick="Core.LiveMap.act(()=>Core.War.setForce(${f}))">${f === 1 ? 'Todos' : f * 100 + '%'}</button>`).join('')}</div>
                    <p class="lm-note">Mandas ${fmt(p.sic)} 🔫 + ${fmt(p.eli)} 🎖️ · ataque <b>${fmt(my)}</b> contra defensa <b class="red">${fmt(W.enemyDefense(id))}</b></p>
                    <div class="lm-odds"><span>Probabilidad de ganar</span><b class="${col}">${Math.round(ch * 100)}%</b></div>
                    <p class="lm-note">Si ganas: bajas ~${fmt(Math.round(p.sic * 0.1))} 🔫 · se quedan ~${fmt(Math.round(p.sic * 0.9 * keep))} a cuidarlo · 💰 botín ~$${fmt(W.lootOf(id))}<br>Si pierdes: bajas ~${fmt(Math.round(p.sic * 0.22))} 🔫 y tus tenientes se enojan.</p>
                    <div class="lm-btns"><button class="red big" onclick="Core.LiveMap.act(()=>{Core.War.selected=${id};Core.War.setForce(Core.War.forceFrac||1);Core.War.launchAttack()})" ${p.sic + p.eli < 5 || W.battling ? 'disabled' : ''}>⚔️ ATACAR ${c.hq ? '(FASE ' + W.siegePhase(id) + ')' : ''}</button></div>
                    ${ch < 0.6 ? '<p class="lm-note">💡 Con menos de 60% mejor junta más gente: recluta en Guerra o saca tropas de estados tranquilos.</p>' : ''}`;
            }
        }
        if (war) h += `<div class="lm-btns"><button class="ghost" onclick="Core.LiveMap.closePanel(); UI.nav('war'); Core.War.select(${id})">⚙️ Todo sobre esta plaza</button></div>`;
        return h;
    },
    routeHTML(r) {
        if (!State.routes.includes(r)) return '<div class="lm-h"><b>Convoy</b></div><p class="lm-note">Ya llegó a su destino (o lo perdiste).</p>';
        const V = Config.vehicles[r.type], risk = Core.Logistics.seizureChance(r.dist), ef = Core.War.escortFactor();
        return `<div class="lm-h"><b>${V.icon} ${r.name}</b><small>${V.name} · ruta ${['', 'local', 'nacional', 'frontera', 'internacional'][r.dist] || r.dist}</small></div>
            <div class="lm-stats"><div><small>CARGA</small><b>${fmt(r.amount)} kg</b></div><div><small>VALOR</small><b class="gold">$${fmt(r.val || 0)}</b></div>
                <div><small>AVANCE</small><b>${Math.floor(r.progress)}%</b></div><div><small>RIESGO</small><b class="${risk > 0.15 ? 'red' : ''}">${Math.round(risk * 100)}%</b></div></div>
            <div class="lm-bar"><i style="width:${Math.min(100, r.progress)}%"></i></div>
            ${Core.Unlocks.isOpen('war') ? `<p class="lm-note">Escolta de rutas: ${Math.round(ef * 100)}%. Más escolta = menos asaltos y decomisos.</p>
            <div class="lm-btns"><button onclick="Core.LiveMap.act(()=>Core.War.startOp('escort', 0.1))">🚚 Escoltar con 10% de la reserva</button></div>` : ''}
            <div class="lm-btns"><button class="ghost" onclick="Core.LiveMap.closePanel(); UI.nav('logistics')">📦 Ir a Logística</button></div>`;
    }
};

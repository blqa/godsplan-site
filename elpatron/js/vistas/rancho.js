/* =========================================================
   EL RANCHO (vista desde arriba, 2D) — lo usan v2 y v3
   Cada edificio abre su menú de siempre. La gente se mueve según el juego:
   trabajadores cargan mercancía, sicarios patrullan, la familia juega en el patio,
   y todo reacciona a redadas, ataques, traiciones, golpes y cuentas pendientes.
   ========================================================= */
class Rancho {
    constructor() {
        this.W = 1000; this.H = 700;
        this.gate = { x: 985, y: 525 };
        this.B = [
            { id: 'lab', x: 50, y: 60, w: 260, h: 160, icon: '🧪', name: 'LABORATORIO', view: 'ops', color: '#1f3a2a' },
            { id: 'bodega', x: 350, y: 60, w: 220, h: 160, icon: '📦', name: 'BODEGA', view: 'logistics', color: '#3a3020' },
            { id: 'garaje', x: 610, y: 60, w: 330, h: 160, icon: '🚚', name: 'GARAJE', view: 'assets', color: '#262b33' },
            { id: 'casa', x: 50, y: 290, w: 280, h: 200, icon: '🏡', name: 'LA CASA', view: 'familia', alt: 'story', color: '#3b2620' },
            { id: 'cuartel', x: 370, y: 300, w: 230, h: 180, icon: '🪖', name: 'CUARTEL', view: 'war', color: '#2a2f22' },
            { id: 'oficina', x: 640, y: 300, w: 300, h: 180, icon: '💼', name: 'OFICINA', view: 'finance', color: '#232338' },
            { id: 'palapa', x: 370, y: 545, w: 230, h: 115, icon: '🍺', name: 'LA PALAPA', view: 'hr', color: '#3a2e18' },
            { id: 'radio', x: 50, y: 555, w: 200, h: 105, icon: '📡', name: 'RADIO · MAPA', action: 'map', color: '#1c2a30' },
            { id: 'armeria', x: 640, y: 545, w: 200, h: 115, icon: '🎯', name: 'ARMERÍA', view: 'golpes', color: '#331c1c' }
        ];
        this.agents = []; this.fx = []; this.t = 0; this.last = performance.now();
        this.hover = null; this.alarm = 0; this.siren = 0;
        this.sync(true);
    }
    b(id) { return this.B.find(x => x.id === id); }
    center(id) { const b = this.b(id); return { x: b.x + b.w / 2, y: b.y + b.h / 2 }; }
    door(id) { const b = this.b(id); return { x: b.x + b.w / 2, y: b.y + b.h + 8 }; }

    /* ---------- gente ---------- */
    add(o) { const a = Object.assign({ x: 0, y: 0, sp: 60, path: [], loop: false, life: Infinity }, o); this.agents.push(a); return a; }
    // ajusta cuánta gente hay según el estado del juego
    sync(first) {
        const S = State, want = {
            worker: Math.min(8, Config.productKeys.filter(k => S.ops[k] > 0 && S.opsStatus[k]).length * 2),
            guard: Math.min(14, Math.ceil(S.army / 40)),
            elite: Math.min(6, Math.ceil(S.elite / 15)),
            fam: (S.family.spouse ? 1 : 0) + S.family.kids.length
        };
        const count = k => this.agents.filter(a => a.kind === k).length;
        while (count('worker') < want.worker) { const d1 = this.door('lab'), d2 = this.door('bodega'), d3 = this.door('garaje'); this.add({ kind: 'worker', e: '👷', x: d1.x + Math.random() * 40, y: d1.y, sp: 45 + Math.random() * 20, path: [d2, d3, d1], loop: true }); }
        while (count('worker') > want.worker) this.agents.splice(this.agents.findIndex(a => a.kind === 'worker'), 1);
        const per = [{ x: 30, y: 30 }, { x: 970, y: 30 }, { x: 970, y: 680 }, { x: 30, y: 680 }];
        while (count('guard') < want.guard) { const i = Math.floor(Math.random() * 4); this.add({ kind: 'guard', e: '🔫', x: per[i].x, y: per[i].y, sp: 30 + Math.random() * 15, path: per.slice(i + 1).concat(per.slice(0, i + 1)), loop: true }); }
        while (count('guard') > want.guard) this.agents.splice(this.agents.findIndex(a => a.kind === 'guard'), 1);
        while (count('elite') < want.elite) { const c = this.door('cuartel'); this.add({ kind: 'elite', e: '🎖️', x: c.x + (Math.random() - 0.5) * 120, y: c.y + 10, sp: 25, wander: { x: 380, y: 485, w: 210, h: 40 } }); }
        while (count('elite') > want.elite) this.agents.splice(this.agents.findIndex(a => a.kind === 'elite'), 1);
        if (count('fam') !== want.fam) {
            this.agents = this.agents.filter(a => a.kind !== 'fam');
            const s = Core.Family.spouse && Core.Family.spouse();
            if (s) this.add({ kind: 'fam', e: s.icon, label: s.name, x: 150, y: 520, sp: 18, wander: { x: 60, y: 500, w: 260, h: 40 } });
            S.family.kids.forEach(k => this.add({ kind: 'fam', e: '🧒', label: k, x: 200, y: 520, sp: 30, wander: { x: 60, y: 500, w: 260, h: 40 } }));
        }
        // tenientes en la palapa
        const lts = S.lieutenants.slice(0, 6);
        this.agents = this.agents.filter(a => a.kind !== 'lt' || lts.some(l => l.id === a.ltId));
        lts.forEach((l, i) => { if (!this.agents.some(a => a.ltId === l.id)) this.add({ kind: 'lt', ltId: l.id, e: (Config.roles[l.role] || {}).icon || '🧔', x: 400 + i * 34, y: 515, sp: 0 }); });
    }
    /* ---------- reacciones a eventos del juego ---------- */
    react(type, data) {
        const g = this.gate;
        if (type === 'raid') {
            this.siren = 6;
            for (let i = 0; i < 3; i++) this.add({ kind: 'fx', e: '🚓', x: g.x + 40 + i * 30, y: g.y, sp: 140, path: [{ x: 600, y: 520 }, this.door('bodega')], life: 7 });
        } else if (type === 'attack') {
            this.alarm = 8;
            this.agents.filter(a => a.kind === 'guard' || a.kind === 'elite').forEach(a => { a.rush = { x: g.x - 30 - Math.random() * 60, y: g.y + (Math.random() - 0.5) * 80 }; a.rushT = 8; });
        } else if (type === 'betray') {
            const p = this.center('palapa');
            this.add({ kind: 'fx', e: '🏃', label: '💰 TRAIDOR', x: p.x, y: p.y, sp: 110, path: [{ x: 700, y: 520 }, { x: g.x + 60, y: g.y }], life: 6 });
        } else if (type === 'golpe') {
            const c = this.door('cuartel');
            for (let i = 0; i < 5; i++) this.add({ kind: 'fx', e: '🪖', x: c.x + i * 12, y: c.y, sp: 90, path: [{ x: 700, y: 525 }, { x: g.x + 80, y: g.y }], life: 6 });
        } else if (type === 'ship') {
            const d = this.door('garaje');
            this.add({ kind: 'fx', e: pick(['🚐', '🚚', '🛻']), x: d.x, y: d.y, sp: 150, path: [{ x: 960, y: 260 }, { x: g.x + 60, y: g.y }], life: 5 });
        } else if (type === 'conquest' || type === 'baby' || type === 'chapter') {
            for (let i = 0; i < 40; i++) { const a = Math.random() * 6.28, s = 40 + Math.random() * 160; this.fx.push({ x: 500, y: 250, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1.4, c: pick(['#ffd27f', '#ff6b3b', '#6cf', '#fff']) }); }
        } else if (type === 'hijack' || type === 'lost') {
            for (let i = 0; i < 25; i++) this.fx.push({ x: g.x - 20, y: g.y, vx: (Math.random() - 0.7) * 90, vy: -Math.random() * 80, life: 1.8, c: pick(['#555', '#777', '#f63']) });
        }
    }
    // qué edificio tiene una cuenta pendiente
    vendettaAt() {
        const map = { convoy: 'garaje', pitazo: 'radio', traicion: 'palapa', usura: 'oficina', familia: 'casa', compadre: 'casa', plaza: 'cuartel', saqueo: 'cuartel' };
        const out = {}; (State.vendettas || []).forEach(v => { out[map[v.kind] || 'cuartel'] = true; }); return out;
    }

    /* ---------- simulación ---------- */
    update(dt) {
        this.t += dt; this.alarm = Math.max(0, this.alarm - dt); this.siren = Math.max(0, this.siren - dt);
        if (Math.floor(this.t * 2) !== Math.floor((this.t - dt) * 2)) this.sync();
        this.agents.forEach(a => {
            a.life -= dt;
            let tgt = null;
            if (a.rush && a.rushT > 0) { a.rushT -= dt; tgt = a.rush; if (a.rushT <= 0) a.rush = null; }
            else if (a.path.length) tgt = a.path[0];
            else if (a.wander) { if (!a.wt || Math.hypot(a.wt.x - a.x, a.wt.y - a.y) < 4) a.wt = { x: a.wander.x + Math.random() * a.wander.w, y: a.wander.y + Math.random() * a.wander.h }; tgt = a.wt; }
            if (!tgt || !a.sp) return;
            const dx = tgt.x - a.x, dy = tgt.y - a.y, d = Math.hypot(dx, dy), step = a.sp * dt * (a.rush ? 2.2 : 1);
            if (d <= step) { a.x = tgt.x; a.y = tgt.y; if (!a.rush && a.path.length) { const p = a.path.shift(); if (a.loop) a.path.push(p); } a.carry = a.kind === 'worker' ? !a.carry : a.carry; }
            else { a.x += dx / d * step; a.y += dy / d * step; }
        });
        this.agents = this.agents.filter(a => a.life > 0);
        this.fx.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 60 * dt; p.life -= dt; });
        this.fx = this.fx.filter(p => p.life > 0);
    }

    /* ---------- dibujo ---------- */
    fit(W, H, zoom = 1) {
        const s = Math.min(W / this.W, H / this.H) * 0.94 * zoom;
        this.tf = { s, ox: (W - this.W * s) / 2, oy: (H - this.H * s) / 2 + 6 * s };
        return this.tf;
    }
    draw(ctx, W, H, o = {}) {
        const n = performance.now(), dt = Math.min(0.1, (n - this.last) / 1000); this.last = n;
        this.update(dt);
        const { s, ox, oy } = this.fit(W, H, o.zoom || 1), X = x => ox + x * s, Y = y => oy + y * s;
        ctx.save(); ctx.globalAlpha = o.alpha === undefined ? 1 : o.alpha;
        if (!o.noBg) { ctx.fillStyle = '#0b0d08'; ctx.fillRect(0, 0, W, H); }
        // terreno
        const gr = ctx.createRadialGradient(X(500), Y(350), 50 * s, X(500), Y(350), 700 * s);
        gr.addColorStop(0, '#2b2a1a'); gr.addColorStop(1, '#14160d');
        ctx.fillStyle = gr; ctx.fillRect(X(0), Y(0), this.W * s, this.H * s);
        // caminos de tierra
        ctx.strokeStyle = 'rgba(120,100,60,0.35)'; ctx.lineWidth = 26 * s; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(X(180), Y(250)); ctx.lineTo(X(960), Y(250)); ctx.moveTo(X(480), Y(250)); ctx.lineTo(X(480), Y(520)); ctx.moveTo(X(180), Y(520)); ctx.lineTo(X(1000), Y(525)); ctx.stroke();
        // cerca
        ctx.strokeStyle = 'rgba(160,130,80,0.6)'; ctx.lineWidth = 3 * s; ctx.setLineDash([10 * s, 6 * s]);
        ctx.strokeRect(X(20), Y(20), 960 * s, 670 * s); ctx.setLineDash([]);
        // portón
        ctx.fillStyle = this.alarm > 0 ? `rgba(255,40,40,${0.4 + 0.4 * Math.sin(this.t * 10)})` : '#5a4a2a';
        ctx.fillRect(X(972), Y(495), 16 * s, 60 * s);
        // edificios
        const vend = this.vendettaAt(), S = State;
        this.B.forEach(b => {
            const locked = b.view && !Core.Unlocks.isOpen(b.view) && !(b.alt && Core.Unlocks.isOpen(b.alt));
            ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(X(b.x + 8), Y(b.y + 8), b.w * s, b.h * s);
            ctx.fillStyle = locked ? '#1a1a1a' : b.color; ctx.fillRect(X(b.x), Y(b.y), b.w * s, b.h * s);
            ctx.strokeStyle = this.hover === b.id ? '#e5c587' : locked ? '#333' : 'rgba(197,160,89,0.55)'; ctx.lineWidth = (this.hover === b.id ? 3 : 1.5) * s;
            ctx.strokeRect(X(b.x), Y(b.y), b.w * s, b.h * s);
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.globalAlpha = (o.alpha === undefined ? 1 : o.alpha) * (locked ? 0.35 : 1);
            ctx.font = `${42 * s}px sans-serif`; ctx.fillText(locked ? '🔒' : b.icon, X(b.x + b.w / 2), Y(b.y + b.h / 2 - 14));
            ctx.font = `bold ${15 * s}px Cinzel, serif`; ctx.fillStyle = '#e5c587'; ctx.fillText(b.name, X(b.x + b.w / 2), Y(b.y + b.h - 38));
            ctx.font = `${12 * s}px monospace`; ctx.fillStyle = '#bbb'; ctx.fillText(locked ? `Cap. ${Core.Unlocks.chapterFor(b.view)}` : this.status(b.id), X(b.x + b.w / 2), Y(b.y + b.h - 18));
            ctx.globalAlpha = o.alpha === undefined ? 1 : o.alpha;
            if (vend[b.id]) { ctx.font = `${26 * s}px sans-serif`; ctx.fillText('🩸', X(b.x + b.w - 18), Y(b.y + 18 + 4 * Math.sin(this.t * 5))); }
            if (b.id === 'lab' && Config.productKeys.some(k => S.ops[k] > 0 && S.opsStatus[k])) { // humo del laboratorio
                for (let i = 0; i < 3; i++) { const p = (this.t * 0.4 + i / 3) % 1; ctx.fillStyle = `rgba(200,200,200,${0.25 * (1 - p)})`; ctx.beginPath(); ctx.arc(X(b.x + 40 + i * 12), Y(b.y - p * 50), (6 + p * 14) * s, 0, 6.28); ctx.fill(); }
            }
            if (b.id === 'garaje') { // vehículos estacionados
                const free = S.fleet.filter(v => Core.Logistics.usable(v)).slice(0, 10);
                ctx.font = `${18 * s}px sans-serif`; free.forEach((v, i) => ctx.fillText(Config.vehicles[v.type].icon, X(b.x + 22 + i * 30), Y(b.y + 22)));
            }
            if (b.id === 'casa' && (S.family.spouse || S.family.kids.length) && S.family.happy < 30) { ctx.font = `${22 * s}px sans-serif`; ctx.fillText('💔', X(b.x + 22), Y(b.y + 22)); }
        });
        // gente
        this.agents.forEach(a => {
            ctx.font = `${(a.kind === 'fx' ? 24 : 18) * s}px sans-serif`;
            ctx.fillText(a.e, X(a.x), Y(a.y));
            if (a.carry) { ctx.font = `${10 * s}px sans-serif`; ctx.fillText('📦', X(a.x + 9), Y(a.y - 9)); }
            if (a.kind === 'lt') {
                const l = State.lieutenants.find(x => x.id === a.ltId);
                if (l) { ctx.fillStyle = l.loyalty < 40 ? '#f55' : l.loyalty < 70 ? '#fc0' : '#8f8'; ctx.beginPath(); ctx.arc(X(a.x + 12), Y(a.y - 10), 4 * s, 0, 6.28); ctx.fill();
                    if (l.loyalty < 40) { ctx.font = `${12 * s}px sans-serif`; ctx.fillText('💢', X(a.x - 12), Y(a.y - 12)); }
                }
            } else if (a.label) { ctx.font = `bold ${10 * s}px monospace`; ctx.fillStyle = a.kind === 'fx' ? '#f66' : '#ccc'; ctx.fillText(a.label, X(a.x), Y(a.y + 16)); }
        });
        // helicóptero si te buscan mucho
        if (S.heat > S.heatCap * 0.7) { const a = this.t * 0.6; ctx.font = `${30 * s}px sans-serif`; ctx.fillText('🚁', X(500 + Math.cos(a) * 380), Y(350 + Math.sin(a) * 260)); }
        // chispas
        this.fx.forEach(p => { ctx.globalAlpha = Math.max(0, p.life / 1.4) * (o.alpha === undefined ? 1 : o.alpha); ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(X(p.x), Y(p.y), 3 * s, 0, 6.28); ctx.fill(); });
        ctx.globalAlpha = 1;
        // luces de redada
        if (this.siren > 0) { ctx.fillStyle = Math.sin(this.t * 14) > 0 ? 'rgba(255,0,0,0.12)' : 'rgba(0,80,255,0.12)'; ctx.fillRect(0, 0, W, H); }
        ctx.restore();
    }
    status(id) {
        const S = State;
        if (id === 'lab') { const kg = Config.productKeys.reduce((t, k) => t + (S.ops[k] > 0 && S.opsStatus[k] ? Core.Ops.rate(k) * 60 : 0), 0); return `${fmt(kg)} kg/min`; }
        if (id === 'bodega') return `${fmt(Config.productKeys.reduce((t, k) => t + S.inv[k], 0))} kg · ${fmt(S.inv.chems)} L`;
        if (id === 'garaje') return `${S.fleet.filter(v => Core.Logistics.usable(v)).length}/${S.fleet.length} libres · ${S.routes.length} en ruta`;
        if (id === 'casa') return S.family.spouse || S.family.kids.length ? `familia ${Math.floor(S.family.happy)}/100` : 'tu mamá te espera';
        if (id === 'cuartel') return `${fmt(S.army)} 🔫 · ${fmt(S.elite)} 🎖️ libres`;
        if (id === 'oficina') return `$${fmt(S.money.clean)} limpio`;
        if (id === 'palapa') return `${S.lieutenants.length} tenientes`;
        if (id === 'radio') return S.incoming.length ? `⚔️ ${S.incoming.length} ataque(s)` : `${Core.War.owned().length} plazas`;
        if (id === 'armeria') return S.golpes.active ? `golpe ${fmtTime(S.golpes.active.left)}` : 'golpes';
        return '';
    }
    /* ---------- toques ---------- */
    toWorld(px, py) { const t = this.tf; return t ? { x: (px - t.ox) / t.s, y: (py - t.oy) / t.s } : { x: -1, y: -1 }; }
    hit(px, py) { const p = this.toWorld(px, py); return this.B.find(b => p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) || null; }
    open(b, onMap) {
        if (!b) return;
        Sfx.click();
        if (b.action === 'map') return onMap && onMap();
        if (!Core.Unlocks.isOpen(b.view) && b.alt) return UI.nav(b.alt);
        UI.nav(b.view);
    }
}

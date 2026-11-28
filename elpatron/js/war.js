/* =========================================================
   Guerra: mapa animado, conquistas, mejoras de plaza,
   cárteles rivales con personalidad y defensa en vivo
   ========================================================= */
const MAP_W = 600, MAP_H = 430;

// Silueta aproximada del país (solo decorativa)
const MAP_SHAPES = [
    [[20, 22], [250, 28], [300, 62], [345, 78], [420, 92], [445, 140], [432, 200], [442, 258], [472, 298], [503, 288], [522, 232], [588, 198], [598, 240], [562, 302], [503, 332], [470, 332], [462, 382], [432, 412], [362, 402], [292, 397], [222, 335], [190, 284], [160, 232], [120, 172], [80, 112], [58, 62], [20, 22]],
    [[22, 34], [44, 42], [72, 112], [110, 190], [132, 232], [114, 238], [80, 172], [44, 102], [18, 44], [22, 34]]
];

Core.War = {
    canvas: null, ctx: null, selected: null, particles: [], dpr: 1, t: 0,

    neighbors(id) {
        return Config.edges.filter(e => e[0] === id || e[1] === id).map(e => e[0] === id ? e[1] : e[0]);
    },
    owned() { return State.territories.filter(t => t.owner === 'player'); },
    totalTroops() { return State.army + State.elite + State.territories.reduce((s, t) => s + (t.owner === 'player' ? t.troops : 0), 0); },
    recruitCost(n) {
        const base = this.totalTroops();
        let c = 0;
        for (let i = 0; i < n; i++) c += 1000 + (base + i) * 50;
        return c;
    },
    recruit(n) {
        if (!Core.pay('dirty', this.recruitCost(n))) return;
        State.army += n;
        Sfx.gun();
        UI.notify(`Reclutaste ${n} sicarios.`);
        this.renderPanel();
    },
    recruitElite() {
        if (!Core.pay('clean', 25000)) return;
        State.elite++;
        Sfx.burst(2);
        UI.notify('Fuerzas especiales contratadas.');
    },

    attackPower() {
        return ((State.army * State.armyPower) + State.elite * 2 + State.military[7] * 50) * Core.Mods.attack();
    },
    defenseOf(id) {
        const t = State.territories[id];
        return (20 + t.troops * State.armyPower * 1.5 + t.tanks * 300) * (1 + 0.3 * t.up.fort) * Core.Mods.defense();
    },
    enemyDefense(id) {
        const c = Config.territories[id], t = State.territories[id];
        const r = State.rivals[t.owner];
        if (!r) return 0;
        if (c.hq) return Config.rivals[t.owner].bossPower * (1 + r.power / 3000) + t.troops * 3;
        return c.power * (1 + r.power / 2000) + t.troops * 2;
    },
    hqLocked(id) {
        const c = Config.territories[id], owner = State.territories[id].owner;
        return c.hq && State.territories.some(t => t.owner === owner && t.id !== id);
    },
    canAttack(id) {
        const t = State.territories[id];
        if (t.owner === 'player') return false;
        if (!this.neighbors(id).some(n => State.territories[n].owner === 'player')) return false;
        return !this.hqLocked(id);
    },
    winChance(id) {
        const my = this.attackPower(), en = this.enemyDefense(id);
        if (my <= 0) return 0;
        // mi poder varía entre 85% y 115%
        return clamp((my * 1.15 - en) / (my * 0.3), 0, 1);
    },

    launchAttack() {
        const id = this.selected;
        if (id === null) return;
        const t = State.territories[id], c = Config.territories[id];
        if (Core.Game.isFrozen()) return UI.notify('Operaciones congeladas por el Plan de Escape.', 'bad');
        if (!this.neighbors(id).some(n => State.territories[n].owner === 'player')) return UI.notify('No hay frontera con esa plaza.', 'bad');
        if (this.hqLocked(id)) return UI.notify('Primero quítale todas sus otras plazas.', 'bad');
        if (State.army < 5) return UI.notify('Necesitas mínimo 5 sicarios libres.', 'bad');
        if (c.hq) {
            const R = Config.rivals[t.owner];
            Sfx.alert();
            UI.modal(`⚔️ ${R.leader.toUpperCase()} TE ESPERA`,
                `${pick(R.taunts)}\n\nEstás por entrar a la guarida de ${R.name}.\nDefensa del jefe: ${fmt(this.enemyDefense(id))}\nTu ataque: ${fmt(this.attackPower())}\nProbabilidad: ${Math.round(this.winChance(id) * 100)}%`,
                [{ text: '¡AL ATAQUE!', style: 'btn-red', cb: () => this.doAttack(id) }, { text: 'Retirarse', cb: () => { } }]);
            return;
        }
        this.doAttack(id);
    },
    doAttack(id) {
        const t = State.territories[id], c = Config.territories[id];
        const prevOwner = t.owner;
        const my = this.attackPower() * (0.85 + Math.random() * 0.3);
        const en = this.enemyDefense(id);
        State.military[7] = 0; // los MLRS se gastan
        Core.Heat.add(15);
        Sfx.burst(6);
        this.boom(c.x, c.y, 1.3);
        if (my > en) {
            State.army -= Math.floor(State.army * (0.05 + Math.random() * 0.1));
            t.owner = 'player';
            t.troops = Math.floor(State.army / 2);
            State.army -= t.troops;
            t.tanks = 0;
            t.up = { fort: 0, lab: 0, bodega: 0 };
            State.stats.conquests++;
            const R = State.rivals[prevOwner];
            if (R) R.power = Math.max(30, R.power - c.power * 0.3);
            UI.notify(`¡${c.name.toUpperCase()} CONQUISTADA!`);
            Core.News.add(`Balacera en ${c.name}: un nuevo grupo toma el control de la plaza`, 'bad', true);
            setTimeout(() => Sfx.explosion(), 300);
            if (c.hq) Core.Rivals.defeat(prevOwner);
        } else {
            State.army -= Math.floor(State.army * (0.15 + Math.random() * 0.15));
            UI.notify(`Ataque a ${c.name} fallido. Nos rechazaron.`, 'bad');
            State.lieutenants.forEach(l => l.loyalty = Math.max(0, l.loyalty - 8));
            Core.News.add(`Enfrentamiento en ${c.name} deja varios muertos; el grupo local resiste`, 'bad');
        }
        this.calcBonuses();
        this.renderPanel();
    },

    modifyTroops(n) {
        const id = this.selected;
        if (id === null || State.territories[id].owner !== 'player') return;
        const t = State.territories[id];
        if (n === 'all') n = State.army;
        if (n === '-all') n = -t.troops;
        if (n > 0) { const m = Math.min(n, State.army); State.army -= m; t.troops += m; }
        else { const m = Math.min(-n, t.troops); t.troops -= m; State.army += m; }
        Sfx.click();
        this.renderPanel();
    },
    deployTank() {
        const id = this.selected;
        if (id === null || State.territories[id].owner !== 'player') return UI.notify('Selecciona una de tus plazas en el mapa.', 'bad');
        if (State.military[6] <= 0) return UI.notify('No tienes T-90 en reserva. Cómpralos en FLOTA.', 'bad');
        State.military[6]--;
        State.territories[id].tanks++;
        Sfx.engine();
        UI.notify(`T-90 desplegado en ${Config.territories[id].name}.`);
        this.renderPanel();
    },
    upgradeCost(type, lvl) { return Math.floor(Config.territoryUpgrades.find(u => u.id === type).base * Math.pow(lvl + 1, 1.8)); },
    upgrade(type) {
        const id = this.selected;
        if (id === null || State.territories[id].owner !== 'player') return;
        const t = State.territories[id];
        if (t.up[type] >= 3) return;
        if (!Core.pay('dirty', this.upgradeCost(type, t.up[type]))) return;
        t.up[type]++;
        Sfx.levelup();
        this.calcBonuses();
        this.renderPanel();
    },

    calcBonuses() {
        const B = { price: 1, speed: 1, cap: 0, chems: false, launder: 0, heat: 1, defense: 1, prod: 1, raidKeep: 0 };
        const txt = [];
        State.territories.forEach(t => {
            if (t.owner !== 'player') return;
            const b = Config.territories[t.id].bonus;
            if (b.type === 'price') B.price += b.val;
            if (b.type === 'speed') B.speed += b.val;
            if (b.type === 'cap') B.cap += b.val;
            if (b.type === 'chems') B.chems = true;
            if (b.type === 'launder') B.launder += b.val;
            if (b.type === 'heat') B.heat -= b.val;
            if (b.type === 'defense') B.defense += b.val;
            if (b.type === 'prod') B.prod += b.val;
            B.prod += 0.08 * t.up.lab;
            B.cap += 100 * t.up.bodega;
            B.raidKeep += 0.05 * t.up.bodega;
            txt.push(b.text);
        });
        Core.B = B;
        setText('active-bonuses', txt.join(' · ') || 'Ninguno');
        setText('count-territory', this.owned().length);
        setText('count-territory-total', Config.territories.length);
        setHTML('map-legend', `<div><i style="background:#c5a059"></i>Tú</div>` + Object.values(Config.rivals).filter(r => !State.rivals[r.id].defeated)
            .map(r => `<div><i style="background:${r.color}"></i>${r.name}</div>`).join(''));
    },

    select(id) { this.selected = id; this.renderPanel(); },
    renderPanel() {
        setText('val-army', fmt(State.army));
        setText('val-elite', fmt(State.elite));
        setText('val-attack', fmt(this.attackPower()));
        setText('recruit-cost', fmt(this.recruitCost(1)));
        setText('btn-deploy-tanks', `T-90 (${State.military[6]}) · DESPLEGAR`);
        setText('mlrs-count', `MLRS LISTOS: ${State.military[7]}`);
        const p = $('troop-controls');
        if (!p) return;
        const id = this.selected;
        if (id === null) { p.innerHTML = '<h3>SELECCIONA UNA PLAZA</h3><p class="muted">Toca un punto del mapa. Solo puedes atacar plazas conectadas a las tuyas.</p>' + this.legendHTML(); return; }
        const c = Config.territories[id], t = State.territories[id];
        const ownerName = t.owner === 'player' ? 'TUYA' : Config.rivals[t.owner].name.toUpperCase();
        const ownerColor = t.owner === 'player' ? 'var(--gold)' : Config.rivals[t.owner].color;
        const inc = State.incoming.find(i => i.target === id);
        let html = `<h3>${c.hq ? '👑 ' : ''}${c.name.toUpperCase()}</h3>
            <div class="tiny" style="color:${ownerColor}; margin-bottom:6px;">● ${ownerName}${c.hq ? ' · GUARIDA DEL JEFE' : ''}</div>
            <div class="chip green">${c.bonus.text}</div>
            ${inc ? `<div class="red tiny" style="margin-top:6px;">⚔️ ¡BAJO ATAQUE! ${Math.ceil(inc.left)}s</div>` : ''}`;
        if (t.owner === 'player') {
            if (id === Config.baseId) html += `<p class="tiny green" style="margin-top:8px;">🏠 Es tu base: los cárteles nunca la atacan. No necesitas dejar tropas aquí; úsalas para atacar.</p>`;
            html += `<div class="row-between" style="margin-top:10px;"><span>DEFENSA</span><b class="gold">${fmt(this.defenseOf(id))}</b></div>
                <div class="row-between tiny"><span>Defensores ${fmt(t.troops)} · T-90 ${t.tanks}</span><span>Libres ${fmt(State.army)}</span></div>
                <div class="btn-row">
                    <button class="action-btn" style="margin:0;" onclick="Core.War.modifyTroops(-10)">-10</button>
                    <button class="action-btn" style="margin:0;" onclick="Core.War.modifyTroops(-1)">-1</button>
                    <button class="action-btn" style="margin:0;" onclick="Core.War.modifyTroops(1)">+1</button>
                    <button class="action-btn" style="margin:0;" onclick="Core.War.modifyTroops(10)">+10</button>
                    <button class="action-btn btn-green" style="margin:0;" onclick="Core.War.modifyTroops('all')">TODOS</button>
                </div>
                <div class="lbl" style="margin-top:12px;">MEJORAS DE PLAZA</div>
                ${Config.territoryUpgrades.map(u => {
                const lvl = t.up[u.id];
                return `<div class="up-row"><div><div>${u.icon} ${u.name} <span class="pips">${'●'.repeat(lvl)}${'○'.repeat(3 - lvl)}</span></div><div class="tiny muted">${u.desc}</div></div>
                    ${lvl < 3 ? `<button class="action-btn btn-gold" onclick="Core.War.upgrade('${u.id}')">$${fmt(this.upgradeCost(u.id, lvl))}</button>` : '<span class="tiny gold">MAX</span>'}</div>`;
            }).join('')}`;
        } else {
            const adj = this.neighbors(id).some(n => State.territories[n].owner === 'player');
            const ch = this.winChance(id);
            html += `<div class="row-between" style="margin-top:10px;"><span>DEFENSA ENEMIGA</span><b class="red">${fmt(this.enemyDefense(id))}</b></div>
                <div class="row-between"><span>TU ATAQUE</span><b class="gold">${fmt(this.attackPower())}</b></div>`;
            if (!adj) html += `<p class="tiny red">Sin frontera: conquista una plaza vecina primero.</p>`;
            else if (this.hqLocked(id)) html += `<p class="tiny red">🔒 Guarida protegida: quítale a ${Config.rivals[t.owner].leader} todas sus otras plazas.</p>`;
            else html += `<div class="row-between"><span>PROBABILIDAD</span><b style="color:${ch > 0.6 ? '#8f8' : ch > 0.2 ? '#fc0' : '#f55'}">${Math.round(ch * 100)}%</b></div>
                <button class="action-btn btn-red" onclick="Core.War.launchAttack()">${c.hq ? '👑 ENFRENTAR AL JEFE' : 'INICIAR INVASIÓN'}</button>`;
        }
        p.innerHTML = html;
    },
    legendHTML() {
        return `<div class="tiny" style="margin-top:12px; line-height:1.8;">
            <div><span class="gold">●</span> Tus plazas</div>
            ${Object.values(Config.rivals).map(r => `<div><span style="color:${r.color}">●</span> ${r.name}${State.rivals[r.id].defeated ? ' <s>(derrotado)</s>' : ''}</div>`).join('')}
            <div class="muted">👑 = guarida del jefe · línea roja = frente de guerra</div></div>`;
    },

    /* ---------- Canvas ---------- */
    initCanvas() {
        this.canvas = $('war-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.canvas.addEventListener('pointerdown', e => this.click(e));
        const loop = () => { this.draw(); requestAnimationFrame(loop); };
        requestAnimationFrame(loop);
    },
    resize() {
        const c = $('war-container');
        if (!c || !c.clientWidth) return;
        this.dpr = Math.min(2, window.devicePixelRatio || 1);
        this.canvas.width = c.clientWidth * this.dpr;
        this.canvas.height = c.clientHeight * this.dpr;
    },
    toScreen() { return { sx: this.canvas.width / MAP_W, sy: this.canvas.height / MAP_H }; },
    click(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width * MAP_W;
        const y = (e.clientY - rect.top) / rect.height * MAP_H;
        let best = null, bd = 26;
        Config.territories.forEach(t => { const d = Math.hypot(t.x - x, t.y - y); if (d < bd) { bd = d; best = t.id; } });
        if (best !== null) { Sfx.click(); this.select(best); }
    },
    boom(x, y, size = 1) {
        for (let i = 0; i < 26 * size; i++) {
            const a = Math.random() * Math.PI * 2, s = (0.5 + Math.random() * 2.5) * size;
            this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1, color: pick(['#ffb347', '#ff6b3b', '#ffd27f', '#fff']), r: 1 + Math.random() * 2.5 * size });
        }
        this.particles.push({ x, y, ring: true, life: 1, r: 4, max: 40 * size });
    },
    draw() {
        if (!this.ctx || !isVisible('war')) return;
        const ctx = this.ctx, W = this.canvas.width, H = this.canvas.height;
        if (!W) { this.resize(); return; }
        this.t += 1 / 60;
        const { sx, sy } = this.toScreen();
        const s = Math.min(sx, sy);
        const X = x => x * sx, Y = y => y * sy;
        ctx.clearRect(0, 0, W, H);

        // silueta
        MAP_SHAPES.forEach(shape => {
            ctx.beginPath();
            shape.forEach((p, i) => i ? ctx.lineTo(X(p[0]), Y(p[1])) : ctx.moveTo(X(p[0]), Y(p[1])));
            ctx.fillStyle = '#0c120e'; ctx.fill();
            ctx.strokeStyle = '#1d2c22'; ctx.lineWidth = 1.5 * s; ctx.stroke();
        });

        // conexiones
        Config.edges.forEach(([a, b]) => {
            const A = Config.territories[a], Bt = Config.territories[b];
            const oa = State.territories[a].owner, ob = State.territories[b].owner;
            const front = (oa === 'player') !== (ob === 'player');
            ctx.strokeStyle = front ? 'rgba(255,70,70,0.55)' : (oa === 'player' ? 'rgba(197,160,89,0.45)' : 'rgba(255,255,255,0.08)');
            ctx.lineWidth = (front ? 2 : 1) * s;
            ctx.setLineDash(front ? [4 * s, 4 * s] : []);
            ctx.beginPath(); ctx.moveTo(X(A.x), Y(A.y)); ctx.lineTo(X(Bt.x), Y(Bt.y)); ctx.stroke();
        });
        ctx.setLineDash([]);

        // rutas animadas
        ctx.font = `${14 * s}px sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        State.routes.slice(-30).forEach(r => {
            if (r.fx === undefined) return;
            const p = Math.min(1, r.progress / 100);
            ctx.strokeStyle = 'rgba(197,160,89,0.18)'; ctx.lineWidth = 1 * s;
            ctx.setLineDash([2 * s, 5 * s]);
            ctx.beginPath(); ctx.moveTo(X(r.fx), Y(r.fy)); ctx.lineTo(X(r.tx), Y(r.ty)); ctx.stroke();
            ctx.setLineDash([]);
            const x = r.fx + (r.tx - r.fx) * p, y = r.fy + (r.ty - r.fy) * p;
            ctx.fillText(Config.vehicles[r.type].icon, X(x), Y(y) - 2 * s);
        });

        // territorios
        State.territories.forEach(t => {
            const c = Config.territories[t.id];
            const color = t.owner === 'player' ? '#c5a059' : Config.rivals[t.owner].color;
            const x = X(c.x), y = Y(c.y), rad = (c.hq ? 14 : 10) * s;
            const attacked = State.incoming.some(i => i.target === t.id);
            if (attacked) {
                const pr = (this.t * 1.5) % 1;
                ctx.strokeStyle = `rgba(255,50,50,${1 - pr})`; ctx.lineWidth = 3 * s;
                ctx.beginPath(); ctx.arc(x, y, rad + pr * 28 * s, 0, Math.PI * 2); ctx.stroke();
            }
            if (this.selected === t.id) {
                ctx.strokeStyle = '#fff'; ctx.lineWidth = 2 * s;
                ctx.beginPath(); ctx.arc(x, y, rad + 5 * s, 0, Math.PI * 2); ctx.stroke();
            }
            ctx.shadowBlur = 14 * s; ctx.shadowColor = color;
            ctx.fillStyle = color;
            ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
            if (c.hq) { ctx.font = `${12 * s}px sans-serif`; ctx.fillText('👑', x, y - rad - 7 * s); }
            if (t.owner === 'player' && t.up.fort) { ctx.font = `${9 * s}px sans-serif`; ctx.fillText('🏰'.repeat(t.up.fort), x, y + rad + 8 * s); }
            // etiquetas a la izquierda si el punto está pegado al borde derecho
            const right = c.x > 500;
            ctx.textAlign = right ? 'right' : 'left';
            const lx = right ? x - rad - 5 * s : x + rad + 5 * s;
            ctx.font = `bold ${10 * s}px monospace`; ctx.fillStyle = '#eee';
            ctx.fillText(c.name, lx, y - 3 * s);
            ctx.font = `${8.5 * s}px monospace`; ctx.fillStyle = '#888';
            const def = t.owner === 'player' ? this.defenseOf(t.id) : this.enemyDefense(t.id);
            ctx.fillText(`DEF ${fmt(def)}`, lx, y + 8 * s);
            ctx.textAlign = 'center';
        });

        // partículas
        this.particles = this.particles.filter(p => p.life > 0);
        this.particles.forEach(p => {
            if (p.ring) {
                p.r += (p.max - p.r) * 0.12; p.life -= 0.03;
                ctx.strokeStyle = `rgba(255,180,80,${p.life})`; ctx.lineWidth = 3 * s;
                ctx.beginPath(); ctx.arc(X(p.x), Y(p.y), p.r * s, 0, Math.PI * 2); ctx.stroke();
            } else {
                p.x += p.vx; p.y += p.vy; p.vx *= 0.94; p.vy *= 0.94; p.life -= 0.022;
                ctx.globalAlpha = Math.max(0, p.life);
                ctx.fillStyle = p.color;
                ctx.beginPath(); ctx.arc(X(p.x), Y(p.y), p.r * s, 0, Math.PI * 2); ctx.fill();
                ctx.globalAlpha = 1;
            }
        });
    }
};

/* =========================================================
   CÁRTELES RIVALES
   ========================================================= */
Core.Rivals = {
    alive() { return Object.keys(State.rivals).filter(id => !State.rivals[id].defeated); },
    randomAlive() { const a = this.alive(); return a.length ? pick(a) : null; },
    territoriesOf(rid) { return State.territories.filter(t => t.owner === rid); },
    truceCost(rid) { return Math.floor(State.rivals[rid].power * 200 * Config.rivals[rid].truceMult * Math.max(0.3, 1 - 0.3 * Core.HR.eff('Relacionista'))); },
    sabotageCost(rid) { return Math.floor(State.rivals[rid].power * 400); },
    inTruce(rid) { return State.rivals[rid].truceUntil > now() || State.timers.informant > now(); },
    // ¿Este cártel tiene alguna plaza pegada a una tuya?
    inContact(rid) {
        return State.territories.some(t => t.owner === 'player' && Core.War.neighbors(t.id).some(n => State.territories[n].owner === rid));
    },

    tick() {
        if (State.stats.playTime < 240) return; // 4 minutos de gracia al iniciar
        this.alive().forEach(rid => {
            const R = State.rivals[rid], C = Config.rivals[rid];
            const lands = this.territoriesOf(rid).length;
            R.power = Math.min(20000, R.power + 0.4 + lands * 0.35 + State.respect / 2e8);

            // Comportamiento según personalidad
            // Solo te molestan si ya tienen frontera contigo (antes atacaban desde el otro lado del mapa)
            const contact = this.inContact(rid);
            if (rid === 'halcones' && contact && Math.random() < 0.015 && !this.inTruce(rid)) {
                Core.Heat.add(6);
                UI.notify('La Dama le pasó un pitazo a la policía sobre ti (+Heat).', 'bad');
            }
            if (rid === 'golfo' && contact && Math.random() < 0.01 && State.routes.some(r => r.dist >= 2) && !this.inTruce(rid)) {
                // tu élite y tu Comandante pueden repeler el asalto
                const escort = Math.min(0.75, State.elite * 0.05 + 0.15 * Core.HR.eff('Comandante'));
                if (Math.random() < escort) {
                    UI.notify('🛡️ Tu escolta repelió un asalto del Golfo Negro a uno de tus convoyes.');
                    Sfx.burst(3);
                } else {
                    const r = Core.Logistics.hijack();
                    if (r) {
                        State.stats.hijacked = (State.stats.hijacked || 0) + 1;
                        UI.notify(`¡El Golfo Negro asaltó tu cargamento de ${fmt(r.amount)} kg (${r.name})! Contrata élite para escoltar.`, 'bad');
                        Core.News.add(`Comando armado asalta convoy en carretera federal; se llevan ${fmt(r.amount)} kg`, 'bad');
                        Sfx.burst(4);
                    }
                }
            }
            if (rid === 'serrana' && Math.random() < 0.03) {
                const k = pick(Config.productKeys.filter(x => State.ops[x] > 0));
                State.sat[k] += 0.6;
                Core.News.add(`La Familia Serrana inunda el mercado de ${Config.products[k].name.toLowerCase()}: el precio se desploma`);
            }

            // ¿Ataca al jugador?
            if (this.inTruce(rid)) return;
            if (State.incoming.length >= 2) return;
            const targets = State.territories.filter(t => t.owner === 'player' && t.id !== Config.baseId && !State.incoming.some(i => i.target === t.id) &&
                Core.War.neighbors(t.id).some(n => State.territories[n].owner === rid));
            if (!targets.length) return;
            targets.sort((a, b) => Core.War.defenseOf(a.id) - Core.War.defenseOf(b.id));
            const target = rid === 'halcones' ? targets[0] : pick(targets); // los Halcones van por la más débil
            const ratio = R.power / Math.max(30, Core.War.defenseOf(target.id));
            let chance = clamp(0.012 * C.aggression * ratio, 0, 0.12);
            if (State.heat > State.heatCap * 0.5) chance *= 1.5;
            if (hasTech('war_3')) chance *= 0.8;
            if (Math.random() < chance) this.spawnAttack(rid, target.id);
        });

        // Guerra entre cárteles
        if (Math.random() < 0.04) this.rivalWar();
    },
    rivalWar() {
        const a = this.randomAlive();
        if (!a) return;
        const options = State.territories.filter(t => t.owner !== a && t.owner !== 'player' && !Config.territories[t.id].hq &&
            Core.War.neighbors(t.id).some(n => State.territories[n].owner === a));
        if (!options.length) return;
        const t = pick(options), b = t.owner;
        const A = State.rivals[a], Bv = State.rivals[b];
        if (A.power * Math.random() > Bv.power * Math.random() * 0.8) {
            t.owner = a; t.troops = 15;
            A.power *= 0.95; Bv.power *= 0.9;
            Core.News.add(`${Config.rivals[a].leader} le arrebata ${Config.territories[t.id].name} a ${Config.rivals[b].leader}`, 'bad');
            Core.War.boom(Config.territories[t.id].x, Config.territories[t.id].y, 0.8);
        }
    },
    spawnAttack(rid, target) {
        const R = State.rivals[rid];
        const power = Math.floor(R.power * (0.15 + Math.random() * 0.2));
        const time = 20 + (hasTech('war_3') ? 15 : 0);
        State.incoming.push({ id: now(), rid, target, power, left: time, total: time });
        Sfx.alert();
        UI.setBadge('war', '!');
        UI.renderAttackAlert();
    },
    // Avanza los temporizadores (se llama cada 100 ms)
    incomingTick() {
        if (!State.incoming.length) return;
        State.incoming.forEach(i => i.left -= 0.1);
        const expired = State.incoming.filter(i => i.left <= 0);
        expired.forEach(i => this.resolve(i.id, 'fight'));
        if (State.ticks % 2 === 0) UI.renderAttackAlert();
    },
    resolve(incId, mode) {
        const inc = State.incoming.find(i => i.id === incId);
        if (!inc) return;
        const t = State.territories[inc.target], c = Config.territories[inc.target], C = Config.rivals[inc.rid];
        if (t.owner !== 'player') { State.incoming = State.incoming.filter(i => i.id !== incId); UI.renderAttackAlert(); return; }

        if (mode === 'negotiate') {
            const cost = this.negotiateCost(inc);
            if (!Core.pay('dirty', cost)) return;
            State.rivals[inc.rid].truceUntil = now() + 60000;
            State.rivals[inc.rid].relation += 5;
            UI.notify(`Pagaste $${fmt(cost)} a ${C.leader}. Se retiran... por ahora.`);
            Sfx.coin();
        } else if (mode === 'abandon') {
            State.army += t.troops;
            State.military[6] += t.tanks;
            t.owner = inc.rid; t.troops = 10; t.tanks = 0; t.up = { fort: 0, lab: 0, bodega: 0 };
            State.stats.lostTerritories++;
            UI.notify(`Abandonaste ${c.name}. Tus hombres y tanques regresaron a la reserva.`, 'bad');
            Core.News.add(`${C.leader} recupera ${c.name} sin disparar un tiro`);
        } else {
            if (mode === 'reinforce') { t.troops += State.army; State.army = 0; }
            const def = Core.War.defenseOf(inc.target) * (0.85 + Math.random() * 0.3);
            Core.War.boom(c.x, c.y, 1);
            Sfx.burst(5);
            if (inc.power > def) {
                t.owner = inc.rid; t.troops = 10; t.tanks = 0; t.up = { fort: 0, lab: 0, bodega: 0 };
                State.stats.lostTerritories++;
                UI.notify(`¡${C.name} tomó ${c.name}!`, 'bad');
                Core.News.add(`${C.leader} retoma ${c.name} tras intensa balacera`, 'bad', true);
                setTimeout(() => Sfx.explosion(), 250);
            } else {
                const loss = Math.min(t.troops, Math.floor(t.troops * clamp(inc.power / def, 0, 1) * 0.35));
                t.troops -= loss;
                State.rivals[inc.rid].power = Math.max(30, State.rivals[inc.rid].power - inc.power * 0.25);
                State.stats.defended++;
                UI.notify(`¡Defendimos ${c.name}! Perdimos ${loss} hombres.`);
                Core.News.add(`Repelen ataque de ${C.name} en ${c.name}`);
            }
        }
        State.incoming = State.incoming.filter(i => i.id !== incId);
        if (!State.incoming.length) UI.setBadge('war', null);
        Core.War.calcBonuses();
        Core.War.renderPanel();
        UI.renderAttackAlert();
    },
    negotiateCost(inc) { return Math.floor(inc.power * 400 * Config.rivals[inc.rid].truceMult * Math.max(0.3, 1 - 0.3 * Core.HR.eff('Relacionista'))); },
    truce(rid) {
        const cost = this.truceCost(rid);
        if (!Core.pay('dirty', cost)) return;
        State.rivals[rid].truceUntil = Math.max(now(), State.rivals[rid].truceUntil) + 120000;
        State.rivals[rid].relation += 10;
        UI.notify(`Tregua de 2 minutos con ${Config.rivals[rid].name}.`);
        Sfx.coin();
        this.render();
    },
    sabotage(rid) {
        const cost = this.sabotageCost(rid);
        if (!Core.pay('clean', cost)) return;
        State.rivals[rid].power *= 0.8;
        State.rivals[rid].relation -= 15;
        UI.notify(`Sabotaje exitoso: ${Config.rivals[rid].name} pierde 20% de su poder.`);
        Core.News.add(`Incendian bodegas de ${Config.rivals[rid].name}; nadie se atribuye el ataque`);
        Sfx.explosion();
        this.render();
    },
    defeat(rid) {
        const R = State.rivals[rid], C = Config.rivals[rid];
        R.defeated = true; R.power = 0;
        State.territories.forEach(t => { if (t.owner === rid) { t.owner = 'player'; t.troops = 5; } });
        State.stats.bossesDefeated++;
        State.incoming = State.incoming.filter(i => i.rid !== rid);
        const reward = 500000 * Math.pow(4, State.stats.bossesDefeated);
        State.money.dirty += reward;
        Sfx.fanfare();
        Core.News.add(`CAE ${C.leader.toUpperCase()}: FIN DE ${C.name.toUpperCase()}`, 'bad', true);
        UI.modal(`👑 ${C.leader.toUpperCase()} HA CAÍDO`, `${C.name} ya no existe. Sus plazas, sus hombres y su dinero ahora son tuyos.\n\nBotín: $${fmt(reward)} sucios.`, [{ text: 'CONTINUAR', style: 'btn-gold', cb: () => { } }]);
        Core.War.calcBonuses();
    },
    render() {
        $('rivals-grid').innerHTML = Object.values(Config.rivals).map(C => {
            const R = State.rivals[C.id];
            const lands = this.territoriesOf(C.id).length;
            if (R.defeated) return `<div class="op-card rival-card locked" style="border-left-color:${C.color}">
                <div class="rival-leader"><s>${C.leader}</s></div><div class="tiny muted">${C.name}</div>
                <p class="gold" style="margin-top:10px;">☠️ DERROTADO</p></div>`;
            const truce = R.truceUntil > now();
            const rel = R.relation > 20 ? 'Respetuosa' : R.relation < -20 ? 'Hostil' : 'Tensa';
            return `<div class="op-card rival-card" style="border-left-color:${C.color}">
                <div class="row-between"><div><div class="rival-leader">${C.leader}</div><div class="tiny" style="color:${C.color}">${C.name}</div></div>
                    <span class="chip ${truce ? 'green' : 'red'}">${truce ? 'TREGUA ' + fmtTime((R.truceUntil - now()) / 1000) : 'EN GUERRA'}</span></div>
                <p class="tiny muted" style="margin:8px 0;">${C.style}</p>
                <p class="tiny" style="font-style:italic; color:#999;">${C.taunts[0]}</p>
                <div class="row-between tiny"><span>PODER</span><span>${fmt(R.power)}</span></div>
                <div class="power-bar"><div style="width:${Math.min(100, R.power / 50)}%; background:${C.color}"></div></div>
                <div class="row-between tiny"><span>Plazas: ${lands}</span><span>Relación: ${rel}</span></div>
                <div class="btn-row">
                    <button class="action-btn btn-green" onclick="Core.Rivals.truce('${C.id}')">TREGUA 2 MIN $${fmt(this.truceCost(C.id))} SUCIO</button>
                    <button class="action-btn btn-red" onclick="Core.Rivals.sabotage('${C.id}')">SABOTAJE $${fmt(this.sabotageCost(C.id))} LIMPIO</button>
                </div></div>`;
        }).join('');
    }
};

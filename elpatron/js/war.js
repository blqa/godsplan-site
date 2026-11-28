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

    /* ===================== EJÉRCITO ===================== */
    // Unidades: el sicario escala con tu armamento; la élite pega fuerte, casi no muere y cobra en limpio
    U: {
        sic: { cost: 1000, upkeep: 20, atk: 1, def: 1.5 },
        eli: { cost: 25000, upkeep: 250, atk: 15, def: 12 }
    },
    totalSic() { return State.army + this.owned().reduce((s, t) => s + t.troops, 0); },
    totalElite() { return State.elite + this.owned().reduce((s, t) => s + (t.elite || 0), 0); },
    totalTroops() { return this.totalSic() + this.totalElite(); },
    // Cuartel: cuántos hombres puedes mantener (más plazas y fortalezas = más espacio)
    capacity() { return 200 + this.owned().length * 150 + this.owned().reduce((s, t) => s + t.up.fort * 75, 0); },
    room() { return Math.max(0, this.capacity() - this.totalTroops()); },
    payrollCost() { return { dirty: this.totalSic() * this.U.sic.upkeep, clean: this.totalElite() * this.U.eli.upkeep }; },
    weaponCost() { return Math.floor(5000 * Math.pow(1.5, State.weaponsLvl || 0)); },

    recruit(n) {
        const room = this.room();
        if (n === 'max') n = Math.min(room, Math.floor(State.money.dirty / this.U.sic.cost));
        n = Math.min(n, room);
        if (room <= 0) return UI.notify('Tu cuartel está lleno. Conquista plazas o construye fortalezas para tener más espacio.', 'bad');
        if (n <= 0) return UI.notify('No te alcanza el dinero sucio.', 'bad');
        if (!Core.pay('dirty', n * this.U.sic.cost)) return;
        State.army += n;
        Sfx.gun();
        UI.notify(`Reclutaste ${n} sicarios.`);
        this.refresh(true);
    },
    recruitElite(n) {
        const room = this.room();
        if (n === 'max') n = Math.min(room, Math.floor(State.money.clean / this.U.eli.cost));
        n = Math.min(n, room);
        if (room <= 0) return UI.notify('Tu cuartel está lleno.', 'bad');
        if (n <= 0) return UI.notify('No te alcanza el dinero limpio.', 'bad');
        if (!Core.pay('clean', n * this.U.eli.cost)) return;
        State.elite += n;
        Sfx.burst(2);
        UI.notify(`${n} de Fuerzas Especiales se unieron.`);
        this.refresh(true);
    },
    buyWeapons() {
        if (!Core.pay('clean', this.weaponCost())) return;
        State.weaponsLvl = (State.weaponsLvl || 0) + 1;
        State.armyPower += 0.5;
        Sfx.gun();
        UI.notify(`Armamento nivel ${State.weaponsLvl}: cada sicario ahora vale x${State.armyPower.toFixed(1)}.`);
        this.refresh(true);
    },
    // Nómina cada minuto. Si no alcanza, desertan.
    payroll() {
        const c = this.payrollCost();
        if (c.dirty > 0) {
            if (State.money.dirty >= c.dirty) State.money.dirty -= c.dirty;
            else { const lost = Math.ceil(State.army * 0.1); State.army -= lost; if (lost) UI.notify(`Sin nómina: desertaron ${lost} sicarios. Necesitas $${fmt(c.dirty)} sucio por minuto.`, 'bad'); }
        }
        if (c.clean > 0) {
            if (State.money.clean >= c.clean) State.money.clean -= c.clean;
            else { const lost = Math.ceil(State.elite * 0.1); State.elite -= lost; if (lost) UI.notify(`Sin nómina: ${lost} de élite se fueron. Necesitan $${fmt(c.clean)} limpio por minuto.`, 'bad'); }
        }
    },

    /* ----- poder ----- */
    power(sic, eli, withMlrs = true) {
        return (sic * State.armyPower * this.U.sic.atk + eli * this.U.eli.atk + (withMlrs ? State.military[7] * 50 : 0)) * Core.Mods.attack();
    },
    attackPower() { return this.power(State.army, State.elite); },
    defenseWith(id, sic, eli, tanks) {
        const t = State.territories[id];
        return (20 + sic * State.armyPower * this.U.sic.def + eli * this.U.eli.def + tanks * 300) * (1 + 0.3 * t.up.fort) * Core.Mods.defense();
    },
    defenseOf(id) { const t = State.territories[id]; return this.defenseWith(id, t.troops, t.elite || 0, t.tanks); },
    // Ataque más fuerte que te puede llegar a esa plaza (0 si nadie colinda)
    threat(id) {
        if (id === Config.baseId) return 0;
        let max = 0;
        this.neighbors(id).forEach(n => {
            const o = State.territories[n].owner, R = State.rivals[o];
            if (R && !R.defeated) max = Math.max(max, R.power * 0.35);
        });
        return max;
    },
    status(id) {
        if (id === Config.baseId) return { txt: '🏠 Base', color: '#8fbc8f', key: 'base' };
        const th = this.threat(id);
        if (!th) return { txt: 'Sin frontera', color: '#777', key: 'inner' };
        const d = this.defenseOf(id);
        if (d >= th) return { txt: 'Segura', color: '#8f8', key: 'ok' };
        if (d >= th * 0.6) return { txt: 'En riesgo', color: '#fc0', key: 'risk' };
        return { txt: 'PELIGRO', color: '#f55', key: 'danger' };
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
    chance(my, en) {
        if (my <= 0) return 0;
        return clamp((my * 1.15 - en) / (my * 0.3), 0, 1); // tu poder varía entre 85% y 115%
    },

    /* ----- plan de ataque: cuántos mandas y cuántos se quedan si ganas ----- */
    plan: { sic: null, eli: null, keep: 0.5 },
    planned() {
        const sic = this.plan.sic === null ? State.army : Math.min(this.plan.sic, State.army);
        const eli = this.plan.eli === null ? State.elite : Math.min(this.plan.eli, State.elite);
        return { sic, eli };
    },
    setPlan(kind, val) {
        if (kind === 'keep') this.plan.keep = +val;
        else this.plan[kind] = +val;
        this.updatePlanUI();
    },
    updatePlanUI() {
        const id = this.selected;
        if (id === null || !$('plan-power')) return;
        const p = this.planned();
        const my = this.power(p.sic, p.eli), en = this.enemyDefense(id), ch = this.chance(my, en);
        setText('plan-sic', fmt(p.sic)); setText('plan-eli', fmt(p.eli));
        setText('plan-power', fmt(my));
        const c = $('plan-chance'); c.textContent = Math.round(ch * 100) + '%'; c.style.color = ch > 0.6 ? '#8f8' : ch > 0.2 ? '#fc0' : '#f55';
        setText('plan-keep-txt', `Si ganas se quedan ~${Math.round(p.sic * 0.9 * this.plan.keep)} sicarios y ${Math.round(p.eli * this.plan.keep)} de élite a cuidar la plaza`);
    },

    launchAttack() {
        const id = this.selected;
        if (id === null) return;
        const t = State.territories[id], c = Config.territories[id];
        const p = this.planned();
        if (Core.Game.isFrozen()) return UI.notify('Operaciones congeladas por el Plan de Escape.', 'bad');
        if (!this.neighbors(id).some(n => State.territories[n].owner === 'player')) return UI.notify('No hay frontera con esa plaza.', 'bad');
        if (this.hqLocked(id)) return UI.notify('Primero quítale todas sus otras plazas.', 'bad');
        if (p.sic + p.eli < 5) return UI.notify('Manda mínimo 5 hombres (sicarios + élite).', 'bad');
        if (c.hq) {
            const R = Config.rivals[t.owner];
            Sfx.alert();
            UI.modal(`⚔️ ${R.leader.toUpperCase()} TE ESPERA`,
                `${pick(R.taunts)}\n\nEstás por entrar a la guarida de ${R.name}.\nDefensa del jefe: ${fmt(this.enemyDefense(id))}\nTu ataque: ${fmt(this.power(p.sic, p.eli))} (${fmt(p.sic)} sicarios + ${fmt(p.eli)} élite)\nProbabilidad: ${Math.round(this.chance(this.power(p.sic, p.eli), this.enemyDefense(id)) * 100)}%`,
                [{ text: '¡AL ATAQUE!', style: 'btn-red', cb: () => this.doAttack(id) }, { text: 'Retirarse', cb: () => { } }]);
            return;
        }
        this.doAttack(id);
    },
    doAttack(id) {
        const t = State.territories[id], c = Config.territories[id];
        const prevOwner = t.owner;
        const { sic, eli } = this.planned();
        const my = this.power(sic, eli) * (0.85 + Math.random() * 0.3);
        const en = this.enemyDefense(id);
        State.military[7] = 0; // los MLRS se gastan
        Core.Heat.add(15);
        Sfx.burst(6);
        this.boom(c.x, c.y, 1.3);
        const won = my > en;
        // bajas: la élite casi no muere
        const sicLost = Math.floor(sic * (won ? 0.05 + Math.random() * 0.1 : 0.15 + Math.random() * 0.15));
        let eliLost = 0;
        for (let i = 0; i < eli; i++) if (Math.random() < (won ? 0.02 : 0.08)) eliLost++;
        State.army -= sicLost; State.elite -= eliLost;
        const lossTxt = `Bajas: ${sicLost} sicarios${eliLost ? ` y ${eliLost} de élite` : ''}.`;
        if (won) {
            const gs = Math.round((sic - sicLost) * this.plan.keep), ge = Math.round((eli - eliLost) * this.plan.keep);
            t.owner = 'player';
            t.troops = gs; t.elite = ge; t.tanks = 0;
            State.army -= gs; State.elite -= ge;
            t.up = { fort: 0, lab: 0, bodega: 0 };
            State.stats.conquests++;
            const R = State.rivals[prevOwner];
            if (R) R.power = Math.max(30, R.power - c.power * 0.3);
            UI.notify(`¡${c.name.toUpperCase()} CONQUISTADA! ${lossTxt} Se quedan ${gs} sicarios y ${ge} de élite.`);
            Core.News.add(`Balacera en ${c.name}: un nuevo grupo toma el control de la plaza`, 'bad', true);
            setTimeout(() => Sfx.explosion(), 300);
            if (c.hq) Core.Rivals.defeat(prevOwner);
        } else {
            UI.notify(`Ataque a ${c.name} fallido. ${lossTxt}`, 'bad');
            State.lieutenants.forEach(l => l.loyalty = Math.max(0, l.loyalty - 8));
            Core.News.add(`Enfrentamiento en ${c.name} deja varios muertos; el grupo local resiste`, 'bad');
        }
        this.plan.sic = null; this.plan.eli = null;
        this.calcBonuses();
        this.refresh(true);
    },

    /* ----- mover tropas ----- */
    move(id, kind, n) {
        const t = State.territories[id];
        if (!t || t.owner !== 'player') return;
        const pool = kind === 'eli' ? 'elite' : 'army', here = kind === 'eli' ? 'elite' : 'troops';
        t[here] = t[here] || 0;
        if (n === 'all') n = State[pool];
        if (n === '-all') n = -t[here];
        if (n > 0) { const m = Math.min(n, State[pool]); State[pool] -= m; t[here] += m; }
        else { const m = Math.min(-n, t[here]); t[here] -= m; State[pool] += m; }
        Sfx.click();
        this.refresh(true);
    },
    modifyTroops(n) { if (this.selected !== null) this.move(this.selected, 'sic', n); },
    // Regresa a la reserva las tropas de plazas que nadie puede atacar
    withdrawSafe() {
        let s = 0, e = 0;
        this.owned().forEach(t => {
            if (this.threat(t.id) > 0) return;
            s += t.troops; e += t.elite || 0;
            State.army += t.troops; State.elite += t.elite || 0;
            t.troops = 0; t.elite = 0;
        });
        UI.notify(s + e ? `Regresaron a la reserva ${fmt(s)} sicarios y ${fmt(e)} de élite de plazas seguras.` : 'No hay tropas en plazas sin frontera.');
        this.refresh(true);
    },
    // Reparte la reserva entre las plazas con frontera según el peligro de cada una
    autoDistribute() {
        const reserve = +($('org-reserve') ? $('org-reserve').value : 0.3);
        let sic = Math.floor(State.army * (1 - reserve)), eli = Math.floor(State.elite * (1 - reserve));
        const front = this.owned().filter(t => this.threat(t.id) > 0);
        if (!front.length) return UI.notify('Ninguna de tus plazas tiene frontera con un rival.', 'bad');
        const deficit = id => this.threat(id) * 1.15 - this.defenseOf(id);
        let moved = 0;
        // de 5 en 5 sicarios a la plaza que más lo necesita; luego la élite de 1 en 1
        while (sic > 0) {
            const worst = front.slice().sort((a, b) => deficit(b.id) - deficit(a.id))[0];
            if (deficit(worst.id) <= 0) break;
            const m = Math.min(5, sic);
            worst.troops += m; State.army -= m; sic -= m; moved += m;
        }
        while (eli > 0) {
            const worst = front.slice().sort((a, b) => deficit(b.id) - deficit(a.id))[0];
            if (deficit(worst.id) <= 0) break;
            worst.elite = (worst.elite || 0) + 1; State.elite--; eli--; moved++;
        }
        const still = front.filter(t => deficit(t.id) > 0).length;
        UI.notify(moved ? `Tropas repartidas (${fmt(moved)} hombres).${still ? ` ${still} plaza(s) siguen débiles: recluta más.` : ' Todas tus fronteras están cubiertas.'}` : 'Tus fronteras ya están cubiertas.', still ? 'bad' : 'good');
        this.refresh(true);
    },

    deployTank() {
        const id = this.selected;
        if (id === null || State.territories[id].owner !== 'player') return UI.notify('Selecciona una de tus plazas en el mapa.', 'bad');
        if (State.military[6] <= 0) return UI.notify('No tienes T-90 en reserva. Cómpralos en FLOTA.', 'bad');
        State.military[6]--;
        State.territories[id].tanks++;
        Sfx.engine();
        UI.notify(`T-90 desplegado en ${Config.territories[id].name}.`);
        this.refresh(true);
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
        this.refresh(true);
    },

    calcBonuses() {
        const B = { price: 1, speed: 1, capMult: 1, chems: false, launder: 0, heat: 1, defense: 1, prod: 1, raidKeep: 0 };
        const txt = [];
        State.territories.forEach(t => {
            if (t.owner !== 'player') return;
            const b = Config.territories[t.id].bonus;
            if (b.type === 'price') B.price += b.val;
            if (b.type === 'speed') B.speed += b.val;
            if (b.type === 'cap') B.capMult += b.val;
            if (b.type === 'chems') B.chems = true;
            if (b.type === 'launder') B.launder += b.val;
            if (b.type === 'heat') B.heat -= b.val;
            if (b.type === 'defense') B.defense += b.val;
            if (b.type === 'prod') B.prod += b.val;
            B.prod += 0.08 * t.up.lab;
            B.capMult += 0.02 * t.up.bodega;
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

    select(id) { this.selected = id; this.plan.sic = null; this.plan.eli = null; this.renderPanel(); },
    // Actualiza todo lo de la pestaña Guerra. force = redibuja también el panel de la plaza.
    refresh(force) {
        this.renderArmy();
        this.renderOrg();
        const p = $('troop-controls');
        if (force || !p || !p.contains(document.activeElement)) this.renderPanel();
    },
    renderArmy() {
        const c = this.payrollCost();
        setText('val-army', fmt(State.army));
        setText('val-elite', fmt(State.elite));
        setText('val-attack', fmt(this.attackPower()));
        setText('val-barracks', `${fmt(this.totalTroops())} / ${fmt(this.capacity())}`);
        setText('val-payroll', `$${fmt(c.dirty)} sucio + $${fmt(c.clean)} limpio por minuto`);
        setText('val-armypower', 'x' + State.armyPower.toFixed(1));
        setText('btn-weapons', `MEJORAR ARMAMENTO (NV ${(State.weaponsLvl || 0) + 1}) · $${fmt(this.weaponCost())} LIMPIO`);
        setText('btn-deploy-tanks', `T-90 (${State.military[6]}) · DESPLEGAR`);
        setText('mlrs-count', `MLRS LISTOS: ${State.military[7]}`);
    },
    renderOrg() {
        const el = $('army-org');
        if (!el) return;
        const rows = this.owned().slice().sort((a, b) => this.threat(b.id) - this.threat(a.id));
        const danger = rows.filter(t => this.status(t.id).key === 'danger').length;
        setText('org-alert', danger ? `⚠️ ${danger} plaza(s) en PELIGRO` : '');
        el.innerHTML = rows.map(t => {
            const c = Config.territories[t.id], st = this.status(t.id);
            const rivals = [...new Set(this.neighbors(t.id).map(n => State.territories[n].owner).filter(o => State.rivals[o] && !State.rivals[o].defeated))];
            const th = this.threat(t.id);
            return `<tr>
                <td><b class="white" style="cursor:pointer;" onclick="Core.War.select(${t.id})">${c.name}</b><div class="tiny" style="white-space:normal;">${rivals.map(r => `<span style="color:${Config.rivals[r].color}">●</span>`).join(' ') || '—'}</div></td>
                <td><span style="color:${st.color}">${st.txt}</span>${th ? `<div class="tiny muted">ataque máx. ~${fmt(th)}</div>` : ''}</td>
                <td class="gold">${fmt(this.defenseOf(t.id))}</td>
                <td>${fmt(t.troops)} <span class="org-btns"><button onclick="Core.War.move(${t.id},'sic',-10)">-10</button><button onclick="Core.War.move(${t.id},'sic',10)">+10</button><button onclick="Core.War.move(${t.id},'sic','-all')">0</button></span></td>
                <td>${fmt(t.elite || 0)} <span class="org-btns"><button onclick="Core.War.move(${t.id},'eli',-1)">-1</button><button onclick="Core.War.move(${t.id},'eli',1)">+1</button></span></td>
                <td>${t.tanks || 0}</td></tr>`;
        }).join('');
    },
    renderPanel() {
        this.renderArmy();
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
            const st = this.status(id), th = this.threat(id);
            if (id === Config.baseId) html += `<p class="tiny green" style="margin-top:8px;">🏠 Es tu base: los cárteles nunca la atacan. No necesitas dejar tropas aquí.</p>`;
            else if (!th) html += `<p class="tiny green" style="margin-top:8px;">Ningún cártel colinda con esta plaza: no la pueden atacar.</p>`;
            html += `<div class="row-between" style="margin-top:10px;"><span>DEFENSA</span><b class="gold">${fmt(this.defenseOf(id))}</b></div>
                ${th ? `<div class="row-between tiny"><span>Ataque rival máximo</span><span style="color:${st.color}">~${fmt(th)} · ${st.txt}</span></div>` : ''}
                <div class="lbl">SICARIOS AQUÍ: ${fmt(t.troops)} <span class="muted">(libres ${fmt(State.army)})</span></div>
                <div class="btn-row" style="margin-top:2px;">
                    <button class="action-btn" style="margin:0;" onclick="Core.War.move(${id},'sic',-10)">-10</button>
                    <button class="action-btn" style="margin:0;" onclick="Core.War.move(${id},'sic',10)">+10</button>
                    <button class="action-btn btn-green" style="margin:0;" onclick="Core.War.move(${id},'sic','all')">TODOS</button>
                    <button class="action-btn btn-red" style="margin:0;" onclick="Core.War.move(${id},'sic','-all')">VACIAR</button>
                </div>
                <div class="lbl">ÉLITE AQUÍ: ${fmt(t.elite || 0)} <span class="muted">(libres ${fmt(State.elite)})</span></div>
                <div class="btn-row" style="margin-top:2px;">
                    <button class="action-btn" style="margin:0;" onclick="Core.War.move(${id},'eli',-1)">-1</button>
                    <button class="action-btn" style="margin:0;" onclick="Core.War.move(${id},'eli',1)">+1</button>
                    <button class="action-btn btn-blue" style="margin:0;" onclick="Core.War.move(${id},'eli','all')">TODOS</button>
                    <button class="action-btn btn-red" style="margin:0;" onclick="Core.War.move(${id},'eli','-all')">VACIAR</button>
                </div>
                ${t.tanks ? `<div class="tiny muted" style="margin-top:6px;">🪖 T-90 desplegados: ${t.tanks}</div>` : ''}
                <div class="lbl" style="margin-top:12px;">MEJORAS DE PLAZA</div>
                ${Config.territoryUpgrades.map(u => {
                const lvl = t.up[u.id];
                return `<div class="up-row"><div><div>${u.icon} ${u.name} <span class="pips">${'●'.repeat(lvl)}${'○'.repeat(3 - lvl)}</span></div><div class="tiny muted">${u.desc}</div></div>
                    ${lvl < 3 ? `<button class="action-btn btn-gold" onclick="Core.War.upgrade('${u.id}')">$${fmt(this.upgradeCost(u.id, lvl))}</button>` : '<span class="tiny gold">MAX</span>'}</div>`;
            }).join('')}`;
        } else {
            const adj = this.neighbors(id).some(n => State.territories[n].owner === 'player');
            html += `<div class="row-between" style="margin-top:10px;"><span>DEFENSA ENEMIGA</span><b class="red">${fmt(this.enemyDefense(id))}</b></div>`;
            if (!adj) html += `<p class="tiny red">Sin frontera: conquista una plaza vecina primero.</p>`;
            else if (this.hqLocked(id)) html += `<p class="tiny red">🔒 Guarida protegida: quítale a ${Config.rivals[t.owner].leader} todas sus otras plazas.</p>`;
            else {
                const p = this.planned();
                html += `<div class="lbl" style="margin-top:12px;">FUERZA DE ATAQUE</div>
                <div class="row-between tiny"><span>Sicarios: <b id="plan-sic">${fmt(p.sic)}</b> / ${fmt(State.army)}</span></div>
                <input type="range" min="0" max="${State.army}" value="${p.sic}" oninput="Core.War.setPlan('sic', this.value)">
                <div class="row-between tiny"><span>Élite: <b id="plan-eli">${fmt(p.eli)}</b> / ${fmt(State.elite)}</span></div>
                <input type="range" min="0" max="${State.elite}" value="${p.eli}" oninput="Core.War.setPlan('eli', this.value)">
                <label class="lbl">SI GANAS, DEJAR CUIDANDO LA PLAZA</label>
                <select onchange="Core.War.setPlan('keep', this.value)">
                    ${[0.25, 0.5, 0.75].map(k => `<option value="${k}" ${this.plan.keep === k ? 'selected' : ''}>${k * 100}% de los que sobrevivan</option>`).join('')}
                </select>
                <div class="tiny muted" id="plan-keep-txt" style="margin-top:4px;"></div>
                <div class="row-between" style="margin-top:8px;"><span>TU ATAQUE</span><b class="gold" id="plan-power">0</b></div>
                <div class="row-between"><span>PROBABILIDAD</span><b id="plan-chance">0%</b></div>
                <button class="action-btn btn-red" onclick="Core.War.launchAttack()">${c.hq ? '👑 ENFRENTAR AL JEFE' : 'INICIAR INVASIÓN'}</button>`;
            }
        }
        p.innerHTML = html;
        this.updatePlanUI();
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
        this.remnantsTick();
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
            t.owner = a; t.troops = 15; t.elite = 0;
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
        if (inc.remnant) return this.resolveRemnant(inc, mode);

        if (mode === 'negotiate') {
            const cost = this.negotiateCost(inc);
            if (!Core.pay('dirty', cost)) return;
            State.rivals[inc.rid].truceUntil = now() + 60000;
            State.rivals[inc.rid].relation += 5;
            UI.notify(`Pagaste $${fmt(cost)} a ${C.leader}. Se retiran... por ahora.`);
            Sfx.coin();
        } else if (mode === 'abandon') {
            State.army += t.troops;
            State.elite += t.elite || 0;
            State.military[6] += t.tanks;
            t.owner = inc.rid; t.troops = 10; t.elite = 0; t.tanks = 0; t.up = { fort: 0, lab: 0, bodega: 0 };
            State.stats.lostTerritories++;
            UI.notify(`Abandonaste ${c.name}. Tus hombres y tanques regresaron a la reserva.`, 'bad');
            Core.News.add(`${C.leader} recupera ${c.name} sin disparar un tiro`);
        } else {
            if (mode === 'reinforce') { t.troops += State.army; State.army = 0; t.elite = (t.elite || 0) + State.elite; State.elite = 0; }
            const def = Core.War.defenseOf(inc.target) * (0.85 + Math.random() * 0.3);
            Core.War.boom(c.x, c.y, 1);
            Sfx.burst(5);
            if (inc.power > def) {
                const escaped = Math.floor((t.elite || 0) / 2); // la mitad de la élite logra escapar
                State.elite += escaped;
                t.owner = inc.rid; t.troops = 10; t.elite = 0; t.tanks = 0; t.up = { fort: 0, lab: 0, bodega: 0 };
                State.stats.lostTerritories++;
                UI.notify(`¡${C.name} tomó ${c.name}!${escaped ? ` ${escaped} de élite lograron escapar.` : ''}`, 'bad');
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
        Core.War.refresh(true);
        UI.renderAttackAlert();
    },
    /* ----- REMANENTES: células sueltas de los cárteles caídos ----- */
    remnantsTick() {
        const dead = Object.keys(State.rivals).filter(id => State.rivals[id].defeated);
        if (!dead.length || State.incoming.length || State.timers.informant > now()) return;
        if (Math.random() > 0.006 * dead.length) return; // más o menos cada 5-8 minutos
        const rid = pick(dead);
        // prefieren las plazas que eran de su cártel
        let targets = Core.War.owned().filter(t => t.id !== Config.baseId && Config.territories[t.id].owner === rid);
        if (!targets.length) targets = Core.War.owned().filter(t => t.id !== Config.baseId);
        if (!targets.length) return;
        const t = pick(targets);
        // su fuerza depende de tu defensa ahí: a veces resistes solo, a veces necesitas refuerzos
        const power = Math.max(150, Math.floor(Core.War.defenseOf(t.id) * (0.5 + Math.random() * 0.9)));
        const time = 25 + (hasTech('war_3') ? 15 : 0);
        State.incoming.push({ id: now(), rid, target: t.id, power, left: time, total: time, remnant: true });
        Sfx.alert();
        UI.setBadge('war', '!');
        UI.renderAttackAlert();
    },
    resolveRemnant(inc, mode) {
        const t = State.territories[inc.target], c = Config.territories[inc.target];
        const label = `los remanentes de ${Config.rivals[inc.rid].name}`;
        // saqueo: pierden un nivel de mejora y un poco de dinero sucio
        const loot = () => {
            const ups = Object.keys(t.up).filter(k => t.up[k] > 0);
            const u = ups.length ? pick(ups) : null;
            if (u) t.up[u]--;
            const cash = Math.floor(State.money.dirty * 0.02);
            State.money.dirty -= cash;
            return `${u ? `Perdiste un nivel de ${Config.territoryUpgrades.find(x => x.id === u).name}` : 'Destrozaron la plaza'} y se llevaron $${fmt(cash)}.`;
        };
        if (mode === 'negotiate') {
            const cost = this.negotiateCost(inc);
            if (!Core.pay('dirty', cost)) return;
            UI.notify(`Les pagaste $${fmt(cost)} a ${label}. Se fueron.`);
            Sfx.coin();
        } else if (mode === 'abandon') {
            UI.notify(`Dejaste que ${label} saquearan ${c.name}. ${loot()}`, 'bad');
        } else {
            if (mode === 'reinforce') { t.troops += State.army; State.army = 0; t.elite = (t.elite || 0) + State.elite; State.elite = 0; }
            const def = Core.War.defenseOf(inc.target) * (0.85 + Math.random() * 0.3);
            Core.War.boom(c.x, c.y, 0.8);
            Sfx.burst(4);
            if (inc.power > def) {
                const lost = Math.floor(t.troops * 0.5), lostE = Math.floor((t.elite || 0) * 0.25);
                t.troops -= lost; t.elite = (t.elite || 0) - lostE;
                UI.notify(`${label.charAt(0).toUpperCase() + label.slice(1)} saquearon ${c.name}: murieron ${lost} sicarios${lostE ? ` y ${lostE} de élite` : ''}. ${loot()}`, 'bad');
                Core.News.add(`Comando armado saquea ${c.name}; autoridades culpan a "células" del crimen organizado`, 'bad');
            } else {
                const loss = Math.min(t.troops, Math.floor(t.troops * clamp(inc.power / def, 0, 1) * 0.2));
                t.troops -= loss;
                State.stats.defended++;
                UI.notify(`¡Repeliste a ${label} en ${c.name}! Perdiste ${loss} hombres.`);
                Core.News.add(`Frustran ataque de una célula criminal en ${c.name}`);
            }
        }
        State.incoming = State.incoming.filter(i => i.id !== inc.id);
        if (!State.incoming.length) UI.setBadge('war', null);
        Core.War.calcBonuses();
        Core.War.refresh(true);
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
        State.territories.forEach(t => { if (t.owner === rid) { t.owner = 'player'; t.troops = 5; t.elite = 0; } });
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

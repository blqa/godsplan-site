/* =========================================================
   Heat (búsqueda), tenientes, contactos y Gabinete Sombra
   ========================================================= */
Core.Heat = {
    add(amount) {
        amount *= Core.Mods.heat();
        State.heat = Math.min(State.heatCap, State.heat + amount);
        if (State.heat > State.heatCap * 0.25 && State.automation.active && Math.random() < 0.02) {
            State.automation.active = false;
            Core.Logistics.updateAutoStatus();
            UI.notify('Inspecciones en carretera: la automatización se detuvo.', 'bad');
        }
        const parked = State.fleet.filter(x => x.hp > 0 && !Core.Logistics.isBusy(x.uid));
        if (State.heat > State.heatCap * 0.6 && Math.random() < 0.004 && parked.length) {
            const v = pick(parked);
            v.hp = 0;
            UI.notify(`La policía destrozó tu vehículo "${v.name}".`, 'bad');
        }
        if (State.heat >= State.heatCap) this.raid();
    },
    // BALANCE v34: la búsqueda baja 2.5x más rápido (0.5/s)
    tick() {
        // entre más alta, más rápido baja (la policía se distrae con otros casos)
        State.heat = Math.max(0, State.heat - 1.5 - State.heat * 0.015);
        const pct = State.heat / State.heatCap;
        if (pct >= 0.8 && !this.warned) { this.warned = true; Sfx.alert(); UI.notify('⚠️ Búsqueda al 80%: si llega al máximo hay REDADA. Baja el ritmo, usa rutas cortas o paga al Hacker.', 'bad'); }
        if (pct < 0.6) this.warned = false;
    },
    render() {
        const pct = State.heat / State.heatCap * 100;
        const bar = $('ui-heat'); if (bar) bar.style.width = pct + '%';
        setText('heat-label', Core.Game.isFrozen() ? `CONGELADO ${fmtTime((State.timers.frozen - now()) / 1000)}` : `BÚSQUEDA ${Math.floor(State.heat)}/${State.heatCap}`);
        $('btn-panic').classList.toggle('hidden', pct <= 80);
    },
    emergencyEscape() {
        if (!Core.pay('clean', 50000)) return;
        State.heat = 0;
        State.timers.frozen = now() + 60000;
        UI.notify('PLAN DE ESCAPE: Heat a cero, operaciones congeladas 60 s.', 'event');
    },
    raid() {
        State.stats.raids++;
        State.heat = 0;
        Sfx.siren();
        if (State.shadow.supreme_court) {
            UI.notify('¡REDADA! El Control Judicial te protegió. Inventario a salvo.');
            return;
        }
        let keep = 0.5 + Core.B.raidKeep;
        if (State.contacts.lawyer) keep += 0.25;
        keep += Math.min(0.2, State.stocks.safe.owned * 0.002);
        keep = Math.min(0.9, keep);
        Config.productKeys.forEach(k => {
            if (k === 'coke' && State.ops.mobile) return;
            State.inv[k] = Math.floor(State.inv[k] * keep);
        });
        State.money.dirty = Math.floor(State.money.dirty * (State.contacts.lawyer ? 0.95 : 0.85));
        UI.notify(`¡REDADA! Perdiste ${Math.round((1 - keep) * 100)}% del inventario y parte del dinero sucio.`, 'bad');
        Core.News.add(`Operativo federal en ${Config.territories[Config.baseId].name}: aseguran bodega con mercancía y efectivo`, 'bad', true);
    }
};

/* ---------- TENIENTES ---------- */
Core.HR = {
    _effCache: null, _effTick: -1,
    best(role) {
        let b = null;
        State.lieutenants.forEach(l => { if (l.active && l.role === role && (!b || l.level > b.level)) b = l; });
        return b;
    },
    // Efecto del mejor teniente activo de ese rol (0 si no hay)
    eff(role) {
        const l = this.best(role);
        if (!l) return 0;
        return (1 + 0.25 * (l.level - 1)) * Config.traits[l.trait].mult;
    },
    levelOf(role) { const l = this.best(role); return l ? l.level : 0; },
    activeCount() { return State.lieutenants.filter(l => l.active).length; },

    search() {
        if (!Core.pay('clean', 5000)) return;
        const roles = Object.keys(Config.roles), traits = Object.keys(Config.traits);
        const used = State.lieutenants.map(l => l.name);
        State.candidates = [];
        // 3 roles distintos, dando prioridad a los que aún no tienes
        const have = State.lieutenants.map(l => l.role);
        const pool = roles.filter(r => !have.includes(r)).sort(() => Math.random() - 0.5)
            .concat(roles.filter(r => have.includes(r)).sort(() => Math.random() - 0.5));
        for (let i = 0; i < 3; i++) {
            const name = pick(Config.ltNames.filter(n => !used.includes(n) && !State.candidates.some(c => c.name === n))) || 'Fulano';
            State.candidates.push({ name, role: pool[i], trait: pick(traits) });
        }
        Sfx.click();
        this.render();
    },
    hire(i) {
        const c = State.candidates[i];
        if (!c) return;
        if (State.lieutenants.length >= 10) return UI.notify('Máximo 10 tenientes. Despide a alguien primero.', 'bad');
        State.lieutenants.push({ id: State.nextLtId++, name: c.name, role: c.role, trait: c.trait, level: 1, xp: 0, loyalty: 100, active: this.activeCount() < 6 });
        State.candidates = [];
        Sfx.levelup();
        UI.notify(`${c.name} (${c.role}) se unió a la organización.`);
        this.render();
        Core.Logistics.updateUI();
    },
    toggle(id) {
        const l = State.lieutenants.find(x => x.id === id);
        if (!l) return;
        if (!l.active && this.activeCount() >= 6) return UI.notify('Máximo 6 tenientes asignados.', 'bad');
        l.active = !l.active;
        Sfx.click();
        this.render();
        Core.Logistics.updateUI();
    },
    bonusCost(l) { return 1000 * l.level; },
    payBonus(id) {
        const l = State.lieutenants.find(x => x.id === id);
        if (!l || !Core.pay('dirty', this.bonusCost(l))) return;
        l.loyalty = 100;
        Sfx.coin();
        this.render();
    },
    fire(id) {
        const l = State.lieutenants.find(x => x.id === id);
        if (!l) return;
        UI.modal('¿DESPEDIR?', `${l.name} sabe demasiado. Si lo despides, se va... pero recuerda tus secretos (+10 Heat).`, [
            { text: 'DESPEDIR', style: 'btn-red', cb: () => { State.lieutenants = State.lieutenants.filter(x => x.id !== id); Core.Heat.add(10); this.render(); Core.Logistics.updateUI(); } },
            { text: 'Cancelar', cb: () => { } }
        ]);
    },
    tick() {
        const minute = State.stats.playTime % 60 === 0; // una vez por minuto de juego
        State.lieutenants.slice().forEach(l => {
            const T = Config.traits[l.trait];
            if (l.active && l.level < 5) {
                l.xp += l.trait === 'Genio' ? 2 : 1;
                const next = Config.ltLevels[l.level];
                if (l.xp >= next) {
                    l.level++;
                    Sfx.levelup();
                    UI.notify(`⭐ ${l.name} subió a nivel ${l.level} (${l.role}).`, 'event');
                }
            }
            if (!minute) return;
            l.loyalty = Math.max(0, l.loyalty - 4 * T.decay * (l.active ? 1 : 0.5));
            if (l.trait === 'Impulsivo' && l.active && Math.random() < 0.05) {
                Core.Heat.add(10);
                UI.notify(`${l.name} se peleó en una cantina. (+Heat)`, 'bad');
            }
            if (l.loyalty < 25 && Math.random() < 0.15) this.betray(l);
        });
        if (minute && isVisible('hr')) this.render();
    },
    betray(l) {
        State.lieutenants = State.lieutenants.filter(x => x.id !== l.id);
        Sfx.alert();
        if (l.trait === 'Codicioso') {
            const stolen = Math.floor(State.money.dirty * 0.15);
            State.money.dirty -= stolen;
            UI.notify(`💀 TRAICIÓN: ${l.name} huyó con $${fmt(stolen)}.`, 'bad');
        } else if (l.trait === 'Impulsivo') {
            const r = Core.Rivals.randomAlive();
            if (r) State.rivals[r].power += 150;
            UI.notify(`💀 TRAICIÓN: ${l.name} se pasó con ${r ? Config.rivals[r].name : 'el enemigo'}.`, 'bad');
        } else {
            const v = State.fleet.filter(x => x.type !== 0 && !Core.Logistics.isBusy(x.uid));
            if (v.length) { const s = pick(v); State.fleet = State.fleet.filter(x => x.uid !== s.uid); UI.notify(`💀 TRAICIÓN: ${l.name} se robó "${s.name}".`, 'bad'); }
            else UI.notify(`💀 TRAICIÓN: ${l.name} desapareció sin dejar rastro.`, 'bad');
        }
        Core.News.add(`Hallan pistas sobre "${l.name}", exintegrante de una organización criminal`);
        this.render();
        Core.Logistics.updateUI();
    },
    render() {
        setText('lt-count', `${this.activeCount()}/6 asignados · ${State.lieutenants.length}/10 total`);
        setHTML('candidates', State.candidates.map((c, i) => {
            const T = Config.traits[c.trait], R = Config.roles[c.role];
            return `<div class="op-card glow">
                <h3>${R.icon} ${c.name}</h3>
                <div><span class="chip gold">${c.role}</span><span class="chip" style="border-color:${T.color}; color:${T.color}">${c.trait}</span></div>
                <p class="tiny muted" style="margin-top:6px;">${R.desc}</p>
                <p class="tiny" style="color:${T.color}">${T.desc}</p>
                <button class="action-btn btn-green" onclick="Core.HR.hire(${i})">CONTRATAR</button></div>`;
        }).join(''));
        setHTML('lieutenants-list', State.lieutenants.map(l => {
            const T = Config.traits[l.trait], R = Config.roles[l.role];
            const next = Config.ltLevels[l.level];
            const xpPct = l.level >= 5 ? 100 : Math.min(100, l.xp / next * 100);
            const lc = l.loyalty > 60 ? '#8f8' : l.loyalty > 25 ? '#fc0' : '#f55';
            return `<div class="op-card ${l.active ? 'glow' : ''}">
                <div class="row-between"><h3 style="margin:0;">${R.icon} ${l.name}</h3><span class="gold">${'★'.repeat(l.level)}</span></div>
                <div style="margin:6px 0;"><span class="chip gold">${l.role}</span><span class="chip" style="border-color:${T.color}; color:${T.color}">${l.trait}</span>${l.active ? '<span class="chip green">ASIGNADO</span>' : ''}</div>
                <p class="tiny muted">${R.desc}</p>
                <div class="row-between tiny"><span>Experiencia ${l.level >= 5 ? 'MÁX' : `${l.xp}/${next}`}</span><span>Efecto x${((1 + 0.25 * (l.level - 1)) * T.mult).toFixed(2)}</span></div>
                <div class="progress-line" style="margin:4px 0 8px;"><div class="progress-active" style="width:${xpPct}%"></div></div>
                <div class="row-between tiny"><span>Lealtad</span><span style="color:${lc}">${Math.floor(l.loyalty)}%</span></div>
                <div class="progress-line" style="margin:4px 0 8px;"><div class="progress-active" style="width:${l.loyalty}%; background:${lc}"></div></div>
                <div class="btn-row">
                    <button class="action-btn" style="margin:0;" onclick="Core.HR.toggle(${l.id})">${l.active ? 'DESASIGNAR' : 'ASIGNAR'}</button>
                    <button class="action-btn btn-green" style="margin:0;" onclick="Core.HR.payBonus(${l.id})">BONO $${fmt(this.bonusCost(l))}</button>
                    <button class="action-btn btn-red" style="margin:0; flex:0.4;" onclick="Core.HR.fire(${l.id})">✕</button>
                </div></div>`;
        }).join('') || '<p class="muted">Aún no tienes tenientes. Busca candidatos arriba.</p>');
    }
};

/* ---------- CONTACTOS ---------- */
Core.Contacts = {
    list: [
        { id: 'weapons', name: 'Traficante de Armas', icon: '🔫', desc: '+0.5 poder por sicario (acumulable).', cost: 5000, cur: 'clean', repeat: true },
        { id: 'politician', name: 'Político Corrupto', icon: '🎩', desc: 'Baja tu búsqueda al instante (-30 Heat).', cost: 50000, cur: 'dirty', repeat: true },
        { id: 'hacker', name: 'Hacker "The Ghost"', icon: '💻', desc: 'Borra registros digitales (-50 Heat).', cost: 10000, cur: 'clean', repeat: true },
        { id: 'informant', name: 'Informante', icon: '🕵️', desc: 'Ningún cártel te ataca durante 2 minutos.', cost: 5000, cur: 'clean', repeat: true },
        { id: 'police', name: 'Jefe de Policía', icon: '👮', desc: 'La mitad de Heat en todo (permanente).', cost: 2000, cur: 'clean' },
        { id: 'customs', name: 'Aduanero Corrupto', icon: '🛃', desc: '-15% Heat y riesgo de decomiso en rutas.', cost: 10000, cur: 'clean' },
        { id: 'union', name: 'Líder Sindical', icon: '👷', desc: '+10% producción en todos los labs.', cost: 20000, cur: 'dirty' },
        { id: 'lawyer', name: 'Narco-Abogado', icon: '⚖️', desc: 'En redadas conservas 25% más de inventario.', cost: 50000, cur: 'clean' }
    ],
    render() {
        $('contacts-grid').innerHTML = this.list.map(c => {
            const active = !c.repeat && State.contacts[c.id];
            let status = '';
            if (c.id === 'informant' && State.timers.informant > now()) status = `<span class="chip green">ACTIVO ${fmtTime((State.timers.informant - now()) / 1000)}</span>`;
            if (active) status = '<span class="chip green">EN NÓMINA</span>';
            return `<div class="op-card">
                <h3>${c.icon} ${c.name} ${status}</h3>
                <p class="tiny muted">${c.desc}</p>
                ${active ? '' : `<button class="action-btn ${c.cur === 'clean' ? 'btn-green' : ''}" onclick="Core.Contacts.use('${c.id}')">PAGAR $${fmt(c.cost)} ${c.cur === 'clean' ? 'LIMPIO' : 'SUCIO'}</button>`}
            </div>`;
        }).join('');
    },
    use(id) {
        const c = this.list.find(x => x.id === id);
        if (!c.repeat && State.contacts[id]) return;
        if (!Core.pay(c.cur, c.cost)) return;
        if (id === 'weapons') { State.armyPower += 0.5; UI.notify('Armamento mejorado. +0.5 poder por sicario.'); }
        else if (id === 'politician') { State.heat = Math.max(0, State.heat - 30); UI.notify('Campaña financiada. Heat -30.'); }
        else if (id === 'hacker') { State.heat = Math.max(0, State.heat - 50); UI.notify('Registros borrados. Heat -50.'); }
        else if (id === 'informant') { State.timers.informant = Math.max(now(), State.timers.informant) + 120000; UI.notify('Informante activo: 2 minutos sin ataques.'); }
        else { State.contacts[id] = true; UI.notify(`${c.name} ahora trabaja para ti.`); }
        Sfx.coin();
        this.render();
    }
};

/* ---------- GABINETE SOMBRA ---------- */
Core.Shadow = {
    render() {
        $('shadow-grid').innerHTML = Config.shadow.map(s => {
            const bought = State.shadow[s.id];
            const locked = State.rank < s.reqRank;
            return `<div class="op-card ${bought ? 'glow' : locked ? 'locked' : ''}" style="${bought ? 'border-color:var(--success-b)' : ''}">
                <h3>${s.name}</h3>
                <p class="tiny muted">${s.desc}</p>
                ${locked ? `<p class="tiny red">Requiere rango ${Config.ranks[s.reqRank].name.toUpperCase()}</p>` : ''}
                <button class="action-btn btn-purple" onclick="Core.Shadow.buy('${s.id}')" ${bought || locked ? 'disabled' : ''}>${bought ? '✔ ADQUIRIDO' : `COMPRAR $${fmt(s.cost)} LIMPIO`}</button>
            </div>`;
        }).join('');
    },
    buy(id) {
        const s = Config.shadow.find(x => x.id === id);
        if (State.shadow[id] || State.rank < s.reqRank) return;
        if (!Core.pay('clean', s.cost)) return;
        State.shadow[id] = true;
        if (id === 'fiscal') State.heatCap = 200;
        Sfx.fanfare();
        UI.notify(`ADQUIRIDO: ${s.name}`);
        if (!State.shadow.media) Core.News.add(`Rumores de un "poder detrás del poder" sacuden al gobierno`);
        Core.Logistics.updateUI();
        Core.Assets.renderStore();
        this.render();
    },
    tick() { if (State.shadow.media) State.heat = Math.max(0, State.heat - 0.05); }
};

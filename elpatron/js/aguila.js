/* =========================================================
   EL ÁGUILA: el gobierno de Estados Unidos (fin de juego)
   Se activa cuando ya no queda ningún cártel en México.
   - Células en EE.UU.: venden tu mercancía a precio gringo
   - Atención: entre más vendes allá, más te persiguen (DEA, Tesoro, extradiciones)
   - Defensas: infiltrado, abogados y túneles
   - Influencia: compras poder en Washington hasta cerrar El Pacto del Águila
   ========================================================= */
Core.Aguila = {
    lastIncome: 0, // dinero sucio que dejaron las células en el último minuto (aprox.)

    A() { return State.aguila; },
    active() { return Core.Rivals.alive().length === 0; },
    lvl(id) { return this.A().cells[id] || 0; },
    totalLevels() { return Config.aguila.cities.reduce((n, c) => n + this.lvl(c.id), 0); },
    cellCost(c) { const l = this.lvl(c.id); return l === 0 ? c.cost : Math.floor(c.cost * l * 1.2); },
    defLvl(id) { return this.A().def[id] || 0; },
    defCost(d) { return d.base * [1, 3, 6][this.defLvl(d.id)]; },
    actCost(a) { return Math.floor(a.base * (1 + 0.5 * (this.A().acts[a.id] || 0))); },
    kgPerMin(c) { return c.kg * this.lvl(c.id) * (1 + 0.25 * this.defLvl('tuneles')); },
    borderOn() { return this.A().borderUntil > now(); },

    // Cuánta atención gana por ciclo de 3 s
    attGain() {
        let g = this.totalLevels() * 0.035 * (1 + 0.15 * (State.dynasty || 0));
        if (State.shadow.lobby_us) g *= 0.7;
        if (State.shadow.presidencia) g *= 0.85;
        return g;
    },

    /* ---------- Cada 3 segundos ---------- */
    tick() {
        const A = this.A();
        if (!this.active()) return;
        // 1) las células venden
        let income = 0;
        const order = ['fenta', 'heroin', 'coke', 'meth', 'weed'];
        Config.aguila.cities.forEach(c => {
            if (!this.lvl(c.id)) return;
            let want = this.kgPerMin(c) / 20;
            for (const k of order) {
                if (want <= 0) break;
                const kg = Math.min(want, Math.floor(State.inv[k]));
                if (kg <= 0) continue;
                State.inv[k] -= kg; want -= kg;
                income += kg * Config.products[k].basePrice * c.price * Core.Mods.price(k);
                A.sold += kg;
            }
        });
        if (income > 0) { income = Math.floor(income); State.money.dirty += income; State.stats.dirtyEarned += income; }
        this.lastIncome = this.lastIncome * 0.95 + income * 20 * 0.05;

        if (A.done) { A.attention = 0; return; }
        // 2) atención e influencia
        A.attention = clamp(A.attention + this.attGain() - 0.12, 0, 100);
        A.influence = clamp(A.influence + this.totalLevels() * 0.004, 0, 100);
        if (A.attention >= 80 && !A.alerted) {
            A.alerted = true;
            UI.notify('🦅 Washington te tiene en la mira (atención 80+). Si llega a 100 viene la Operación Águila Real.', 'bad');
            UI.setBadge('aguila', '!');
        }
        if (A.attention < 60) A.alerted = false;
        if (A.attention >= 100) return this.bigStrike();
        // 3) ¿el gobierno gringo hace algo?
        if (A.nextOp > State.stats.playTime) return;
        if (Math.random() < A.attention / 100 * 0.04) {
            A.nextOp = State.stats.playTime + 60;
            this.operation();
        }
    },

    operation() {
        const A = this.A();
        const ops = [];
        if (this.totalLevels() > 0) ops.push('raid', 'raid');
        if (State.money.offshore > 1e6) ops.push('sanction');
        if (State.lieutenants.length && $('event-modal').classList.contains('hidden')) ops.push('extradite');
        if (!this.borderOn()) ops.push('border');
        if (!ops.length) return;
        const op = pick(ops);
        if (op === 'raid') {
            const cells = Config.aguila.cities.filter(c => this.lvl(c.id) > 0);
            const c = pick(cells);
            const stop = 0.25 * this.defLvl('infiltrado');
            if (Math.random() < stop) {
                UI.notify(`🕵️ Tu infiltrado en la DEA avisó a tiempo: la redada en ${c.name} encontró la bodega vacía.`);
                Core.News.add(`La DEA catea una bodega en ${c.name}... y no encuentra nada`);
            } else {
                A.cells[c.id]--;
                UI.notify(`🚨 La DEA hizo una redada en tu célula de ${c.name} (baja a nivel ${A.cells[c.id]}).`, 'bad');
                Core.News.add(`DEA desmantela red de distribución mexicana en ${c.name}`, 'bad', true);
                Sfx.alert();
            }
        } else if (op === 'sanction') {
            const pct = Math.max(0.07, 0.25 - 0.06 * this.defLvl('abogados'));
            const amt = Math.floor(State.money.offshore * pct);
            State.money.offshore -= amt; A.frozen += amt;
            UI.notify(`🏦 El Tesoro de EE.UU. te sancionó: congelaron $${fmt(amt)} de tu cuenta offshore.`, 'bad');
            Core.News.add('Departamento del Tesoro congela cuentas ligadas a "El Patrón"', 'bad', true);
            Sfx.error();
        } else if (op === 'extradite') {
            const l = pick(State.lieutenants);
            const cost = Math.floor(Math.max(5e6, State.money.offshore * 0.02) * (1 - 0.25 * this.defLvl('abogados')));
            Sfx.alert();
            UI.modal('🦅 PETICIÓN DE EXTRADICIÓN', `Washington pide la extradición de ${l.name} (${l.role}).\n\nSi lo entregas, la presión baja. Si lo proteges, tus abogados meten un amparo.`, [
                { text: `AMPARO $${fmt(cost)} LIMPIO`, style: 'btn-green', cb: () => { if (!Core.pay('clean', cost)) return false; UI.notify(`${l.name} se queda en México. Por ahora.`); } },
                { text: 'ENTREGARLO (−15 atención)', style: 'btn-red', cb: () => {
                    State.lieutenants = State.lieutenants.filter(x => x.id !== l.id);
                    A.attention = Math.max(0, A.attention - 15);
                    Core.News.add(`Extraditan a "${l.name}" a Estados Unidos`, 'bad', true);
                    Core.HR.render(); Core.Logistics.updateUI();
                } }
            ]);
        } else {
            const secs = 180 - 40 * this.defLvl('tuneles');
            A.borderUntil = now() + secs * 1000;
            UI.notify(`🛂 Operativo en la frontera por ${fmtTime(secs)}: más decomisos en rutas largas.`, 'bad');
            Core.News.add('EE.UU. despliega a la Guardia Nacional en la frontera');
        }
        UI.setBadge('aguila', '!');
        if (UI.current === 'aguila') this.render();
    },

    // La atención llegó a 100
    bigStrike() {
        const A = this.A();
        Config.aguila.cities.forEach(c => { if (A.cells[c.id] > 0) A.cells[c.id]--; });
        const pct = Math.max(0.1, 0.3 - 0.05 * this.defLvl('abogados'));
        const amt = Math.floor(State.money.offshore * pct);
        State.money.offshore -= amt; A.frozen += amt;
        A.influence = Math.max(0, A.influence - 15);
        A.attention = 55;
        Sfx.explosion();
        Core.News.add('OPERACIÓN ÁGUILA REAL: golpe histórico contra el imperio de El Patrón', 'bad', true);
        UI.modal('🦅 OPERACIÓN ÁGUILA REAL', `La DEA, el FBI y el Tesoro te pegaron al mismo tiempo.\n\n• Todas tus células bajaron un nivel.\n• Congelaron $${fmt(amt)} de tu cuenta offshore.\n• Perdiste 15 de influencia en Washington.\n\nBaja la atención con el Lobby, entregando gente o vendiendo menos allá.`, [{ text: 'ENTENDIDO', style: 'btn-red', cb: () => { } }]);
        if (UI.current === 'aguila') this.render();
    },

    /* ---------- Acciones del jugador ---------- */
    buyCell(id) {
        const c = Config.aguila.cities.find(x => x.id === id);
        if (!this.active() || this.lvl(id) >= Config.aguila.CELL_MAX) return;
        if (!Core.pay('dirty', this.cellCost(c))) return;
        const first = !this.lvl(id);
        this.A().cells[id] = this.lvl(id) + 1;
        Sfx.coin();
        UI.notify(first ? `${c.icon} Abriste una célula en ${c.name}.` : `${c.icon} Célula de ${c.name} a nivel ${this.lvl(id)}.`);
        if (first) Core.News.add(`Aumenta la droga mexicana en las calles de ${c.name}`);
        this.render();
    },
    buyDef(id) {
        const d = Config.aguila.defenses.find(x => x.id === id);
        if (this.defLvl(id) >= 3) return;
        if (!Core.pay(d.cur, this.defCost(d))) return;
        this.A().def[id] = this.defLvl(id) + 1;
        Sfx.levelup();
        UI.notify(`${d.icon} ${d.name} nivel ${this.defLvl(id)}.`);
        this.render();
    },
    act(id) {
        const a = Config.aguila.acts.find(x => x.id === id), A = this.A();
        if (A.done || A.influence >= 100) return;
        if (!Core.pay(a.cur, this.actCost(a))) return;
        A.acts[id] = (A.acts[id] || 0) + 1;
        if (a.risk && Math.random() < a.risk) {
            A.attention = Math.min(100, A.attention + 25);
            UI.notify(`📸 El senador te grabó a ti. Escándalo en Washington (+25 atención).`, 'bad');
            Core.News.add('Senador denuncia intento de extorsión del narco mexicano', 'bad', true);
            Sfx.error();
        } else {
            A.influence = Math.min(100, A.influence + a.inf);
            A.attention = Math.min(100, A.attention + a.att);
            UI.notify(`${a.icon} ${a.name}: +${a.inf} influencia, +${a.att} atención.`);
            Sfx.coin();
        }
        if (A.attention >= 100) this.bigStrike();
        this.render();
    },
    unfreeze() {
        const A = this.A();
        if (!A.frozen) return;
        if (this.defLvl('abogados') < 1) return UI.notify('Necesitas el Bufete en Nueva York para liberar cuentas.', 'bad');
        const cost = Math.floor(A.frozen * 0.15);
        if (!Core.pay('clean', cost)) return;
        State.money.offshore += A.frozen;
        UI.notify(`⚖️ Tus abogados liberaron $${fmt(A.frozen)}.`);
        A.frozen = 0;
        Sfx.cash();
        this.render();
    },
    pact() {
        const A = this.A();
        if (A.done || A.influence < 100) return;
        if (!Core.pay('clean', Config.aguila.PACT_COST)) return;
        A.done = true; A.attention = 0; A.borderUntil = 0;
        if (A.frozen) { State.money.offshore += A.frozen; A.frozen = 0; }
        Sfx.fanfare();
        Core.News.add('Washington y "El Patrón" firman un pacto secreto. Oficialmente, nunca pasó.', 'good', true);
        UI.modal('🦅 EL PACTO DEL ÁGUILA', `En una sala sin ventanas de Washington, tres hombres de traje firmaron un papel que no existe.\n\nLa DEA mira hacia otro lado. El Tesoro te devolvió lo congelado. Tus células venden sin que nadie las toque.\n\nAl retirarte ganarás +${Config.aguila.PACT_LEGACY} puntos de Legado extra.`, [{ text: 'EL MUNDO ES MÍO', style: 'btn-gold', cb: () => { } }]);
        Core.Achievements.check();
        this.render();
    },

    /* ---------- Pantalla ---------- */
    bar(val, color) {
        return `<div class="progress-line" style="height:10px;"><div class="progress-active" style="width:${clamp(val, 0, 100)}%; background:${color};"></div></div>`;
    },
    render() {
        const wrap = $('aguila-wrap');
        if (!wrap) return;
        UI.setBadge('aguila', null);
        const A = this.A();
        if (!this.active()) {
            const left = Core.Rivals.alive().map(id => `<li>${Config.rivals[id].name} (${Config.rivals[id].leader})</li>`).join('');
            wrap.innerHTML = `<div class="op-card locked">
                <h3>🦅 WASHINGTON TODAVÍA NO SABE TU NOMBRE</h3>
                <p class="muted">Mientras haya cárteles peleándose en México, para Estados Unidos eres uno más. Cuando seas el único dueño del país, el Águila va a voltear a verte... y tú vas a poder vender allá a precio gringo.</p>
                <p class="tiny" style="margin-top:10px;">Te falta derrotar a:</p><ul class="tiny">${left}</ul>
            </div>`;
            return;
        }
        const attColor = A.attention >= 80 ? '#f55' : A.attention >= 50 ? '#fc0' : '#8f8';
        const levels = this.totalLevels();
        let html = `<div class="op-card" style="border-color:${A.done ? 'var(--gold)' : attColor};">
            <h3>${A.done ? '🦅 EL ÁGUILA ES TUYA' : '🦅 ESTADOS UNIDOS TE VIGILA'}</h3>
            <div class="status-row"><span>👁️ Atención de Washington</span><span style="color:${attColor}">${Math.floor(A.attention)} / 100</span></div>
            ${this.bar(A.attention, attColor)}
            <p class="tiny muted" style="margin:4px 0 10px;">${A.done ? 'Con el Pacto nadie te persigue.' : `Sube ${(this.attGain() * 20).toFixed(1)}/min por tus células y baja 2.4/min sola. A 100 viene la Operación Águila Real.${State.shadow.lobby_us ? ' Tu Lobby en Washington la frena 30%.' : ''}`}</p>
            <div class="status-row"><span>🏛️ Influencia en Washington</span><span class="gold">${Math.floor(A.influence)} / 100</span></div>
            ${this.bar(A.influence, 'var(--gold)')}
            <div class="status-row" style="margin-top:10px;"><span>💵 Tus células dejan</span><span class="green">~$${fmt(this.lastIncome)}/min sucio</span></div>
            <div class="status-row"><span>📦 Vendido en EE.UU.</span><span>${fmt(A.sold)} kg</span></div>
            ${this.borderOn() ? `<p class="tiny red">🛂 Operativo en la frontera: ${fmtTime((A.borderUntil - now()) / 1000)} (más decomisos en rutas largas).</p>` : ''}
            ${A.frozen ? `<div class="status-row" style="margin-top:8px;"><span class="red">🧊 Dinero congelado</span><span class="red">$${fmt(A.frozen)}</span></div>
                <button class="action-btn btn-blue" onclick="Core.Aguila.unfreeze()" ${this.defLvl('abogados') ? '' : 'disabled'}>⚖️ LIBERAR CUENTAS · $${fmt(A.frozen * 0.15)} LIMPIO${this.defLvl('abogados') ? '' : ' (necesitas Bufete)'}</button>` : ''}
        </div>`;

        html += `<div class="section-title sub">🌎 CÉLULAS EN ESTADOS UNIDOS</div>
        <p class="muted tiny" style="margin-bottom:10px;">Se llevan mercancía de tu bodega (primero la más cara) y la venden a precio gringo, sin saturar el mercado de México. Cada nivel vende más... y llama más la atención.</p>
        <div class="grid-cards">` + Config.aguila.cities.map(c => {
            const l = this.lvl(c.id), max = l >= Config.aguila.CELL_MAX;
            return `<div class="op-card ${l ? 'glow' : ''}">
                <h3>${c.icon} ${c.name.toUpperCase()} <span class="chip">x${c.price} precio</span></h3>
                <p class="tiny muted">${c.desc}</p>
                <div class="status-row"><span>${l ? 'NIVEL ' + l + ' / ' + Config.aguila.CELL_MAX : 'SIN CÉLULA'}</span><span>${l ? fmt(this.kgPerMin(c)) + ' kg/min' : c.kg + ' kg/min por nivel'}</span></div>
                ${max ? '<div class="tiny gold" style="margin-top:6px;">NIVEL MÁXIMO</div>' : `<button class="action-btn btn-green" onclick="Core.Aguila.buyCell('${c.id}')">${l ? 'AMPLIAR' : 'ABRIR CÉLULA'} · $${fmt(this.cellCost(c))} SUCIO</button>`}
            </div>`;
        }).join('') + `</div>`;

        html += `<div class="section-title sub">🛡️ DEFENSAS CONTRA WASHINGTON</div><div class="grid-cards">` + Config.aguila.defenses.map(d => {
            const l = this.defLvl(d.id);
            return `<div class="op-card">
                <h3>${d.icon} ${d.name.toUpperCase()}</h3>
                <p class="tiny muted">${d.desc}</p>
                <div class="status-row"><span>NIVEL ${l} / 3</span></div>
                ${l >= 3 ? '<div class="tiny gold" style="margin-top:6px;">NIVEL MÁXIMO</div>' : `<button class="action-btn" onclick="Core.Aguila.buyDef('${d.id}')">MEJORAR · $${fmt(this.defCost(d))} ${d.cur === 'clean' ? 'LIMPIO' : 'SUCIO'}</button>`}
            </div>`;
        }).join('') + `</div>`;

        if (!A.done) {
            html += `<div class="section-title sub">🏛️ PODER EN WASHINGTON</div>
            <p class="muted tiny" style="margin-bottom:10px;">Junta 100 de influencia para cerrar El Pacto del Águila. Tus células también suman un poco de influencia sola (${(levels * 0.08).toFixed(1)}/min).</p>
            <div class="grid-cards">` + Config.aguila.acts.map(a => `<div class="op-card">
                <h3>${a.icon} ${a.name.toUpperCase()}</h3>
                <p class="tiny muted">${a.desc}</p>
                <div class="status-row"><span class="gold">+${a.inf} influencia</span><span class="red">+${a.att} atención</span></div>
                <button class="action-btn btn-purple" onclick="Core.Aguila.act('${a.id}')" ${A.influence >= 100 ? 'disabled' : ''}>$${fmt(this.actCost(a))} ${a.cur === 'clean' ? 'LIMPIO' : 'SUCIO'}</button>
            </div>`).join('') + `</div>
            <div class="op-card center" style="border-color:var(--gold); margin-top:14px;">
                <h3>🦅 EL PACTO DEL ÁGUILA</h3>
                <p class="muted">Con 100 de influencia, Washington firma contigo: se acaba la persecución, te devuelven lo congelado y al retirarte ganas <b class="gold">+${Config.aguila.PACT_LEGACY} puntos de Legado</b> extra.</p>
                <button class="action-btn btn-gold" onclick="Core.Aguila.pact()" ${A.influence >= 100 ? '' : 'disabled'}>FIRMAR EL PACTO · $${fmt(Config.aguila.PACT_COST)} LIMPIO</button>
            </div>`;
        } else {
            html += `<div class="op-card center" style="border-color:var(--gold); margin-top:14px;"><h3>🦅 PACTO FIRMADO</h3><p class="muted">Al retirarte ganas +${Config.aguila.PACT_LEGACY} puntos de Legado extra.</p></div>`;
        }
        wrap.innerHTML = html;
    }
};

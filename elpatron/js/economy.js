/* =========================================================
   Economía: modificadores, producción, mercado, finanzas,
   préstamos, negocios fachada, lujos e I+D
   ========================================================= */

/* ---------- Modificadores centrales (un solo lugar para todos los bonus) ---------- */
Core.B = { price: 1, speed: 1, cap: 0, chems: false, launder: 0, heat: 1, defense: 1, prod: 1, raidKeep: 0 };

Core.Mods = {
    prod(k) {
        let m = Core.B.prod * legacyMult();
        if (hasTech('eff_1')) m *= 1.2;
        if (hasTech('prod_auto')) m *= 1.3;
        if (k === 'weed' && hasTech('hydro_1')) m *= 1.5;
        if (k === 'heroin' && hasTech('asia_net')) m *= 1.5;
        if (State.contacts.union) m *= 1.1;
        m *= 1 + 0.2 * Core.HR.eff('Químico');
        if (k === 'weed' && State.weatherCurrent === 2) m *= 0.5;
        return m;
    },
    price(k) {
        let m = Core.B.price * legacyMult();
        if (k === 'meth' && hasTech('blue_meth')) m *= 1.3;
        if (hasTech('prod_master')) m *= 1.25;
        return m;
    },
    heat() {
        let m = Core.B.heat;
        if (hasTech('sec_1')) m *= 0.9;
        if (hasTech('stealth_ai')) m *= 0.8;
        if (State.contacts.police) m *= 0.5;
        if (State.luxuries.tiger > 0) m *= 0.95;
        if (State.shadow.fiscal) m *= 0.5;
        m *= 1 - 0.15 * Core.HR.eff('Relacionista');
        return Math.max(0.05, m);
    },
    launderFee() {
        let m = 1 - Core.B.launder;
        if (hasTech('stealth_cash')) m *= 0.8;
        m *= 1 - 0.2 * Core.HR.eff('Contador');
        m *= Math.max(0.5, 1 - State.luxuries.tiger * 0.05);
        if (State.heat > State.heatCap * 0.5) m *= 1.6; // con mucha búsqueda, lavar cuesta más
        return Math.max(0.1, m);
    },
    routeSpeed() {
        let m = Core.B.speed;
        if (State.shadow.transport) m *= 1.5;
        if (hasTech('stealth_ai')) m *= 1.2;
        m *= 1 + State.luxuries.lambo * 0.05;
        m *= 1 + State.stocks.tran.owned * 0.01;
        m *= 1 + 0.05 * Core.HR.levelOf('Logístico');
        if (State.weatherCurrent === 1 || State.weatherCurrent === 2) m *= 0.75;
        return m;
    },
    seizure() {
        let m = 1;
        if (hasTech('ghost_log')) m *= 0.8;
        if (hasTech('stealth_drones')) m *= 0.75;
        if (State.contacts.customs) m *= 0.85;
        if (State.weatherCurrent === 3) m *= 0.8; // la niebla ayuda
        return m;
    },
    attack() {
        let m = 1;
        if (State.shadow.kremlin_pact) m *= 1.5;
        if (hasTech('war_1')) m *= 1.2;
        if (hasTech('war_4')) m *= 1.4;
        m *= 1 + 0.15 * Core.HR.eff('Comandante');
        return m;
    },
    defense() {
        let m = Core.B.defense;
        if (hasTech('war_2')) m *= 1.25;
        if (hasTech('war_4')) m *= 1.4;
        m *= 1 + 0.15 * Core.HR.eff('Comandante');
        return m;
    },
    vehicleCap(type) {
        const v = Config.vehicles[type];
        return v.cap > 0 ? v.cap + Core.B.cap : 0;
    }
};

/* ---------- PRODUCCIÓN ---------- */
Core.Ops = {
    progress: { weed: 0, meth: 0, coke: 0, heroin: 0, fenta: 0, mobile: 0 },

    speed(k) { return (0.5 + State.ops[k] * 0.1) * Core.Mods.prod(k) * (State.labs[k] || 1); },
    rate(k) { return this.speed(k) / 10; }, // kg por segundo
    chemCost(k) {
        let c = Config.products[k].chems;
        if (!c || Core.B.chems) return 0;
        if (Core.HR.eff('Químico') > 0) c = Math.ceil(c / 2);
        return c;
    },
    upgradeCost(k) { return Math.floor(State.ops[k] * 1500 * Config.products[k].mult * Math.pow(1.08, State.ops[k])); },
    labCost(k) { const base = Config.products[k].unlock || 2000; return Math.floor(base * Math.pow(1.8, State.labs[k])); },

    render() {
        const grid = $('ops-grid');
        let html = '';
        Config.productKeys.forEach(k => {
            const p = Config.products[k];
            const unlocked = State.ops[k] > 0;
            const cc = this.chemCost(k);
            html += `
            <div class="op-card ${unlocked ? '' : 'locked'}">
                <h3>${p.name.toUpperCase()} <span class="chip">$${fmt(p.basePrice)}/kg</span></h3>
                <div class="status-row"><span>${unlocked ? 'NIVEL ' + State.ops[k] : 'BLOQUEADO'}</span><span class="gold">${unlocked ? 'Labs: ' + State.labs[k] : ''}</span></div>
                ${unlocked ? `<div class="status-row"><span>${this.rate(k).toFixed(2)} kg/s</span><span>${cc ? cc + ' L químicos/kg' : 'Sin químicos'}</span></div>` : ''}
                <div class="progress-line"><div class="progress-active" id="prog-${k}"></div></div>
                ${unlocked ? `
                <div class="btn-row">
                    <button class="action-btn" onclick="Core.Ops.upgrade('${k}')">MEJORAR $${fmt(this.upgradeCost(k))}</button>
                    <button class="action-btn btn-green" onclick="Core.Ops.buyLab('${k}')">+LAB $${fmt(this.labCost(k))}</button>
                </div>
                <label class="toggle-wrapper"><input type="checkbox" class="toggle-input" ${State.opsStatus[k] ? 'checked' : ''} onchange="Core.Ops.toggle('${k}')"> ACTIVO</label>`
                    : `<button class="action-btn btn-locked" onclick="Core.Ops.unlock('${k}')">DESBLOQUEAR $${fmt(p.unlock)} SUCIO</button>`}
            </div>`;
        });
        html += `
            <div class="op-card ${State.ops.mobile ? '' : 'locked'}" style="border-color:#444;">
                <h3>LABORATORIO MÓVIL</h3>
                <p class="tiny muted">Produce Coca lento y la protege por completo en las redadas.</p>
                <div class="progress-line"><div class="progress-active" id="prog-mobile"></div></div>
                <button class="action-btn ${State.ops.mobile ? '' : 'btn-locked'}" onclick="Core.Ops.unlockMobile()" ${State.ops.mobile ? 'disabled' : ''}>${State.ops.mobile ? 'OPERANDO' : 'COMPRAR UNIDAD ($50K LIMPIO)'}</button>
            </div>`;
        grid.innerHTML = html;
        $('auto-chem-toggle').checked = !!State.autoChem;
    },
    toggle(k) { State.opsStatus[k] = !State.opsStatus[k]; },
    toggleAutoChem() { State.autoChem = !State.autoChem; UI.notify(State.autoChem ? 'Auto-importación activada (compra 100 L cuando bajas de 1,000).' : 'Auto-importación desactivada.'); },

    tick() {
        if (Core.Game.isFrozen()) return;
        Config.productKeys.forEach(k => {
            if (!(State.ops[k] > 0 && State.opsStatus[k])) return;
            const cost = this.chemCost(k);
            if (!(cost > 0 && State.inv.chems < cost)) this.progress[k] += this.speed(k);
            while (this.progress[k] >= 100) {
                if (cost > 0) {
                    if (State.inv.chems < cost) { this.progress[k] = 99; break; }
                    State.inv.chems -= cost;
                }
                State.inv[k]++;
                this.progress[k] -= 100;
            }
            const bar = $(`prog-${k}`);
            if (bar) bar.style.width = Math.min(100, this.progress[k]) + '%';
        });
        if (State.ops.mobile && State.opsStatus.mobile) {
            this.progress.mobile += 0.3 * legacyMult();
            if (this.progress.mobile >= 100 && State.inv.chems >= 2) { State.inv.chems -= 2; State.inv.coke++; this.progress.mobile = 0; }
            const bar = $('prog-mobile'); if (bar) bar.style.width = Math.min(100, this.progress.mobile) + '%';
        }
        if (State.autoChem && State.ticks % 10 === 0 && State.inv.chems < 1000 && State.money.clean >= 3000) this.buyChems(100, true);
    },
    buyChems(amount, silent) {
        let cost = amount * 30;
        if (amount === 1000) cost = 28000;
        if (amount === 10000) cost = 250000;
        cost *= Math.max(0.7, 1 - State.stocks.chem.owned * 0.0005);
        cost = Math.floor(cost);
        if (State.money.clean >= cost) {
            State.money.clean -= cost;
            State.inv.chems += amount;
            if (!silent) Sfx.coin();
        } else if (!silent) { UI.notify('Falta dinero limpio', 'bad'); Sfx.error(); }
    },
    upgrade(k) {
        const cost = this.upgradeCost(k);
        if (!Core.pay('dirty', cost)) return;
        State.ops[k]++;
        Sfx.levelup();
        this.render();
    },
    buyLab(k) {
        const cost = this.labCost(k);
        if (!Core.pay('dirty', cost)) return;
        State.labs[k]++;
        Sfx.coin();
        this.render();
    },
    unlock(k) {
        if (!Core.pay('dirty', Config.products[k].unlock)) return;
        State.ops[k] = 1; State.labs[k] = 1;
        Sfx.levelup();
        UI.notify(`¡${Config.products[k].name} desbloqueada!`);
        this.render();
        Core.Logistics.updateUI();
    },
    unlockMobile() {
        if (!Core.pay('clean', 50000)) return;
        State.ops.mobile = true;
        this.render();
    }
};

/* Cobra dinero; si no alcanza, avisa. Devuelve true/false */
Core.pay = function (currency, amount, silent) {
    if (State.money[currency] >= amount) { State.money[currency] -= amount; return true; }
    if (!silent) { UI.notify(`Falta dinero ${currency === 'dirty' ? 'sucio' : 'limpio'} ($${fmt(amount - State.money[currency])})`, 'bad'); Sfx.error(); }
    return false;
};

/* ---------- MERCADO (con saturación) ---------- */
Core.Market = {
    // Precio por kg de un producto en una ruta, con todos los bonus
    price(k, dist = 2) {
        const r = Config.routes[dist];
        let p = Config.products[k].basePrice * State.market[k] / (1 + State.sat[k]) * Core.Mods.price(k) * r.mult;
        if (dist === 5 && k === 'fenta') p *= 3;
        if (dist === 6 && k === 'heroin') p *= 3;
        return Math.floor(p);
    },
    sell(k, amount) {
        State.sat[k] += amount / 400;
        if (State.sat[k] > 1.5 && Math.random() < 0.3) Core.News.add(`Se desploma el precio de la ${Config.products[k].name.toLowerCase()} en las calles por exceso de oferta`);
    },
    fluctuate() {
        Config.productKeys.forEach(k => {
            State.market[k] = clamp(State.market[k] + (Math.random() * 0.2 - 0.1), 0.5, 2.0);
            State.sat[k] *= 0.98; // tarda varios minutos en recuperarse
            if (State.sat[k] < 0.001) State.sat[k] = 0;
        });
        Object.keys(State.stocks).forEach(k => {
            const base = Config.stocks.find(s => s.id === k).basePrice;
            // camina al azar con ligera atracción hacia su precio base
            let p = State.stocks[k].price * (0.955 + Math.random() * 0.1) + (base - State.stocks[k].price) * 0.01;
            State.stocks[k].price = Math.max(10, p);
        });
        if (isVisible('finance')) Core.Finance.renderStocks();
        if (isVisible('logistics')) this.render();
    },
    render() {
        let html = '';
        Config.productKeys.forEach(k => {
            const unlocked = State.ops[k] > 0;
            const m = State.market[k];
            const color = m >= 1.05 ? '#8f8' : (m < 0.95 ? '#f66' : '#888');
            const satPct = Math.min(100, Math.round(State.sat[k] / (1 + State.sat[k]) * 100));
            html += `<div class="ticker" style="opacity:${unlocked ? 1 : 0.4}">
                <div class="row-between"><span>${Config.products[k].name}</span><span style="color:${color}">$${fmt(this.price(k, 2))}/kg ${m >= 1.05 ? '▲' : m < 0.95 ? '▼' : '■'}</span></div>
                <div class="row-between tiny"><span>Saturación ${satPct}%</span><span>Tendencia x${m.toFixed(2)}</span></div>
                <div class="sat-bar"><div style="width:${satPct}%"></div></div></div>`;
        });
        setHTML('market-ticker', html);
    }
};

/* ---------- FINANZAS ---------- */
Core.Finance = {
    renderAll() { this.renderLoan(); this.renderStocks(true); this.renderLaundering(); },

    renderStocks(force) {
        const d = $('stock-market-grid');
        if (!d) return;
        const active = document.activeElement;
        if (!force && active && active.id && active.id.startsWith('stock-amount-')) return;
        const typed = {};
        Config.stocks.forEach(s => { const el = $('stock-amount-' + s.id); if (el) typed[s.id] = el.value; });
        d.innerHTML = Config.stocks.map(s => {
            const st = State.stocks[s.id];
            const color = st.price > s.basePrice ? '#8f8' : (st.price < s.basePrice ? '#f66' : '#fff');
            return `<div class="op-card">
                <h3>${s.symbol} <span style="color:${color}; float:right; font-family:var(--font-data);">$${fmt(st.price)}</span></h3>
                <div class="tiny muted">${s.name} · ${s.desc}</div>
                <div class="tiny" style="margin:6px 0;">Tienes ${fmt(st.owned)} · Valor $${fmt(st.owned * st.price)}</div>
                <input type="number" id="stock-amount-${s.id}" value="${typed[s.id] || 10}" min="1">
                <div class="btn-row">
                    <button class="action-btn btn-green" onclick="Core.Finance.tradeStock('${s.id}', true)">COMPRAR</button>
                    <button class="action-btn btn-red" onclick="Core.Finance.tradeStock('${s.id}', false)">VENDER</button>
                </div></div>`;
        }).join('');
    },
    tradeStock(id, buy) {
        const st = State.stocks[id];
        const amount = parseInt($('stock-amount-' + id).value) || 0;
        if (amount <= 0) return UI.notify('Cantidad inválida.', 'bad');
        const cost = Math.floor(st.price * amount);
        if (buy) {
            if (!Core.pay('clean', cost)) return;
            st.owned += amount;
            st.price *= 1 + Math.min(0.05, amount / 20000); // comprar mucho sube el precio
            UI.notify(`Compraste ${fmt(amount)} acciones de ${id.toUpperCase()}.`);
        } else {
            if (st.owned < amount) return UI.notify(`Solo tienes ${st.owned} acciones.`, 'bad');
            st.owned -= amount;
            State.money.clean += cost;
            st.price *= 1 - Math.min(0.05, amount / 20000);
            UI.notify(`Vendiste ${fmt(amount)} acciones por $${fmt(cost)}.`);
        }
        Sfx.coin();
        this.renderStocks(true);
    },

    renderLaundering() {
        const div = $('laundering-grid');
        const fee = Core.Mods.launderFee();
        div.innerHTML = Config.laundering.map(m => {
            const unlocked = State.launderingLevels.includes(m.id);
            const eff = 1 - (1 - m.rate) * fee;
            return `<div class="op-card ${unlocked ? '' : 'locked'}">
                <h3>${m.name}</h3>
                <p class="tiny muted">Recibes ${(eff * 100).toFixed(0)}% · Límite $${fmt(m.limit)} por operación</p>
                ${unlocked ? `<div class="btn-row"><input type="number" id="launder-${m.id}" placeholder="$" style="flex:2;">
                    <button class="action-btn auto-w" style="margin:0;" onclick="Core.Finance.launder('${m.id}')">LAVAR</button>
                    <button class="action-btn btn-green auto-w" style="margin:0;" onclick="Core.Finance.launder('${m.id}', true)">MÁX</button></div>`
                    : `<button class="action-btn btn-locked" onclick="Core.Finance.unlock('${m.id}')">DESBLOQUEAR $${fmt(m.unlock)} SUCIO</button>`}
            </div>`;
        }).join('');
    },
    unlock(id) {
        const m = Config.laundering.find(x => x.id === id);
        if (!Core.pay('dirty', m.unlock)) return;
        State.launderingLevels.push(id);
        this.renderLaundering();
    },
    launder(id, max) {
        const m = Config.laundering.find(x => x.id === id);
        const inp = $('launder-' + id);
        let val = max ? Math.min(m.limit, Math.floor(State.money.dirty)) : parseInt(inp.value);
        if (!(val > 0)) return UI.notify('Escribe un monto.', 'bad');
        if (val > m.limit) return UI.notify('El monto excede el límite.', 'bad');
        if (val > State.money.dirty) return UI.notify('No tienes tanto dinero sucio.', 'bad');
        if (val > m.limit * 0.5) Core.Heat.add(4);
        const fee = (1 - m.rate) * Core.Mods.launderFee();
        const got = Math.floor(val * (1 - fee));
        State.money.dirty -= val;
        State.money.clean += got;
        State.stats.laundered += got;
        inp.value = '';
        Sfx.cash();
    },

    passiveIncome() {
        if (State.ticks % 30 === 0) {
            let income = 0;
            Config.investments.forEach(i => income += (State.investments[i.id] || 0) * i.income);
            State.money.clean += income;
            this.perSec = income / 3 + (State.shadow.presidencia ? 10000 : 0);
            if (State.money.offshore > 0) {
                if (State.heat > State.heatCap * 0.75 && Math.random() < 0.01) {
                    const loss = Math.floor(State.money.offshore * 0.2);
                    State.money.offshore -= loss;
                    UI.notify('¡Fondos offshore congelados! Perdiste 20%.', 'bad');
                    Core.News.add('Congelan cuentas en paraíso fiscal ligadas a empresario sinaloense', 'bad');
                } else State.money.offshore += Math.floor(State.money.offshore * 0.0005);
            }
        }
        if (State.shadow.presidencia) State.money.clean += 1000; // $10K/s
    },
    deposit() {
        const val = parseInt($('inp-offshore').value);
        if (val > 0 && State.money.clean >= val) { State.money.clean -= val; State.money.offshore += val; $('inp-offshore').value = ''; Sfx.coin(); }
        else UI.notify('Monto inválido.', 'bad');
    },
    depositAll() {
        const val = Math.floor(State.money.clean);
        if (val <= 0) return;
        State.money.clean -= val; State.money.offshore += val; Sfx.coin();
    },
    withdraw() {
        const val = parseInt($('inp-offshore').value);
        if (val > 0 && State.money.offshore >= val) { State.money.offshore -= val; State.money.clean += val; $('inp-offshore').value = ''; Sfx.coin(); }
        else UI.notify('Monto inválido.', 'bad');
    },

    /* ----- PRÉSTAMOS: Don Usura ----- */
    creditLimit() { return Math.max(50000, Math.floor(State.respect * 0.25)); },
    borrow(frac) {
        const L = State.loan;
        const avail = this.creditLimit() - L.debt;
        if (L.anger > 0) return UI.notify('Don Usura no le presta a quien le debe.', 'bad');
        const amount = Math.floor(avail * frac);
        if (amount < 1000) return UI.notify('Ya llegaste a tu límite de crédito.', 'bad');
        if (L.debt === 0) L.dueAt = now() + 10 * 60000;
        L.debt += Math.floor(amount * 1.1); // 10% de comisión de apertura
        State.money.dirty += amount;
        Sfx.cash();
        UI.notify(`Don Usura te prestó $${fmt(amount)}. Tienes ${fmtTime((L.dueAt - now()) / 1000)} para pagar.`, 'event');
        this.renderLoan();
    },
    payLoan(frac) {
        const L = State.loan;
        if (L.debt <= 0) return;
        const amount = Math.min(Math.ceil(L.debt * frac), Math.floor(State.money.dirty));
        if (amount <= 0) return UI.notify('No tienes dinero sucio para pagar.', 'bad');
        State.money.dirty -= amount;
        L.debt -= amount;
        Sfx.coin();
        if (L.debt <= 1) {
            L.debt = 0; L.anger = 0; L.dueAt = 0;
            State.stats.loansPaid++;
            UI.notify('Deuda liquidada. Don Usura sonríe.', 'good');
        }
        this.renderLoan();
    },
    loanTick() {
        const L = State.loan;
        if (L.debt <= 0) return;
        L.debt *= 1.001; // ~2% por minuto
        if (now() < L.dueAt) return;
        L.anger += 1;
        if (now() - L.lastPenalty < 30000) return;
        L.lastPenalty = now();
        Sfx.alert();
        if (L.anger < 20) {
            UI.notify('Don Usura: "Se te acabó el plazo. No me hagas ir por ti."', 'bad');
            Core.Heat.add(5);
        } else if (L.anger < 40) {
            const lost = Math.ceil(State.army * 0.1);
            State.army -= lost;
            UI.notify(`Los cobradores de Don Usura mataron a ${lost} de tus sicarios.`, 'bad');
            Core.News.add('Aparecen cuerpos con mensaje: "Así pagan los que no pagan"', 'bad');
            Sfx.burst(3);
        } else if (L.anger < 60) {
            const v = State.fleet.find(x => !Core.Logistics.isBusy(x.uid));
            if (v) { v.hp = 0; UI.notify(`Don Usura quemó tu ${Config.vehicles[v.type].name} "${v.name}".`, 'bad'); Sfx.explosion(); }
        } else {
            const take = Math.min(Math.floor(State.money.dirty * 0.3), Math.floor(L.debt));
            State.money.dirty -= take; L.debt -= take;
            UI.notify(`Don Usura se cobró a la fuerza $${fmt(take)}.`, 'bad');
            if (L.debt <= 1) { L.debt = 0; L.anger = 0; L.dueAt = 0; }
        }
        if (isVisible('finance')) this.renderLoan();
    },
    renderLoan() {
        const L = State.loan;
        const left = (L.dueAt - now()) / 1000;
        const avail = Math.max(0, this.creditLimit() - L.debt);
        const anger = L.anger > 0 ? `<div class="red tiny">😠 ENOJO: ${Math.min(100, Math.floor(L.anger))}% — cada 30 s castiga más fuerte</div>` : '';
        setHTML('loan-card', `
            <h3 class="red">🦈 DON USURA, PRESTAMISTA</h3>
            <p class="tiny muted">Te presta dinero sucio al instante. 10% de comisión + ~2% de interés por minuto. Tienes 10 minutos para pagar... o te va a buscar.</p>
            <div class="row-between"><span>DEUDA</span><b class="${L.debt > 0 ? 'red' : 'green'}" style="font-family:var(--font-data); font-size:1.3rem;">$${fmt(L.debt)}</b></div>
            ${L.debt > 0 ? `<div class="row-between tiny"><span>Plazo</span><span class="${left < 60 ? 'red' : ''}">${left > 0 ? fmtTime(left) : 'VENCIDO'}</span></div>` : ''}
            ${anger}
            <div class="row-between tiny"><span>Crédito disponible</span><span>$${fmt(avail)}</span></div>
            <div class="btn-row">
                <button class="action-btn btn-red" onclick="Core.Finance.borrow(0.25)">PEDIR 25%</button>
                <button class="action-btn btn-red" onclick="Core.Finance.borrow(1)">PEDIR TODO</button>
            </div>
            <div class="btn-row">
                <button class="action-btn" onclick="Core.Finance.payLoan(0.25)" ${L.debt > 0 ? '' : 'disabled'}>PAGAR 25%</button>
                <button class="action-btn btn-green" onclick="Core.Finance.payLoan(1)" ${L.debt > 0 ? '' : 'disabled'}>LIQUIDAR</button>
            </div>`);
    }
};

/* ---------- NEGOCIOS FACHADA ---------- */
Core.Fronts = {
    capOf(f, lvl) { return f.cap * (1 + 0.5 * (lvl - 1)); },
    upgradeCost(f, lvl) { return Math.floor(f.cost * lvl * 1.5); },
    render() {
        const fee = Core.Mods.launderFee();
        $('fronts-grid').innerHTML = Config.fronts.map(f => {
            const s = State.fronts[f.id];
            if (!s) return `<div class="op-card locked">
                <h3>${f.icon} ${f.name}</h3>
                <p class="tiny muted">${f.desc}</p>
                <div class="status-row"><span>Lava $${fmt(f.cap / 3)}/s</span><span>Riesgo ${'⚠'.repeat(Math.ceil(f.risk / 0.005))}</span></div>
                <button class="action-btn btn-green" onclick="Core.Fronts.buy('${f.id}')">ABRIR NEGOCIO $${fmt(f.cost)} SUCIO</button></div>`;
            const closed = s.closedUntil > now();
            const cap = this.capOf(f, s.level);
            const eff = 1 - (1 - f.rate) * fee;
            return `<div class="op-card ${closed ? '' : 'glow'}" style="${closed ? 'border-color:#7a2020;' : ''}">
                <h3>${f.icon} ${f.name} <span class="chip gold">NV ${s.level}</span></h3>
                <p class="tiny muted">${f.desc}</p>
                <div class="status-row"><span>Lava $${fmt(cap / 3)}/s</span><span>Recibes ${(eff * 100).toFixed(0)}%</span></div>
                <div class="status-row"><span>Total lavado: $${fmt(s.total || 0)}</span><span>Auditorías: ${s.audits || 0}</span></div>
                ${closed ? `<div class="red tiny">🚫 CLAUSURADO por Hacienda · reabre en ${fmtTime((s.closedUntil - now()) / 1000)}</div>` : ''}
                <label class="toggle-wrapper"><input type="checkbox" class="toggle-input" ${s.active ? 'checked' : ''} onchange="Core.Fronts.toggle('${f.id}')"> LAVANDO</label>
                ${s.level < 5 ? `<button class="action-btn" onclick="Core.Fronts.upgrade('${f.id}')">AMPLIAR A NV ${s.level + 1} · $${fmt(this.upgradeCost(f, s.level))} SUCIO</button>` : '<div class="tiny gold" style="margin-top:6px;">NIVEL MÁXIMO</div>'}
            </div>`;
        }).join('');
    },
    buy(id) {
        const f = Config.fronts.find(x => x.id === id);
        if (!Core.pay('dirty', f.cost)) return;
        State.fronts[id] = { level: 1, active: true, closedUntil: 0, total: 0, audits: 0 };
        Sfx.cash();
        Core.News.add(`Abre sus puertas "${f.name}"; vecinos celebran la nueva inversión`);
        this.render();
    },
    upgrade(id) {
        const f = Config.fronts.find(x => x.id === id), s = State.fronts[id];
        if (!s || s.level >= 5) return;
        if (!Core.pay('dirty', this.upgradeCost(f, s.level))) return;
        s.level++;
        Sfx.levelup();
        this.render();
    },
    toggle(id) { const s = State.fronts[id]; if (s) s.active = !s.active; },
    tick() {
        const fee = Core.Mods.launderFee();
        Config.fronts.forEach(f => {
            const s = State.fronts[f.id];
            if (!s || !s.active || s.closedUntil > now() || State.money.dirty < 1) return;
            const amt = Math.min(Math.floor(State.money.dirty), this.capOf(f, s.level));
            const got = Math.floor(amt * (1 - (1 - f.rate) * fee));
            State.money.dirty -= amt;
            State.money.clean += got;
            State.stats.laundered += got;
            s.total = (s.total || 0) + got;
            let risk = f.risk * (1 + State.heat / 50) * (1 + 0.2 * (s.level - 1));
            if (hasTech('stealth_cash')) risk *= 0.7;
            if (Math.random() < risk) {
                s.closedUntil = now() + 120000;
                s.audits = (s.audits || 0) + 1;
                Core.Heat.add(8);
                UI.notify(`Hacienda clausuró ${f.name} por 2 minutos.`, 'bad');
                Core.News.add(`Clausuran "${f.name}" por irregularidades fiscales`, 'bad');
                Sfx.siren();
            }
        });
    }
};

/* ---------- LUJOS, PROPIEDADES Y CASINO ---------- */
Core.Lifestyle = {
    render() {
        $('properties-grid').innerHTML = Config.investments.map(i => `
            <div class="op-card">
                <h3>${i.icon} ${i.name}</h3>
                <div class="status-row"><span>+$${fmt(i.income / 3)}/s limpio</span><span class="gold">Tienes ${State.investments[i.id] || 0}</span></div>
                ${i.desc ? `<p class="tiny muted">${i.desc}</p>` : ''}
                <button class="action-btn btn-green" onclick="Core.Lifestyle.buyProperty('${i.id}')">COMPRAR $${fmt(i.cost)} LIMPIO</button>
            </div>`).join('');
        $('luxury-grid').innerHTML = Config.luxuries.map(l => `
            <div class="op-card">
                <h3>${l.icon} ${l.name}</h3>
                <div class="status-row"><span>${l.desc} (acumulable)</span><span class="gold">x${State.luxuries[l.id]}</span></div>
                <button class="action-btn btn-purple" onclick="Core.Lifestyle.buyLuxury('${l.id}')">COMPRAR $${fmt(l.cost)} LIMPIO</button>
            </div>`).join('');
        const cp = $('casino-panel');
        if (State.investments.casino > 0) {
            if (!$('bet-amount')) cp.innerHTML = `
                <h3>🎰 RULETA VIP</h3>
                <div class="casino-wheel" id="wheel">🎡</div>
                <p class="tiny muted center">Rojo o negro paga x2 (47%). Verde paga x14 (6%).</p>
                <input type="number" id="bet-amount" placeholder="Apuesta en limpio...">
                <div class="btn-row">
                    <button class="action-btn btn-red" onclick="Core.Lifestyle.gamble('red')">🔴 ROJO</button>
                    <button class="action-btn" onclick="Core.Lifestyle.gamble('black')">⚫ NEGRO</button>
                    <button class="action-btn btn-green" onclick="Core.Lifestyle.gamble('green')">🟢 VERDE</button>
                </div>`;
        } else cp.innerHTML = '<p class="muted">Compra el Casino Golden Cage para jugar a la ruleta.</p>';
    },
    buyProperty(id) {
        const p = Config.investments.find(i => i.id === id);
        if (!Core.pay('clean', p.cost)) return;
        State.investments[id]++;
        Sfx.cash();
        UI.notify(`${p.name} comprado.`);
        if (id === 'island') Core.News.add('Misterioso comprador adquiere isla privada en el Caribe');
        this.render();
    },
    buyLuxury(id) {
        const l = Config.luxuries.find(i => i.id === id);
        if (!Core.pay('clean', l.cost)) return;
        State.luxuries[id]++;
        if (id === 'ak47') State.armyPower += 0.1;
        Sfx.cash();
        this.render();
    },
    gamble(color) {
        const bet = parseInt($('bet-amount').value);
        if (!bet || bet <= 0 || bet > State.money.clean) return UI.notify('Apuesta inválida.', 'bad');
        State.money.clean -= bet;
        const w = $('wheel');
        const r = Math.random();
        const result = r < 0.06 ? 'green' : r < 0.53 ? 'red' : 'black';
        const icon = { red: '🔴', black: '⚫', green: '🟢' };
        let spins = 0;
        const iv = setInterval(() => {
            w.textContent = pick(['🔴', '⚫', '🔴', '⚫', '🟢']);
            if (++spins > 10) {
                clearInterval(iv);
                w.textContent = icon[result];
                if (result === color) {
                    const win = bet * (color === 'green' ? 14 : 2);
                    State.money.clean += win;
                    UI.notify(`¡GANASTE $${fmt(win)}!`); Sfx.cash();
                } else { UI.notify('La casa gana.', 'bad'); Sfx.error(); }
            }
        }, 80);
    }
};

/* ---------- I + D (árbol de 3 ramas) ---------- */
Core.RnD = {
    state(t) {
        if (hasTech(t.id)) return 'bought';
        if (t.req && !hasTech(t.req)) return 'locked';
        return 'available';
    },
    render() {
        setText('tech-count', `${State.techs.length} / ${Config.techs.length}`);
        $('tech-tree').innerHTML = Config.techBranches.map(b => `
            <div class="tech-branch"><h4>${b.icon} ${b.name}</h4>
            ${Config.techs.filter(t => t.branch === b.id).map(t => {
            const st = this.state(t);
            return `<div class="tech-node ${st}">
                    <b>${t.name}</b>
                    <div class="td">${t.desc}</div>
                    ${st === 'bought' ? '<span class="green tiny">✔ INVESTIGADO</span>'
                    : st === 'locked' ? `<span class="tiny muted">🔒 Requiere ${Config.techs.find(x => x.id === t.req).name}</span>`
                        : `<button class="action-btn btn-gold" onclick="Core.RnD.buy('${t.id}')">INVESTIGAR $${fmt(t.cost)} LIMPIO</button>`}
                </div>`;
        }).join('')}</div>`).join('');
    },
    buy(id) {
        const t = Config.techs.find(x => x.id === id);
        if (!t || this.state(t) !== 'available') return;
        if (!Core.pay('clean', t.cost)) return;
        State.techs.push(id);
        Sfx.levelup();
        UI.notify(`Investigación completa: ${t.name}`);
        if (id === 'subs_1') Core.Assets.renderStore();
        this.render();
    }
};

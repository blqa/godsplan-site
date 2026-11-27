/* =========================================================
   Logística (envíos, decomisos, automatización) y Flota
   ========================================================= */
Core.Logistics = {
    isBusy(uid) { return State.routes.some(r => r.vUid === uid); },
    usable(v) { return Config.vehicles[v.type].cap > 0 && !this.isBusy(v.uid) && v.hp >= 20; },
    routeOpen(d) {
        const r = Config.routes[d];
        if (r.req && !State.shadow[r.req]) return false;
        if (r.rank && State.rank < r.rank) return false;
        return true;
    },
    seizureChance(d) {
        let c = Config.routes[d].risk / 100 * 0.25 * (0.5 + State.heat / State.heatCap) * Core.Mods.seizure();
        if (d === 4 && State.shadow.lobby_us) c *= 0.25;
        return clamp(c, 0, 0.6);
    },

    updateUI() {
        const selP = $('sel-prod'), selV = $('sel-veh'), selD = $('sel-dist');
        const autoP = $('auto-prod'), autoV = $('auto-veh'), autoD = $('auto-dist');
        const prev = [selP.value, selV.value, selD.value, autoP.value, autoV.value, autoD.value];

        const prodOpts = Config.productKeys.filter(k => State.ops[k] > 0 || State.inv[k] > 0)
            .map(k => `<option value="${k}">${Config.products[k].name} (${fmt(State.inv[k])} kg)</option>`).join('');
        selP.innerHTML = prodOpts; autoP.innerHTML = prodOpts;

        const counts = {}, total = {};
        State.fleet.forEach(v => {
            if (Config.vehicles[v.type].cap <= 0) return;
            total[v.type] = (total[v.type] || 0) + 1;
            if (this.usable(v)) counts[v.type] = (counts[v.type] || 0) + 1;
        });
        selV.innerHTML = Object.keys(counts).map(t => { const c = Config.vehicles[t]; return `<option value="${t}">${c.icon} ${c.name} · ${counts[t]} libres · ${Core.Mods.vehicleCap(t)} kg</option>`; }).join('')
            || '<option value="">Sin vehículos libres</option>';
        autoV.innerHTML = Object.keys(total).map(t => `<option value="${t}">${Config.vehicles[t].icon} ${Config.vehicles[t].name}</option>`).join('');

        const routeOpts = Object.keys(Config.routes).map(d => {
            const r = Config.routes[d], open = this.routeOpen(+d);
            return `<option value="${d}" ${open ? '' : 'disabled'}>${r.name} · x${r.mult} valor${open ? '' : ' 🔒'}</option>`;
        }).join('');
        selD.innerHTML = routeOpts; autoD.innerHTML = routeOpts;

        const keep = (sel, val) => { if (val && [...sel.options].some(o => o.value == val && !o.disabled)) sel.value = val; };
        [selP, selV, selD, autoP, autoV, autoD].forEach((s, i) => keep(s, prev[i]));
        if (!prev[2]) selD.value = '2';

        $('auto-logistics-panel').classList.toggle('hidden', Core.HR.eff('Logístico') <= 0);
        $('auto-smart-toggle').checked = !!State.automation.smart;
        $('auto-inputs').classList.toggle('hidden', !!State.automation.smart);
        this.updateAutoStatus();
        this.calc();
    },
    // reset = true cuando cambias producto/vehículo: la carga se llena al máximo
    calc(reset) {
        const k = $('sel-prod').value, t = $('sel-veh').value, d = +$('sel-dist').value || 2;
        const rng = $('rng-load');
        if (!k || t === '') { rng.max = 0; setText('lbl-load', 0); setText('dispatch-preview', '—'); return; }
        const max = Math.min(Core.Mods.vehicleCap(+t), State.inv[k]);
        rng.max = max;
        if (reset || +rng.value > max || +rng.value === 0) rng.value = max;
        const amount = +rng.value;
        setText('lbl-load', amount);
        setText('dispatch-preview', `≈ $${fmt(amount * Core.Market.price(k, d))} · decomiso ${(this.seizureChance(d) * 100).toFixed(1)}%`);
    },
    dispatch() {
        if (Core.Game.isFrozen()) return UI.notify('Operaciones congeladas por el Plan de Escape.', 'bad');
        const k = $('sel-prod').value, t = +$('sel-veh').value, d = +$('sel-dist').value;
        const amount = +$('rng-load').value;
        if (!k || isNaN(t) || amount <= 0) return UI.notify('Elige producto, vehículo y carga.', 'bad');
        if (!this.routeOpen(d)) return UI.notify('Esa ruta aún está bloqueada.', 'bad');
        const v = State.fleet.find(x => x.type === t && this.usable(x));
        if (!v) return UI.notify('No hay vehículos libres de ese tipo.', 'bad');
        if (this.execute(v, k, amount, d)) { Sfx.engine(); this.updateUI(); }
    },
    mapPoints(d) {
        const owned = State.territories.filter(t => t.owner === 'player');
        const from = Config.territories[pick(owned).id];
        let to;
        if (d === 1) {
            const nb = Core.War.neighbors(from.id);
            to = Config.territories[pick(nb)];
        } else if (d === 2) to = pick(Config.territories.filter(t => t.id !== from.id));
        else if (d === 3) to = { x: 60 + Math.random() * 360, y: -15 };
        else if (d === 4) to = { x: 300, y: -30 };
        else if (d === 5) to = { x: 650, y: 170 };
        else to = { x: -50, y: 300 };
        return { fx: from.x, fy: from.y, tx: to.x, ty: to.y };
    },
    execute(v, k, amount, d) {
        if (State.inv[k] < amount || amount <= 0) return false;
        const r = Config.routes[d];
        const price = Core.Market.price(k, d);
        State.inv[k] -= amount;
        Core.Market.sell(k, amount);

        const vet = Core.Assets.vetBonus(v);
        const speed = Config.vehicles[v.type].speed * Core.Mods.routeSpeed() * r.speed * (1 + vet);

        let heat = r.risk * Math.min(1, 0.3 + amount / 200);
        if (hasTech('ghost_log')) heat *= 0.8;
        if (State.contacts.customs) heat *= 0.85;
        if (d === 4 && State.shadow.lobby_us) heat *= 0.25;
        heat *= Math.max(0.7, 1 - State.stocks.safe.owned * 0.005);

        State.routes.push(Object.assign({
            id: now() + Math.floor(Math.random() * 1000), vUid: v.uid, type: v.type, name: v.name,
            prod: k, amount, val: amount * price, progress: 0, speed, dist: d
        }, this.mapPoints(d)));
        Core.Heat.add(heat);
        this.renderLog();
        return true;
    },
    tick() {
        let finished = false;
        for (let i = State.routes.length - 1; i >= 0; i--) {
            const r = State.routes[i];
            r.progress += r.speed * 0.2;
            if (r.progress < 100) continue;
            State.routes.splice(i, 1);
            finished = true;
            const v = State.fleet.find(x => x.uid === r.vUid);
            const place = pick(Config.territories).name;
            if (Math.random() < this.seizureChance(r.dist)) {
                // DECOMISO
                State.stats.seizures++;
                Core.Heat.add(10);
                Sfx.siren();
                Core.News.add(`Decomisan ${fmt(r.amount)} kg de ${Config.products[r.prod].name.toLowerCase()} en ${place}`, 'bad', r.amount >= 200);
                if (v) {
                    if (v.insured) {
                        v.hp = 30;
                        const payout = Math.floor(Config.vehicles[v.type].price * 0.5);
                        State.money.clean += payout;
                        UI.notify(`¡Decomiso! Perdiste la carga de "${v.name}". El seguro recuperó el vehículo y pagó $${fmt(payout)}.`, 'bad');
                    } else if (v.type === 0) {
                        v.hp = 20;
                        UI.notify(`¡Decomiso! Detuvieron a tu mula "${v.name}" con ${r.amount} kg.`, 'bad');
                    } else {
                        State.fleet = State.fleet.filter(x => x.uid !== v.uid);
                        UI.notify(`¡Decomiso! Perdiste ${r.amount} kg y tu ${Config.vehicles[v.type].name} "${v.name}" (sin seguro).`, 'bad');
                    }
                }
                continue;
            }
            State.money.dirty += r.val;
            State.stats.dirtyEarned += r.val;
            State.stats.kgSold += r.amount;
            State.stats.shipments++;
            if (v) {
                v.hp = Math.max(0, v.hp - 10);
                const before = Math.floor(v.km / 5000);
                v.km += Config.routes[r.dist].km;
                if (Math.floor(v.km / 5000) > before && v.km >= 5000) UI.notify(`"${v.name}" ahora es veterano: ${fmt(v.km)} km (+${Math.round(Core.Assets.vetBonus(v) * 100)}% vel.)`, 'event');
            }
            Sfx.cash();
            if (r.val >= 500000 && Math.random() < 0.5) Core.News.add(`Autoridades investigan red que movió "toneladas" por ${Config.routes[r.dist].name.toLowerCase()}`);
        }
        if (finished && isVisible('logistics')) this.updateUI();
        if (State.ticks % 5 === 0 && isVisible('logistics')) this.renderLog();
    },
    renderLog() {
        setText('routes-count', State.routes.length ? `(${State.routes.length})` : '');
        setHTML('log-body', State.routes.slice(-40).reverse().map(r => `<tr>
            <td>${Config.vehicles[r.type].icon} ${r.name}</td><td>${fmt(r.amount)} kg ${Config.products[r.prod].name}</td>
            <td>${Config.routes[r.dist].name}</td><td class="gold">$${fmt(r.val)}</td>
            <td>${(this.seizureChance(r.dist) * 100).toFixed(1)}%</td><td>${Math.floor(r.progress)}%</td></tr>`).join('')
            || '<tr><td colspan="6" class="muted">Sin envíos activos.</td></tr>');
    },
    hijack() {
        if (!State.routes.length) return null;
        const i = Math.floor(Math.random() * State.routes.length);
        const r = State.routes.splice(i, 1)[0];
        const v = State.fleet.find(x => x.uid === r.vUid);
        if (v) v.hp = Math.max(0, v.hp - 50);
        return r;
    },

    /* ----- Automatización ----- */
    toggleAuto() {
        const A = State.automation;
        A.active = !A.active;
        if (A.active) {
            A.prod = $('auto-prod').value || 'weed';
            A.dist = +$('auto-dist').value || 1;
            A.veh = +$('auto-veh').value || 0;
            A.min = parseInt($('auto-min-load').value) || 1;
            A.smart = $('auto-smart-toggle').checked;
            UI.notify('Logístico: automatización iniciada.');
        }
        this.updateAutoStatus();
    },
    updateAutoUI() {
        State.automation.smart = $('auto-smart-toggle').checked;
        $('auto-inputs').classList.toggle('hidden', State.automation.smart);
    },
    updateAutoStatus() {
        const A = State.automation;
        setText('btn-auto-toggle', A.active ? 'DESACTIVAR' : 'ACTIVAR AUTOMATIZACIÓN');
        const st = $('auto-status');
        if (st) { st.textContent = A.active ? (A.smart ? 'Estado: envío inteligente activo' : 'Estado: buscando envíos...') : 'Estado: inactivo'; st.style.color = A.active ? 'var(--success)' : '#666'; }
    },
    autoRun() {
        const A = State.automation;
        if (!A.active || Core.Game.isFrozen() || State.ticks % 10 !== 0) return;
        if (Core.HR.eff('Logístico') <= 0) { A.active = false; this.updateAutoStatus(); return; }
        let free = State.fleet.filter(v => this.usable(v)).sort((a, b) => Config.vehicles[b.type].cap - Config.vehicles[a.type].cap);
        if (A.smart) {
            const d = 3;
            for (const v of free) {
                const cap = Core.Mods.vehicleCap(v.type);
                // elige el producto que deja más dinero en este vehículo
                let best = null, bestVal = 0;
                Config.productKeys.forEach(k => {
                    const amt = Math.min(cap, State.inv[k]);
                    if (amt < A.min) return;
                    const val = amt * Core.Market.price(k, d);
                    if (val > bestVal) { bestVal = val; best = { k, amt }; }
                });
                if (!best) break;
                this.execute(v, best.k, best.amt, d);
            }
        } else {
            if (!this.routeOpen(A.dist)) return;
            free.filter(v => v.type === A.veh).forEach(v => {
                const amt = Math.min(Core.Mods.vehicleCap(v.type), State.inv[A.prod]);
                if (amt >= A.min) this.execute(v, A.prod, amt, A.dist);
            });
        }
    }
};

/* ---------- FLOTA ---------- */
Core.Assets = {
    vetBonus(v) { return Math.min(0.25, Math.floor(v.km / 5000) * 0.05); },
    repairCost(v) { return Math.floor(Math.max(200, Config.vehicles[v.type].price * 0.02) * (1 - 0.1 * Core.HR.levelOf('Mecánico'))); },
    premium(v) { return Math.floor(Math.max(100, Config.vehicles[v.type].price * 0.03)); },

    renderStore() {
        $('assets-grid').innerHTML = Config.vehicles.filter(v => v.id !== 0).map(v => {
            const lockedTech = v.reqTech && !hasTech(v.reqTech);
            const lockedMil = v.isMilitary && !State.shadow.kremlin_pact;
            const locked = lockedTech || lockedMil;
            return `<div class="op-card ${locked ? 'locked' : ''}">
                <h3>${v.icon} ${v.name}</h3>
                <div class="status-row"><span>${v.isMilitary ? (v.id === 6 ? 'Defensa +300' : 'Ataque +50') : `Cap ${v.cap} kg · Vel ${v.speed}`}</span><span class="gold">$${fmt(v.price)}</span></div>
                ${locked ? `<div class="tiny red">🔒 ${lockedTech ? 'Requiere Ingeniería Naval (I+D)' : 'Requiere Pacto Kremlin'}</div>`
                    : `<button class="action-btn" onclick="Core.Assets.buy(${v.id})">COMPRAR (SUCIO)</button>`}
            </div>`;
        }).join('');
        this.renderFleet();
    },
    buy(type) {
        const v = Config.vehicles[type];
        if ((v.reqTech && !hasTech(v.reqTech)) || (v.isMilitary && !State.shadow.kremlin_pact)) return;
        if (!Core.pay('dirty', v.price)) return;
        if (v.isMilitary) {
            State.military[type]++;
            State.militaryBought[type]++;
            UI.notify(`${v.name} añadido a la reserva militar.`);
        } else {
            const used = State.fleet.map(x => x.name);
            const name = pick(Config.vehicleNames.filter(n => !used.includes(n))) || `Unidad ${State.nextUid}`;
            State.fleet.push({ uid: State.nextUid++, type, name, hp: 100, km: 0, insured: false });
            UI.notify(`${v.icon} "${name}" se une a la flota.`);
        }
        Sfx.engine();
        this.renderFleet();
        Core.Logistics.updateUI();
    },
    renderFleet() {
        const prem = State.fleet.filter(v => v.insured).reduce((s, v) => s + this.premium(v), 0);
        setText('insurance-info', prem ? `Seguro: $${fmt(prem)} limpio/min` : '');
        $('auto-repair-panel').classList.toggle('hidden', Core.HR.eff('Mecánico') <= 0);
        setHTML('fleet-list', State.fleet.map(v => {
            const c = Config.vehicles[v.type];
            const busy = Core.Logistics.isBusy(v.uid);
            const color = v.hp > 50 ? '#8f8' : (v.hp >= 20 ? '#fc0' : '#f55');
            const stars = '★'.repeat(Math.floor(this.vetBonus(v) / 0.05));
            return `<div class="op-card" style="padding:12px;">
                <div class="row-between"><b class="white">${c.icon} ${v.name}</b><span class="gold" title="Veterano">${stars}</span></div>
                <div class="tiny muted">${c.name} · ${fmt(v.km)} km ${busy ? '· <span class="blue">EN RUTA</span>' : ''}</div>
                <div class="progress-line" style="margin:6px 0;"><div class="progress-active" style="width:${v.hp}%; background:${color}"></div></div>
                <div class="row-between tiny"><span style="color:${color}">HP ${v.hp}%</span>
                    <label class="toggle-wrapper" style="margin:0;"><input type="checkbox" class="toggle-input" ${v.insured ? 'checked' : ''} onchange="Core.Assets.toggleInsure(${v.uid})"> 🛡️ Seguro</label></div>
                <div class="btn-row">
                    ${v.hp < 100 && !busy ? `<button class="action-btn" style="margin:0;" onclick="Core.Assets.repair(${v.uid})">REPARAR $${fmt(this.repairCost(v))}</button>` : ''}
                    ${v.type !== 0 && !busy ? `<button class="action-btn btn-red" style="margin:0;" onclick="Core.Assets.sell(${v.uid})">VENDER</button>` : ''}
                </div>
            </div>`;
        }).join(''));
    },
    repair(uid, silent) {
        const v = State.fleet.find(x => x.uid === uid);
        if (!v || v.hp >= 100 || Core.Logistics.isBusy(uid)) return false;
        if (!Core.pay('clean', this.repairCost(v), silent)) return false;
        v.hp = 100;
        if (!silent) { Sfx.click(); this.renderFleet(); }
        return true;
    },
    repairAll() {
        let n = 0;
        State.fleet.forEach(v => { if (v.hp < 100 && this.repair(v.uid, true)) n++; });
        UI.notify(n ? `${n} vehículos reparados.` : 'Nada que reparar (o falta dinero limpio).', n ? 'good' : 'bad');
        this.renderFleet();
    },
    sell(uid) {
        const v = State.fleet.find(x => x.uid === uid);
        if (!v || v.type === 0 || Core.Logistics.isBusy(uid)) return;
        const val = Math.floor(Config.vehicles[v.type].price * 0.4 * v.hp / 100);
        State.fleet = State.fleet.filter(x => x.uid !== uid);
        State.money.dirty += val;
        UI.notify(`Vendiste "${v.name}" por $${fmt(val)}.`);
        this.renderFleet();
    },
    toggleInsure(uid) {
        const v = State.fleet.find(x => x.uid === uid);
        if (v) v.insured = !v.insured;
        this.renderFleet();
    },
    insureAll(on) { State.fleet.forEach(v => v.insured = on); UI.notify('Toda la flota está asegurada.'); this.renderFleet(); },
    insuranceTick() {
        State.fleet.forEach(v => {
            if (!v.insured) return;
            if (!Core.pay('clean', this.premium(v), true)) { v.insured = false; UI.notify(`Se canceló el seguro de "${v.name}" por falta de pago.`, 'bad'); }
        });
    },
    autoRepair() {
        if (Core.HR.eff('Mecánico') <= 0 || State.ticks % 10 !== 0) return;
        State.fleet.forEach(v => { if (v.hp < 80) this.repair(v.uid, true); });
    }
};

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
    // BALANCE v34: antes era ~2.5x más alto. Un desconocido (antes del cap. 3) casi no llama la atención.
    seizureChance(d) {
        let c = Config.routes[d].risk / 100 * 0.15 * (0.3 + State.heat / State.heatCap) * Core.Mods.seizure();
        if (Core.fame() < 3) c *= 0.4;
        if (d === 4 && State.shadow.lobby_us) c *= 0.25;
        return clamp(c, 0, 0.4);
    },
    // Avisos de entregas exitosas agrupados (para no llenar la pantalla)
    okBuf: { n: 0, kg: 0, val: 0 },
    flushOk() {
        const b = this.okBuf;
        if (!b.n) return;
        UI.notify(b.n === 1 ? `✅ Entrega exitosa: ${fmt(b.kg)} kg · +$${fmt(b.val)}` : `✅ ${b.n} entregas exitosas: ${fmt(b.kg)} kg · +$${fmt(b.val)}`);
        this.okBuf = { n: 0, kg: 0, val: 0 };
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
        [selP, selV, selD].forEach((s, i) => keep(s, prev[i]));
        if (!prev[2]) selD.value = '2';

        autoV.innerHTML = '<option value="-1">Cualquiera disponible</option>' + autoV.innerHTML;
        const A = State.automation;
        autoP.value = A.prod; autoD.value = String(A.dist); autoV.value = String(A.veh);
        if (!autoV.value) autoV.value = '-1';
        if (A.fill === undefined) A.fill = 0.5;
        if (A.reserve === undefined) A.reserve = true;
        $('auto-fill').value = String(A.fill);
        $('auto-reserve').checked = !!A.reserve;
        $('auto-smart-toggle').checked = !!A.smart;
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
        const risk = this.seizureChance(d) * 100;
        const hot = State.heat > State.heatCap * 0.5 ? ' ⚠️ búsqueda alta' : '';
        setHTML('dispatch-preview', `≈ $${fmt(amount * Core.Market.price(k, d))} · riesgo <span style="color:${risk < 2 ? '#8f8' : risk < 5 ? '#fc0' : '#f66'}">${risk.toFixed(1)}%</span>${hot}`);
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
    execute(v, k, amount, d) { return this.executeCargo(v, { [k]: amount }, d); },
    // Envía un vehículo con uno o varios productos (carga mixta)
    executeCargo(v, cargo, d) {
        const keys = Object.keys(cargo).filter(k => cargo[k] > 0);
        if (!keys.length || keys.some(k => State.inv[k] < cargo[k])) return false;
        const r = Config.routes[d];
        let val = 0, amount = 0, main = keys[0];
        keys.forEach(k => {
            val += cargo[k] * Core.Market.price(k, d);
            amount += cargo[k];
            if (cargo[k] > cargo[main]) main = k;
        });
        keys.forEach(k => { State.inv[k] -= cargo[k]; Core.Market.sell(k, cargo[k], d); });
        v.idleSince = null;

        const vet = Core.Assets.vetBonus(v);
        const speed = Config.vehicles[v.type].speed * Core.Mods.routeSpeed() * r.speed * (1 + vet);

        // BALANCE v34: antes una ruta larga daba +20 de búsqueda; ahora ~+6
        let heat = r.risk * 0.2 * Math.min(1, 0.3 + amount / 300);
        if (hasTech('ghost_log')) heat *= 0.8;
        if (State.contacts.customs) heat *= 0.85;
        if (d === 4 && State.shadow.lobby_us) heat *= 0.25;
        heat *= Math.max(0.7, 1 - State.stocks.safe.owned * 0.005);

        State.routes.push(Object.assign({
            id: now() + Math.floor(Math.random() * 1000), vUid: v.uid, type: v.type, name: v.name,
            prod: main, cargo, amount, val, progress: 0, speed, dist: d, vet
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
            if (v) v.idleSince = now();
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
            State.stats.delivered = (State.stats.delivered || 0) + 1;
            if (State.stats.delivered === this.AUTO_UNLOCK && this.autoTier() === 1) {
                Sfx.fanfare();
                UI.notify(`⚡ ¡${this.AUTO_UNLOCK} entregas! Desbloqueaste el AUTO-ENVÍO básico en Logística.`, 'event');
                UI.setBadge('logistics', '!');
            }
            this.okBuf.n++; this.okBuf.kg += r.amount; this.okBuf.val += r.val;
            State.stats.dirtyEarned += r.val;
            State.stats.kgSold += r.amount;
            State.stats.shipments++;
            if (v) {
                v.hp = Math.max(0, v.hp - 10);
                const before = Core.Assets.vetBonus(v);
                v.km += Config.routes[r.dist].km;
                if (Core.Assets.vetBonus(v) > before) UI.notify(`"${v.name}" ahora es veterano: ${fmt(v.km)} km (+${Math.round(Core.Assets.vetBonus(v) * 100)}% vel.)`, 'event');
            }
            Sfx.cash();
            if (r.val >= 500000 && Math.random() < 0.05) Core.News.add(`Autoridades investigan red que movió "toneladas" por ${Config.routes[r.dist].name.toLowerCase()}`);
        }
        if (State.ticks % 20 === 0) this.flushOk();
        if (finished && isVisible('logistics')) this.updateUI();
        if (State.ticks % 5 === 0 && isVisible('logistics')) this.renderLog();
    },
    renderLog() {
        const st = State.stats, ok = st.delivered || 0, lost = (st.seizures || 0) + (st.hijacked || 0);
        const pct = ok + lost ? Math.round(ok / (ok + lost) * 100) : 100;
        setText('routes-count', `${State.routes.length ? `(${State.routes.length} en ruta) · ` : ''}✅ ${fmt(ok)} entregados · 🚔 ${fmt(st.seizures || 0)} decomisados · 🔫 ${fmt(st.hijacked || 0)} asaltados · éxito ${pct}%`);
        setHTML('log-body', State.routes.slice(-40).reverse().map(r => `<tr>
            <td>${Config.vehicles[r.type].icon} ${r.name}${r.vet ? ` <span class="gold" title="Bono de veterano">★+${Math.round(r.vet * 100)}%</span>` : ''}</td><td>${fmt(r.amount)} kg ${r.cargo && Object.keys(r.cargo).length > 1 ? `mixta (${Object.keys(r.cargo).map(k => Config.products[k].name).join(', ')})` : Config.products[r.prod].name}</td>
            <td>${Config.routes[r.dist].name}</td><td class="gold">$${fmt(r.val)}</td>
            <td>${(this.seizureChance(r.dist) * 100).toFixed(1)}%</td><td>${Math.floor(r.progress)}%</td></tr>`).join('')
            || '<tr><td colspan="6" class="muted">Sin envíos activos.</td></tr>');
    },
    hijack() {
        const opts = State.routes.filter(r => r.dist >= 2); // las rutas cortas son locales y seguras
        if (!opts.length) return null;
        const r = pick(opts);
        State.routes.splice(State.routes.indexOf(r), 1);
        const v = State.fleet.find(x => x.uid === r.vUid);
        if (v) v.hp = Math.max(0, v.hp - 50);
        return r;
    },

    /* ----- Envío con toda la flota (un clic) ----- */
    dispatchAll() {
        if (Core.Game.isFrozen()) return UI.notify('Operaciones congeladas por el Plan de Escape.', 'bad');
        const k = $('sel-prod').value, d = +$('sel-dist').value;
        if (!k) return UI.notify('Elige un producto.', 'bad');
        if (!this.routeOpen(d)) return UI.notify('Esa ruta aún está bloqueada.', 'bad');
        let n = 0, kg = 0;
        State.fleet.filter(v => this.usable(v)).sort((a, b) => Config.vehicles[b.type].cap - Config.vehicles[a.type].cap).forEach(v => {
            const amt = Math.min(Core.Mods.vehicleCap(v.type), State.inv[k]);
            if (amt > 0 && this.execute(v, k, amt, d)) { n++; kg += amt; }
        });
        if (!n) return UI.notify('No hay vehículos libres o no tienes mercancía.', 'bad');
        Sfx.engine();
        UI.notify(`🚀 Salieron ${n} vehículos con ${fmt(kg)} kg de ${Config.products[k].name}.`);
        this.updateUI();
    },

    /* ----- Auto-envío -----
       Nivel 1 (básico): se desbloquea con 25 entregas exitosas. 1 vehículo cada 3 s, solo rutas corta/media.
       Nivel 2 (operador): con un Logístico asignado. Toda la flota libre cada segundo, todas las rutas y modo inteligente. */
    AUTO_UNLOCK: 25,
    autoTier() {
        if (Core.HR.eff('Logístico') > 0) return 2;
        if ((State.stats.delivered || 0) >= this.AUTO_UNLOCK) return 1;
        return 0;
    },
    // kg que se apartan para los encargos activos
    reserved(k) {
        if (!State.automation.reserve) return 0;
        return State.contracts.filter(c => c.prod === k).reduce((s, c) => s + c.qty, 0);
    },
    available(k) { return Math.max(0, State.inv[k] - this.reserved(k)); },
    readAuto() {
        const A = State.automation;
        A.prod = $('auto-prod').value || A.prod || 'weed';
        A.dist = +$('auto-dist').value || 1;
        A.veh = $('auto-veh').value === '' ? -1 : +$('auto-veh').value;
        A.fill = parseFloat($('auto-fill').value) || 0.5;
        A.reserve = $('auto-reserve').checked;
        A.smart = $('auto-smart-toggle').checked;
        this.updateAutoStatus();
    },
    toggleAuto() {
        const A = State.automation;
        if (!A.active && this.autoTier() === 0) { Sfx.error(); return UI.notify(`Necesitas ${this.AUTO_UNLOCK} entregas exitosas o contratar un operador de logística.`, 'bad'); }
        this.readAuto();
        A.active = !A.active;
        Sfx.click();
        UI.notify(A.active ? '⚡ Auto-envío encendido.' : 'Auto-envío apagado.');
        this.updateAutoStatus();
    },
    updateAutoStatus() {
        const A = State.automation, tier = this.autoTier();
        // En Modo Historia el panel aparece hasta el capítulo 3 o al ganarte el auto-envío
        $('auto-logistics-panel').classList.toggle('hidden', !(Core.Unlocks.isOpen('autosend') || tier > 0));
        const chip = $('auto-tier-chip');
        if (chip) {
            chip.textContent = ['BLOQUEADO', 'BÁSICO', 'OPERADOR'][tier];
            chip.className = 'chip ' + ['red', 'blue', 'gold'][tier];
        }
        const done = State.stats.delivered || 0;
        const op = Core.HR.best('Logístico');
        setHTML('auto-tier-info', [
            `🔒 Se desbloquea el auto-envío básico con <b>${this.AUTO_UNLOCK} entregas exitosas</b> (llevas ${done}/${this.AUTO_UNLOCK}). O contrata un operador y empieza ya.`,
            `Básico: manda <b>1 vehículo cada 3 s</b>, solo rutas corta y media. Con un operador manda toda la flota cada segundo, por cualquier ruta y elige lo más rentable.`,
            `Tu operador <b>${op ? op.name : ''}</b> manda <b>toda la flota libre cada segundo</b>, por cualquier ruta. Entre más nivel, más rápido viajan.`
        ][tier]);
        $('auto-controls').classList.toggle('hidden', tier === 0);
        const smartRow = $('auto-smart-toggle').closest('label');
        smartRow.classList.toggle('hidden', tier < 2);
        $('auto-inputs').classList.toggle('hidden', tier === 2 && A.smart);
        $('btn-hire-operator').classList.toggle('hidden', tier === 2);
        if (tier === 0 && A.active) A.active = false;
        setText('btn-auto-toggle', A.active ? '⏸ APAGAR AUTO-ENVÍO' : '▶ ACTIVAR AUTO-ENVÍO');
        $('btn-auto-toggle').className = 'action-btn ' + (A.active ? 'btn-red' : 'btn-green');
        const st = $('auto-status');
        if (st) {
            let txt = 'Estado: apagado';
            if (A.active) txt = `Estado: ENCENDIDO · ${tier === 2 && A.smart ? 'lo más rentable' : Config.products[A.prod].name} por ruta ${Config.routes[tier === 1 ? Math.min(A.dist, 2) : A.dist].name.toLowerCase()}`;
            st.textContent = txt; st.style.color = A.active ? 'var(--success)' : '#666';
        }
        setText('inv-auto', tier === 0 ? '🔒' : (A.active ? '⚡ ON' : 'OFF'));
        const res = Config.productKeys.filter(k => this.reserved(k) > 0).map(k => `${Config.products[k].name} ${fmt(Math.min(State.inv[k], this.reserved(k)))}/${fmt(this.reserved(k))} kg`);
        setText('auto-reserve-info', A.reserve && res.length ? `Apartando para encargos: ${res.join(' · ')}` : '');
    },
    autoRun() {
        const A = State.automation;
        if (!A.active || Core.Game.isFrozen()) return;
        const tier = this.autoTier();
        if (tier === 0) { A.active = false; this.updateAutoStatus(); return; }
        if (State.ticks % (tier === 2 ? 10 : 30) !== 0) return;
        const d = tier === 1 ? Math.min(A.dist, 2) : A.dist;
        if (!this.routeOpen(d)) return;
        const limit = tier === 1 ? 1 : Infinity;
        let sent = 0;
        // Primero los vehículos más grandes (menos viajes = menos riesgo). Si el grande todavía no se
        // llena pero tu producción lo llena en ~20 s, los demás lo esperan; si no, pasan los chicos.
        const free = State.fleet.filter(v => this.usable(v) && (A.veh < 0 || v.type === A.veh))
            .sort((a, b) => (Config.vehicles[b.type].cap - Config.vehicles[a.type].cap) || ((a.idleSince || 0) - (b.idleSince || 0)));
        const smart = tier === 2 && A.smart;
        const rate = (smart ? Config.productKeys : [A.prod]).reduce((s, k) => s + (State.ops[k] > 0 && State.opsStatus[k] ? Core.Ops.rate(k) : 0), 0);
        // precio por kg de cada producto, del más caro al más barato
        const order = Config.productKeys.slice().sort((a, b) => Core.Market.price(b, d) - Core.Market.price(a, d));
        for (const v of free) {
            if (sent >= limit) break;
            const cap = Core.Mods.vehicleCap(v.type);
            const need = Math.max(1, Math.ceil(cap * (A.fill || 0.5)));
            const cargo = {};
            let total = 0;
            if (smart) {
                // llena con lo más caro primero, mezclando productos
                for (const k of order) {
                    const amt = Math.min(cap - total, this.available(k));
                    if (amt > 0) { cargo[k] = amt; total += amt; }
                    if (total >= cap) break;
                }
            } else {
                const amt = Math.min(cap, this.available(A.prod));
                if (amt > 0) { cargo[A.prod] = amt; total = amt; }
            }
            if (total < need) {
                if (need - total <= rate * 20) break; // se llena pronto: los demás esperan
                continue;                              // tardaría mucho: que salgan los chicos
            }
            if (this.executeCargo(v, cargo, d)) sent++;
        }
        if (sent && isVisible('logistics')) this.updateUI();
    }
};

/* ---------- FLOTA ---------- */
Core.Assets = {
    vetBonus(v) { return Math.min(0.25, Math.floor(v.km / 5000) * 0.05); },
    repairCost(v) { return Math.floor(Math.max(200, Config.vehicles[v.type].price * 0.02) * Math.max(0.3, 1 - 0.1 * Core.HR.levelOf('Mecánico'))); },
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
                <div class="tiny" style="margin-top:3px;">${this.vetBonus(v) > 0 ? `<span class="gold">+${Math.round(this.vetBonus(v) * 100)}% velocidad</span>` : '<span class="muted">Sin bono aún</span>'}
                    <span class="muted">· ${this.vetBonus(v) >= 0.25 ? 'bono máximo' : `faltan ${fmt(5000 - v.km % 5000)} km para +${Math.round(this.vetBonus(v) * 100) + 5}%`}</span></div>
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

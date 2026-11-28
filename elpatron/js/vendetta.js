/* =========================================================
   AJUSTE DE CUENTAS: registro de agravios y represalias
   Cada agravio (convoy asaltado, pitazo, traición, Don Usura, familia,
   plaza perdida o saqueada) abre una cuenta pendiente con tiempo límite.
   Respondes con: Cacería, Golpe ejemplar, Ajuste silencioso o Dejarlo pasar.
   ========================================================= */
Config.vendetta = {
    MAX: 5,
    LIFE: [0, 300, 360, 420], // segundos para responder según gravedad (1-3)
    kinds: {
        convoy: { icon: '🚚', huntName: 'Cazar a los asaltantes' },
        pitazo: { icon: '📞', huntName: 'Cazar al soplón' },
        traicion: { icon: '🐍', huntName: 'Cazar al traidor' },
        usura: { icon: '💀', huntName: 'Cazar a los cobradores' },
        familia: { icon: '👨‍👩‍👧', huntName: 'Rescatar / cazar a los responsables' },
        compadre: { icon: '🤝', huntName: 'Ir por el compadre' },
        plaza: { icon: '🏴', huntName: 'Cazar al comandante enemigo' },
        saqueo: { icon: '🔥', huntName: 'Cazar a los saqueadores' }
    }
};

Core.Vendetta = {
    list() { return State.vendettas; },
    on() { return Core.Unlocks.isOpen('cuentas'); },
    base() { return Math.round(60000 * (1 + 0.5 * Core.War.weight()) * dynMult()); },
    culpritName(v) {
        if (v.rid && Config.rivals[v.rid]) return (State.rivals[v.rid] && State.rivals[v.rid].defeated ? 'los restos de ' : '') + Config.rivals[v.rid].name;
        return v.who || 'desconocidos';
    },

    /* ---------- registrar un agravio ---------- */
    add(o) {
        if (!this.on()) return;
        const L = this.list();
        // el mismo culpable por lo mismo: se suma a la cuenta abierta
        const same = L.find(v => v.kind === o.kind && v.rid === o.rid && v.who === o.who);
        const sev = clamp(o.sev || 1, 1, 3);
        if (same) {
            same.loot += o.loot || 0; same.sev = Math.max(same.sev, sev);
            same.expires = State.stats.playTime + Config.vendetta.LIFE[same.sev];
            return;
        }
        const v = { id: (State.vendettaSeq = (State.vendettaSeq || 0) + 1), kind: o.kind, rid: o.rid || null, who: o.who || null, ltRole: o.ltRole || null,
            title: o.title, desc: o.desc || '', loot: Math.floor(o.loot || 0), sev, member: o.member || null,
            created: State.stats.playTime, expires: State.stats.playTime + Config.vendetta.LIFE[sev] };
        L.push(v);
        while (this.list().length > Config.vendetta.MAX) this.expire(this.list()[0], true);
        UI.notify(`🩸 Cuenta pendiente: ${v.title}. Tienes ${fmtTime(Config.vendetta.LIFE[sev])} para responder (AJUSTE DE CUENTAS).`, 'bad');
        UI.setBadge('cuentas', String(L.length));
        if (UI.current === 'cuentas') this.render();
    },

    /* ---------- costos y probabilidades ---------- */
    huntForce() { return { sic: State.army, eli: State.elite }; },
    huntDiff(v) {
        const R = v.rid && State.rivals[v.rid];
        return Math.round(120 * v.sev * (1 + 0.4 * Core.War.weight()) * dynMult() * (R && !R.defeated ? Core.War.allyMult() : 0.7));
    },
    huntChance(v) {
        const f = this.huntForce();
        if (f.sic + f.eli < 10) return 0;
        return Core.War.chance(Core.War.power(f.sic, f.eli), this.huntDiff(v));
    },
    brutalCost(v) { return this.base() * v.sev; },
    silentCost(v) {
        let c = this.base() * v.sev * 2.5;
        if (State.shadow.fiscal) c *= 0.7;
        if (State.contacts.lawyer) c *= 0.85;
        return Math.round(c);
    },

    /* ---------- efectos ---------- */
    hitRival(v, pct) {
        const R = v.rid && State.rivals[v.rid];
        if (R && !R.defeated) R.power = Math.max(30, Math.round(R.power * (1 - pct)));
    },
    loyalty(n) { State.lieutenants.forEach(l => l.loyalty = clamp(l.loyalty + n, 0, 100)); },
    recover(v, pct) {
        const amt = Math.floor(v.loot * pct);
        if (amt > 0) State.money.dirty += amt;
        if (v.kind === 'usura' && State.loan.debt > 0) { State.loan.debt *= 0.7; State.loan.anger = 0; State.loan.lastPenalty = now(); }
        return amt;
    },
    close(v, outcome) {
        State.vendettas = State.vendettas.filter(x => x.id !== v.id);
        State.vendettaLog = [{ title: v.title, outcome, t: State.stats.playTime }].concat(State.vendettaLog || []).slice(0, 8);
        State.stats.vendettas = (State.stats.vendettas || 0) + 1;
        UI.setBadge('cuentas', State.vendettas.length ? String(State.vendettas.length) : null);
        Core.HR.render(); Core.Logistics.updateUI();
        this.render();
    },
    done(title, txt) {
        setTimeout(() => UI.modal(title, txt, [{ text: 'CONTINUAR', style: 'btn-gold', cb: () => { } }]), 30);
    },

    respond(id, mode) {
        const v = this.list().find(x => x.id === id);
        if (!v) return;
        const K = Config.vendetta.kinds[v.kind], name = this.culpritName(v), A = Core.Me.alias(), F = State.family;
        if (mode === 'hunt') {
            const f = this.huntForce(), ch = this.huntChance(v);
            if (f.sic + f.eli < 10) return UI.notify('Necesitas al menos 10 hombres libres en la reserva. Usa REAGRUPAR en Guerra.', 'bad');
            const ok = Math.random() < ch;
            const sicLost = Math.floor(f.sic * (ok ? 0.03 + Math.random() * 0.05 : 0.12 + Math.random() * 0.1));
            let eliLost = 0; for (let i = 0; i < f.eli; i++) if (Math.random() < (ok ? 0.01 : 0.06)) eliLost++;
            State.army -= sicLost; State.elite -= eliLost;
            Core.Heat.add(8 * v.sev);
            const bajas = `Bajas: ${sicLost} sicarios${eliLost ? ` y ${eliLost} de élite` : ''}.`;
            if (ok) {
                const got = this.recover(v, v.kind === 'traicion' ? 1 : 0.5);
                this.hitRival(v, 0.12);
                this.loyalty(v.kind === 'traicion' ? 10 : 5);
                if (v.kind === 'familia') { F.happy = Math.min(100, F.happy + 20); if (State.me) State.me.honor += 1; }
                Sfx.burst(5);
                Core.News.add(v.kind === 'traicion' ? `Capturan a "${v.who}", exintegrante de ${Core.Me.cartel()}; nadie lo vuelve a ver` : `Comando de ${Core.Me.cartel()} da con los responsables: ${name}`, 'bad', true);
                this.done('🎯 CACERÍA EXITOSA', `${K.huntName}: lo lograste.\n${got ? `Recuperaste $${fmt(got)} sucios.\n` : ''}${v.rid ? `${name} pierde 12% de poder.\n` : ''}${v.kind === 'familia' ? 'Tu familia está orgullosa (+20) y el pueblo te admira (+1 honor).\n' : ''}${bajas}`);
                this.close(v, '🎯 Cacería exitosa');
            } else {
                this.loyalty(-5);
                Sfx.error();
                Core.News.add(`Fracasa operativo de venganza de ${A}: ${name} escapa`, 'bad');
                this.done('💨 SE TE ESCAPARON', `${name} se enteró y huyó a tiempo. Tu gente regresó con las manos vacías.\nTus tenientes dudan de ti (−5 lealtad).\n${bajas}`);
                this.close(v, '💨 Cacería fallida');
            }
        } else if (mode === 'brutal') {
            if (!Core.pay('dirty', this.brutalCost(v))) return;
            this.hitRival(v, 0.25);
            const got = this.recover(v, 0.3);
            this.loyalty(15);
            Core.Heat.add(18 * v.sev);
            if (State.me) State.me.honor -= 1;
            Sfx.explosion();
            Core.News.add(pick([`Narcomensaje de ${A}: "Así terminan los que se meten conmigo"`, `Escena dantesca: ${name} recibe un mensaje de ${A}`, `Terror en las calles: ${Core.Me.cartel()} cobra venganza a la vista de todos`]), 'bad', true);
            this.done('🩸 GOLPE EJEMPLAR', `Todo el país supo lo que les pasa a los que se meten con ${A}.\n${v.rid ? `${name} pierde 25% de poder.\n` : ''}${got ? `Recuperaste $${fmt(got)}.\n` : ''}Tus tenientes te temen: +15 lealtad.\nLa policía también lo vio: +${18 * v.sev} búsqueda. (−1 honor)`);
            this.close(v, '🩸 Golpe ejemplar');
        } else if (mode === 'silent') {
            if (!Core.pay('clean', this.silentCost(v))) return;
            this.hitRival(v, 0.12);
            const got = this.recover(v, 0.25);
            this.loyalty(5);
            Sfx.coin();
            Core.News.add(pick([`Muere en extraño accidente un hombre ligado a ${name}`, `Hallan sin vida a un contador de ${name}; autoridades descartan violencia`, `Desaparece sin dejar rastro un operador de ${name}`]));
            this.done('🤫 AJUSTE SILENCIOSO', `Un profesional se encargó. Nadie vio nada, nadie sabe nada.\n${v.rid ? `${name} pierde 12% de poder.\n` : ''}${got ? `Recuperaste $${fmt(got)}.\n` : ''}Sin búsqueda extra. +5 lealtad.`);
            this.close(v, '🤫 Ajuste silencioso');
        } else {
            this.weak(v, 1);
            this.done('🏳️ LO DEJASTE PASAR', `No hiciste nada. En la calle ya se dice que ${A} se ablandó.\nTus tenientes −8 lealtad · tu familia −10 · ${v.rid ? `${name} se envalentona (+5% poder).` : ''}`);
            this.close(v, '🏳️ Lo dejó pasar');
        }
    },
    // mostrar debilidad
    weak(v, f) {
        this.loyalty(-8 * f);
        State.family.happy = Math.max(0, State.family.happy - 10 * f);
        const R = v.rid && State.rivals[v.rid];
        if (R && !R.defeated) R.power = Math.round(R.power * (1 + 0.05 * f));
        Core.News.add(`En la calle se dice que ${Core.Me.alias()} se tragó la afrenta de ${this.culpritName(v)}`);
    },
    expire(v, silent) {
        this.weak(v, 0.5);
        if (!silent) UI.notify(`🧊 Se enfrió la cuenta "${v.title}". No respondiste y tu gente lo notó.`, 'bad');
        this.close(v, '🧊 Se enfrió');
    },

    /* ---------- cada 3 segundos ---------- */
    tick() {
        this.list().slice().forEach(v => { if (v.expires <= State.stats.playTime) this.expire(v); });
        if (UI.current === 'cuentas') this.render();
    },

    /* ---------- pantalla ---------- */
    render() {
        const wrap = $('cuentas-wrap');
        if (!wrap) return;
        const L = this.list(), f = this.huntForce();
        let h = `<p class="muted tiny" style="margin-bottom:10px;">Cuando alguien te hace daño se abre una cuenta. Respóndela antes de que se enfríe o tu gente pensará que eres débil.
            Para cazar usas tu reserva libre (${fmt(f.sic)} sicarios + ${fmt(f.eli)} élite): si está vacía, usa REAGRUPAR o RESERVA DE ATAQUE en Guerra.</p>`;
        if (!L.length) h += `<div class="op-card"><h3>🕊️ NADIE TE DEBE NADA</h3><p class="muted">Por ahora. En este negocio eso nunca dura.</p></div>`;
        h += '<div class="grid-cards">' + L.map(v => {
            const K = Config.vendetta.kinds[v.kind], left = v.expires - State.stats.playTime, ch = this.huntChance(v);
            const col = ch >= 0.7 ? 'green' : ch >= 0.4 ? 'gold' : 'red';
            return `<div class="op-card" style="border-color:${v.sev >= 3 ? '#f55' : v.sev === 2 ? '#fc0' : '#555'}">
                <h3>${K.icon} ${v.title.toUpperCase()}</h3>
                <p class="tiny muted">${v.desc}</p>
                <div class="status-row tiny"><span>Culpable</span><span>${this.culpritName(v)}</span></div>
                <div class="status-row tiny"><span>Gravedad</span><span>${'🩸'.repeat(v.sev)}</span></div>
                ${v.loot ? `<div class="status-row tiny"><span>Te quitaron</span><span>$${fmt(v.loot)}</span></div>` : ''}
                <div class="status-row tiny"><span>Se enfría en</span><span class="${left < 60 ? 'red' : ''}">${fmtTime(left)}</span></div>
                <button class="action-btn btn-green" onclick="Core.Vendetta.respond(${v.id},'hunt')" ${f.sic + f.eli < 10 ? 'disabled' : ''}>🎯 ${K.huntName.toUpperCase()} · <span class="${col}">${Math.round(ch * 100)}%</span></button>
                <button class="action-btn btn-red" onclick="Core.Vendetta.respond(${v.id},'brutal')">🩸 GOLPE EJEMPLAR · $${fmt(this.brutalCost(v))} SUCIO · +${18 * v.sev} búsqueda</button>
                <button class="action-btn btn-purple" onclick="Core.Vendetta.respond(${v.id},'silent')">🤫 AJUSTE SILENCIOSO · $${fmt(this.silentCost(v))} LIMPIO</button>
                <button class="action-btn" onclick="Core.Vendetta.respond(${v.id},'pass')">🏳️ DEJARLO PASAR (−lealtad, −familia)</button>
            </div>`;
        }).join('') + '</div>';
        const log = State.vendettaLog || [];
        if (log.length) h += `<div class="section-title sub">CUENTAS CERRADAS</div><div class="op-card"><ul class="tiny">${log.map(x => `<li>${x.title} — ${x.outcome}</li>`).join('')}</ul></div>`;
        wrap.innerHTML = h;
    }
};

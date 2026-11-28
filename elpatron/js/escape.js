/* =========================================================
   PLAN DE ESCAPE: misiones del final y la cacería del FBI
   Se activa cuando ya no queda ningún cártel en México.
   - 5 misiones (una a la vez) que toman tiempo y dinero; son requisito para retirarte
   - Cacería del FBI (0-100): sube con el tiempo y con tu fortuna offshore
   ========================================================= */
Config.escape = {
    missions: [
        { id: 'familia', icon: '👨‍👩‍👧', name: 'Sacar a tu familia', cur: 'clean', cost: 15000000, secs: 120, desc: 'Pasaportes falsos, un jet privado y una casa en Uruguay. Ellos primero.' },
        { id: 'expediente', icon: '🗂️', name: 'Borrar tu expediente', cur: 'clean', cost: 40000000, secs: 180, fbi: -30, desc: 'Hackers y un archivista comprado desaparecen tu historial. Con el Fiscal General tarda la mitad. −30 cacería.' },
        { id: 'identidad', icon: '🎭', name: 'Nueva identidad', cur: 'clean', cost: 30000000, secs: 150, fbi: -20, req: 'expediente', desc: 'Cirujano plástico en Suiza y un nombre nuevo. Necesita el expediente borrado. −20 cacería.' },
        { id: 'isla', icon: '🏝️', name: 'Comprar una isla', cur: 'clean', cost: 80000000, secs: 240, desc: 'Una isla sin tratado de extradición, con pista de aterrizaje y búnker.' },
        { id: 'salida', icon: '🛩️', name: 'Ruta de salida', cur: 'clean', cost: 50000000, secs: 180, req: 'isla', desc: 'Pilotos, un submarino de reserva y tres rutas falsas para despistar. Necesita la isla.' }
    ]
};

Core.Escape = {
    E() { return State.escape; },
    active() { return Core.Rivals.alive().length === 0; },
    m(id) { return this.E().missions[id] || (this.E().missions[id] = { state: 'idle', left: 0 }); },
    doneCount() { return Config.escape.missions.filter(x => this.m(x.id).state === 'done').length; },
    allDone() { return this.doneCount() >= Config.escape.missions.length; },
    running() { return Config.escape.missions.find(x => this.m(x.id).state === 'running'); },
    secs(x) { return x.id === 'expediente' && State.shadow.fiscal ? x.secs / 2 : x.secs; },
    fbiGain() {
        let g = 0.06 + Math.min(0.12, State.money.offshore / 1e9 * 0.12);
        if (State.shadow.lobby_us) g *= 0.75;
        if (State.shadow.presidencia) g *= 0.8;
        if (State.aguila.done) g *= 0.5;
        return g;
    },

    /* ---------- Cada 3 segundos ---------- */
    tick() {
        if (!this.active()) return;
        const E = this.E();
        if (!E.started) {
            E.started = true;
            Core.News.add('El FBI abre una investigación especial: "Operación Patrón"', 'bad', true);
            UI.modal('🕵️ EL FBI TE ESTÁ CAZANDO', 'Ya no queda nadie en México que te haga sombra... y por eso ahora te buscan los gringos.\n\nPara retirarte necesitas, además del dinero, completar tu PLAN DE ESCAPE: 5 misiones en RETIRO.\n\nMientras tanto el FBI va a allanar tus negocios, embargar cuentas, meterte topos y mandar fuerzas de tarea. Si su cacería llega a 100, te encuentran.', [{ text: 'QUE LO INTENTEN', style: 'btn-red', cb: () => { } }]);
            UI.setBadge('ending', '!');
        }
        // misión en curso
        const r = this.running();
        if (r) {
            const s = this.m(r.id);
            s.left -= 3;
            if (s.left <= 0) {
                s.state = 'done';
                if (r.fbi) E.fbi = Math.max(0, E.fbi + r.fbi);
                Sfx.levelup();
                UI.notify(`${r.icon} Misión completa: ${r.name}.`);
                Core.News.add(`Rumores: "El Patrón" prepara su desaparición`);
                UI.setBadge('ending', '!');
                if (this.allDone()) UI.notify('✈️ PLAN DE ESCAPE LISTO. Cuando tengas el dinero, desaparece.');
            }
        }
        if (this.allDone() && State.money.offshore >= WIN_TARGET) return this.refresh();
        // la cacería
        E.fbi = clamp(E.fbi + this.fbiGain(), 0, 100);
        if (E.fbi >= 80 && !E.alerted) { E.alerted = true; UI.notify('🕵️ El FBI está cerca (cacería 80+). Soborna agentes o termina tus misiones.', 'bad'); }
        if (E.fbi < 60) E.alerted = false;
        if (E.fbi >= 100) return this.found();
        if (E.nextOp <= State.stats.playTime && E.fbi > 15 && Math.random() < E.fbi / 100 * 0.05) {
            E.nextOp = State.stats.playTime + 75;
            this.operation();
        }
        this.refresh();
    },
    refresh() { if (UI.current === 'ending') Core.Legacy.render(); },

    operation() {
        const E = this.E(), ops = ['raid', 'seize', 'force', 'force'];
        if (State.lieutenants.length && $('event-modal').classList.contains('hidden')) ops.push('mole');
        if (this.running()) ops.push('intercept');
        const op = pick(ops);
        if (op === 'raid') {
            const open = Config.fronts.filter(f => State.fronts[f.id] && State.fronts[f.id].closedUntil < now());
            if (!open.length) return this.operation2();
            const f = pick(open);
            State.fronts[f.id].closedUntil = now() + 300000;
            UI.notify(`🕵️ El FBI y Hacienda allanaron ${f.name}: cerrado 5 minutos.`, 'bad');
            Core.News.add(`Agentes federales catean "${f.name}"`, 'bad');
        } else if (op === 'seize') {
            const pct = Math.max(0.02, 0.05 - 0.01 * (State.aguila.def.abogados || 0));
            const amt = Math.floor(State.money.offshore * pct);
            if (amt < 1e5) return this.operation2();
            State.money.offshore -= amt;
            UI.notify(`🏦 Embargo del FBI: te quitaron $${fmt(amt)} de la cuenta offshore.`, 'bad');
            Core.News.add('FBI embarga cuentas en el Caribe ligadas al narcotráfico', 'bad', true);
            Sfx.error();
        } else if (op === 'force') this.operation2();
        else if (op === 'mole') {
            const l = pick(State.lieutenants);
            Sfx.alert();
            UI.modal('🐀 HAY UN TOPO', `Tus halcones grabaron a ${l.name} (${l.role}) reuniéndose con un agente del FBI en un Sanborns.\n\nSi lo interrogas, se acaba la fuga de información... y pierdes a tu teniente. Si lo dejas, el FBI sabrá más de ti.`, [
                { text: 'INTERROGARLO (−10 cacería)', style: 'btn-red', cb: () => {
                    State.lieutenants = State.lieutenants.filter(x => x.id !== l.id);
                    E.fbi = Math.max(0, E.fbi - 10);
                    Core.News.add(`Encuentran sin vida a un presunto informante en Sinaloa`, 'bad');
                    Core.HR.render(); Core.Logistics.updateUI();
                } },
                { text: 'DEJARLO (+15 cacería)', cb: () => { E.fbi = Math.min(100, E.fbi + 15); } }
            ]);
        } else {
            const r = this.running(), s = this.m(r.id);
            s.left = this.secs(r);
            UI.notify(`🚔 El FBI interceptó a tu gente en "${r.name}". La misión vuelve a empezar.`, 'bad');
            Sfx.error();
        }
        UI.setBadge('ending', '!');
    },
    // fuerza de tarea: ataca una plaza tuya (se defiende como los remanentes)
    operation2() {
        const mine = Core.War.owned().filter(t => t.id !== Config.baseId && !State.incoming.some(i => i.target === t.id));
        const rid = Object.keys(State.rivals)[0];
        if (!mine.length) return;
        const t = pick(mine);
        const power = Math.max(500, Math.floor(Core.War.defenseOf(t.id) * (0.6 + Math.random() * 0.8)));
        const time = 25 + (hasTech('war_3') ? 15 : 0);
        State.incoming.push({ id: now() + Math.random(), rid, target: t.id, power, left: time, total: time, remnant: true, fbi: true });
        Sfx.alert();
        UI.setBadge('war', '!');
        UI.renderAttackAlert();
    },

    // La cacería llegó a 100
    found() {
        const E = this.E();
        const amt = Math.floor(State.money.offshore * Math.max(0.05, 0.1 - 0.015 * (State.aguila.def.abogados || 0)));
        State.money.offshore -= amt;
        const r = this.running();
        if (r) { const s = this.m(r.id); s.state = 'idle'; s.left = 0; }
        Config.fronts.forEach(f => { if (State.fronts[f.id]) State.fronts[f.id].closedUntil = now() + 180000; });
        E.fbi = 40;
        Sfx.explosion();
        Core.News.add('FBI ESTUVO A MINUTOS DE CAPTURAR A "EL PATRÓN"', 'bad', true);
        UI.modal('🚁 TE ENCONTRARON', `Helicópteros sobre tu casa de seguridad. Escapaste por el túnel de la cocina con lo puesto.\n\n• Te embargaron $${fmt(amt)} del offshore.\n• Todas tus fachadas cerradas 3 minutos.${r ? `\n• La misión "${r.name}" se perdió (y lo que pagaste).` : ''}\n\nLa cacería baja a 40. La próxima vez no vas a tener tanta suerte.`, [{ text: 'A ESCONDERSE', style: 'btn-red', cb: () => { } }]);
        this.refresh();
    },

    /* ---------- Acciones ---------- */
    start(id) {
        const x = Config.escape.missions.find(m => m.id === id), s = this.m(id);
        if (!this.active() || s.state !== 'idle') return;
        if (this.running()) return UI.notify('Ya tienes una misión en curso.', 'bad');
        if (x.req && this.m(x.req).state !== 'done') return UI.notify('Primero termina la misión anterior.', 'bad');
        if (!Core.pay(x.cur, x.cost)) return;
        s.state = 'running'; s.left = this.secs(x);
        Sfx.click();
        UI.notify(`${x.icon} Empezó la misión: ${x.name}.`);
        this.refresh();
    },
    bribeCost() { return Math.floor(5000000 * (1 + 0.5 * (this.E().bribes || 0))); },
    bribe() {
        const E = this.E();
        if (!Core.pay('clean', this.bribeCost())) return;
        E.bribes = (E.bribes || 0) + 1;
        E.fbi = Math.max(0, E.fbi - 20);
        Sfx.coin();
        UI.notify('💵 Un agente del FBI "perdió" unas pruebas. −20 cacería.');
        this.refresh();
    },

    /* ---------- Pantalla (dentro de RETIRO) ---------- */
    html() {
        if (!this.active()) return `<div class="op-card locked"><h3>✈️ PLAN DE ESCAPE</h3><p class="muted">Cuando no quede ningún cártel en México, el FBI empezará a cazarte y tendrás que preparar tu escape: 5 misiones que son requisito para retirarte.</p></div>`;
        const E = this.E(), col = E.fbi >= 80 ? '#f55' : E.fbi >= 50 ? '#fc0' : '#8f8';
        const r = this.running();
        let h = `<div class="op-card" style="border-color:${col};">
            <h3>🕵️ CACERÍA DEL FBI</h3>
            <div class="status-row"><span>Qué tan cerca están</span><span style="color:${col}">${Math.floor(E.fbi)} / 100</span></div>
            <div class="progress-line" style="height:10px;"><div class="progress-active" style="width:${E.fbi}%; background:${col};"></div></div>
            <p class="tiny muted" style="margin:6px 0;">Sube ${(this.fbiGain() * 20).toFixed(1)}/min (más entre más dinero tengas offshore). A 100 te encuentran: embargo, fachadas cerradas y pierdes la misión en curso.</p>
            <button class="action-btn btn-purple" onclick="Core.Escape.bribe()">💵 SOBORNAR A UN AGENTE (−20) · $${fmt(this.bribeCost())} LIMPIO</button>
        </div>
        <div class="section-title sub">✈️ MISIONES DEL PLAN DE ESCAPE · ${this.doneCount()}/${Config.escape.missions.length}</div>
        <div class="grid-cards">` + Config.escape.missions.map(x => {
            const s = this.m(x.id), locked = x.req && this.m(x.req).state !== 'done';
            let foot;
            if (s.state === 'done') foot = '<div class="green">✔ COMPLETADA</div>';
            else if (s.state === 'running') foot = `<div class="tiny gold">EN CURSO · ${fmtTime(s.left)}</div><div class="progress-line" style="height:6px;"><div class="progress-active" style="width:${100 - s.left / this.secs(x) * 100}%"></div></div>`;
            else if (locked) foot = `<div class="tiny muted">🔒 Requiere: ${Config.escape.missions.find(m => m.id === x.req).name}</div>`;
            else foot = `<button class="action-btn btn-gold" onclick="Core.Escape.start('${x.id}')" ${r ? 'disabled' : ''}>${r ? 'OTRA MISIÓN EN CURSO' : `INICIAR · $${fmt(x.cost)} ${x.cur === 'clean' ? 'LIMPIO' : 'SUCIO'} · ${fmtTime(this.secs(x))}`}</button>`;
            return `<div class="op-card ${s.state === 'done' ? 'glow' : ''}"><h3>${x.icon} ${x.name.toUpperCase()}</h3><p class="tiny muted">${x.desc}</p>${foot}</div>`;
        }).join('') + '</div>';
        return h;
    }
};

/* =========================================================
   FAMILIA Y VIDA PERSONAL
   - Mamá: visitarla baja tu búsqueda
   - Pareja: tres opciones, cada una con un bono distinto
   - Hijos: suman Legado al retirarte
   - Compadre: un aliado poderoso... que puede traicionarte
   - Felicidad familiar: si baja mucho, pierdes los bonos (y a tu pareja)
   - Eventos: secuestros, cumpleaños, traiciones
   ========================================================= */
Config.family = {
    spouses: [
        { id: 'lucia', name: 'Lucía', who: 'reina de belleza de Sinaloa', icon: '👸', bonus: 'price', text: '+10% precio de venta (la fama vende)' },
        { id: 'valeria', name: 'Valeria', who: 'abogada fiscalista', icon: '👩‍⚖️', bonus: 'fee', text: '−20% comisión de lavado' },
        { id: 'carmen', name: 'Carmen', who: 'hija de un general', icon: '🎖️', bonus: 'heat', text: '−20% búsqueda ganada' }
    ],
    compadres: [
        { id: 'gober', name: 'El Gobernador', icon: '🏛️', text: '−15% búsqueda ganada', bonus: 'heat' },
        { id: 'federal', name: 'El Comandante de la Federal', icon: '🚓', text: '−25% decomisos en tus envíos', bonus: 'seizure' },
        { id: 'cura', name: 'El Padre Toño', icon: '⛪', text: 'Tus tenientes pierden lealtad 30% más lento (+1 honor)', bonus: 'loyalty' }
    ],
    kidNames: ['Junior', 'Valentina', 'Emiliano', 'Ximena', 'Santiago', 'Camila', 'Mateo', 'Regina'],
    MAX_KIDS: 3, KID_LEGACY: 3
};

Core.Family = {
    F() { return State.family; },
    base() { return Math.max(50000, Math.floor((State.money.clean + State.money.offshore * 0.1) * 0.03)); }, // los gastos crecen con tu fortuna
    spouse() { const F = this.F(); return F.spouse ? Config.family.spouses.find(s => s.id === F.spouse) : null; },
    compadre() { const F = this.F(); return F.compadre ? Config.family.compadres.find(s => s.id === F.compadre) : null; },
    happyOk() { return this.F().happy >= 30; },
    // modificadores para el resto del juego
    mod(kind) {
        const s = this.spouse(), c = this.compadre();
        let m = 1;
        if (s && this.happyOk()) {
            if (kind === 'price' && s.bonus === 'price') m *= 1.1;
            if (kind === 'fee' && s.bonus === 'fee') m *= 0.8;
            if (kind === 'heat' && s.bonus === 'heat') m *= 0.8;
        }
        if (c) {
            if (kind === 'heat' && c.bonus === 'heat') m *= 0.85;
            if (kind === 'seizure' && c.bonus === 'seizure') m *= 0.75;
            if (kind === 'loyalty' && c.bonus === 'loyalty') m *= 0.7;
        }
        if (kind === 'loyalty' && State.me && State.me.fear) m *= 0.7;
        return m;
    },
    legacyBonus() { return this.F().kids.length * Config.family.KID_LEGACY; },

    /* ---------- Acciones ---------- */
    visitMom() {
        const F = this.F();
        if (F.momReady > State.stats.playTime) return;
        if (!Core.pay('clean', 20000)) return;
        F.momReady = State.stats.playTime + 300;
        State.heat = Math.max(0, State.heat - 15);
        F.happy = Math.min(100, F.happy + 10);
        UI.notify('👵 Tu mamá te hizo chilaquiles y rezó por ti. −15 búsqueda, +10 felicidad.');
        Sfx.coin(); this.render();
    },
    marry(id) {
        const F = this.F(), s = Config.family.spouses.find(x => x.id === id);
        if (F.spouse) return;
        const cost = this.base() * 5;
        if (!Core.pay('clean', cost)) return;
        F.spouse = id; F.happy = Math.min(100, F.happy + 30);
        Sfx.fanfare();
        Core.News.add(`Boda del año: ${Core.Me.alias()} se casa con ${s.name}, ${s.who}`, '', true);
        UI.modal('💍 TE CASASTE', `Banda sinaloense, 800 invitados y tres gobernadores en la mesa de honor.\n\n${s.name} (${s.who}) es tu esposa: ${s.text} mientras la familia esté contenta.`, [{ text: '¡VIVAN LOS NOVIOS!', style: 'btn-gold', cb: () => { } }]);
        this.render();
    },
    haveKid() {
        const F = this.F();
        if (!F.spouse || F.kids.length >= Config.family.MAX_KIDS || F.baby) return;
        if (!Core.pay('clean', this.base() * 2)) return;
        F.baby = State.stats.playTime + 180;
        UI.notify('🍼 ¡Viene un bebé en camino! Nace en 3 minutos.');
        this.render();
    },
    pickCompadre(id) {
        const F = this.F(), c = Config.family.compadres.find(x => x.id === id);
        if (F.compadre) return;
        if (!Core.pay('clean', this.base() * 4)) return;
        F.compadre = id;
        if (c.bonus === 'loyalty' && State.me) State.me.honor += 1;
        Sfx.levelup();
        UI.notify(`${c.icon} ${c.name} es tu compadre: ${c.text}.`);
        this.render();
    },
    gift() {
        const F = this.F();
        if (!Core.pay('clean', this.base())) return;
        F.happy = Math.min(100, F.happy + 25);
        UI.notify('🎁 Viaje a Disney, camionetas y joyas para todos. +25 felicidad.');
        Sfx.cash(); this.render();
    },

    /* ---------- Cada 3 segundos ---------- */
    tick() {
        const F = this.F();
        if (!Core.Unlocks.isOpen('familia')) return;
        const fam = F.spouse || F.kids.length || F.compadre;
        if (fam) F.happy = Math.max(0, F.happy - 0.05 * (1 + F.kids.length * 0.3)); // ~1/min
        // nace el bebé
        if (F.baby && F.baby <= State.stats.playTime) {
            F.baby = 0;
            const name = pick(Config.family.kidNames.filter(n => !F.kids.includes(n))) || 'Junior';
            F.kids.push(name);
            F.happy = Math.min(100, F.happy + 30);
            Sfx.fanfare();
            UI.modal('👶 NACIÓ ' + name.toUpperCase(), `${name} llegó al mundo. Tu familia está feliz (+30).\n\nCada hijo te da +${Config.family.KID_LEGACY} puntos de Legado al retirarte.`, [{ text: 'QUE DIOS LO CUIDE', style: 'btn-gold', cb: () => { } }]);
            this.render();
        }
        // la familia te deja
        if (F.spouse && F.happy <= 0) {
            const s = this.spouse(), loss = Math.floor(State.money.clean * 0.25);
            State.money.clean -= loss; F.spouse = null; F.happy = 30;
            Sfx.error();
            Core.News.add(`Escándalo: ${s.name} deja a ${Core.Me.alias()} y se lleva una fortuna`, 'bad', true);
            UI.modal('💔 TE DEJARON', `${s.name} se cansó de estar sola. Se fue con los niños a casa de su mamá y su abogado te quitó $${fmt(loss)} limpios.\n\nLos bonos de tu esposa se acabaron.`, [{ text: '...', cb: () => { } }]);
            this.render();
        }
        if (F.happy < 30 && fam && !F.warned) { F.warned = true; UI.notify('😠 Tu familia está descuidada (felicidad baja): perdiste el bono de tu esposa. Dales un regalo en FAMILIA.', 'bad'); UI.setBadge('familia', '!'); }
        if (F.happy >= 40) F.warned = false;
        // eventos familiares (~cada 10 min)
        if (fam && (F.nextEvent || 0) <= State.stats.playTime && $('event-modal').classList.contains('hidden') && Math.random() < 0.03) {
            F.nextEvent = State.stats.playTime + 540;
            this.event();
        }
        if (UI.current === 'familia') this.render();
    },
    event() {
        const F = this.F(), opts = [];
        if (F.spouse || F.kids.length) opts.push('kidnap');
        if (F.kids.length) opts.push('birthday');
        if (F.compadre) opts.push('compadre');
        if (!opts.length) return;
        const ev = pick(opts);
        if (ev === 'kidnap') {
            const who = F.kids.length && Math.random() < 0.6 ? pick(F.kids) : this.spouse().name;
            const isKid = F.kids.includes(who);
            const rid = Core.Rivals.randomAlive();
            const enemy = rid ? Config.rivals[rid].name : 'Una banda de secuestradores';
            const ransom = Math.max(200000, Math.floor(State.money.dirty * 0.15 + this.base() * 3));
            const en = Math.round(150 * (1 + Core.War.owned().length * 0.6) * dynMult());
            // el rescate lo hace tu mejor gente de todas tus plazas (30% de todo tu ejército)
            const rs = Math.floor(Core.War.totalSic() * 0.3), re = Math.floor(Core.War.totalElite() * 0.3);
            const ch = Core.War.chance(Core.War.power(rs, re), en);
            Sfx.alert();
            UI.modal('🚨 SECUESTRARON A ' + who.toUpperCase(), `${enemy} se llevó a ${who} saliendo de ${isKid ? 'la escuela' : 'misa'}. Piden $${fmt(ransom)} (sucio o, si no alcanza, limpio).\n\nPuedes pagar o mandar a tu mejor gente (${fmt(rs)} sicarios + ${fmt(re)} de élite de todas tus plazas). Probabilidad de rescate: ${Math.round(ch * 100)}%.`, [
                { text: `PAGAR $${fmt(ransom)}`, style: 'btn-blue', cb: () => { if (State.money.dirty >= ransom) State.money.dirty -= ransom; else if (!Core.pay('clean', ransom)) return false; F.happy = Math.max(0, F.happy - 10); UI.notify(`${who} regresó a casa, asustado pero bien.`); Core.Vendetta.add({ kind: 'familia', rid: rid || null, who: rid ? null : 'los secuestradores', sev: 2, loot: ransom, title: `Secuestraron a ${who}`, desc: `Pagaste $${fmt(ransom)} de rescate. Nadie toca a tu familia y se queda tan tranquilo.` }); this.render(); } },
                { text: `RESCATE ARMADO (${Math.round(ch * 100)}%)`, style: 'btn-red', cb: () => {
                    const lost = Math.min(State.army, Math.floor(rs * (0.05 + Math.random() * 0.1)));
                    State.army -= lost; Core.Heat.add(20);
                    if (Math.random() < ch) {
                        F.happy = Math.min(100, F.happy + 20);
                        if (rid) State.rivals[rid].power = Math.round(State.rivals[rid].power * 0.9);
                        Core.News.add(`Balacera en casa de seguridad: rescatan a familiar de ${Core.Me.alias()}`, 'bad', true);
                        setTimeout(() => UI.modal('✔ RESCATE EXITOSO', `Tu gente entró a sangre y fuego. ${who} está a salvo.\nPerdiste ${lost} sicarios. Tu familia está orgullosa (+20).`, [{ text: 'NADIE TOCA A MI FAMILIA', style: 'btn-gold', cb: () => { } }]), 50);
                    } else {
                        if (isKid) F.kids = F.kids.filter(k => k !== who); else F.spouse = null;
                        Core.Vendetta.add({ kind: 'familia', rid: rid || null, who: rid ? null : 'los secuestradores', sev: 3, member: who, title: `Mataron a ${who}`, desc: 'Esto no se perdona. Nunca.' });
                        F.happy = Math.max(0, F.happy - 40);
                        Core.News.add('Tragedia: muere familiar de capo en rescate fallido', 'bad', true);
                        setTimeout(() => UI.modal('✝️ LLEGASTE TARDE', `El rescate salió mal. Perdiste a ${who}.\nPerdiste ${lost} sicarios y tu familia quedó destrozada (−40).`, [{ text: '...', cb: () => { } }]), 50);
                    }
                    this.render();
                } }
            ]);
        } else if (ev === 'birthday') {
            const k = pick(F.kids), cost = this.base();
            UI.modal(`🎂 CUMPLEAÑOS DE ${k.toUpperCase()}`, `${k} quiere una fiesta con Los Tigres del Norte y un pony.\n\nSi no vas, no te lo va a perdonar.`, [
                { text: `FIESTA EN GRANDE $${fmt(cost)} LIMPIO`, style: 'btn-gold', cb: () => { if (!Core.pay('clean', cost)) return false; F.happy = Math.min(100, F.happy + 15); UI.notify('🎉 La mejor fiesta del año. +15 felicidad.'); } },
                { text: 'No puedo, tengo trabajo (−20)', cb: () => { F.happy = Math.max(0, F.happy - 20); } }
            ]);
        } else {
            const c = this.compadre();
            if (F.happy >= 50 || Math.random() < 0.5) {
                const d = this.base() * 2; State.money.dirty += d;
                UI.notify(`${c.icon} Tu compadre ${c.name} te pasó un negocio: +$${fmt(d)} sucios.`);
            } else {
                F.compadre = null; Core.Heat.add(30);
                Core.Vendetta.add({ kind: 'compadre', who: c.name, sev: 2, title: `${c.name} te vendió`, desc: 'Tu compadre le contó todo a la prensa.' });
                Sfx.error();
                UI.modal('🐍 TU COMPADRE TE TRAICIONÓ', `${c.name} vio que tu familia se estaba desmoronando y te vendió a la prensa.\n\nPerdiste su bono y tu búsqueda sube +30.`, [{ text: 'NUNCA OLVIDO', style: 'btn-red', cb: () => { } }]);
            }
        }
        UI.setBadge('familia', '!');
    },

    /* ---------- Pantalla ---------- */
    render() {
        const wrap = $('familia-wrap');
        if (!wrap) return;
        UI.setBadge('familia', null);
        const F = this.F(), s = this.spouse(), c = this.compadre(), b = this.base();
        const col = F.happy >= 60 ? '#8f8' : F.happy >= 30 ? '#fc0' : '#f55';
        let h = `<div class="op-card" style="border-color:${col}">
            <h3>❤️ FELICIDAD FAMILIAR</h3>
            <div class="status-row"><span>${F.happy >= 60 ? 'Todos contentos' : F.happy >= 30 ? 'Te extrañan' : 'Te reclaman todo el tiempo'}</span><span style="color:${col}">${Math.floor(F.happy)} / 100</span></div>
            <div class="progress-line" style="height:10px;"><div class="progress-active" style="width:${F.happy}%; background:${col};"></div></div>
            <p class="tiny muted" style="margin:6px 0;">Baja sola (más con hijos). Debajo de 30 pierdes el bono de tu esposa; en 0 te deja y se lleva 25% de tu dinero limpio.</p>
            <button class="action-btn btn-gold" onclick="Core.Family.gift()">🎁 REGALOS PARA TODOS (+25) · $${fmt(b)} LIMPIO</button>
        </div><div class="grid-cards">`;
        h += `<div class="op-card"><h3>👵 TU MAMÁ</h3><p class="tiny muted">La única que te quiere sin condiciones. Visitarla calma a todos.</p>
            ${F.momReady > State.stats.playTime ? `<div class="tiny muted">Ya la visitaste. Otra vez en ${fmtTime(F.momReady - State.stats.playTime)}.</div>` : `<button class="action-btn" onclick="Core.Family.visitMom()">VISITARLA (−15 búsqueda) · $20K LIMPIO</button>`}</div>`;
        if (s) h += `<div class="op-card glow"><h3>${s.icon} ${s.name.toUpperCase()}, TU ESPOSA</h3><p class="tiny muted">${s.who}</p><div class="tiny ${this.happyOk() ? 'green' : 'red'}">${s.text}${this.happyOk() ? '' : ' (APAGADO: familia descuidada)'}</div></div>`;
        else h += `<div class="op-card"><h3>💍 BUSCAR ESPOSA</h3><p class="tiny muted">Boda: $${fmt(b * 5)} limpio. Cada una te da algo distinto.</p>` +
            Config.family.spouses.map(x => `<button class="action-btn" onclick="Core.Family.marry('${x.id}')">${x.icon} ${x.name}, ${x.who} · ${x.text}</button>`).join('') + '</div>';
        h += `<div class="op-card"><h3>👶 HIJOS (${F.kids.length}/${Config.family.MAX_KIDS})</h3><p class="tiny muted">${F.kids.length ? F.kids.join(', ') + '. ' : ''}Cada hijo da +${Config.family.KID_LEGACY} de Legado al retirarte, pero la familia se descuida más rápido.</p>
            ${!s ? '<div class="tiny muted">Primero cásate.</div>' : F.baby ? `<div class="tiny gold">🍼 Nace en ${fmtTime(F.baby - State.stats.playTime)}</div>` : F.kids.length >= Config.family.MAX_KIDS ? '<div class="tiny gold">Familia completa</div>' : `<button class="action-btn" onclick="Core.Family.haveKid()">TENER UN HIJO · $${fmt(b * 2)} LIMPIO</button>`}</div>`;
        if (c) h += `<div class="op-card glow"><h3>${c.icon} COMPADRE: ${c.name.toUpperCase()}</h3><div class="tiny green">${c.text}</div><p class="tiny muted">Si tu familia anda mal, puede traicionarte.</p></div>`;
        else h += `<div class="op-card"><h3>🤝 BUSCAR COMPADRE</h3><p class="tiny muted">Bautizo y fiesta: $${fmt(b * 4)} limpio.</p>` +
            Config.family.compadres.map(x => `<button class="action-btn" onclick="Core.Family.pickCompadre('${x.id}')">${x.icon} ${x.name} · ${x.text}</button>`).join('') + '</div>';
        wrap.innerHTML = h + '</div>';
    }
};

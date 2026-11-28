/* =========================================================
   TU PERSONAJE Y LAS DECISIONES DE LA HISTORIA
   - Al empezar eliges apodo, nombre del cártel, emblema y color
   - En varios capítulos tomas decisiones: honor (+) o terror (−)
   - Al retirarte, tus decisiones definen tu leyenda
   ========================================================= */
Config.me = {
    emblems: ['🦂', '🐍', '🦅', '🐺', '💀', '👑', '🐆', '🌵', '🃏', '🔥'],
    colors: ['#c5a059', '#3fbf6f', '#3aa0ff', '#e8e8e8', '#ff5fa2', '#2ad4c4'],
    aliasIdeas: ['El Patrón', 'El Señor de los Cielos', 'El Fantasma', 'La Patrona', 'El Licenciado', 'El Tigre del Sureste', 'El Jaguar', 'La Jefa'],
    cartelIdeas: ['Cártel del Sureste', 'Los Jaguares', 'Cártel Maya', 'La Nueva Hermandad', 'Cártel de la Península', 'Los Intocables'],
    // Leyendas según tus decisiones
    legends: [
        { min: 3, title: 'EL PADRINO DEL PUEBLO', text: 'El pueblo te canta corridos y te esconde cuando llegan los soldados. Nunca fuiste un santo, pero fuiste SU patrón.' },
        { max: -3, title: 'EL CARNICERO', text: 'Tu nombre todavía se dice en voz baja. Nadie te quiso: todos te temieron. Y eso, en este negocio, también es una forma de respeto.' },
        { title: 'EL FANTASMA', text: 'Unos dicen que fuiste generoso, otros que fuiste cruel. La verdad es que nadie supo nunca quién eras. Así se escapa un rey.' }
    ]
};

/* ----- Decisiones de la historia: salen al llegar a cada capítulo ----- */
Config.choices = [
    {
        at: 1, title: '🧒 EL NIÑO DEL BARRIO',
        text: () => `Un niño de la colonia te vio cargando la mula a las 3 de la mañana. Se te quedó viendo sin decir nada.\n\n¿Qué hace ${Core.Me.alias()}?`,
        a: { text: 'Regalarle una bici y $500', fx: () => { State.money.dirty = Math.max(0, State.money.dirty - 500); return 'El niño ahora te avisa cuando pasa la patrulla. El barrio empieza a quererte.'; }, honor: 1 },
        b: { text: 'Asustarlo para que no hable', fx: () => { Core.Heat.add(5); return 'El niño no volvió a salir de su casa. En el barrio ya saben que contigo no se juega.'; }, honor: -1 }
    },
    {
        at: 3, title: '💸 EL PRIMER RATERO', req: () => State.lieutenants.length > 0,
        text: () => { const l = State.lieutenants[0]; Core.Choices.ctx = l.id; return `${l.name}, tu ${l.role}, se quedó con $${fmt(Math.max(2000, State.money.dirty * 0.1))} de la última venta. Todos tus tenientes están esperando a ver qué haces.`; },
        a: { text: 'Perdonarlo (todos ganan lealtad)', fx: () => { State.lieutenants.forEach(l => l.loyalty = 100); return 'Lo perdonaste frente a todos. Tus tenientes te ven como un jefe justo: lealtad al 100%.'; }, honor: 1 },
        b: { text: 'Ejecutarlo frente a todos', fx: () => { State.lieutenants = State.lieutenants.filter(l => l.id !== Core.Choices.ctx); State.me.fear = true; Core.HR.render(); Core.Logistics.updateUI(); return 'Nadie te va a volver a robar. Tus tenientes pierden lealtad 30% más lento... por miedo.'; }, honor: -1 }
    },
    {
        at: 4, title: '🏳️ LOS HALCONES SE RINDEN',
        text: () => 'En Cancún capturaste a 40 halcones de La Dama. Están de rodillas en la playa, esperando lo que digas.',
        a: { text: 'Reclutarlos (+40 sicarios)', fx: () => { State.army += 40; return '40 hombres nuevos que te deben la vida. Algunos hasta te prenden veladoras.'; }, honor: 1 },
        b: { text: 'Fusilarlos (Los Halcones −25% poder)', fx: () => { const R = State.rivals.halcones; if (R && !R.defeated) R.power = Math.round(R.power * 0.75); Core.Heat.add(15); Core.News.add('Hallan 40 cuerpos en una playa de Cancún', 'bad', true); return 'El mensaje llegó hasta La Dama. Sus hombres ya no quieren pelear contra ti.'; }, honor: -1 }
    },
    {
        at: 5, title: '🎉 LA FERIA DEL PUEBLO',
        text: () => 'El pueblo quiere hacer la feria de su santo patrono, pero no hay dinero. El sacerdote vino a pedirte ayuda... y los comerciantes temen que les cobres cuota.',
        a: { text: () => `Pagar la feria ($${fmt(Core.Choices.feria())} limpio, −30% búsqueda)`, fx: () => { const c = Core.Choices.feria(); State.money.clean = Math.max(0, State.money.clean - c); State.heat *= 0.7; return 'Hubo banda, jaripeo y fuegos artificiales. El pueblo te protege: tu búsqueda bajó 30%.'; }, honor: 1 },
        b: { text: () => `Cobrar cuota a los comerciantes (+$${fmt(Core.Choices.feria() * 2)} sucio)`, fx: () => { State.money.dirty += Core.Choices.feria() * 2; Core.Heat.add(20); return 'Te pagaron, pero ya nadie te saluda en la calle.'; }, honor: -1 }
    },
    {
        at: 6, title: '🥀 LA DAMA SUPLICA',
        text: () => 'La Dama sobrevivió al asalto a su guarida. Te ofrece sus contactos en la policía a cambio de dejarla irse del país para siempre.',
        a: { text: 'Dejarla ir (te quedas con su contacto en la policía)', fx: () => { State.contacts.police = true; return 'La Dama se fue a Madrid. Su comandante de policía ahora trabaja para ti: −50% búsqueda.'; }, honor: 1 },
        b: { text: 'Ejecutarla en vivo (los demás cárteles −15% poder)', fx: () => { Core.Rivals.alive().forEach(id => State.rivals[id].power = Math.round(State.rivals[id].power * 0.85)); Core.News.add('Video de una ejecución recorre las redes sociales', 'bad', true); return 'Todo el país vio el video. Los otros cárteles te tienen miedo: −15% de poder.'; }, honor: -1 }
    },
    {
        at: 8, title: '📰 EL PERIODISTA',
        text: () => `Un periodista de investigación consiguió tu foto y va a publicar quién es ${Core.Me.alias()} en primera plana.`,
        a: { text: () => `Pagarle para que se calle ($${fmt(Core.Choices.feria() * 3)} limpio)`, fx: () => { State.money.clean = Math.max(0, State.money.clean - Core.Choices.feria() * 3); return 'La nota nunca salió. El periodista se compró una casa en la playa.'; }, honor: 1 },
        b: { text: 'Desaparecerlo (+40 búsqueda)', fx: () => { Core.Heat.add(40); Core.News.add('Desaparece periodista que investigaba al narco', 'bad', true); return 'La nota nunca salió... y el periodista tampoco volvió. Todo el país está viendo.'; }, honor: -1 }
    },
    {
        at: 10, title: '👑 TU HEREDERO',
        text: () => `Pronto vas a desaparecer. ¿Qué pasa con ${Core.Me.cartel()} cuando ya no estés?`,
        a: { text: 'Dejárselo a tu mejor teniente', fx: () => 'Tu gente seguirá trabajando. El cártel sobrevivirá sin ti.', honor: 1 },
        b: { text: 'Quemarlo todo cuando te vayas', fx: () => 'Nadie va a heredar lo que construiste. Cuando desaparezcas, desaparece todo contigo.', honor: -1 }
    }
];

Core.Me = {
    alias() { return (State.me && State.me.alias) || 'El Patrón'; },
    cartel() { return (State.me && State.me.cartel) || 'tu cártel'; },
    color() { return (State.me && State.me.color) || '#c5a059'; },
    emblem() { return (State.me && State.me.emblem) || '👑'; },
    // reemplaza las menciones del jugador en textos
    fill(txt) {
        return String(txt).replace(/\{alias\}/g, this.alias()).replace(/\{cartel\}/g, this.cartel())
            .replace(/"El Patrón"/g, `"${this.alias()}"`).replace(/El Patrón(?! II)/g, this.alias());
    },
    legend() {
        const h = (State.me && State.me.honor) || 0;
        return Config.me.legends.find(l => (l.min !== undefined ? h >= l.min : l.max !== undefined ? h <= l.max : true));
    },

    /* ----- Pantalla para crear tu personaje ----- */
    pending: 'story',
    sel: { emblem: '🦂', color: '#c5a059' },
    open(mode) {
        this.pending = mode;
        $('mode-screen').classList.add('hidden');
        $('me-screen').classList.remove('hidden');
        if (!$('me-alias').value) $('me-alias').value = pick(Config.me.aliasIdeas);
        if (!$('me-cartel').value) $('me-cartel').value = pick(Config.me.cartelIdeas);
        this.renderPick();
        Sfx.click();
    },
    back() { $('me-screen').classList.add('hidden'); $('mode-screen').classList.remove('hidden'); },
    random(which) {
        $(which === 'alias' ? 'me-alias' : 'me-cartel').value = pick(which === 'alias' ? Config.me.aliasIdeas : Config.me.cartelIdeas);
        Sfx.click();
    },
    pickEmblem(e) { this.sel.emblem = e; this.renderPick(); Sfx.click(); },
    pickColor(c) { this.sel.color = c; this.renderPick(); Sfx.click(); },
    renderPick() {
        setHTML('me-emblems', Config.me.emblems.map(e => `<button class="me-chip ${this.sel.emblem === e ? 'on' : ''}" onclick="Core.Me.pickEmblem('${e}')">${e}</button>`).join(''));
        setHTML('me-colors', Config.me.colors.map(c => `<button class="me-chip me-color ${this.sel.color === c ? 'on' : ''}" style="background:${c}" onclick="Core.Me.pickColor('${c}')"></button>`).join(''));
        const a = ($('me-alias').value || 'El Patrón').trim(), k = ($('me-cartel').value || 'Mi Cártel').trim();
        setHTML('me-preview', `<span style="font-size:2.2rem">${this.sel.emblem}</span><div><div style="color:${this.sel.color}; font-family:Cinzel,serif; font-size:1.3rem; letter-spacing:2px;">${a.toUpperCase()}</div><div class="tiny muted">${k}</div></div>`);
    },
    confirm() {
        const alias = ($('me-alias').value || '').trim().slice(0, 28) || 'El Patrón';
        const cartel = ($('me-cartel').value || '').trim().slice(0, 34) || 'Cártel del Sureste';
        const me = { alias, cartel, emblem: this.sel.emblem, color: this.sel.color, honor: 0, fear: false, choices: {} };
        $('me-screen').classList.add('hidden');
        Core.Game.startMode(this.pending, me);
    },
    // cabecera del juego
    renderTag() {
        setHTML('me-tag', `<span>${this.emblem()}</span> <span style="color:${this.color()}">${this.alias().toUpperCase()}</span><span class="muted"> · ${this.cartel()}</span>`);
    }
};

Core.Choices = {
    ctx: null,
    feria() { return Math.max(20000, Math.floor((State.money.clean + State.money.dirty) * 0.05)); },
    // revisa si hay una decisión pendiente para el capítulo actual (cada 3 s)
    tick() {
        if (State.mode !== 'story' || !State.me) return;
        const ch = Config.choices.find(c => c.at <= State.story.chapter && !(c.title in State.me.choices) && (!c.req || c.req()));
        if (!ch) return;
        if (!$('intro-screen').classList.contains('hidden') || !$('event-modal').classList.contains('hidden')) return;
        const lbl = o => typeof o.text === 'function' ? o.text() : o.text;
        const pickIt = (o, key) => {
            const res = o.fx();
            State.me.choices[ch.title] = key;
            State.me.honor += o.honor;
            Sfx[o.honor > 0 ? 'coin' : 'burst'](3);
            setTimeout(() => UI.modal(o.honor > 0 ? '🕊️ HONOR' : '🩸 TERROR', `${res}\n\nTu leyenda: ${Core.Me.legend().title} (${State.me.honor > 0 ? '+' : ''}${State.me.honor})`, [{ text: 'CONTINUAR', style: 'btn-gold', cb: () => { } }]), 50);
            Core.Story.render();
        };
        Sfx.alert();
        UI.modal(`⚖️ DECISIÓN: ${ch.title}`, ch.text(), [
            { text: lbl(ch.a), style: 'btn-green', cb: () => pickIt(ch.a, 'a') },
            { text: lbl(ch.b), style: 'btn-red', cb: () => pickIt(ch.b, 'b') }
        ]);
    },
    // resumen para la pestaña HISTORIA
    html() {
        if (!State.me) return '';
        const made = Config.choices.filter(c => c.title in State.me.choices);
        const L = Core.Me.legend();
        return `<div class="op-card" style="border-color:${Core.Me.color()}">
            <h3>${Core.Me.emblem()} ${Core.Me.alias().toUpperCase()} · ${Core.Me.cartel()}</h3>
            <div class="status-row"><span>Tu leyenda hasta ahora</span><span class="gold">${L.title} (${State.me.honor > 0 ? '+' : ''}${State.me.honor})</span></div>
            <p class="tiny muted">🕊️ Honor suma, 🩸 terror resta. Con +3 o más serás El Padrino del Pueblo; con −3 o menos, El Carnicero. Una leyenda extrema da +5 de Legado al retirarte.</p>
            ${made.length ? '<ul class="tiny" style="margin-top:8px;">' + made.map(c => `<li>${c.title}: ${State.me.choices[c.title] === 'a' ? '🕊️' : '🩸'} ${typeof c[State.me.choices[c.title]].text === 'function' ? c[State.me.choices[c.title]].text().replace(/\s*\(.*\)$/, '') : c[State.me.choices[c.title]].text.replace(/\s*\(.*\)$/, '')}</li>`).join('') + '</ul>' : '<p class="tiny muted">Aún no tomas decisiones importantes.</p>'}
        </div>`;
    }
};

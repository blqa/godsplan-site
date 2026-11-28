/* =========================================================
   Historia, periódico, encargos, eventos, logros,
   patrimonio/rango, legado y guía
   ========================================================= */

/* ---------- PERIÓDICO ---------- */
Core.News = {
    add(text, type = '', big = false) {
        if (State.shadow.media && type === 'bad' && Math.random() < 0.5) return; // tus medios callan la mitad
        const d = new Date();
        State.news.unshift({ text, type, big, time: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` });
        State.news = State.news.slice(0, 40);
        this.renderTicker();
        if (isVisible('news')) this.render(); else UI.setBadge('news', '•');
    },
    renderTicker() {
        const items = State.news.slice(0, 8).map(n => n.text.toUpperCase());
        const el = $('ticker-move');
        const txt = items.length ? items.join('   ◆   ') : 'SIN NOVEDADES EN EL FRENTE';
        if (el && el.textContent !== txt) {
            el.textContent = txt;
            el.style.animationDuration = Math.max(25, txt.length * 0.18) + 's';
        }
    },
    render() {
        UI.setBadge('news', null);
        const d = new Date();
        setText('np-date', d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + ` · Año ${Math.floor(State.stats.playTime / 3600) + 1} del Patrón`);
        $('news-list').innerHTML = State.news.map(n => `
            <div class="np-item ${n.big ? 'big' : ''} ${n.type}">
                <div class="np-meta">${n.time} · ${n.type === 'bad' ? 'Seguridad' : 'Nacional'}</div>
                <h4>${n.text}</h4>
            </div>`).join('') || '<p>Hoy no hay nada que reportar. Por ahora.</p>';
    },
    flavor() { if (Math.random() < 0.08) this.add(pick(Config.flavorNews)); }
};

/* ---------- FAMA ----------
   En Modo Historia es el capítulo actual. En Modo Libre se calcula con tus avances.
   Sirve para decidir qué eventos salen, cuántos encargos llegan, etc. */
Core.fame = function () {
    if (State.mode !== 'libre') return State.story.chapter;
    const s = State.stats;
    let f = 0;
    if (s.kgSold >= 50) f++;
    if (s.laundered >= 20000) f++;
    if (State.lieutenants.length >= 2) f++;
    f += Math.min(3, Core.War.owned().length - 1);
    f += State.rank * 2;
    return Math.min(10, f);
};

/* ---------- DESBLOQUEOS ---------- */
Core.Unlocks = {
    isOpen(key) {
        if (State.mode === 'libre') return key !== 'story';
        return State.unlocked.includes(key);
    },
    nameOf(key) {
        const v = VIEWS.find(x => x.id === key);
        return v ? v.name : (Config.unlockNames[key] || key);
    },
    // Revisa qué se abre con el capítulo actual. Regresa la lista de lo nuevo.
    refresh(silent) {
        if (State.mode === 'libre') return [];
        const newly = [];
        Object.keys(Config.unlocks).forEach(k => {
            if (State.story.chapter >= Config.unlocks[k] && !State.unlocked.includes(k)) { State.unlocked.push(k); newly.push(k); }
        });
        if (newly.length) {
            UI.buildNav();
            newly.forEach(k => UI.setBadge(k, 'NUEVO'));
            if (!silent) UI.notify(`🔓 Desbloqueaste: ${newly.map(k => this.nameOf(k)).join(', ')}`, 'event');
        }
        UI.applyUnlocks();
        return newly;
    },
    chapterFor(key) { return (Config.unlocks[key] || 0) + 1; }
};

/* ---------- HISTORIA ---------- */
Core.Story = {
    current() { return Config.story[State.story.chapter]; },
    progress() {
        const c = this.current();
        if (!c) return [1, 1];
        const [v, max] = c.progress();
        return [Math.min(v, max), max];
    },
    check() {
        const c = this.current();
        if (State.mode === 'libre' || !c || State.story.chapter >= Config.story.length - 1) return;
        const [v, max] = this.progress();
        if (v < max) return;
        // recompensa
        const r = c.reward || {};
        if (r.dirty) State.money.dirty += r.dirty;
        if (r.clean) State.money.clean += r.clean;
        State.story.chapter++;
        const next = this.current();
        Sfx.fanfare();
        UI.setBadge('story', '!');
        const rewardTxt = [r.dirty ? `$${fmt(r.dirty)} sucios` : '', r.clean ? `$${fmt(r.clean)} limpios` : ''].filter(Boolean).join(' + ');
        const newly = Core.Unlocks.refresh(true);
        const unlockTxt = newly.length ? '\n🔓 Desbloqueaste: ' + newly.map(k => Core.Unlocks.nameOf(k)).join(', ') : '';
        Core.Game.showChapter(next, `✔ CAPÍTULO ${State.story.chapter}: ${c.title.toUpperCase()} COMPLETADO${rewardTxt ? '\nRecompensa: ' + rewardTxt : ''}${unlockTxt}`);
        this.render();
    },
    render() {
        if (State.mode === 'libre') {
            const g = Core.Legacy.goalsMet();
            setHTML('mini-story', `<b class="gold">🗺️ MODO LIBRE</b><br>Plan de retiro: ${g}/3 metas<br><span class="muted">$1B offshore · 14 plazas · 16 techs</span>`);
            const bar = $('mini-story-bar'); if (bar) bar.style.width = (g / 3 * 100) + '%';
            return;
        }
        const c = this.current();
        const [v, max] = this.progress();
        const pct = Math.round(v / max * 100);
        setHTML('mini-story', c ? `<b class="gold">Cap. ${State.story.chapter + 1}:</b> ${c.goal}<br><span class="muted">${max > 1 ? `${fmt(v)} / ${fmt(max)}` : (v ? 'Listo' : 'Pendiente')}</span>` : '');
        const bar = $('mini-story-bar'); if (bar) bar.style.width = pct + '%';
        if (!isVisible('story')) return;
        UI.setBadge('story', null);
        const r = c.reward || {};
        $('story-current').innerHTML = `<div class="story-card">
            <div class="sc-chapter">CAPÍTULO ${State.story.chapter + 1} DE ${Config.story.length}</div>
            <div class="sc-title">${c.title}</div>
            <div class="sc-text">${c.text.replace(/\n/g, '<br>')}</div>
            <div class="sc-goal">🎯 ${c.goal}</div>
            <div class="progress-line" style="margin:10px 0;"><div class="progress-active" style="width:${pct}%"></div></div>
            <div class="row-between tiny"><span>${fmt(v)} / ${fmt(max)}</span><span class="gold">${r.dirty ? 'Recompensa: $' + fmt(r.dirty) + ' sucios' : r.clean ? 'Recompensa: $' + fmt(r.clean) + ' limpios' : 'Recompensa: tu leyenda'}</span></div>
            ${c.boss ? `<p class="tiny red" style="margin-top:10px;">👑 JEFE FINAL: ${Config.rivals[c.boss].leader} — ${Config.rivals[c.boss].name}</p>` : ''}
        </div>`;
        $('story-list').innerHTML = Config.story.map((s, i) => {
            const st = i < State.story.chapter ? 'done' : i === State.story.chapter ? 'current' : 'locked';
            return `<div class="story-item ${st}"><span class="si-num">${i + 1}</span><span>${st === 'locked' ? '???' : s.title}</span><span class="push-right tiny">${st === 'done' ? '✔' : st === 'current' ? '▶ EN CURSO' : '🔒'}</span></div>`;
        }).join('');
    }
};

/* ---------- ENCARGOS ---------- */
Core.Contracts = {
    make() {
        const unlocked = Config.productKeys.filter(k => State.ops[k] > 0);
        const k = pick(unlocked);
        const scale = 1 + State.rank * 2 + (State.labs[k] || 1);
        const qty = Math.max(10, Math.floor((20 + Math.random() * 60) * scale));
        const mult = 1.4 + Math.random() * 1.1;
        return {
            id: now() + Math.floor(Math.random() * 100000), client: pick(Config.contractClients), prod: k, qty,
            reward: Math.floor(qty * Config.products[k].basePrice * mult * legacyMult()), mult,
            cleanBonus: Math.random() < 0.25, expires: now() + (4 + Math.random() * 6) * 60000, seen: false
        };
    },
    // Cuántos clientes especiales te buscan según tu fama
    max() {
        const ch = Core.fame();
        if (ch < 3) return 0;                       // nadie te conoce todavía
        if (State.rank >= 2 || ch >= 7) return 3;
        if (State.rank >= 1 || ch >= 5) return 2;
        return 1;
    },
    refill() {
        const max = this.max();
        State.contracts = State.contracts.filter(c => c.expires > now()).slice(0, max);
        if (max > 0 && !State.contractsUnlocked) {
            State.contractsUnlocked = true;
            UI.notify('📋 Ya se corre tu nombre en la calle: llegaron los primeros encargos.', 'event');
            Core.News.add('Se habla de un nuevo proveedor "serio y discreto" en la península');
        }
        while (State.contracts.length < max) State.contracts.push(this.make());
        if (State.contracts.some(c => !c.seen) && !isVisible('contracts')) UI.setBadge('contracts', '•');
    },
    render() {
        UI.setBadge('contracts', null);
        if (this.max() === 0) {
            $('contracts-grid').innerHTML = `<div class="op-card locked"><h3>🔒 NADIE TE CONOCE TODAVÍA</h3>
                <p class="muted">Los clientes especiales solo le compran a alguien con nombre. ${State.mode === 'libre' ? 'Vende, lava y contrata gente para que corra tu fama.' : 'Termina el capítulo 3 de la historia ("La Red") para que la gente empiece a buscarte.'}</p></div>`;
            return;
        }
        State.contracts.forEach(c => c.seen = true);
        $('contracts-grid').innerHTML = State.contracts.map(c => {
            const have = State.inv[c.prod] || 0, ok = have >= c.qty;
            return `<div class="op-card ${ok ? 'glow' : ''}">
                <h3>${c.client.toUpperCase()}</h3>
                <div class="status-row"><span>Pide ${fmt(c.qty)} kg de ${Config.products[c.prod].name}</span><span>⏱ ${fmtTime((c.expires - now()) / 1000)}</span></div>
                <div class="status-row"><span>Tienes <span style="color:${ok ? '#8f8' : '#f66'}">${fmt(have)} kg</span></span><span>x${c.mult.toFixed(2)} mercado</span></div>
                <div style="font-size:1.1rem; color:var(--gold); margin:10px 0;">$${fmt(c.reward)} SUCIO ${c.cleanBonus ? '<span class="chip blue">+20% LIMPIO</span>' : ''}</div>
                ${!ok && State.automation.active && !State.automation.reserve ? `<p class="tiny red">⚠️ Tu auto-envío se está llevando esta mercancía. En Logística activa "No tocar la mercancía de los encargos".</p>` : ''}
                <button class="action-btn ${ok ? 'btn-green' : 'btn-locked'}" onclick="Core.Contracts.deliver(${c.id})">ENTREGAR</button>
            </div>`;
        }).join('');
    },
    deliver(id) {
        const c = State.contracts.find(x => x.id === id);
        if (!c) return;
        if ((State.inv[c.prod] || 0) < c.qty) { Sfx.error(); return UI.notify('No tienes suficiente mercancía.', 'bad'); }
        State.inv[c.prod] -= c.qty;
        State.money.dirty += c.reward;
        State.stats.dirtyEarned += c.reward;
        State.stats.kgSold += c.qty;
        if (c.cleanBonus) State.money.clean += Math.floor(c.reward * 0.2);
        State.stats.contractsDone++;
        Core.Heat.add(8);
        State.contracts = State.contracts.filter(x => x.id !== id);
        this.refill();
        Sfx.cash();
        UI.notify(`${c.client} pagó $${fmt(c.reward)}.`);
        this.render();
    },
    reroll() {
        if (this.max() === 0) return UI.notify('Todavía nadie te busca.', 'bad');
        if (!Core.pay('dirty', 5000)) return;
        State.contracts = [];
        this.refill();
        this.render();
    }
};

/* ---------- EVENTOS ---------- */
Core.Events = {
    check() {
        if (!$('event-modal').classList.contains('hidden') || State.stats.playTime < 90) return;
        // solo eventos que tienen sentido para tu nivel (nadie le hace fiesta a un desconocido)
        const pool = Config.events.filter(e => { try { return !e.req || e.req(); } catch (err) { return false; } });
        if (pool.length && Math.random() < 0.018) this.trigger(pick(pool));
    },
    trigger(ev) {
        Sfx.alert();
        UI.modal(ev.title, ev.desc, ev.opts.map(o => ({
            text: o.text,
            keepOpen: true,
            cb: () => {
                const c = o.cost || {};
                if (c.dirty && State.money.dirty < c.dirty) { UI.notify('No tienes dinero sucio suficiente.', 'bad'); return false; }
                if (c.clean && State.money.clean < c.clean) { UI.notify('No tienes dinero limpio suficiente.', 'bad'); return false; }
                if (c.dirty) State.money.dirty -= c.dirty;
                if (c.clean) State.money.clean -= c.clean;
                o.effect();
                return true;
            }
        })));
    }
};

/* ---------- LOGROS ---------- */
Core.Achievements = {
    check() {
        Config.achievements.forEach(a => {
            if (State.achievements.includes(a.id)) return;
            let ok = false;
            try { ok = !!a.check(); } catch (e) { ok = false; }
            if (ok) {
                State.achievements.push(a.id);
                Sfx.levelup();
                UI.notify(`🏆 LOGRO: ${a.name}`, 'event');
                if (isVisible('achievements')) this.render();
            }
        });
    },
    render() {
        setText('ach-counter', `${State.achievements.length} / ${Config.achievements.length}`);
        $('achievements-list').innerHTML = Config.achievements.map(a => {
            const ok = State.achievements.includes(a.id);
            return `<div class="op-card ${ok ? 'glow' : 'locked'}" style="padding:12px;">
                <b class="${ok ? 'gold' : ''}">${ok ? '🏆' : '🔒'} ${a.name}</b>
                <div class="tiny muted">${a.desc}</div></div>`;
        }).join('');
        const st = State.stats;
        const rows = [
            ['Tiempo jugado', `${Math.floor(st.playTime / 3600)}h ${Math.floor(st.playTime % 3600 / 60)}m`],
            ['Dinero sucio generado', '$' + fmt(st.dirtyEarned)], ['Dinero lavado', '$' + fmt(st.laundered)],
            ['Kilos vendidos', fmt(st.kgSold)], ['Envíos entregados', fmt(st.delivered || 0)], ['Decomisos sufridos', fmt(st.seizures)], ['Cargamentos asaltados', fmt(st.hijacked || 0)],
            ['Encargos cumplidos', fmt(st.contractsDone)], ['Plazas conquistadas', fmt(st.conquests)], ['Ataques defendidos', fmt(st.defended)],
            ['Plazas perdidas', fmt(st.lostTerritories)], ['Jefes derrotados', fmt(st.bossesDefeated)], ['Redadas', fmt(st.raids)],
            ['Préstamos liquidados', fmt(st.loansPaid)], ['Legado / Retiros', `${Legacy.points} pts / ${Legacy.runs}`]
        ];
        $('stats-panel').innerHTML = rows.map(r => `<div class="data-row"><span>${r[0]}</span><span>${r[1]}</span></div>`).join('');
    }
};

/* ---------- PATRIMONIO Y RANGO ---------- */
Core.Respect = {
    calc() {
        let val = State.money.offshore + State.money.clean + State.money.dirty * 0.1 - State.loan.debt * 0.5;
        Config.investments.forEach(i => val += (State.investments[i.id] || 0) * i.cost);
        Config.fronts.forEach(f => { if (State.fronts[f.id]) val += f.cost * State.fronts[f.id].level; });
        val += Core.War.owned().length * 5000000;
        Object.keys(State.stocks).forEach(k => val += State.stocks[k].owned * State.stocks[k].price);
        State.respect = Math.max(0, Math.floor(val));
        const old = State.rank;
        let rank = 0;
        Config.ranks.forEach(r => { if (State.respect >= r.req) rank = r.id; });
        State.rank = Math.max(State.rank, rank); // el rango no se pierde
        if (State.rank > old) {
            Sfx.fanfare();
            UI.notify(`¡ASCENSO! AHORA ERES ${Config.ranks[State.rank].name.toUpperCase()}`, 'event');
            Core.News.add(`Autoridades identifican a nuevo "${Config.ranks[State.rank].name}" en el Pacífico`, 'bad', true);
            Core.Logistics.updateUI();
            if (isVisible('shadow')) Core.Shadow.render();
        }
    }
};

/* ---------- LEGADO / RETIRO ---------- */
Core.Legacy = {
    pointsFor() { return Math.floor(Math.sqrt(Math.max(0, State.respect) / 1000000)); },
    goalsMet() {
        let n = 0;
        if (State.money.offshore >= WIN_TARGET) n++;
        if (Core.War.owned().length >= Config.territories.length) n++;
        if (State.techs.length >= Config.techs.length) n++;
        return n;
    },
    render() {
        const lands = Core.War.owned().length;
        setText('end-money', `$${fmt(State.money.offshore)} / $1B`);
        setText('end-land', `${lands} / ${Config.territories.length}`);
        setText('end-tech', `${State.techs.length} / ${Config.techs.length}`);
        $('btn-win').disabled = this.goalsMet() < 3;
        setText('legacy-current', Legacy.points);
        setText('legacy-gain', '+' + this.pointsFor());
        setText('legacy-runs', Legacy.runs);
    },
    winGame() {
        if (this.goalsMet() < 3) return UI.notify('Aún no cumples todas las condiciones.', 'bad');
        const pts = this.pointsFor() + 25;
        Sfx.fanfare();
        UI.modal('👑 EL REY DE REYES', `Desapareciste con mil millones de dólares. Controlas el país entero y ya no queda nadie que te desafíe.\n\nTu nombre será leyenda por generaciones.\n\nGanas ${pts} puntos de Legado.`, [
            { text: 'NUEVA DINASTÍA', style: 'btn-gold', cb: () => this.retire(pts, true) }
        ]);
    },
    earlyRetire() {
        const pts = this.pointsFor();
        if (pts < 1) return UI.notify('Necesitas al menos $1M de patrimonio para dejar huella.', 'bad');
        UI.modal('RETIRO ANTICIPADO', `Tu imperio se reinicia por completo y ganas ${pts} puntos de Legado (+${pts * 5}% producción y precio para siempre).\n\n¿Seguro?`, [
            { text: 'RETIRARME', style: 'btn-red', cb: () => this.retire(pts, false) },
            { text: 'Cancelar', cb: () => { } }
        ]);
    },
    retire(pts, won) {
        Legacy.points += pts;
        Legacy.runs += 1;
        if (won) Legacy.wins += 1;
        try { localStorage.setItem(LEGACY_KEY, JSON.stringify(Legacy)); } catch (e) { }
        Core.Save.wipe();
        location.reload();
    }
};

/* ---------- PROGRESO OFFLINE ---------- */
Core.Offline = {
    apply() {
        if (!State.lastSave) return;
        const secs = Math.min(4 * 3600, Math.floor((now() - State.lastSave) / 1000));
        if (secs < 60) return;
        const eff = 0.5;
        let clean = 0;
        Config.investments.forEach(i => clean += (State.investments[i.id] || 0) * i.income);
        clean = clean / 3 * secs * eff;
        if (State.shadow.presidencia) clean += 10000 * secs * eff;
        State.money.clean += clean;
        const produced = [];
        Config.productKeys.forEach(k => {
            if (!(State.ops[k] > 0 && State.opsStatus[k])) return;
            let units = Math.floor(Core.Ops.rate(k) * secs * eff);
            const cc = Core.Ops.chemCost(k);
            if (cc > 0) units = Math.min(units, Math.floor(State.inv.chems / cc));
            if (units <= 0) return;
            State.inv.chems -= units * cc;
            State.inv[k] += units;
            produced.push(`${Config.products[k].name}: +${fmt(units)} kg`);
        });
        // las rutas que estaban en camino llegan
        State.routes.forEach(r => r.progress = Math.max(r.progress, 99.9));
        State.heat = Math.max(0, State.heat - secs * 0.1);
        State.incoming.forEach(i => i.left = Math.min(i.left, 5));
        const h = Math.floor(secs / 3600), m = Math.floor(secs % 3600 / 60);
        UI.modal('MIENTRAS NO ESTABAS', `Estuviste fuera ${h}h ${m}m. Tu gente siguió trabajando (al 50%).\n\nIngresos limpios: $${fmt(clean)}\n${produced.join('\n') || 'Sin producción (¿faltaron químicos?)'}`, [{ text: 'A TRABAJAR', style: 'btn-gold', cb: () => { } }]);
    }
};

/* ---------- GUÍA ---------- */
Core.Guide = {
    open() { this.render(); $('guide-modal').classList.remove('hidden'); },
    close() { $('guide-modal').classList.add('hidden'); },
    render() {
        $('guide-content').innerHTML = `
        <h2>0. Modos de juego</h2>
        <p><strong>Modo Historia</strong>: empiezas con Producción, Logística y Flota, y cada capítulo te abre nuevos menús (Finanzas, Tenientes, Guerra, Fachadas...). <strong>Modo Libre</strong>: todo abierto desde el inicio y sin capítulos.</p>
        <h2>1. La meta</h2>
        <p>Retírate como <strong>EL REY DE REYES</strong>: junta <strong>$1B</strong> en tu cuenta offshore, controla los <strong>14 territorios</strong> e investiga las <strong>16 tecnologías</strong>. La pestaña <strong>HISTORIA</strong> te guía capítulo por capítulo.</p>
        <h2>2. Dinero sucio y limpio</h2>
        <p>Vender mercancía da dinero <strong>sucio</strong> (producción, tropas, vehículos). Lo conviertes en <strong>limpio</strong> lavándolo a mano o con <strong>negocios fachada</strong>, que lavan solos pero pueden ser clausurados por Hacienda. Con el limpio compras propiedades, tecnología y poder político.</p>
        <h2>3. Producción y mercado</h2>
        <p>Cada producto se fabrica en laboratorios; casi todos necesitan <strong>químicos</strong>. Si vendes mucho de lo mismo, el mercado se <strong>satura</strong> y el precio baja unos minutos. Tu mercado crece con cada plaza que conquistas, y las rutas largas e internacionales saturan mucho menos. Los <strong>encargos</strong> pagan mejor y no saturan, pero solo llegan cuando ya tienes fama (desde el capítulo 3).</p>
        <h2>4. Logística</h2>
        <p>Cada vehículo tiene nombre, HP y kilometraje (cada 5,000 km es más rápido). Las rutas largas pagan más pero tienen más riesgo de <strong>decomiso</strong>, sobre todo con la búsqueda alta: antes de enviar ves el % de riesgo. Las rutas cortas son locales y no las asaltan. Un vehículo con <strong>seguro</strong> no se pierde si lo decomisan, y tu <strong>élite</strong> escolta los convoyes contra asaltos.</p>
        <h2>5. Guerra y rivales</h2>
        <p>Empiezas en <strong>Mérida</strong>, la ciudad más tranquila del país. Hay tres cárteles: <strong>Los Halcones</strong> (sigilosos, en el Golfo y el sureste), <strong>el Golfo Negro</strong> (agresivos, en el norte) y <strong>la Familia Serrana</strong> (la vieja guardia del Pacífico y la capital). Solo atacas plazas conectadas a las tuyas. Cada cártel tiene una <strong>guarida con su jefe</strong> que solo puedes atacar cuando ya no le quedan otras plazas. Cuando te atacan, tienes unos segundos para <strong>mandar refuerzos, negociar, resistir o abandonar</strong>. Mejora tus plazas con fortalezas, labs y bodegas.</p>
        <h2>5b. Tu ejército</h2>
        <p><strong>Sicarios</strong> ($1,000 sucio): baratos, su fuerza crece con tu <strong>armamento</strong>. <strong>Fuerzas Especiales</strong> ($25K limpio): pegan 15, defienden 12 y casi no mueren. Todos cobran <strong>nómina</strong> cada minuto y caben en tu <strong>cuartel</strong> (crece con plazas y fortalezas). Al atacar eliges cuántos mandas y cuántos se quedan cuidando la plaza. En <strong>Organización del ejército</strong> ves qué plazas están en peligro y puedes repartir tus tropas automáticamente.</p>
        <h2>6. Tenientes</h2>
        <p>Cada teniente tiene rol, personalidad y sube de nivel trabajando. Puedes asignar varios del mismo rol: el mejor aporta 100%, el segundo 50%, el tercero 25%. Si su lealtad baja mucho, te traiciona. Págales bonos.</p>
        <h2>7. Heat (búsqueda)</h2>
        <p>Envíos, ataques y lavados grandes suben tu búsqueda. Si llega al máximo hay <strong>redada</strong>. Bájala con contactos, tecnología de sigilo o el Plan de Escape.</p>
        <h2>8. Préstamos</h2>
        <p><strong>Don Usura</strong> te presta al instante, pero cobra intereses y si no le pagas a tiempo, va por ti.</p>
        <h2>9. Legado</h2>
        <p>Al retirarte ganas puntos de Legado permanentes: más producción, mejor precio y dinero inicial en tu siguiente partida.</p>
        <h2>Atajos</h2>
        <p>Barra espaciadora = pausa. EXPORTAR / IMPORTAR para pasar tu partida a otro dispositivo. El juego sigue produciendo al 50% mientras no estás (máx. 4 h).</p>`;
    }
};

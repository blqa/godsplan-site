/* =========================================================
   GOLPES: misiones especiales con planeación
   Mandas un equipo (sicarios + élite), se planea durante un tiempo y luego
   se resuelve: entre más fuerza mandes, más probabilidad de éxito.
   Un golpe a la vez; cada uno tiene tiempo de espera para repetirse.
   ========================================================= */
Config.golpes = [
    { id: 'tren', icon: '🚂', name: 'Asaltar a La Bestia', sic: 30, eli: 0, secs: 60, diff: 60, cd: 420, heat: 10,
      desc: 'El tren de carga trae químicos de Lázaro Cárdenas. Nadie lo cuida de noche.',
      reward: s => { const c = 3000 * s; State.inv.chems += c; const d = 40000 * s; State.money.dirty += d; return `+${fmt(c)} L de químicos y $${fmt(d)} sucios.`; } },
    { id: 'valores', icon: '🚚', name: 'Camión de valores', sic: 50, eli: 2, secs: 90, diff: 110, cd: 600, heat: 25,
      desc: 'Un blindado sale del aeropuerto con la nómina de una minera.',
      reward: s => { const d = 150000 * s; State.money.dirty += d; return `$${fmt(d)} sucios en billetes nuevecitos.`; } },
    { id: 'avion', icon: '✈️', name: 'Robar una avioneta', sic: 25, eli: 5, secs: 90, diff: 130, cd: 900, heat: 15,
      desc: 'En el aeródromo de Toluca hay una avioneta que nadie va a extrañar.',
      reward: () => { const v = Config.vehicles.find(x => x.name === 'Avioneta'); State.fleet.push({ uid: State.nextUid++, type: v.id, name: 'La Robada ' + State.nextUid, hp: 100, km: 0, insured: false }); Core.Assets.renderFleet && Core.Assets.renderFleet(); return 'Una Avioneta nueva para tu flota (600 kg, gratis).'; } },
    { id: 'ejercito', icon: '🪖', name: 'Convoy del ejército', sic: 80, eli: 15, secs: 150, diff: 320, cd: 1200, heat: 35,
      desc: 'Un convoy con armamento nuevo va de la Ciudad de México a la frontera.',
      reward: () => { State.weaponsLvl++; return `Tu armamento sube a nivel ${State.weaponsLvl} sin pagar un peso.`; } },
    { id: 'contador', icon: '💼', name: 'Secuestrar al contador de un rival', sic: 40, eli: 10, secs: 120, diff: 240, cd: 900, heat: 20, req: () => Core.Rivals.alive().length > 0,
      desc: 'Él sabe dónde guarda el dinero su jefe. Y lo va a decir.',
      reward: () => { const rid = pick(Core.Rivals.alive()), R = State.rivals[rid]; const d = Math.floor(R.power * 3000); R.power = Math.round(R.power * 0.75); State.money.dirty += d; return `Vaciaste una caja fuerte de ${Config.rivals[rid].name}: $${fmt(d)} sucios y su poder baja 25%.`; } },
    { id: 'carcel', icon: '⛓️', name: 'Fuga de Puente Grande', sic: 120, eli: 20, secs: 210, diff: 450, cd: 1800, heat: 40,
      desc: 'Adentro está "El Ingeniero", un genio que hizo túneles para medio país. Sácalo y trabajará para ti.',
      reward: () => {
          if (State.lieutenants.length >= 10) { State.lieutenants.forEach(l => l.xp += 300); return 'No había lugar para él, pero tus tenientes aprendieron de la fuga: +300 experiencia a todos.'; }
          const roles = Object.keys(Config.roles);
          State.lieutenants.push({ id: State.nextLtId++, name: 'El Ingeniero', role: pick(roles), trait: 'Genio', level: 3, xp: Config.ltLevels[2], loyalty: 100, active: Core.HR.activeCount() < 6 });
          Core.HR.render(); Core.Logistics.updateUI();
          return 'El Ingeniero se une a tu organización: teniente nivel 3, rasgo Genio, lealtad total.';
      } }
];

Core.Golpes = {
    G() { return State.golpes; },
    // los golpes se hacen más difíciles conforme avanzas
    scale() { return (1 + 0.5 * Core.War.owned().length) * dynMult(); },
    diff(g) { return Math.round(g.diff * this.scale()); },
    ready(g) { return (this.G().cd[g.id] || 0) <= State.stats.playTime; },
    crew(g) { const m = this.G().mult[g.id] || 1; return { sic: g.sic * m, eli: g.eli * m }; },
    setMult(id, v) { this.G().mult[id] = +v; this.render(); },
    chance(g) { const c = this.crew(g); return Core.War.chance(Core.War.power(c.sic, c.eli), this.diff(g)); },

    start(id) {
        const g = Config.golpes.find(x => x.id === id), G = this.G();
        if (G.active) return UI.notify('Ya tienes un golpe en marcha.', 'bad');
        if (!this.ready(g)) return;
        if (g.req && !g.req()) return UI.notify('Ya no hay a quién hacerle este golpe.', 'bad');
        const c = this.crew(g);
        if (State.army < c.sic || State.elite < c.eli) return UI.notify(`Necesitas ${fmt(c.sic)} sicarios y ${fmt(c.eli)} de élite libres en la reserva.`, 'bad');
        State.army -= c.sic; State.elite -= c.eli;
        G.active = { id, sic: c.sic, eli: c.eli, left: g.secs, total: g.secs, chance: this.chance(g) };
        Sfx.click();
        UI.notify(`${g.icon} Empezó la planeación: ${g.name} (${fmtTime(g.secs)}).`);
        this.render();
    },
    // cada 3 segundos
    tick() {
        const A = this.G().active;
        if (!A) return;
        A.left -= 3;
        if (A.left > 0) { if (UI.current === 'golpes') this.render(); return; }
        const g = Config.golpes.find(x => x.id === A.id), G = this.G();
        G.active = null;
        G.cd[g.id] = State.stats.playTime + g.cd;
        const ok = Math.random() < A.chance;
        const sicLost = Math.floor(A.sic * (ok ? 0.05 : 0.3) * Math.random());
        let eliLost = 0; for (let i = 0; i < A.eli; i++) if (Math.random() < (ok ? 0.02 : 0.12)) eliLost++;
        State.army += A.sic - sicLost; State.elite += A.eli - eliLost;
        Core.Heat.add(ok ? g.heat : g.heat * 1.5);
        const loss = sicLost || eliLost ? `\nBajas: ${sicLost} sicarios${eliLost ? ` y ${eliLost} de élite` : ''}.` : '\nSin bajas.';
        if (ok) {
            const txt = g.reward(Core.Golpes.scale());
            G.done = (G.done || 0) + 1;
            Sfx.fanfare();
            Core.News.add(`Golpe espectacular: "${g.name}". Autoridades sin pistas`, 'bad', true);
            UI.modal(`${g.icon} GOLPE EXITOSO`, `${g.name}\n\n${txt}${loss}`, [{ text: 'LIMPIO', style: 'btn-gold', cb: () => { } }]);
        } else {
            Sfx.error();
            Core.News.add(`Frustran asalto: "${g.name}" termina en balacera`, 'bad');
            UI.modal(`${g.icon} EL GOLPE SALIÓ MAL`, `${g.name}\n\nAlguien les avisó. Tu gente tuvo que huir con las manos vacías.${loss}`, [{ text: 'MALDITA SEA', style: 'btn-red', cb: () => { } }]);
        }
        UI.setBadge('golpes', '!');
        this.render();
    },

    render() {
        const wrap = $('golpes-wrap');
        if (!wrap) return;
        UI.setBadge('golpes', null);
        const A = this.G().active;
        let html = '';
        if (A) {
            const g = Config.golpes.find(x => x.id === A.id);
            html += `<div class="op-card glow" style="border-color:var(--gold)"><h3>${g.icon} EN MARCHA: ${g.name.toUpperCase()}</h3>
                <div class="status-row"><span>${fmt(A.sic)} sicarios + ${fmt(A.eli)} élite · probabilidad ${Math.round(A.chance * 100)}%</span><span class="gold">${fmtTime(A.left)}</span></div>
                <div class="progress-line" style="height:8px;"><div class="progress-active" style="width:${100 - A.left / A.total * 100}%"></div></div></div>`;
        }
        html += `<p class="muted tiny" style="margin:10px 0;">Manda un equipo de tu reserva; regresan cuando termina el golpe (si sobreviven). Entre más gente mandes, más probabilidad. Libres ahora: ${fmt(State.army)} sicarios y ${fmt(State.elite)} élite. Hechos: ${this.G().done || 0}.</p><div class="grid-cards">`;
        html += Config.golpes.map(g => {
            const ready = this.ready(g), c = this.crew(g), ch = this.chance(g), m = this.G().mult[g.id] || 1;
            const avail = !g.req || g.req();
            const col = ch >= 0.75 ? 'green' : ch >= 0.45 ? 'gold' : 'red';
            return `<div class="op-card ${avail ? '' : 'locked'}">
                <h3>${g.icon} ${g.name.toUpperCase()}</h3>
                <p class="tiny muted">${g.desc}</p>
                <div class="status-row tiny"><span>Dificultad</span><span>${fmt(this.diff(g))}</span></div>
                <div class="status-row tiny"><span>Equipo</span><span>${fmt(c.sic)} sicarios${c.eli ? ' + ' + fmt(c.eli) + ' élite' : ''}</span></div>
                <div class="status-row tiny"><span>Probabilidad</span><span class="${col}">${Math.round(ch * 100)}%</span></div>
                <select onchange="Core.Golpes.setMult('${g.id}', this.value)">${[1, 2, 3, 5].map(x => `<option value="${x}" ${m === x ? 'selected' : ''}>Equipo x${x}</option>`).join('')}</select>
                ${!avail ? '<div class="tiny muted">Ya no hay a quién.</div>' : !ready ? `<div class="tiny muted" style="margin-top:6px;">⏳ Se puede repetir en ${fmtTime(this.G().cd[g.id] - State.stats.playTime)}</div>`
                    : `<button class="action-btn btn-red" onclick="Core.Golpes.start('${g.id}')" ${A ? 'disabled' : ''}>${A ? 'OTRO GOLPE EN MARCHA' : `PLANEAR · ${fmtTime(g.secs)}`}</button>`}
            </div>`;
        }).join('') + '</div>';
        wrap.innerHTML = html;
    }
};

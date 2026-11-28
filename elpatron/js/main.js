/* =========================================================
   Arranque, pantalla de inicio, intro y bucles del juego
   ========================================================= */
Core.Game = {
    running: false,
    paused: false,
    typing: null,

    isFrozen() { return State.timers.frozen > now(); },

    boot() {
        UI.buildNav();
        Sfx.updateButtons();
        const has = Core.Save.has();
        $('btn-continue').classList.toggle('hidden', !has);
        if (has) {
            try {
                const d = JSON.parse(localStorage.getItem(SAVE_KEY));
                const lbl = d.mode === 'libre' ? 'MODO LIBRE' : `HISTORIA · CAP. ${((d.story && d.story.chapter) || 0) + 1}`;
                $('btn-continue').textContent = `▶ CONTINUAR (${lbl})`;
            } catch (e) { }
        }
        $('btn-newgame').textContent = has ? 'NUEVA PARTIDA (BORRA LA ACTUAL)' : 'NUEVA PARTIDA';
        $('start-legacy').textContent = Legacy.points ? `👑 LEGADO: ${Legacy.points} puntos · ${Legacy.runs} retiro(s) · +${Legacy.points * 5}% a todo · Próxima: ${dynastyName(Legacy.runs)}, cárteles x${dynastyMult(Legacy.runs).toFixed(1)} más duros` : '';
        document.addEventListener('keydown', e => this.keys(e));
        document.addEventListener('pointerdown', () => Sfx.init(), { once: true });
        window.addEventListener('beforeunload', () => { if (this.running) Core.Save.save(); });
        document.addEventListener('visibilitychange', () => { if (document.hidden && this.running) Core.Save.save(); });
    },

    continueGame() {
        Sfx.init(); Sfx.click();
        Core.Save.load();
        $('start-screen').classList.add('hidden');
        this.start();
        Core.Offline.apply();
    },
    // Paso 1: elegir modo de juego
    newGame() {
        Sfx.init(); Sfx.click();
        $('mode-screen').classList.remove('hidden');
    },
    closeModes() { $('mode-screen').classList.add('hidden'); },
    // Paso 2: arrancar en el modo elegido
    startMode(mode) {
        Sfx.click();
        if (Core.Save.has() && !confirm('¿Empezar de cero? Se borrará tu partida actual (el Legado se conserva).')) return;
        try { localStorage.removeItem(SAVE_KEY); } catch (e) { }
        State = newState();
        State.mode = mode;
        $('mode-screen').classList.add('hidden');
        $('start-screen').classList.add('hidden');
        Core.News.add('Mérida, la ciudad más segura del país, amanece tranquila. Por ahora.');
        if (mode === 'libre') {
            State.money.dirty += 25000;
            State.money.clean += 10000;
            State.unlocked = Object.keys(Config.unlocks);
            this.start();
            UI.modal('🗺️ MODO LIBRE', 'Todo está desbloqueado desde el inicio y no hay capítulos.\nArrancas en Mérida con $26.5K sucios y $10.5K limpios.\n\nTu meta: retirarte con $1B offshore, los 14 territorios y las 16 tecnologías. Cómo llegues es cosa tuya.', [{ text: 'A JUGAR', style: 'btn-gold', cb: () => { } }]);
        } else {
            this.showChapter(Config.story[0], 'PRÓLOGO');
            this.start();
        }
    },

    // Muestra la intro de un capítulo con efecto de máquina de escribir
    showChapter(ch, header) {
        if (!ch) return;
        const idx = Config.story.indexOf(ch);
        const scr = $('intro-screen');
        scr.classList.remove('hidden');
        setText('intro-chapter', header);
        const full = `CAPÍTULO ${idx + 1}: ${ch.title.toUpperCase()}\n\n${ch.text}\n\n🎯 Objetivo: ${ch.goal}`;
        const el = $('intro-text');
        el.textContent = '';
        let i = 0;
        clearInterval(this.typing);
        this.wasPaused = this.paused;
        this.paused = true;
        this.typing = setInterval(() => {
            el.textContent = full.slice(0, i += 2);
            if (i % 8 === 0) Sfx.click();
            if (i >= full.length) clearInterval(this.typing);
        }, 22);
        this.fullIntro = full;
    },
    skipIntro() {
        clearInterval(this.typing);
        $('intro-text').textContent = this.fullIntro || '';
    },
    endIntro() {
        clearInterval(this.typing);
        $('intro-screen').classList.add('hidden');
        this.paused = !!this.wasPaused;
        Core.Story.render();
    },

    start() {
        if (this.running) return;
        this.running = true;
        UI.buildNav();
        Core.Unlocks.refresh(true);
        Core.War.calcBonuses();
        Core.War.initCanvas();
        Core.Contracts.refill();
        Core.Respect.calc();
        Core.News.renderTicker();
        Core.Story.render();
        $('weather-display').textContent = Config.weather[State.weatherCurrent];
        UI.nav('ops');
        if (State.incoming.length) UI.renderAttackAlert();

        // Bucle rápido: 10 veces por segundo
        setInterval(() => {
            if (this.paused) return;
            State.ticks++;
            Core.Ops.tick();
            Core.Logistics.tick();
            Core.Logistics.autoRun();
            Core.Assets.autoRepair();
            Core.Finance.passiveIncome();
            Core.Shadow.tick();
            Core.Rivals.incomingTick();
            if (State.ticks % 10 === 0) UI.refreshView();
            if (State.ticks % 600 === 0) Core.Assets.insuranceTick();
            UI.updateHUD();
        }, 100);

        // Bucle lento: cada 3 segundos
        setInterval(() => {
            if (this.paused) return;
            State.stats.playTime += 3;
            Core.Market.fluctuate();
            Core.Heat.tick();
            Core.Rivals.tick();
            Core.Fronts.tick();
            Core.Aguila.tick();
            Core.Finance.loanTick();
            Core.HR.tick();
            if (State.stats.playTime % 60 === 0) Core.War.payroll();
            Core.Contracts.refill();
            Core.Events.check();
            Core.Respect.calc();
            Core.Achievements.check();
            Core.Story.check();
            Core.News.flavor();
            this.weather();
            Core.Save.save();
        }, 3000);
    },

    weather() {
        if (Math.random() < 0.05) {
            State.weatherCurrent = Math.random() < 0.55 ? 0 : 1 + Math.floor(Math.random() * 3);
            $('weather-display').textContent = Config.weather[State.weatherCurrent];
            if (State.weatherCurrent === 2) Core.News.add('Tormenta azota el Pacífico; cierran carreteras');
        }
    },

    togglePause() {
        if (!this.running) return;
        this.paused = !this.paused;
        $('pause-modal').classList.toggle('hidden', !this.paused);
        if (this.paused) Core.Save.save();
    },
    hardReset() {
        if (!confirm('¿BORRAR TODO Y VOLVER AL INICIO? (El Legado se conserva)')) return;
        Core.Save.wipe();
        location.reload();
    },

    // Atajos: espacio = pausa; escribir "patron" abre el panel de desarrollador
    keyBuf: '',
    keys(e) {
        const tag = document.activeElement && document.activeElement.tagName;
        if (['INPUT', 'SELECT', 'TEXTAREA'].includes(tag)) return;
        if (e.code === 'Space' && this.running) { e.preventDefault(); this.togglePause(); return; }
        if (e.key && e.key.length === 1) {
            this.keyBuf = (this.keyBuf + e.key.toLowerCase()).slice(-6);
            if (this.keyBuf === 'patron') { $('dev-panel').classList.toggle('hidden'); this.keyBuf = ''; }
        }
    }
};

/* Panel de desarrollador (oculto) */
Core.Dev = {
    money() { State.money.dirty += 1e6; State.money.clean += 1e6; UI.notify('DEV: +$1M sucio y limpio'); },
    chems() { State.inv.chems += 5000; },
    army() { State.army += 100; },
    time() { State.lastSave = now() - 3600000; Core.Offline.apply(); },
    attack() {
        const rid = Core.Rivals.randomAlive();
        const t = State.territories.find(x => x.owner === 'player' && x.id !== Config.baseId);
        if (rid && t) Core.Rivals.spawnAttack(rid, t.id); else UI.notify('DEV: conquista una plaza primero');
    }
};

window.addEventListener('load', () => Core.Game.boot());

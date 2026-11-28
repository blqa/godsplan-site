/* =========================================================
   NUBE: acceso por Alias + Clave rápida y 3 slots de guardado
   - Firebase (Auth anónima + Firestore) cargado con import() dinámico,
     así funciona aunque el juego use <script> normales.
   - Si Firebase o la red fallan, todo sigue funcionando con localStorage.
   - Ruta en Firestore: profiles/{perfil}/slots/{versión}_{1..3}
     {perfil} = huella SHA-256 de "alias|clave" (nunca se guarda la clave).
   ========================================================= */
Core.Cloud = {
    SDK: 'https://www.gstatic.com/firebasejs/10.12.2/',
    SLOTS: 3,
    SESSION_KEY: 'elpatron_profile',
    online: false,      // Firebase conectado
    fb: null,           // { db, doc, getDoc, setDoc, deleteDoc, serverTimestamp }
    user: null,         // { alias, pid, guest }
    cache: {},          // slots ya leídos

    ver() { return window.EP_VERSION || 'clasica'; },
    localKey(n) { return `elpatron_slot_${this.user ? this.user.pid : 'guest'}_${this.ver()}_${n}`; },
    activeKey() { return `elpatron_active_${this.user ? this.user.pid : 'guest'}_${this.ver()}`; },
    active() { try { return +localStorage.getItem(this.activeKey()) || 0; } catch (e) { return 0; } },
    setActive(n) { try { localStorage.setItem(this.activeKey(), String(n)); } catch (e) { } },
    timeout(p, ms = 6000) { return Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]); },

    /* ---------- arranque ---------- */
    async init() {
        try { this.user = JSON.parse(localStorage.getItem(this.SESSION_KEY) || 'null'); } catch (e) { this.user = null; }
        this.renderBar();
        if (!this.user) this.openLogin();
        await this.connect();
        this.renderBar();
        if (this.user && !this.user.guest) this.touchProfile();
        // autoguardado en el slot activo cada 2 minutos
        setInterval(() => { if (Core.Game.running && this.active()) this.saveSlot(this.active(), true); }, 120000);
    },
    async connect() {
        if (!window.EP_FIREBASE || this.online) return this.online;
        try {
            const [appM, authM, fsM] = await this.timeout(Promise.all([
                import(this.SDK + 'firebase-app.js'), import(this.SDK + 'firebase-auth.js'), import(this.SDK + 'firebase-firestore.js')
            ]), 8000);
            const app = appM.initializeApp(window.EP_FIREBASE);
            const auth = authM.getAuth(app);
            await this.timeout(authM.signInAnonymously(auth), 8000);
            this.fb = { db: fsM.getFirestore(app), doc: fsM.doc, getDoc: fsM.getDoc, setDoc: fsM.setDoc, deleteDoc: fsM.deleteDoc };
            this.online = true;
        } catch (e) {
            console.warn('Nube no disponible, guardando solo en este dispositivo:', e && e.message);
            this.online = false;
        }
        return this.online;
    },
    useCloud() { return this.online && this.user && !this.user.guest; },
    ref(n) { return this.fb.doc(this.fb.db, 'profiles', this.user.pid, 'slots', `${this.ver()}_${n}`); },
    async touchProfile() {
        if (!this.useCloud()) return;
        try { await this.timeout(this.fb.setDoc(this.fb.doc(this.fb.db, 'profiles', this.user.pid), { alias: this.user.alias, lastSeen: Date.now() }, { merge: true })); } catch (e) { }
    },

    /* ---------- acceso ficticio ---------- */
    async hash(txt) {
        try {
            const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(txt));
            return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
        } catch (e) { // navegadores sin crypto.subtle (http): huella simple
            let h = 0; for (const ch of txt) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
            return ('p' + h.toString(16)).padEnd(32, '0');
        }
    },
    openLogin() {
        $('login-screen').classList.remove('hidden');
        $('login-alias').value = this.user && !this.user.guest ? this.user.alias : '';
        $('login-pin').value = '';
        setText('login-msg', this.online ? '☁️ Conectado a la nube' : 'Tus partidas se guardan en la nube cuando hay conexión.');
    },
    closeLogin() { $('login-screen').classList.add('hidden'); },
    async login() {
        const alias = ($('login-alias').value || '').trim().slice(0, 24);
        const pin = ($('login-pin').value || '').trim();
        if (alias.length < 2) return setText('login-msg', '⚠️ Escribe un alias de al menos 2 letras.');
        if (pin.length < 4) return setText('login-msg', '⚠️ La clave rápida debe tener al menos 4 caracteres.');
        const pid = await this.hash(alias.toLowerCase() + '|' + pin);
        this.user = { alias, pid, guest: false };
        try { localStorage.setItem(this.SESSION_KEY, JSON.stringify(this.user)); } catch (e) { }
        this.cache = {};
        this.closeLogin();
        Sfx.click();
        await this.connect();
        this.touchProfile();
        this.renderBar();
        UI.notify(`👤 Entraste como ${alias}${this.online ? ' (☁️ nube)' : ' (💾 solo este dispositivo)'}.`);
    },
    guest() {
        this.user = { alias: 'Invitado', pid: 'guest', guest: true };
        try { localStorage.setItem(this.SESSION_KEY, JSON.stringify(this.user)); } catch (e) { }
        this.cache = {};
        this.closeLogin();
        this.renderBar();
    },

    /* ---------- resumen de un slot ---------- */
    summary() {
        const S = State, rank = (Config.ranks[S.rank] || Config.ranks[0]).name;
        return {
            mode: S.mode === 'libre' ? 'Libre' : 'Historia',
            chapter: (S.story && S.story.chapter || 0) + 1,
            rank, worth: Math.floor(S.respect || 0), offshore: Math.floor(S.money.offshore || 0),
            playTime: Math.floor(S.stats.playTime || 0),
            alias: S.me ? S.me.alias : 'El Patrón', cartel: S.me ? S.me.cartel : '', emblem: S.me ? S.me.emblem : '👑',
            dynasty: S.dynasty || 0
        };
    },

    /* ---------- leer / guardar / borrar ---------- */
    readLocal(n) { try { return JSON.parse(localStorage.getItem(this.localKey(n)) || 'null'); } catch (e) { return null; } },
    async read(n) {
        let rec = this.readLocal(n);
        if (this.useCloud()) {
            try {
                const snap = await this.timeout(this.fb.getDoc(this.ref(n)));
                const cloud = snap.exists() ? snap.data() : null;
                if (cloud && (!rec || (cloud.updatedAt || 0) >= (rec.updatedAt || 0))) { rec = cloud; try { localStorage.setItem(this.localKey(n), JSON.stringify(rec)); } catch (e) { } }
                else if (!cloud && rec && rec.synced) rec = null; // se borró en otro dispositivo
            } catch (e) { /* sin red: nos quedamos con la copia local */ }
        }
        this.cache[n] = rec;
        return rec;
    },
    async saveSlot(n, silent) {
        if (!Core.Game.running) return UI.notify('Primero empieza o continúa una partida.', 'bad');
        Core.Save.save();
        const rec = { v: this.ver(), n, summary: this.summary(), data: JSON.stringify(State), updatedAt: Date.now(), synced: false };
        let where = '💾 este dispositivo';
        if (this.useCloud()) {
            try { await this.timeout(this.fb.setDoc(this.ref(n), Object.assign({}, rec, { synced: true }))); rec.synced = true; where = '☁️ la nube'; }
            catch (e) { where = '💾 este dispositivo (sin conexión a la nube)'; }
        }
        try { localStorage.setItem(this.localKey(n), JSON.stringify(rec)); }
        catch (e) { if (!rec.synced) return UI.notify('No se pudo guardar: el navegador no tiene espacio.', 'bad'); }
        this.cache[n] = rec;
        this.setActive(n);
        if (!silent) { Sfx.coin(); UI.notify(`💾 Guardado en el Slot ${n} (${where}).`); }
        if (!$('slots-screen').classList.contains('hidden')) this.renderSlots();
    },
    async loadSlot(n) {
        const rec = this.cache[n] || await this.read(n);
        if (!rec || !rec.data) return UI.notify('Ese slot está vacío.', 'bad');
        try { JSON.parse(rec.data); } catch (e) { return UI.notify('Ese slot está dañado.', 'bad'); }
        Core.Save.wiping = true; // que el cierre de página no sobrescriba con la partida actual
        localStorage.setItem(SAVE_KEY, rec.data);
        this.setActive(n);
        try { sessionStorage.setItem('ep_autocontinue', '1'); } catch (e) { }
        location.reload();
    },
    async deleteSlot(n) {
        if (this.useCloud()) { try { await this.timeout(this.fb.deleteDoc(this.ref(n))); } catch (e) { } }
        try { localStorage.removeItem(this.localKey(n)); } catch (e) { }
        delete this.cache[n];
        if (this.active() === n) this.setActive(0);
        UI.notify(`🗑️ Slot ${n} borrado.`);
        this.renderSlots();
    },
    // confirmaciones
    askSave(n) {
        const r = this.cache[n];
        if (!r) return this.saveSlot(n);
        UI.modal(`💾 SOBRESCRIBIR SLOT ${n}`, `Ya hay una partida aquí:\n${this.line(r.summary)}\n\n¿La reemplazas con la actual?`, [
            { text: 'SOBRESCRIBIR', style: 'btn-red', cb: () => { this.saveSlot(n); } }, { text: 'Cancelar', cb: () => { } }]);
    },
    askLoad(n) {
        const r = this.cache[n];
        if (!r) return;
        const go = () => this.loadSlot(n);
        if (!Core.Game.running) return go();
        UI.modal(`📂 CARGAR SLOT ${n}`, `Vas a cargar:\n${this.line(r.summary)}\n\nLo que no hayas guardado de tu partida actual se pierde.`, [
            { text: 'CARGAR', style: 'btn-gold', cb: go }, { text: 'Cancelar', cb: () => { } }]);
    },
    askDelete(n) {
        const r = this.cache[n];
        if (!r) return;
        UI.modal(`🗑️ BORRAR SLOT ${n}`, `Se borra para siempre${this.useCloud() ? ' (también de la nube)' : ''}:\n${this.line(r.summary)}`, [
            { text: 'BORRAR', style: 'btn-red', cb: () => { this.deleteSlot(n); } }, { text: 'Cancelar', cb: () => { } }]);
    },

    /* ---------- pantallas ---------- */
    line(s) { return s ? `${s.emblem} ${s.alias} · ${s.mode}${s.mode === 'Historia' ? ' cap. ' + s.chapter : ''} · ${s.rank} · $${fmt(s.worth)} · ${fmtTime(s.playTime)}` : ''; },
    renderBar() {
        const u = this.user;
        const html = u ? `👤 <b>${u.alias}</b> · ${u.guest ? '💾 invitado (solo este dispositivo)' : this.online ? '☁️ nube conectada' : '💾 sin nube por ahora'} · <a href="#" onclick="Core.Cloud.openLogin(); return false;">cambiar</a>` : '';
        setHTML('cloud-bar', html);
        setText('footer-slot', u ? `👤 ${u.alias}${this.active() ? ' · Slot ' + this.active() : ''}` : '');
    },
    async openSlots() {
        if (!this.user) return this.openLogin();
        $('slots-screen').classList.remove('hidden');
        setHTML('slots-list', '<p class="muted center">Cargando partidas...</p>');
        for (let n = 1; n <= this.SLOTS; n++) await this.read(n);
        this.renderSlots();
    },
    closeSlots() { $('slots-screen').classList.add('hidden'); },
    renderSlots() {
        const inGame = Core.Game.running, act = this.active();
        setText('slots-sub', `${this.user.alias} · versión ${this.ver()} · ${this.useCloud() ? '☁️ se guarda en la nube y en este dispositivo' : '💾 solo en este dispositivo'}`);
        let h = '';
        for (let n = 1; n <= this.SLOTS; n++) {
            const r = this.cache[n], s = r && r.summary;
            h += `<div class="slot-card ${act === n ? 'active' : ''}">
                <div class="row-between"><b class="gold">SLOT ${n}${act === n ? ' · EN USO' : ''}</b><span class="tiny muted">${r ? (r.synced ? '☁️' : '💾') + ' ' + new Date(r.updatedAt).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }) : 'VACÍO'}</span></div>
                ${s ? `<div class="slot-sum">
                        <div>${s.emblem} <b>${s.alias}</b> <span class="muted">${s.cartel}</span></div>
                        <div class="tiny">${s.mode}${s.mode === 'Historia' ? ` · Capítulo ${s.chapter}` : ''} · ${s.rank}${s.dynasty ? ` · ${dynastyName(s.dynasty)}` : ''}</div>
                        <div class="tiny">Patrimonio $${fmt(s.worth)} · Offshore $${fmt(s.offshore)} · ⏱️ ${fmtTime(s.playTime)}</div>
                    </div>` : '<div class="slot-sum muted tiny">Sin partida guardada.</div>'}
                <div class="btn-row" style="margin-top:8px;">
                    <button class="action-btn btn-green" style="margin:0;" onclick="Core.Cloud.askSave(${n})" ${inGame ? '' : 'disabled title="Empieza o continúa una partida para guardar"'}>GUARDAR</button>
                    <button class="action-btn btn-gold" style="margin:0;" onclick="Core.Cloud.askLoad(${n})" ${r ? '' : 'disabled'}>CARGAR</button>
                    <button class="action-btn btn-red" style="margin:0;" onclick="Core.Cloud.askDelete(${n})" ${r ? '' : 'disabled'}>BORRAR</button>
                </div>
            </div>`;
        }
        setHTML('slots-list', h);
    }
};

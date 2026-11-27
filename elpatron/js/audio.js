/* =========================================================
   Efectos de sonido sintetizados con Web Audio (sin archivos)
   ========================================================= */
const Sfx = {
    ctx: null,
    master: null,
    muted: (() => { try { return localStorage.getItem('elpatron_mute') === '1'; } catch (e) { return false; } })(),
    last: {},

    init() {
        if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return true; }
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return false;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.35;
        this.master.connect(this.ctx.destination);
        return true;
    },
    toggle() {
        this.muted = !this.muted;
        try { localStorage.setItem('elpatron_mute', this.muted ? '1' : '0'); } catch (e) { }
        this.updateButtons();
        if (!this.muted) { this.init(); this.click(); }
    },
    updateButtons() {
        const label = this.muted ? '🔇' : '🔊';
        const b = $('btn-sound'); if (b) b.textContent = label;
        const s = $('start-sound'); if (s) s.textContent = `${label} SONIDO ${this.muted ? 'APAGADO' : 'ENCENDIDO'}`;
    },
    // Evita que un mismo sonido se repita 20 veces por segundo
    ok(name, gap = 120) {
        if (this.muted || !this.init()) return false;
        const t = performance.now();
        if (this.last[name] && t - this.last[name] < gap) return false;
        this.last[name] = t;
        return true;
    },
    tone(freq, dur, type = 'sine', vol = 0.5, delay = 0, slideTo = null) {
        const c = this.ctx, t0 = c.currentTime + delay;
        const o = c.createOscillator(), g = c.createGain();
        o.type = type;
        o.frequency.setValueAtTime(freq, t0);
        if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        o.connect(g); g.connect(this.master);
        o.start(t0); o.stop(t0 + dur + 0.05);
    },
    noise(dur, vol = 0.6, delay = 0, filterFreq = 1200, type = 'lowpass') {
        const c = this.ctx, t0 = c.currentTime + delay;
        const len = Math.floor(c.sampleRate * dur);
        const buf = c.createBuffer(1, len, c.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
        const src = c.createBufferSource(); src.buffer = buf;
        const f = c.createBiquadFilter(); f.type = type; f.frequency.value = filterFreq;
        const g = c.createGain(); g.gain.value = vol;
        src.connect(f); f.connect(g); g.connect(this.master);
        src.start(t0);
    },

    click() { if (this.ok('click', 40)) this.tone(900, 0.04, 'square', 0.08); },
    error() { if (this.ok('error', 200)) { this.tone(180, 0.12, 'square', 0.15); this.tone(140, 0.15, 'square', 0.15, 0.1); } },
    // Caja registradora: "ka" + "ching"
    cash() {
        if (!this.ok('cash', 250)) return;
        this.noise(0.05, 0.4, 0, 3000, 'highpass');
        this.tone(1568, 0.25, 'triangle', 0.35, 0.05);
        this.tone(2093, 0.4, 'triangle', 0.3, 0.12);
    },
    // Sirena de policía que sube y baja
    siren() {
        if (!this.ok('siren', 3000)) return;
        for (let i = 0; i < 4; i++) {
            this.tone(650, 0.38, 'sawtooth', 0.12, i * 0.4, 1100);
        }
    },
    gun() {
        if (!this.ok('gun', 80)) return;
        this.noise(0.18, 0.9, 0, 1800);
        this.tone(120, 0.12, 'square', 0.25, 0, 40);
    },
    // Ráfaga de disparos
    burst(n = 5) {
        if (!this.ok('burst', 600)) return;
        for (let i = 0; i < n; i++) { this.noise(0.12, 0.7, i * 0.09 + Math.random() * 0.03, 1600); this.tone(110, 0.08, 'square', 0.15, i * 0.09, 40); }
    },
    explosion() {
        if (!this.ok('explosion', 300)) return;
        this.noise(1.2, 1.0, 0, 400);
        this.tone(80, 0.8, 'sine', 0.6, 0, 30);
    },
    alert() {
        if (!this.ok('alert', 1500)) return;
        [0, 0.18, 0.36].forEach(d => this.tone(880, 0.12, 'square', 0.18, d));
    },
    levelup() {
        if (!this.ok('levelup', 500)) return;
        [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.25, 'triangle', 0.3, i * 0.09));
    },
    fanfare() {
        if (!this.ok('fanfare', 1000)) return;
        [392, 523, 659, 784, 1047, 784, 1047].forEach((f, i) => this.tone(f, 0.35, 'triangle', 0.3, i * 0.13));
    },
    engine() { if (this.ok('engine', 400)) this.tone(90, 0.35, 'sawtooth', 0.12, 0, 160); },
    coin() { if (this.ok('coin', 120)) { this.tone(988, 0.08, 'square', 0.12); this.tone(1319, 0.2, 'square', 0.12, 0.07); } }
};

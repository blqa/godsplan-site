/* =========================================================
   Estado del juego, utilidades y guardado
   ========================================================= */
const SAVE_KEY = 'elpatron_save_v32';
const LEGACY_KEY = 'elpatron_legacy';

/* ---------- Utilidades ---------- */
function fmt(n) {
    n = Math.floor(n || 0);
    const a = Math.abs(n);
    if (a >= 1e12) return (n / 1e12).toFixed(2) + 'T';
    if (a >= 1e9) return (n / 1e9).toFixed(2) + 'B';
    if (a >= 1e6) return (n / 1e6).toFixed(2) + 'M';
    if (a >= 1e4) return (n / 1e3).toFixed(1) + 'K';
    return n.toLocaleString('es-MX');
}
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const $ = id => document.getElementById(id);
function setText(id, v) { const e = $(id); if (e && e.textContent !== String(v)) e.textContent = v; }
function setHTML(id, v) { const e = $(id); if (e && e.innerHTML !== v) e.innerHTML = v; }
function isVisible(view) { const e = $('view-' + view); return e && !e.classList.contains('hidden'); }
const hasTech = id => State.techs.includes(id);
const now = () => Date.now();
const fmtTime = s => { s = Math.max(0, Math.ceil(s)); const m = Math.floor(s / 60); return m > 0 ? `${m}:${String(s % 60).padStart(2, '0')}` : `${s}s`; };

/* ---------- Legado (sobrevive a los reinicios) ---------- */
const Legacy = (() => {
    try { return Object.assign({ points: 0, runs: 0, wins: 0 }, JSON.parse(localStorage.getItem(LEGACY_KEY) || '{}')); }
    catch (e) { return { points: 0, runs: 0, wins: 0 }; }
})();
const legacyMult = () => 1 + Legacy.points * 0.05;

/* ---------- Estado inicial ---------- */
function newState() {
    const rivals = {};
    Object.values(Config.rivals).forEach(r => rivals[r.id] = { power: r.startPower, truceUntil: 0, relation: 0, defeated: false });
    const shadow = {};
    Config.shadow.forEach(s => shadow[s.id] = false);
    const zeroP = () => ({ weed: 0, meth: 0, coke: 0, heroin: 0, fenta: 0 });
    return {
        version: 32,
        money: { dirty: 1500 + Legacy.points * 10000, clean: 500, offshore: 0 },
        inv: Object.assign(zeroP(), { chems: 0 }),
        ops: Object.assign(zeroP(), { weed: 1, mobile: false }),
        opsStatus: { weed: true, meth: true, coke: true, heroin: true, fenta: true, mobile: true },
        labs: Object.assign(zeroP(), { weed: 1 }),
        autoChem: false,
        army: 0, elite: 0, armyPower: 1,
        military: { 6: 0, 7: 0 }, militaryBought: { 6: 0, 7: 0 },
        respect: 0, rank: 0,
        heat: 0, heatCap: 100,
        market: { weed: 1, meth: 1, coke: 1, heroin: 1, fenta: 1 },
        sat: zeroP(),
        stocks: { chem: { owned: 0, price: 100 }, tran: { owned: 0, price: 250 }, safe: { owned: 0, price: 500 } },
        fleet: [{ uid: 1, type: 0, name: 'El Burro', hp: 100, km: 0, insured: false }],
        nextUid: 2,
        routes: [],
        lieutenants: [], candidates: [], nextLtId: 1,
        territories: Config.territories.map(t => ({ id: t.id, owner: t.owner, troops: t.troops, tanks: 0, up: { fort: 0, lab: 0, bodega: 0 } })),
        rivals,
        incoming: [],
        contacts: { police: false, customs: false, union: false, lawyer: false },
        launderingLevels: ['street'],
        fronts: {},
        loan: { debt: 0, dueAt: 0, anger: 0, lastPenalty: 0 },
        techs: [],
        achievements: [],
        story: { chapter: 0 },
        contracts: [],
        news: [],
        weatherCurrent: 0,
        automation: { active: false, smart: false, prod: 'weed', veh: 0, dist: 1, min: 20 },
        ticks: 0,
        luxuries: { ak47: 0, tiger: 0, lambo: 0 },
        investments: { local: 0, hotel: 0, office: 0, casino: 0, island: 0 },
        shadow,
        timers: { frozen: 0, informant: 0 },
        stats: {
            playTime: 0, dirtyEarned: 0, kgSold: 0, shipments: 0, conquests: 0, raids: 0, laundered: 0, contractsDone: 0,
            lostTerritories: 0, seizures: 0, defended: 0, bossesDefeated: 0, loansPaid: 0
        },
        lastSave: 0
    };
}

let State = newState();

/* Core se llena en cada archivo: Core.Ops, Core.War, etc. */
const Core = {};

/* Información estática + dinámica de un territorio */
const terr = id => Object.assign({}, Config.territories[id], State.territories[id]);

/* ---------- Guardar / cargar ---------- */
Core.Save = {
    wiping: false,
    has() { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } },
    save() {
        if (this.wiping) return;
        State.lastSave = now();
        try { localStorage.setItem(SAVE_KEY, JSON.stringify(State)); } catch (e) { }
    },
    load() {
        let data = null;
        try { data = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (e) { data = null; }
        if (!data) return false;
        const def = newState();
        // Merge con valores por defecto para que partidas viejas no truenen
        const merged = Object.assign(def, data);
        ['money', 'inv', 'ops', 'opsStatus', 'labs', 'military', 'militaryBought', 'market', 'sat', 'contacts', 'loan', 'story',
            'automation', 'luxuries', 'investments', 'shadow', 'timers', 'stats'].forEach(k => {
                merged[k] = Object.assign(newState()[k], data[k] || {});
            });
        merged.stocks = Object.assign(newState().stocks, data.stocks || {});
        const baseRivals = newState().rivals;
        Object.keys(baseRivals).forEach(id => merged.rivals[id] = Object.assign(baseRivals[id], (data.rivals || {})[id] || {}));
        if (!Array.isArray(data.territories) || data.territories.length !== Config.territories.length) merged.territories = newState().territories;
        merged.territories.forEach(t => { t.up = Object.assign({ fort: 0, lab: 0, bodega: 0 }, t.up || {}); t.tanks = t.tanks || 0; });
        ['fleet', 'routes', 'lieutenants', 'candidates', 'techs', 'achievements', 'contracts', 'news', 'incoming', 'launderingLevels'].forEach(k => {
            if (!Array.isArray(merged[k])) merged[k] = newState()[k];
        });
        if (!merged.fleet.length) merged.fleet = newState().fleet;
        // Rutas cuyo vehículo ya no existe se descartan
        merged.routes = merged.routes.filter(r => merged.fleet.some(v => v.uid === r.vUid));
        State = merged;
        return true;
    },
    wipe() {
        this.wiping = true;
        try { localStorage.removeItem(SAVE_KEY); } catch (e) { }
    }
};

Core.SaveIO = {
    exportSave() {
        Core.Save.save();
        const code = btoa(unescape(encodeURIComponent(localStorage.getItem(SAVE_KEY) || '')));
        const done = () => UI.notify('Código de partida copiado al portapapeles.', 'event');
        if (navigator.clipboard) navigator.clipboard.writeText(code).then(done).catch(() => prompt('Copia tu código:', code));
        else prompt('Copia tu código:', code);
    },
    importSave() {
        const code = prompt('Pega tu código de partida:');
        if (!code) return;
        try {
            const json = decodeURIComponent(escape(atob(code.trim())));
            JSON.parse(json);
            Core.Save.wiping = true;
            localStorage.setItem(SAVE_KEY, json);
            location.reload();
        } catch (e) { UI.notify('Código inválido.', 'bad'); }
    }
};

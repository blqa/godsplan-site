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
    try { return Object.assign({ points: 0, runs: 0, wins: 0, hall: [] }, JSON.parse(localStorage.getItem(LEGACY_KEY) || '{}')); }
    catch (e) { return { points: 0, runs: 0, wins: 0, hall: [] }; }
})();
const legacyMult = () => 1 + Legacy.points * 0.05;
/* Dinastías: cada retiro (y cada punto de Legado) hace a los enemigos más duros.
   Tu Legado multiplica tu economía; esto mantiene el reto en las partidas siguientes. */
const dynastyMult = d => 1 + 0.5 * d + (d > 0 ? 0.02 * Legacy.points : 0);
const dynMult = () => (State && State.dynMult) || 1;
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
const dynastyName = d => 'Dinastía ' + (ROMAN[d] || (d + 1));

/* ---------- Estado inicial ---------- */
function newState() {
    const rivals = {};
    const dyn = Legacy.runs, dm = dynastyMult(dyn);
    Object.values(Config.rivals).forEach(r => rivals[r.id] = { power: Math.round(r.startPower * dm), truceUntil: 0, relation: 0, defeated: false });
    const shadow = {};
    Config.shadow.forEach(s => shadow[s.id] = false);
    const zeroP = () => ({ weed: 0, meth: 0, coke: 0, heroin: 0, fenta: 0 });
    return {
        version: 36,
        mode: 'story',          // 'story' = Modo Historia, 'libre' = Modo Libre
        dynasty: dyn, dynMult: dm,
        unlocked: ['ops', 'story', 'logistics', 'assets'],
        money: { dirty: 1500 + Legacy.points * 10000, clean: 500, offshore: 0 },
        inv: Object.assign(zeroP(), { chems: 0 }),
        ops: Object.assign(zeroP(), { weed: 5, mobile: false }),
        opsStatus: { weed: true, meth: true, coke: true, heroin: true, fenta: true, mobile: true },
        labs: Object.assign(zeroP(), { weed: 1 }),
        autoChem: false,
        army: 0, elite: 0, armyPower: 1, weaponsLvl: 0,
        military: { 6: 0, 7: 0 }, militaryBought: { 6: 0, 7: 0 },
        respect: 0, rank: 0,
        heat: 0, heatCap: 100,
        market: { weed: 1, meth: 1, coke: 1, heroin: 1, fenta: 1 },
        sat: zeroP(),
        stocks: { chem: { owned: 0, price: 100 }, tran: { owned: 0, price: 250 }, safe: { owned: 0, price: 500 } },
        fleet: [{ uid: 1, type: 0, name: 'El Burro', hp: 100, km: 0, insured: false }, { uid: 2, type: 0, name: 'La Burra', hp: 100, km: 0, insured: false }],
        nextUid: 3,
        routes: [],
        lieutenants: [], candidates: [], nextLtId: 1,
        territories: Config.territories.map(t => ({ id: t.id, owner: t.owner, troops: t.owner === 'player' ? t.troops : Math.round(t.troops * dm), elite: 0, tanks: 0, up: { fort: 0, lab: 0, bodega: 0 } })),
        rivals,
        incoming: [],
        contacts: { police: false, customs: false, union: false, lawyer: false },
        launderingLevels: ['street'],
        fronts: {},
        loan: { debt: 0, dueAt: 0, anger: 0, lastPenalty: 0 },
        techs: [],
        research: {},
        siege: {},
        me: null,
        golpes: { active: null, cd: {}, mult: {}, done: 0 },
        vendettas: [], vendettaLog: [], vendettaSeq: 0,
        armyOps: [],
        family: { spouse: null, kids: [], compadre: null, happy: 70, momReady: 0, baby: 0, nextEvent: 0 },
        escape: { missions: {}, fbi: 0, nextOp: 0, started: false, alerted: false, bribes: 0 },
        achievements: [],
        story: { chapter: 0 },
        contracts: [], contractsUnlocked: false,
        news: [],
        weatherCurrent: 0,
        automation: { active: false, smart: false, prod: 'weed', veh: -1, dist: 1, min: 20, fill: 0.5, reserve: true },
        ticks: 0,
        luxuries: { ak47: 0, tiger: 0, lambo: 0 },
        investments: { local: 0, hotel: 0, office: 0, casino: 0, island: 0 },
        shadow,
        timers: { frozen: 0, informant: 0 },
        satNews: {},
        aguila: { attention: 0, influence: 0, cells: {}, def: { infiltrado: 0, abogados: 0, tuneles: 0 }, frozen: 0, acts: {}, borderUntil: 0, done: false, alerted: false, sold: 0 },
        stats: {
            playTime: 0, dirtyEarned: 0, kgSold: 0, shipments: 0, conquests: 0, raids: 0, laundered: 0, contractsDone: 0,
            lostTerritories: 0, seizures: 0, delivered: 0, hijacked: 0, defended: 0, bossesDefeated: 0, loansPaid: 0
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
            'automation', 'luxuries', 'investments', 'shadow', 'timers', 'stats', 'aguila', 'research', 'siege', 'escape', 'golpes', 'family'].forEach(k => {
                merged[k] = Object.assign(newState()[k], data[k] || {});
            });
        merged.stocks = Object.assign(newState().stocks, data.stocks || {});
        const baseRivals = newState().rivals;
        Object.keys(baseRivals).forEach(id => merged.rivals[id] = Object.assign(baseRivals[id], (data.rivals || {})[id] || {}));
        if (!Array.isArray(data.territories) || data.territories.length !== Config.territories.length) merged.territories = newState().territories;
        merged.territories.forEach(t => { t.up = Object.assign({ fort: 0, lab: 0, bodega: 0 }, t.up || {}); t.tanks = t.tanks || 0; t.elite = t.elite || 0; });
        ['unlocked', 'fleet', 'routes', 'lieutenants', 'candidates', 'techs', 'achievements', 'contracts', 'news', 'incoming', 'launderingLevels'].forEach(k => {
            if (!Array.isArray(merged[k])) merged[k] = newState()[k];
        });
        if (!merged.fleet.length) merged.fleet = newState().fleet;
        // quita titulares repetidos (bug de saturación) y deja la saturación dentro del nuevo tope
        const seen = new Set();
        merged.news = merged.news.filter(n => { if (seen.has(n.text)) return false; seen.add(n.text); return true; });
        Object.keys(merged.sat).forEach(k => merged.sat[k] = Math.min(2.5, merged.sat[k]));
        // v33: la base pasó de Culiacán a Mérida y se redistribuyó el mapa
        if ((data.version || 0) < 33) {
            const fresh = newState();
            merged.territories = fresh.territories;
            merged.rivals = fresh.rivals;
            merged.incoming = [];
            merged.contracts = [];
            merged.story.chapter = Math.min(merged.story.chapter || 0, 3);
            merged.version = 33;
        }
        // v35: modos de juego. Las partidas viejas pasan a Modo Historia y conservan
        // los menús donde ya tenían avances.
        if (!data.mode) {
            merged.mode = 'story';
            const u = new Set(['ops', 'story', 'logistics', 'assets']);
            Object.keys(Config.unlocks).forEach(v => { if ((merged.story.chapter || 0) >= Config.unlocks[v]) u.add(v); });
            if (merged.lieutenants.length) { u.add('hr'); u.add('autosend'); }
            if (Object.keys(merged.fronts).length) u.add('fronts');
            if (merged.techs.length) u.add('rnd');
            if (merged.territories.filter(t => t.owner === 'player').length > 1 || merged.army > 0) { u.add('war'); u.add('rivals'); }
            if (Object.values(merged.investments).some(x => x > 0)) u.add('lifestyle');
            if ((merged.stats.laundered || 0) > 0 || merged.money.offshore > 0) u.add('finance');
            merged.unlocked = [...u];
            merged.version = 35;
        }
        // partidas de antes de "tu personaje": un patrón genérico, sin decisiones atrasadas
        if (!data.me) {
            merged.me = { alias: 'El Patrón', cartel: 'Cártel del Sureste', emblem: '👑', color: '#c5a059', honor: 0, fear: false, choices: {} };
            Config.choices.forEach(c => { if (c.at < (merged.story.chapter || 0)) merged.me.choices[c.title] = 'x'; });
        }
        merged.aguila.def = Object.assign({ infiltrado: 0, abogados: 0, tuneles: 0 }, merged.aguila.def || {});
        // v36: dinastías. Una partida recién empezada después de un retiro recibe la dificultad
        // de su dinastía; las partidas avanzadas se quedan como estaban.
        if (data.dynasty === undefined) {
            const fresh = (merged.stats.playTime || 0) < 1800 && Legacy.runs > 0;
            merged.dynasty = fresh ? Legacy.runs : 0;
            merged.dynMult = fresh ? dynastyMult(Legacy.runs) : 1;
            if (fresh) {
                Object.values(merged.rivals).forEach(R => { if (!R.defeated) R.power = Math.round(R.power * merged.dynMult); });
                merged.territories.forEach(t => { if (t.owner !== 'player') t.troops = Math.round(t.troops * merged.dynMult); });
            }
            merged.version = 36;
        }
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

/* =========================================================
   Interfaz: navegación (escritorio + barra inferior móvil),
   HUD, notificaciones, modales y alerta de ataques
   ========================================================= */
const VIEWS = [
    { id: 'ops', icon: '🏭', name: 'PRODUCCIÓN', short: 'Producir' },
    { id: 'story', icon: '📖', name: 'HISTORIA', short: 'Historia' },
    { id: 'war', icon: '🗺️', name: 'GUERRA', short: 'Guerra' },
    { id: 'rivals', icon: '🤝', name: 'RIVALES Y CONTACTOS', short: 'Rivales' },
    { id: 'logistics', icon: '🚚', name: 'LOGÍSTICA', short: 'Envíos' },
    { id: 'assets', icon: '🚗', name: 'FLOTA', short: 'Flota' },
    { id: 'finance', icon: '💰', name: 'FINANZAS', short: 'Finanzas' },
    { id: 'fronts', icon: '🌮', name: 'FACHADAS', short: 'Fachadas' },
    { id: 'hr', icon: '👥', name: 'TENIENTES', short: 'Tenientes' },
    { id: 'contracts', icon: '📋', name: 'ENCARGOS', short: 'Encargos' },
    { id: 'rnd', icon: '🧪', name: 'I + D', short: 'I+D' },
    { id: 'shadow', icon: '🏛️', name: 'GABINETE SOMBRA', short: 'Gabinete' },
    { id: 'lifestyle', icon: '💎', name: 'LUJOS', short: 'Lujos' },
    { id: 'news', icon: '📰', name: 'PERIÓDICO', short: 'Noticias' },
    { id: 'achievements', icon: '🏆', name: 'LOGROS', short: 'Logros' },
    { id: 'ending', icon: '🏁', name: 'RETIRO', short: 'Retiro' }
];
const TABBAR = ['ops', 'logistics', 'war', 'finance'];

const UI = {
    current: 'ops',
    badges: {},

    buildNav() {
        $('side-nav').innerHTML = VIEWS.map(v => `<div class="nav-item" data-view="${v.id}" onclick="UI.nav('${v.id}')">
            <span class="ni-icon">${v.icon}</span>${v.name}<span class="badge hidden"></span></div>`).join('');
        $('tabbar').innerHTML = TABBAR.map(id => {
            const v = VIEWS.find(x => x.id === id);
            return `<div class="tab-item" data-view="${id}" onclick="UI.nav('${id}')"><span class="ti-icon">${v.icon}</span>${v.short.toUpperCase()}<span class="badge hidden"></span></div>`;
        }).join('') + `<div class="tab-item" data-view="more" onclick="UI.toggleMore()"><span class="ti-icon">☰</span>MÁS<span class="badge hidden"></span></div>`;
        $('more-panel').innerHTML = VIEWS.filter(v => !TABBAR.includes(v.id)).map(v =>
            `<div class="more-item" data-view="${v.id}" onclick="UI.nav('${v.id}')"><span class="mi-icon">${v.icon}</span>${v.short.toUpperCase()}<span class="badge hidden"></span></div>`).join('');
    },

    nav(id) {
        Sfx.click();
        this.current = id;
        document.querySelectorAll('.view').forEach(s => s.classList.add('hidden'));
        const target = $('view-' + id);
        if (target) target.classList.remove('hidden');
        document.querySelectorAll('[data-view]').forEach(n => n.classList.toggle('active', n.dataset.view === id));
        const moreTab = document.querySelector('.tab-item[data-view="more"]');
        if (moreTab) moreTab.classList.toggle('active', !TABBAR.includes(id));
        this.toggleMore(false);
        this.toggleAside(false);
        $('main').scrollTop = 0;
        this.renderView(id);
    },
    renderView(id) {
        switch (id) {
            case 'ops': Core.Ops.render(); break;
            case 'story': Core.Story.render(); break;
            case 'war': Core.War.resize(); Core.War.renderPanel(); break;
            case 'rivals': Core.Rivals.render(); Core.Contacts.render(); break;
            case 'logistics': Core.Logistics.updateUI(); Core.Market.render(); Core.Logistics.renderLog(); break;
            case 'assets': Core.Assets.renderStore(); break;
            case 'finance': Core.Finance.renderAll(); break;
            case 'fronts': Core.Fronts.render(); break;
            case 'hr': Core.HR.render(); break;
            case 'contracts': Core.Contracts.render(); break;
            case 'rnd': Core.RnD.render(); break;
            case 'shadow': Core.Shadow.render(); break;
            case 'lifestyle': Core.Lifestyle.render(); break;
            case 'news': Core.News.render(); break;
            case 'achievements': Core.Achievements.render(); break;
            case 'ending': Core.Legacy.render(); break;
        }
    },
    // Re-render ligero de las vistas con temporizadores (cada segundo)
    refreshView() {
        const id = this.current;
        if (id === 'contracts') Core.Contracts.render();
        else if (id === 'fronts') Core.Fronts.render();
        else if (id === 'finance') Core.Finance.renderLoan();
        else if (id === 'assets') Core.Assets.renderFleet();
        else if (id === 'rivals') { Core.Rivals.render(); Core.Contacts.render(); }
        else if (id === 'war') Core.War.renderPanel();
        else if (id === 'story') Core.Story.render();
        else if (id === 'ending') Core.Legacy.render();
        else if (id === 'ops' && State.ticks % 50 === 0) Core.Ops.render();
    },

    setBadge(view, val) {
        this.badges[view] = val;
        document.querySelectorAll(`[data-view="${view}"] .badge`).forEach(b => {
            b.classList.toggle('hidden', !val);
            b.textContent = val || '';
        });
        // el botón "MÁS" muestra punto si alguna vista escondida tiene aviso
        const hiddenHas = VIEWS.some(v => !TABBAR.includes(v.id) && this.badges[v.id]);
        const mb = document.querySelector('.tab-item[data-view="more"] .badge');
        if (mb) mb.classList.toggle('hidden', !hiddenHas);
    },
    toggleMore(force) {
        const s = $('more-sheet');
        const show = force === undefined ? s.classList.contains('hidden') : force;
        s.classList.toggle('hidden', !show);
    },
    toggleAside(force) {
        const a = $('aside');
        const show = force === undefined ? !a.classList.contains('open') : force;
        a.classList.toggle('open', show);
    },

    notify(msg, type = 'good') {
        const area = $('notif-area');
        const div = document.createElement('div');
        div.className = `notif ${type}`;
        div.textContent = msg;
        area.prepend(div);
        setTimeout(() => div.remove(), 3500);
        while (area.children.length > 4) area.lastChild.remove();
        if (type === 'bad') Sfx.error();
    },
    // Los botones se cierran solos salvo que el callback regrese false
    modal(title, msg, acts) {
        $('ev-title').textContent = title;
        $('ev-desc').textContent = msg;
        const a = $('ev-actions');
        a.innerHTML = '';
        acts.forEach(x => {
            const b = document.createElement('button');
            b.className = 'action-btn ' + (x.style || '');
            b.textContent = x.text;
            b.onclick = () => { Sfx.click(); const r = x.cb(); if (r !== false) $('event-modal').classList.add('hidden'); };
            a.appendChild(b);
        });
        $('event-modal').classList.remove('hidden');
    },

    renderAttackAlert() {
        const box = $('attack-alert');
        const inc = State.incoming[0];
        if (!inc) { box.classList.add('hidden'); return; }
        const C = Config.rivals[inc.rid], c = Config.territories[inc.target];
        const def = Core.War.defenseOf(inc.target);
        const withAll = (20 + (State.territories[inc.target].troops + State.army) * State.armyPower * 1.5 + State.territories[inc.target].tanks * 300) * (1 + 0.3 * State.territories[inc.target].up.fort) * Core.Mods.defense();
        const wasHidden = box.classList.contains('hidden');
        box.classList.remove('hidden');
        setText('aa-title', `${C.leader.toUpperCase()} ATACA ${c.name.toUpperCase()}`);
        setText('aa-desc', `${C.name} viene con ${fmt(inc.power)} de fuerza.${State.incoming.length > 1 ? ` (+${State.incoming.length - 1} ataque más)` : ''}`);
        setText('aa-timer', Math.ceil(inc.left));
        $('aa-bar-fill').style.width = (inc.left / inc.total * 100) + '%';
        setHTML('aa-stats', `Tu defensa: <b class="${def >= inc.power ? 'green' : 'red'}">${fmt(def)}</b> · con refuerzos: <b class="${withAll >= inc.power ? 'green' : 'red'}">${fmt(withAll)}</b> · Sicarios libres: ${fmt(State.army)}`);
        if (wasHidden || $('aa-actions').dataset.inc != inc.id) {
            $('aa-actions').dataset.inc = inc.id;
            $('aa-actions').innerHTML = `
                <button class="action-btn btn-green" onclick="Core.Rivals.resolve(${inc.id}, 'reinforce')">🛡️ REFUERZOS</button>
                <button class="action-btn" onclick="Core.Rivals.resolve(${inc.id}, 'fight')">⚔️ RESISTIR</button>
                <button class="action-btn btn-blue" onclick="Core.Rivals.resolve(${inc.id}, 'negotiate')">💵 NEGOCIAR $${fmt(Core.Rivals.negotiateCost(inc))}</button>
                <button class="action-btn btn-red" onclick="Core.Rivals.resolve(${inc.id}, 'abandon')">🏳️ ABANDONAR</button>`;
        }
    },

    updateHUD() {
        setText('ui-dirty', fmt(State.money.dirty));
        setText('ui-clean', fmt(State.money.clean));
        setText('ui-respect', fmt(State.respect));
        setText('ui-passive', fmt(Core.Finance.perSec || 0));
        const r = Config.ranks[State.rank];
        const badge = $('ui-rank-badge');
        if (badge.textContent !== r.name) { badge.textContent = r.name; badge.style.color = r.color; badge.style.borderColor = r.color; }
        setText('val-chems', fmt(State.inv.chems));
        Config.productKeys.forEach(k => setText('inv-' + k, fmt(State.inv[k]) + ' kg'));
        setText('inv-chems', fmt(State.inv.chems) + ' L');
        const free = State.fleet.filter(v => Core.Logistics.usable(v)).length;
        setText('inv-fleet', `${free} / ${State.fleet.length}`);
        setText('inv-routes', State.routes.length);
        setText('inv-cap', fmt(State.fleet.reduce((s, v) => s + Core.Mods.vehicleCap(v.type), 0)) + ' kg');
        setText('inv-army', fmt(Core.War.totalTroops()));
        setText('inv-elite', fmt(State.elite));
        setText('inv-lt', `${Core.HR.activeCount()}/${State.lieutenants.length}`);
        setText('inv-land', `${Core.War.owned().length}/${Config.territories.length}`);
        setText('val-offshore', fmt(State.money.offshore));
        Core.Heat.render();
    }
};

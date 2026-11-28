/* =========================================================
   v1 · MAPA VIVO A PANTALLA COMPLETA
   El mapa del motor llena la pantalla: convoyes moviéndose, frentes,
   ataques en camino y hostigamientos. Toca una plaza o un convoy y sale
   un panel rápido; los menús completos siguen en el dock de abajo.
   ========================================================= */
window.Vista = {
    init() {
        VK.init({
            dock: [{ id: 'centrar', icon: '🎯', label: 'Centrar', onclick: 'Vista.center()' }, { id: 'base', icon: '🏠', label: 'Mi base', onclick: 'Vista.base()' }],
            onStart: () => this.start()
        });
        VK.versionBar('v1');
    },
    start() {
        if (this.ready) return; this.ready = true;
        this.sf = VK.canvas(VK.stage);
        this.map = new MapLive(this.sf, { z: 1, maxZ: 5, minZ: 0.8 });
        VK.onFocus = id => this.map.focus(id, 2.2);
        VK.on(type => { if (type === 'attack' && State.incoming.length === 1) { const i = State.incoming[0]; this.map.focus(i.target, Math.max(this.map.cam.z, 1.6)); } });
        // titulares en vivo abajo a la izquierda
        this.feed = document.createElement('div'); this.feed.id = 'v1-feed'; document.body.appendChild(this.feed);
        // leyenda de cárteles
        this.legend = document.createElement('div'); this.legend.id = 'v1-legend'; document.body.appendChild(this.legend);
        setInterval(() => this.side(), 1000); this.side();
        const loop = () => { if (Core.Game.running) { if (this.sf.W !== VK.stage.clientWidth * this.sf.dpr) this.sf.fit(); this.map.draw(); } requestAnimationFrame(loop); };
        loop();
    },
    center() { this.map.cam = { z: 1, cx: 300, cy: 215 }; },
    base() { this.map.focus(Config.baseId, 2.4); },
    side() {
        if (!Core.Game.running) return;
        setHTML('v1-feed', State.news.slice(0, 4).map(n => `<div class="${n.type === 'bad' ? 'red' : ''}">${n.big ? '📰 ' : '· '}${n.text}</div>`).join(''));
        const alive = Object.values(Config.rivals).map(C => { const R = State.rivals[C.id]; return `<div><span style="color:${C.color}">●</span> ${C.name} ${R.defeated ? '☠️' : `<span class="muted">${fmt(R.power)}</span>`}</div>`; });
        setHTML('v1-legend', `<div><span style="color:${Core.Me.color()}">●</span> ${Core.Me.cartel()} · ${Core.War.owned().length}/14</div>` + alive.join('') + `<div class="muted tiny">Rueda/pellizco: zoom · arrastra: mover</div>`);
    }
};

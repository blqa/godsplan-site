/* =========================================================
   v3 · HÍBRIDO CON ZOOM
   Un solo lienzo: de cerca ves tu rancho; al alejarte (rueda, pellizco o
   botones) se funde con el mapa del país. HUD mínimo y dock compacto.
   ========================================================= */
window.Vista = {
    init() {
        VK.init({
            dock: [{ id: 'base', icon: '🏡', label: 'Base', onclick: 'Vista.goBase()' }, { id: 'pais', icon: '🌎', label: 'País', onclick: 'Vista.goCountry()' }],
            onStart: () => this.start()
        });
        VK.versionBar('v3');
    },
    // h = 0 → mapa del país, 1 → tu rancho
    h() { return clamp((this.map.cam.z - 3) / 1.8, 0, 1); },
    start() {
        if (this.ready) return; this.ready = true;
        this.sf = VK.canvas(VK.stage);
        this.rancho = new Rancho();
        VK.on((t, d) => this.rancho.react(t, d));
        const base = Config.territories[Config.baseId];
        this.map = new MapLive(this.sf, {
            z: 5, maxZ: 5, minZ: 0.8,
            // al acercarse, la cámara se va hacia tu base
            onZoom: z => { if (z > 2.4) { const k = clamp((z - 2.4) / 2, 0, 1); this.map.cam.cx += (base.x - this.map.cam.cx) * k; this.map.cam.cy += (base.y - this.map.cam.cy) * k; } }
        });
        this.map.focus(Config.baseId, 5);
        // en modo rancho los toques van a los edificios
        const click = this.map.click.bind(this.map);
        this.map.click = e => { if (this.h() > 0.5) { const r = this.sf.c.getBoundingClientRect(); this.rancho.open(this.rancho.hit((e.clientX - r.left) * this.sf.dpr, (e.clientY - r.top) * this.sf.dpr), () => this.goCountry()); } else click(e); };
        this.sf.c.addEventListener('pointermove', e => { if (this.h() <= 0.5) { this.rancho.hover = null; return; } const r = this.sf.c.getBoundingClientRect(); const b = this.rancho.hit((e.clientX - r.left) * this.sf.dpr, (e.clientY - r.top) * this.sf.dpr); this.rancho.hover = b ? b.id : null; });
        VK.onFocus = id => { this.tween(2.2, Config.territories[id]); };
        // zoom +/−
        const z = document.createElement('div'); z.id = 'v3-zoom';
        z.innerHTML = '<button onclick="Vista.map.zoomBy(1.4)">＋</button><div id="v3-zlabel"></div><button onclick="Vista.map.zoomBy(1/1.4)">－</button>';
        document.body.appendChild(z);
        const loop = () => {
            if (Core.Game.running) {
                if (this.sf.W !== VK.stage.clientWidth * this.sf.dpr) this.sf.fit();
                if (this.tw) { const T = this.tw; T.k = Math.min(1, T.k + 0.05); const e = T.k * T.k * (3 - 2 * T.k); this.map.cam.z = T.z0 + (T.z1 - T.z0) * e; this.map.cam.cx = T.x0 + (T.x1 - T.x0) * e; this.map.cam.cy = T.y0 + (T.y1 - T.y0) * e; if (T.k >= 1) this.tw = null; }
                const h = this.h();
                if (h < 1) this.map.draw();
                if (h > 0) this.rancho.draw(this.sf.ctx, this.sf.W, this.sf.H, { alpha: h, zoom: 0.55 + 0.45 * h });
                setText('v3-zlabel', h > 0.5 ? '🏡' : '🌎');
            }
            requestAnimationFrame(loop);
        };
        loop();
    },
    tween(z, to) { const c = this.map.cam; this.tw = { k: 0, z0: c.z, z1: z, x0: c.cx, y0: c.cy, x1: to ? to.x : 300, y1: to ? to.y : 215 }; VK.closePanel(); },
    goBase() { this.tween(5, Config.territories[Config.baseId]); },
    goCountry() { this.tween(1); }
};

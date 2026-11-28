/* =========================================================
   v2 · EL RANCHO (vista desde arriba)
   Tu base es la pantalla principal: cada edificio abre su menú y tu gente
   reacciona a redadas, ataques, traiciones, golpes y cuentas pendientes.
   La RADIO o el botón del dock abren el mapa táctico.
   ========================================================= */
window.Vista = {
    init() {
        VK.init({
            dock: [{ id: 'rancho', icon: '🏡', label: 'Rancho', onclick: 'Vista.hideMap()' }, { id: 'mapa', icon: '🗺️', label: 'Mapa táctico', onclick: 'Vista.showMap()' }],
            onStart: () => this.start()
        });
        VK.versionBar('v2');
    },
    start() {
        if (this.ready) return; this.ready = true;
        this.sf = VK.canvas(VK.stage);
        this.rancho = new Rancho();
        VK.on((t, d) => this.rancho.react(t, d));
        const c = this.sf.c;
        const pos = e => { const r = c.getBoundingClientRect(); return [(e.clientX - r.left) * this.sf.dpr, (e.clientY - r.top) * this.sf.dpr]; };
        c.addEventListener('pointermove', e => { const b = this.rancho.hit(...pos(e)); this.rancho.hover = b ? b.id : null; c.style.cursor = b ? 'pointer' : 'default'; });
        c.addEventListener('click', e => this.rancho.open(this.rancho.hit(...pos(e)), () => this.showMap()));
        // mapa táctico encima
        this.mapBox = document.createElement('div'); this.mapBox.id = 'v2-map'; this.mapBox.className = 'hidden';
        this.mapBox.innerHTML = '<button class="v2-close" onclick="Vista.hideMap()">🏡 VOLVER AL RANCHO</button>';
        document.body.appendChild(this.mapBox);
        this.msf = VK.canvas(this.mapBox);
        this.map = new MapLive(this.msf, { z: 1, maxZ: 5 });
        VK.onFocus = id => { this.showMap(); this.map.focus(id, 2); };
        const loop = () => {
            if (Core.Game.running) {
                if (this.mapBox.classList.contains('hidden')) { if (this.sf.W !== VK.stage.clientWidth * this.sf.dpr) this.sf.fit(); this.rancho.draw(this.sf.ctx, this.sf.W, this.sf.H); }
                else { if (this.msf.W !== this.mapBox.clientWidth * this.msf.dpr) this.msf.fit(); this.map.draw(); }
            }
            requestAnimationFrame(loop);
        };
        loop();
    },
    showMap() { this.mapBox.classList.remove('hidden'); this.msf.fit(); VK.closeDrawer(); },
    hideMap() { this.mapBox.classList.add('hidden'); VK.closePanel(); }
};

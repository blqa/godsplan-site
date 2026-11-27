/* God's Plan · interacciones de la portada (sin dependencias) */
(function () {
    var doc = document.documentElement;
    var motion = doc.classList.contains('motion');
    var header = document.getElementById('header');

    // Encabezado: más opaco al hacer scroll
    function onScroll() { if (header) header.classList.toggle('is-scrolled', window.scrollY > 8); }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    // Mosaico: se duplica cada columna para que el deslizamiento no tenga corte
    if (motion) {
        document.querySelectorAll('.mosaic__track').forEach(function (track) {
            Array.prototype.slice.call(track.children).forEach(function (tile) { track.appendChild(tile.cloneNode(true)); });
        });
    }

    // Pestañas de productos (GodsTap / GodsRig)
    var tabs = Array.prototype.slice.call(document.querySelectorAll('.tabs__btn'));
    function select(id, focus) {
        tabs.forEach(function (t) {
            var on = t.getAttribute('aria-controls') === id;
            t.setAttribute('aria-selected', on ? 'true' : 'false');
            t.tabIndex = on ? 0 : -1;
            var panel = document.getElementById(t.getAttribute('aria-controls'));
            if (panel) { panel.hidden = !on; if (on) panel.classList.add('is-in'); }
            if (on && focus) t.focus();
        });
    }
    if (tabs.length) {
        tabs.forEach(function (t, i) {
            t.addEventListener('click', function () { select(t.getAttribute('aria-controls')); });
            t.addEventListener('keydown', function (e) {
                var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
                if (!d) return;
                e.preventDefault();
                select(tabs[(i + d + tabs.length) % tabs.length].getAttribute('aria-controls'), true);
            });
        });
        // Los enlaces #godstap / #godsrig abren su pestaña y bajan a la sección
        function fromHash() {
            var id = location.hash.slice(1);
            if (id === 'godstap' || id === 'godsrig') {
                select(id);
                var sec = document.getElementById('proyectos');
                if (sec) sec.scrollIntoView({ behavior: motion ? 'smooth' : 'auto' });
            }
        }
        document.querySelectorAll('[data-tab-link]').forEach(function (a) {
            a.addEventListener('click', function (e) {
                e.preventDefault();
                history.replaceState(null, '', '#' + a.getAttribute('data-tab-link'));
                fromHash();
            });
        });
        select(/godsrig/.test(location.hash) ? 'godsrig' : 'godstap');
        if (location.hash) fromHash();
        window.addEventListener('hashchange', fromHash);
    }

    // Declaración: cada palabra se enciende según avanzas
    var words = [];
    var statement = document.querySelector('[data-words]');
    if (statement) {
        var hot = { 'línea': 1, 'mantenemos': 1, 'nosotros.': 1 };
        statement.innerHTML = statement.textContent.trim().split(/\s+/).map(function (w) {
            return '<span class="w' + (hot[w] ? ' hot' : '') + '">' + w + '</span>';
        }).join(' ');
        words = statement.querySelectorAll('.w');
    }
    function paint() {
        if (!words.length) return;
        var r = statement.getBoundingClientRect();
        var vh = window.innerHeight;
        var p = (vh * 0.85 - r.top) / (r.height + vh * 0.35);
        var n = Math.round(Math.max(0, Math.min(1, p)) * words.length);
        for (var i = 0; i < words.length; i++) words[i].classList.toggle('on', i < n);
    }
    if (motion && words.length) {
        var ticking = false;
        window.addEventListener('scroll', function () {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(function () { paint(); ticking = false; });
        }, { passive: true });
        paint();
    }

    // Aparición al hacer scroll
    var items = document.querySelectorAll('[data-reveal]');
    if (!motion || !('IntersectionObserver' in window)) {
        items.forEach(function (el) { el.classList.add('is-in'); });
    } else {
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (en) {
                if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
        items.forEach(function (el) { io.observe(el); });
    }
})();

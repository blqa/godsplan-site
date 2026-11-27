/* God's Plan · interacciones de la portada (sin dependencias) */
(function () {
    var doc = document.documentElement;
    var motion = doc.classList.contains('motion');
    var header = document.getElementById('header');

    // Encabezado: más opaco al hacer scroll
    function onScroll() { if (header) header.classList.toggle('is-scrolled', window.scrollY > 8); }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    // Portada: la marca y los servicios siguen un poco al mouse
    var orbit = document.querySelector('.orbit');
    if (motion && orbit && window.matchMedia('(pointer: fine)').matches) {
        var hero = orbit.closest('.hero') || orbit;
        hero.addEventListener('pointermove', function (e) {
            var r = orbit.getBoundingClientRect();
            var x = (e.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2);
            var y = (e.clientY - (r.top + r.height / 2)) / (window.innerHeight / 2);
            orbit.style.setProperty('--mx', Math.max(-1, Math.min(1, x)).toFixed(3));
            orbit.style.setProperty('--my', Math.max(-1, Math.min(1, y)).toFixed(3));
        });
        hero.addEventListener('pointerleave', function () {
            orbit.style.setProperty('--mx', 0);
            orbit.style.setProperty('--my', 0);
        });
    }

    // Tarjetas de soluciones: la luz sigue al mouse
    if (window.matchMedia('(pointer: fine)').matches) {
        document.querySelectorAll('.card__link').forEach(function (card) {
            card.addEventListener('pointermove', function (e) {
                var r = card.getBoundingClientRect();
                card.style.setProperty('--sx', (e.clientX - r.left) + 'px');
                card.style.setProperty('--sy', (e.clientY - r.top) + 'px');
            });
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
        var hot = { 'negocios': 1, 'reales.': 1, 'sin': 1, 'relleno.': 1 };
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

/* God's Plan · interacciones de godsplan.dev (sin dependencias) */
(function () {
    var doc = document.documentElement;
    var motion = doc.classList.contains('motion');
    var header = document.getElementById('header');

    // Encabezado: fondo al hacer scroll
    function onScroll() { if (header) header.classList.toggle('is-scrolled', window.scrollY > 8); }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    // Menú móvil
    var btn = document.getElementById('menuBtn');
    var menu = document.getElementById('menuMovil');
    if (btn && menu && header) {
        var setOpen = function (open) {
            header.classList.toggle('is-open', open);
            btn.setAttribute('aria-expanded', String(open));
            btn.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
        };
        btn.addEventListener('click', function () { setOpen(btn.getAttribute('aria-expanded') !== 'true'); });
        menu.addEventListener('click', function (e) { if (e.target.closest('a')) setOpen(false); });
        document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && header.classList.contains('is-open')) { setOpen(false); btn.focus(); } });
        window.matchMedia('(min-width: 900px)').addEventListener('change', function (m) { if (m.matches) setOpen(false); });
    }

    if (!('IntersectionObserver' in window)) {
        document.querySelectorAll('[data-reveal]').forEach(function (el) { el.classList.add('is-in'); });
        return;
    }

    // Aparición al hacer scroll
    if (motion) {
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (en) {
                if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
            });
        }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
        document.querySelectorAll('[data-reveal]').forEach(function (el) { io.observe(el); });
    }

    // Navegación: marca la sección activa
    var links = {};
    document.querySelectorAll('.nav a[href^="#"]:not(.btn)').forEach(function (a) { links[a.getAttribute('href').slice(1)] = a; });
    var navIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
            var a = links[en.target.id];
            if (!a) return;
            if (en.isIntersecting) {
                Object.keys(links).forEach(function (k) { links[k].removeAttribute('aria-current'); });
                a.setAttribute('aria-current', 'true');
            } else if (a.getAttribute('aria-current')) {
                a.removeAttribute('aria-current');
            }
        });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(links).forEach(function (id) { var s = document.getElementById(id); if (s) navIO.observe(s); });

    // WhatsApp flotante: solo fuera de la portada, de Contacto y del pie
    var wa = document.getElementById('waFloat');
    if (wa) {
        var blockers = new Set();
        var waIO = new IntersectionObserver(function (entries) {
            entries.forEach(function (en) { if (en.isIntersecting) blockers.add(en.target); else blockers.delete(en.target); });
            wa.classList.toggle('is-visible', blockers.size === 0);
        }, { threshold: 0 });
        ['inicio', 'contacto'].forEach(function (id) { var el = document.getElementById(id); if (el) waIO.observe(el); });
        var foot = document.querySelector('.site-footer'); if (foot) waIO.observe(foot);
    }

    // Acordeón con altura animada (si no hay movimiento, funciona como <details> normal)
    if (motion) {
        document.querySelectorAll('details.qa').forEach(function (d) {
            var summary = d.querySelector('summary');
            var body = d.querySelector('.qa__a');
            var anim = null;
            summary.addEventListener('click', function (e) {
                e.preventDefault();
                if (anim) anim.cancel();
                var opening = !d.open;
                var start = body.offsetHeight;
                if (opening) d.open = true;
                var end = opening ? body.scrollHeight : 0;
                if (opening) start = 0;
                anim = body.animate([{ height: start + 'px', opacity: opening ? 0 : 1 }, { height: end + 'px', opacity: opening ? 1 : 0 }],
                    { duration: 320, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' });
                anim.onfinish = function () { anim = null; if (!opening) d.open = false; };
            });
        });
    }
})();

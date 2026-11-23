/* God's Plan · interacciones de godsplan.dev (sin dependencias) */
(function () {
    var doc = document.documentElement;
    var header = document.getElementById('header');

    // Encabezado: fondo y línea al hacer scroll
    function onScroll() { if (header) header.classList.toggle('is-scrolled', window.scrollY > 8); }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    if (!('IntersectionObserver' in window)) {
        document.querySelectorAll('[data-reveal]').forEach(function (el) { el.classList.add('is-in'); });
        return;
    }

    // Aparición al hacer scroll (solo si se permite movimiento)
    if (doc.classList.contains('motion')) {
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (en) {
                if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
        document.querySelectorAll('[data-reveal]').forEach(function (el) { io.observe(el); });
    }

    // Menú: marca el producto que se está viendo
    var links = {};
    document.querySelectorAll('.nav__link[href^="#"]').forEach(function (a) { links[a.getAttribute('href').slice(1)] = a; });
    var navIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
            var a = links[en.target.id];
            if (!a) return;
            if (en.isIntersecting) {
                Object.keys(links).forEach(function (k) { links[k].removeAttribute('aria-current'); });
                a.setAttribute('aria-current', 'true');
            } else {
                a.removeAttribute('aria-current');
            }
        });
    }, { rootMargin: '-40% 0px -55% 0px' });
    Object.keys(links).forEach(function (id) { var s = document.getElementById(id); if (s) navIO.observe(s); });
})();

/* God's Plan · interacciones de la portada (sin dependencias) */
(function () {
    var doc = document.documentElement;
    var motion = doc.classList.contains('motion');
    var header = document.getElementById('header');

    // ------------------------------------------------------------------
    // Textos que cambian en cada visita: se elige una versión al azar.
    // *palabras* = resaltadas (en títulos van en rojo; en la frase grande se encienden en rojo).
    // Para agregar una versión, solo agrega otra línea a la lista.
    // ------------------------------------------------------------------
    var TEXTOS = {
        // Título principal: [primera línea, segunda línea en rojo]
        heroTitle: [
            ['Menos papeleo.', 'Más negocio.'],
            ['Sistemas reales.', 'Cero relleno.'],
            ['Construido', 'para operar.'],
            ['Tu negocio,', 'en automático.'],
            ['Menos vueltas.', 'Más ventas.'],
            ['Ingeniería', 'para tu negocio.'],
            ['Haz menos.', 'Logra más.']
        ],
        heroSub: [
            'Páginas web, automatizaciones y sistemas a la medida que eliminan el trabajo manual de tu negocio. De la idea a la operación.',
            'Construimos herramientas que hacen el trabajo repetitivo por ti, para que tú te dediques a atender y vender.',
            'Sitios web, automatizaciones y sistemas para negocios que quieren crecer sin complicarse.',
            'Digitalizamos la operación diaria de tu negocio: citas, ventas, inventario y clientes.',
            'Software práctico para negocios reales, hecho y mantenido por las mismas personas.'
        ],
        statement: [
            'Ingeniería aplicada a *negocios reales.* Sistemas que se usan todos los días, *sin relleno.*',
            'La tecnología que usan las *grandes marcas,* hecha a la medida de *tu negocio.*',
            'Si lo haces a mano *todos los días,* probablemente se puede *automatizar.*',
            'No vendemos plantillas: construimos lo que *tu negocio* necesita y lo mantenemos *funcionando.*',
            'Menos tiempo contestando *lo mismo,* más tiempo atendiendo a *tus clientes.*'
        ],
        solTitle: [
            'Un estudio, *muchas soluciones.*',
            'Lo que podemos hacer por *tu negocio.*',
            'Herramientas para *cada parte* de tu negocio.',
            'Tú dinos el problema, *nosotros la solución.*'
        ],
        solLede: [
            'Productos propios y herramientas a medida, todos bajo el mismo estándar. Elige una o combínalas.',
            'Desde el mostrador hasta tu computadora. Elige una o combínalas.',
            'Algunas ya están funcionando; las demás las construimos a tu medida.'
        ],
        methodTitle: [
            'Diagnóstico claro. Desarrollo rápido. *Entrega que funciona.*',
            'Hablas con quien *construye* tu proyecto.',
            'Sin rodeos: de tu idea a *algo que funciona.*'
        ],
        // Contacto: título y texto van en pareja
        cta: [
            ['¿Un proceso lento o una idea por lanzar?', 'Lo construimos. Cuéntanos qué necesitas resolver y te respondemos personalmente.'],
            ['¿Tienes un proyecto en mente?', 'Cuéntanos tu idea. Te respondemos personalmente.'],
            ['Hablemos de lo que necesitas resolver.', 'Escríbenos por WhatsApp o correo: te contesta quien lo va a construir.']
        ]
    };

    function pick(list) { return list[Math.floor(Math.random() * list.length)]; }
    function esc(t) { return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
    function marks(t) { return esc(t).replace(/\*([^*]+)\*/g, '<em>$1</em>'); }
    function slot(name) { return document.querySelector('[data-rotate="' + name + '"]'); }

    (function rotar() {
        var el;
        if ((el = slot('heroTitle'))) {
            var t = pick(TEXTOS.heroTitle), i = 0;
            var words = function (line) {
                return line.split(' ').map(function (w) { return '<span class="wd" style="--i:' + (i++) + '">' + esc(w) + '</span>'; }).join(' ');
            };
            // La segunda línea entra como un solo bloque para que el degradado sea continuo
            el.innerHTML = words(t[0]) + '<br> <em class="wd" style="--i:' + i + '">' + esc(t[1]) + '</em>';
        }
        if ((el = slot('heroSub'))) el.textContent = pick(TEXTOS.heroSub);
        if ((el = slot('statement'))) el.setAttribute('data-text', pick(TEXTOS.statement));
        if ((el = slot('solTitle'))) el.innerHTML = marks(pick(TEXTOS.solTitle));
        if ((el = slot('solLede'))) el.textContent = pick(TEXTOS.solLede);
        if ((el = slot('methodTitle'))) el.innerHTML = marks(pick(TEXTOS.methodTitle));
        var c = pick(TEXTOS.cta);
        if ((el = slot('ctaTitle'))) el.textContent = c[0];
        if ((el = slot('ctaSub'))) el.textContent = c[1];
        doc.classList.add('txt-ready');
    })();

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
        // Versión con *marcas*; si no hay, se usa el texto del HTML tal cual
        var raw = statement.getAttribute('data-text') || statement.textContent.trim();
        var hotOn = false;
        statement.innerHTML = raw.split(/\s+/).map(function (w) {
            var start = w.charAt(0) === '*', end = w.charAt(w.length - 1) === '*';
            if (start) hotOn = true;
            var html = '<span class="w' + (hotOn ? ' hot' : '') + '">' + esc(w.replace(/\*/g, '')) + '</span>';
            if (end) hotOn = false;
            return html;
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

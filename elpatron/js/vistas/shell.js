/* =========================================================
   CARGADOR DE VERSIONES (v1, v2, v3)
   Toma el HTML y la lista de scripts de la versión clásica (../index.html),
   así el motor y los menús NO se duplican: cada versión solo agrega su vista.
   Uso en v1/index.html:
     <script>window.EP_VERSION = 'v1'; window.EP_VISTA = ['../js/vistas/comun.js', './vista.js'];</script>
     <script src="../js/vistas/shell.js"></script>
   ========================================================= */
(async function () {
    window.EP_SHELL = true;
    const me = document.currentScript.src;
    const root = new URL('../../', me).href;            // .../elpatron/
    const load = src => new Promise((ok, fail) => {
        const s = document.createElement('script');
        s.src = src; s.onload = ok; s.onerror = () => fail(new Error('No cargó ' + src));
        document.body.appendChild(s);
    });
    const loading = document.getElementById('v-loading');
    try {
        const html = await (await fetch(root + 'index.html', { cache: 'no-cache' })).text();
        const doc = new DOMParser().parseFromString(html, 'text/html');
        // menús, ventanas y pantallas de la versión clásica (sin sus scripts)
        const frag = document.createDocumentFragment();
        [...doc.body.childNodes].forEach(n => { if (n.nodeName !== 'SCRIPT') frag.appendChild(document.importNode(n, true)); });
        document.body.insertBefore(frag, document.body.firstChild);
        // el mismo motor, en el mismo orden
        const srcs = [...doc.querySelectorAll('script[src]')].map(s => new URL(s.getAttribute('src'), root + 'index.html').href);
        for (const src of srcs) await load(src);
        for (const extra of (window.EP_VISTA || [])) await load(new URL(extra, location.href).href);
        Core.Game.boot();
        if (window.Vista && Vista.init) Vista.init();
    } catch (e) {
        console.error(e);
        if (loading) loading.innerHTML = '⚠️ No se pudo cargar el juego. Revisa tu conexión y recarga.<br><a href="../">Ir a la versión clásica</a>';
        return;
    }
    if (loading) loading.remove();
})();

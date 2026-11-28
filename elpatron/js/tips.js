/* =========================================================
   VENTANAS DE AYUDA: cada vez que se desbloquea un menú (o la primera vez
   que lo abres) sale una ventana que explica para qué sirve y cómo se usa.
   ========================================================= */
Config.tips = {
    mapa: { icon: '🗺️', name: 'El mapa vivo', what: 'Arriba de cada menú está México con sus 32 estados en tiempo real: cada estado pintado del color de su dueño, tus convoyes viajando y los ataques que vienen.',
        how: ['Toca un estado: se iluminan sus fronteras y ves su capital, su defensa y sus vecinos. Ahí mismo mueves gente, blindas o atacas.', 'Toca un convoy para ver qué lleva y su riesgo.', 'Con ▁ ▃ █ lo escondes, lo haces chico o grande. ＋ y － para hacer zoom.'], tip: 'Cuando veas una flecha roja con segundos, te están atacando: toca la plaza.' },
    ops: { icon: '🏭', name: 'Producción', what: 'Aquí se cocina tu mercancía. Cada producto se fabrica solo, poco a poco, y se guarda en tu bodega.',
        how: ['MEJORAR sube un poco la velocidad de ese producto.', '+LAB multiplica todo lo que produce ese producto (2 labs = el doble).', 'Los productos caros (cristal, coca...) necesitan químicos: compra o deja AUTO-IMPORTAR prendido.'], tip: 'Los labs rinden mucho más que mejorar. Desbloquea el siguiente producto en cuanto puedas: vale más por kilo.' },
    story: { icon: '📖', name: 'Historia', what: 'Tu camino de vendedor de esquina a Rey de Reyes, en 11 capítulos.',
        how: ['Cada capítulo te pide una meta (abajo a la derecha ves cuánto llevas).', 'Al cumplirla ganas dinero y se abren menús nuevos.', 'En algunos capítulos tomarás decisiones de honor o terror que cambian tu leyenda.'], tip: 'Si no sabes qué hacer, mira el OBJETIVO del lado derecho.' },
    logistics: { icon: '🚚', name: 'Logística (envíos)', what: 'La mercancía no vale nada en tu bodega: hay que llevarla a vender. Aquí mandas tus vehículos con carga.',
        how: ['Elige producto, vehículo y ruta, y dale ENVIAR.', 'Las rutas largas pagan más, pero tienen más riesgo de decomiso.', 'Si vendes mucho de lo mismo en un lugar, el precio baja (se satura): reparte.'], tip: 'TODA LA FLOTA manda todos tus vehículos libres de un jalón.' },
    assets: { icon: '🚗', name: 'Flota', what: 'Tus vehículos: mulas, motos, camionetas, avionetas... Cada uno carga distinto y va a distinta velocidad.',
        how: ['Compra vehículos más grandes cuando tu bodega se llene más rápido de lo que vendes.', 'Se desgastan con cada viaje: repáralos o contrata un Mecánico.', 'El seguro te devuelve parte si te los decomisan.'], tip: 'Los veteranos (muchos km) viajan más rápido.' },
    finance: { icon: '💰', name: 'Finanzas', what: 'Lo que vendes es dinero SUCIO. Para comprar cosas legales (tenientes, investigación, propiedades) necesitas dinero LIMPIO.',
        how: ['LAVAR convierte sucio en limpio, cobrando una comisión.', 'Cada método lava un máximo por vez; desbloquea mejores conforme crezcas.', 'Lavar mucho con la búsqueda alta sale más caro.'], tip: 'Lava seguido aunque sea poco: el limpio es lo que más vas a necesitar.' },
    news: { icon: '📰', name: 'Noticias', what: 'El periódico del país. Aquí se cuenta lo que hiciste tú y lo que hacen los demás.',
        how: ['Las noticias importantes salen en grande.', 'También pasan abajo en la barra de ÚLTIMA HORA.'], tip: 'Las noticias del mercado avisan cuando un producto se satura.' },
    achievements: { icon: '🏆', name: 'Logros', what: 'Retos especiales que vas cumpliendo mientras juegas.',
        how: ['Se completan solos cuando cumples la condición.', 'Algunos son secretos o muy difíciles.'], tip: '' },
    hr: { icon: '👥', name: 'Tenientes', what: 'Tu gente de confianza. Cada teniente tiene un oficio que te ayuda en algo (logística, producción, lavado, guerra...).',
        how: ['BUSCAR te muestra 3 candidatos; contrata al que te sirva.', 'Hasta 6 trabajan a la vez; ganan experiencia y suben de nivel.', 'Su lealtad baja con el tiempo: págales un BONO o te pueden traicionar.'], tip: 'Un Logístico desbloquea el auto-envío. Contrátalo primero.' },
    autosend: { icon: '⚡', name: 'Auto-envío', what: 'Tus vehículos salen solos a vender en cuanto hay mercancía. Ya no tienes que mandar cada viaje a mano.',
        how: ['Está en Logística. Prende el interruptor.', 'El modo inteligente escoge la mejor ruta y el producto más valioso.', 'Necesita un teniente Logístico activo.'], tip: 'Deja reserva para los encargos: así no se lleva lo que te pidieron.' },
    war: { icon: '🗺️', name: 'Guerra', what: 'Aquí reclutas tu ejército, conquistas plazas y defiendes las tuyas.',
        how: ['Recluta sicarios (dinero sucio) y élite (dinero limpio, mucho más fuertes).', 'Toca una plaza vecina en el mapa y ataca si tienes buena probabilidad.', 'Pon gente en tus plazas con frontera para que no te las quiten: usa los PREAJUSTES.'], tip: 'Fíjate en el colchón de nómina: si te quedas sin dinero, tu gente deserta.' },
    rivals: { icon: '🤝', name: 'Rivales y contactos', what: 'Los 3 cárteles que te disputan el país, cada uno con su estilo, y tus contactos (policía, aduanas...).',
        how: ['Puedes comprar una TREGUA para que no te ataquen un rato.', 'SABOTAJE les baja el poder sin pelear.', 'Los contactos te dan ventajas permanentes.'], tip: 'Los Zetaz te ponen el dedo, el Gulfo asalta convoyes y Sirnaloa te tira los precios.' },
    contracts: { icon: '📋', name: 'Encargos', what: 'Clientes que te piden una cantidad de un producto a cambio de mucho dinero.',
        how: ['Junta la mercancía que piden y dale ENTREGAR.', 'Pagan mucho más que vender en la calle.', 'Tienen tiempo límite.'], tip: 'Deja la reserva del auto-envío prendida para que no se lleve lo de los encargos.' },
    fronts: { icon: '🌮', name: 'Fachadas', what: 'Negocios "legales" que lavan tu dinero solitos, todo el tiempo.',
        how: ['Compra una fachada y lava cada pocos segundos sin que hagas nada.', 'Amplíala para que lave más.', 'Hacienda puede auditarla y cerrarla un rato.'], tip: 'Es la forma más fácil de tener dinero limpio. Ve juntando para la siguiente.' },
    rnd: { icon: '🧪', name: 'Investigación (I+D)', what: 'Tecnologías que mejoran tu producción, tu sigilo y tu ejército.',
        how: ['Tienes 3 laboratorios: uno por rama, una tecnología a la vez en cada uno.', 'Cada tecnología tarda un rato en terminar.', 'Para retirarte necesitas las 16.'], tip: 'Ten siempre algo investigando en las 3 ramas.' },
    stocks: { icon: '📈', name: 'Wall Street', what: 'La bolsa de valores. Compra acciones baratas y véndelas caras.',
        how: ['Los precios suben y bajan solos.', 'Se compra y vende con dinero limpio.'], tip: 'Es un buen lugar para que tu limpio crezca mientras juntas para algo grande.' },
    lifestyle: { icon: '💎', name: 'Lujos', what: 'Propiedades que te dan dinero limpio cada segundo, y lujos que te dan bonos especiales.',
        how: ['Las propiedades pagan solas para siempre.', 'Los lujos (tigre, lambo...) dan ventajas.'], tip: 'Compra propiedades temprano: se pagan solas.' },
    shadow: { icon: '🏛️', name: 'Gabinete Sombra', what: 'Compras al gobierno: medios, fiscales, jueces... Mejoras enormes y permanentes.',
        how: ['Cada mejora pide un rango mínimo y mucho dinero limpio.', 'Para el capítulo 9 necesitas 3.'], tip: 'El Fiscal General y el Control de Medios son los que más ayudan.' },
    ending: { icon: '🏁', name: 'Retiro', what: 'Tu plan para desaparecer como El Rey de Reyes y empezar una nueva dinastía más fuerte.',
        how: ['Necesitas $1B en tu cuenta offshore, los 32 estados, las 16 tecnologías y las 5 misiones del Plan de Escape.', 'El FBI te va a cazar: soborna agentes y termina tus misiones.', 'Al retirarte ganas Legado: bonos para siempre en tus próximas partidas.'], tip: 'Pasa tu dinero limpio a la cuenta offshore desde Finanzas.' },
    aguila: { icon: '🦅', name: 'El Águila (EE.UU.)', what: 'Cuando ya no quede ningún cártel, puedes vender en Estados Unidos... pero Washington te va a perseguir.',
        how: ['Abre células en ciudades gringas: venden tu mercancía al triple.', 'La atención de Washington sube: compra defensas.', 'Junta 100 de influencia para firmar El Pacto del Águila (+50 de Legado).'], tip: '' },
    golpes: { icon: '🎯', name: 'Golpes', what: 'Misiones especiales: asaltar un tren, un camión de valores, un convoy del ejército...',
        how: ['Elige el tamaño del equipo (más gente = más probabilidad).', 'Tu gente sale de la reserva y regresa al terminar.', 'Cada golpe tiene tiempo de espera para repetirse.'], tip: 'La Fuga de Puente Grande te da a "El Ingeniero", un teniente de nivel 3.' },
    familia: { icon: '👨‍👩‍👧', name: 'Familia', what: 'Tu vida personal: tu mamá, tu esposa, tus hijos y tu compadre. Te dan bonos, pero también te pueden lastimar por ahí.',
        how: ['Cada esposa y cada compadre te dan un bono distinto.', 'Cada hijo te da +3 de Legado al retirarte.', 'Si descuidas a tu familia (felicidad baja), pierdes bonos y tu esposa te deja.'], tip: 'Cuidado con los secuestros: ten élite para rescatarlos.' },
    cuentas: { icon: '🩸', name: 'Ajuste de cuentas', what: 'Cuando alguien te hace daño (te asalta, te traiciona, toca a tu familia) se abre una cuenta pendiente con tiempo límite.',
        how: ['🎯 Cacería: mandas tu reserva a buscar al culpable.', '🩸 Golpe ejemplar: castigo público; tu gente te teme, pero sube la búsqueda.', '🤫 Ajuste silencioso: caro, sin ruido. 🏳️ Dejarlo pasar: tu gente pensará que eres débil.'], tip: 'Si se enfría sin responder, cuenta como debilidad.' }
};

Core.Tips = {
    queue: [],
    OFF_KEY: 'elpatron_tips_off',
    off() { try { return localStorage.getItem(this.OFF_KEY) === '1'; } catch (e) { return false; } },
    seen(id) { return (State.seenTips || []).includes(id); },
    // agrega a la cola (si no se ha visto)
    add(ids) {
        if (this.off()) return;
        [].concat(ids).forEach(id => { if (Config.tips[id] && !this.seen(id) && !this.queue.includes(id)) this.queue.push(id); });
    },
    // cada segundo: si no hay otra ventana abierta, muestra la siguiente
    tick() {
        if (!this.queue.length || !Core.Game.running || this.open) return;
        if (!$('intro-screen').classList.contains('hidden') || !$('event-modal').classList.contains('hidden') || !$('me-screen').classList.contains('hidden')) return;
        this.show(this.queue.shift());
    },
    show(id) {
        const T = Config.tips[id];
        if (!T) return;
        State.seenTips = (State.seenTips || []).concat(id);
        this.open = id;
        const isView = !!$('view-' + id), here = UI.current === id || id === 'mapa';
        const nav = id === 'autosend' ? 'logistics' : id === 'stocks' ? 'finance' : id;
        const box = $('tip-modal');
        box.innerHTML = `<div class="tip-card">
            <div class="tip-head"><span class="tip-icon">${T.icon}</span><div><small>${Core.Unlocks.isOpen(id) && State.mode === 'story' && Config.unlocks[id] ? '🔓 NUEVO MENÚ' : '💡 ¿CÓMO FUNCIONA?'}</small><h3>${T.name}</h3></div></div>
            <p class="tip-what">${T.what}</p>
            <div class="tip-lbl">CÓMO SE USA</div>
            <ol class="tip-how">${T.how.map(x => `<li>${x}</li>`).join('')}</ol>
            ${T.tip ? `<div class="tip-pro">💡 ${T.tip}</div>` : ''}
            <div class="tip-btns">
                ${!here && (isView || nav !== id) ? `<button class="action-btn btn-gold" onclick="Core.Tips.close('${nav}')">IR AHORA</button>` : ''}
                <button class="action-btn" onclick="Core.Tips.close()">ENTENDIDO</button>
            </div>
            <label class="tip-off"><input type="checkbox" onchange="Core.Tips.setOff(this.checked)"> No volver a mostrar estas ventanas</label>
        </div>`;
        box.classList.remove('hidden');
        Sfx.levelup && Sfx.levelup();
    },
    close(go) {
        $('tip-modal').classList.add('hidden');
        this.open = null;
        if (go) UI.nav(go);
    },
    setOff(v) { try { localStorage.setItem(this.OFF_KEY, v ? '1' : '0'); } catch (e) { } if (v) this.queue = []; },
    reset() { State.seenTips = []; this.setOff(false); UI.notify('💡 Las ventanas de ayuda volverán a salir.'); }
};

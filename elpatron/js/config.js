/* =========================================================
   EL PATRÓN: LEGADO — datos del juego (configuración estática)
   Todo lo que es "balance" vive aquí para ajustarlo fácil.
   ========================================================= */
const WIN_TARGET = 1000000000; // $1B en la cuenta offshore

const Config = {
    ranks: [
        { id: 0, name: 'Pistolero', req: 0, color: '#cd7f32' },
        { id: 1, name: 'Jefe de Plaza', req: 10000000, color: '#c0c0c0' },
        { id: 2, name: 'Capo', req: 50000000, color: '#ffd700' },
        { id: 3, name: 'Padrino', req: 500000000, color: '#e5e4e2' },
        { id: 4, name: 'Rey de Reyes', req: 2000000000, color: '#ff3333' }
    ],

    productKeys: ['weed', 'meth', 'coke', 'heroin', 'fenta'],
    products: {
        weed: { id: 'weed', name: 'Mota', basePrice: 500, unlock: 0, chems: 0, mult: 1 },
        meth: { id: 'meth', name: 'Cristal', basePrice: 1200, unlock: 10000, chems: 1, mult: 1 },
        coke: { id: 'coke', name: 'Coca', basePrice: 2500, unlock: 30000, chems: 2, mult: 3 },
        heroin: { id: 'heroin', name: 'Heroína', basePrice: 5000, unlock: 150000, chems: 3, mult: 3 },
        fenta: { id: 'fenta', name: 'Fenta', basePrice: 8000, unlock: 600000, chems: 5, mult: 5 }
    },

    vehicles: [
        { id: 0, name: 'Mula', icon: '🎒', cap: 5, speed: 1, price: 0 },
        { id: 1, name: 'Moto', icon: '🏍️', cap: 15, speed: 2, price: 1500 },
        { id: 2, name: 'Tsuru', icon: '🚗', cap: 50, speed: 3, price: 5000 },
        { id: 3, name: 'Pickup', icon: '🛻', cap: 200, speed: 4, price: 25000 },
        { id: 4, name: 'Avioneta', icon: '✈️', cap: 600, speed: 8, price: 100000 },
        { id: 5, name: 'Semi-Sumergible', icon: '🚤', cap: 1500, speed: 5, price: 500000, reqTech: 'subs_1' },
        { id: 6, name: 'Tanque T-90', icon: '🪖', cap: 0, speed: 0, price: 1000000, power: 300, isMilitary: true },
        { id: 7, name: 'MLRS', icon: '🚀', cap: 0, speed: 0, price: 5000000, power: 50, isMilitary: true }
    ],
    vehicleNames: ['La Bestia', 'El Fantasma', 'Rayo', 'La Jefa', 'El Toro', 'Chamuco', 'La Güera', 'Relámpago', 'El Viejo', 'Cucaracha',
        'La Sombra', 'Tornado', 'El Charro', 'La Chula', 'Diablito', 'El Lento', 'Perla Negra', 'El Abuelo', 'Corazón', 'La Loca',
        'Huracán', 'El Coyote', 'Pantera', 'Centella', 'El Flaco', 'La Reina', 'Bala', 'El Patrón II', 'Catrina', 'El Gallo'],

    // Rutas: valor, velocidad, riesgo (Heat y decomiso), km recorridos
    routes: {
        1: { name: 'Corta', mult: 0.8, speed: 2.0, risk: 5, km: 150 },
        2: { name: 'Media', mult: 1.0, speed: 1.0, risk: 10, km: 400 },
        3: { name: 'Larga (Frontera)', mult: 1.5, speed: 0.5, risk: 20, km: 900 },
        4: { name: '🇺🇸 Continental', mult: 2.5, speed: 0.8, risk: 30, km: 2500, req: 'lobby_us' },
        5: { name: '🇪🇺 Europa', mult: 4.0, speed: 0.4, risk: 50, km: 9000, req: 'acuerdo_eu', rank: 3 },
        6: { name: '🇨🇳 Asia', mult: 6.0, speed: 0.2, risk: 70, km: 12000, req: 'ruta_asia', rank: 4 }
    },

    stocks: [
        { id: 'chem', name: 'Químicos Globales', symbol: 'CHM', basePrice: 100, desc: 'Abarata los químicos (hasta -30%)' },
        { id: 'tran', name: 'Transporte Rápido', symbol: 'TRP', basePrice: 250, desc: '+1% vel. logística por acción' },
        { id: 'safe', name: 'Seguridad Privada', symbol: 'SEC', basePrice: 500, desc: 'Menos Heat y pérdidas en redadas' }
    ],

    laundering: [
        { id: 'street', name: 'Pitufeo', rate: 0.60, limit: 1000, unlock: 0 },
        { id: 'store', name: 'Tiendita', rate: 0.70, limit: 5000, unlock: 5000 },
        { id: 'crypto', name: 'Crypto', rate: 0.80, limit: 20000, unlock: 25000 },
        { id: 'realestate', name: 'Inmobiliaria', rate: 0.90, limit: 100000, unlock: 100000 },
        { id: 'bank', name: 'Banco Internacional', rate: 0.95, limit: 1000000, unlock: 500000 }
    ],

    // Negocios fachada: lavan solos cada 3 s. cap = lo que lavan por ciclo en nivel 1
    fronts: [
        { id: 'taqueria', name: 'Taquería "El Paisa"', icon: '🌮', cost: 20000, cap: 1500, rate: 0.85, risk: 0.002, desc: 'Nadie sospecha de unos tacos al pastor.' },
        { id: 'autolavado', name: 'Autolavado Brillo', icon: '🚿', cost: 90000, cap: 6000, rate: 0.83, risk: 0.004, desc: 'Lava carros... y algo más.' },
        { id: 'antro', name: 'Antro "La Jaula"', icon: '🪩', cost: 350000, cap: 25000, rate: 0.80, risk: 0.007, desc: 'Mucho efectivo, mucho ruido.' },
        { id: 'cambio', name: 'Casa de Cambio', icon: '💱', cost: 1500000, cap: 100000, rate: 0.88, risk: 0.012, desc: 'Dólares entran, pesos salen.' },
        { id: 'constructora', name: 'Constructora Imperio', icon: '🏗️', cost: 6000000, cap: 450000, rate: 0.92, risk: 0.02, desc: 'Obras públicas infladas. Hacienda vigila de cerca.' },
        { id: 'aerolinea', name: 'Aerolínea "Vuela Ya"', icon: '🛫', cost: 50000000, cap: 1000000, rate: 0.88, risk: 0.02, desc: 'Vuelos medio vacíos, cuentas siempre llenas.' },
        { id: 'banco', name: 'Banco del Patrón', icon: '🏦', cost: 250000000, cap: 5000000, rate: 0.9, risk: 0.025, desc: 'Tu propio banco. Lava a lo grande... y Hacienda lo sabe.' }
    ],

    investments: [
        { id: 'local', name: 'Local Comercial', icon: '🏪', cost: 25000, income: 100 },
        { id: 'hotel', name: 'Hotel Boutique', icon: '🏨', cost: 150000, income: 500 },
        { id: 'office', name: 'Complejo de Oficinas', icon: '🏢', cost: 500000, income: 2000 },
        { id: 'casino', name: 'Casino Golden Cage', icon: '🎰', cost: 750000, income: 1000, desc: 'Desbloquea la ruleta' },
        { id: 'island', name: 'Isla Privada', icon: '🏝️', cost: 5000000, income: 5000 }
    ],
    luxuries: [
        { id: 'ak47', name: 'AK-47 de Oro', icon: '🔫', cost: 15000, desc: '+0.1 fuerza por sicario' },
        { id: 'tiger', name: 'Tigre de Bengala', icon: '🐅', cost: 50000, desc: '-5% comisión de lavado y Heat' },
        { id: 'lambo', name: 'Lamborghini SVJ', icon: '🏎️', cost: 100000, desc: '+5% vel. logística' }
    ],

    shadow: [
        { id: 'media', name: 'Control de Medios', cost: 5000000, desc: 'El Heat baja solo (-0.5/s) y la prensa habla menos de ti.', reqRank: 0 },
        { id: 'fiscal', name: 'Fiscal General', cost: 10000000, desc: 'Límite de búsqueda al 200% y la mitad de Heat.', reqRank: 1 },
        { id: 'transport', name: 'Red Estatal', cost: 20000000, desc: '+50% velocidad de logística permanente.', reqRank: 1 },
        { id: 'kremlin_pact', name: 'Pacto Kremlin', cost: 250000000, desc: 'Desbloquea T-90 y MLRS. +50% poder de ataque.', reqRank: 2 },
        { id: 'lobby_us', name: 'Lobby Washington', cost: 400000000, desc: 'Abre la ruta Continental con 75% menos riesgo.', reqRank: 3 },
        { id: 'acuerdo_eu', name: 'Acuerdo UE', cost: 600000000, desc: 'Abre Europa. Fenta vale 3x allá.', reqRank: 3 },
        { id: 'supreme_court', name: 'Control Judicial', cost: 150000000, desc: 'Inmunidad total contra redadas de inventario.', reqRank: 4 },
        { id: 'ruta_asia', name: 'Ruta Asiática', cost: 800000000, desc: 'Abre Asia. Heroína vale 3x allá.', reqRank: 4 },
        { id: 'presidencia', name: 'La Presidencia', cost: 500000000, desc: 'Genera $10,000 limpios por segundo.', reqRank: 4 }
    ],

    // Árbol de I+D: 3 ramas, cada tech requiere la anterior
    techBranches: [
        { id: 'prod', name: 'PRODUCCIÓN', icon: '⚗️' },
        { id: 'stealth', name: 'SIGILO', icon: '🕶️' },
        { id: 'war', name: 'GUERRA', icon: '⚔️' }
    ],
    techs: [
        { id: 'eff_1', branch: 'prod', name: 'Destilación al Vacío', cost: 5000, desc: '+20% velocidad de producción' },
        { id: 'hydro_1', branch: 'prod', name: 'Hidroponía Avanzada', cost: 15000, desc: '+50% producción de Mota', req: 'eff_1' },
        { id: 'blue_meth', branch: 'prod', name: 'Fórmula Azul', cost: 50000, desc: '+30% precio del Cristal', req: 'hydro_1' },
        { id: 'asia_net', branch: 'prod', name: 'Red Asiática', cost: 75000, desc: '+50% producción de Heroína', req: 'blue_meth' },
        { id: 'prod_auto', branch: 'prod', name: 'Línea Automatizada', cost: 500000, desc: '+30% producción global', req: 'asia_net' },
        { id: 'prod_master', branch: 'prod', name: 'Química de Élite', cost: 5000000, desc: '+25% precio de todo', req: 'prod_auto' },

        { id: 'sec_1', branch: 'stealth', name: 'Celulares Encriptados', cost: 8000, desc: '-10% Heat ganado' },
        { id: 'ghost_log', branch: 'stealth', name: 'Logística Fantasma', cost: 30000, desc: '-20% riesgo y Heat en rutas', req: 'sec_1' },
        { id: 'stealth_cash', branch: 'stealth', name: 'Contabilidad Fantasma', cost: 120000, desc: '-20% comisión de lavado, -30% auditorías', req: 'ghost_log' },
        { id: 'stealth_drones', branch: 'stealth', name: 'Contra-vigilancia', cost: 400000, desc: '-25% riesgo de decomiso', req: 'stealth_cash' },
        { id: 'stealth_ai', branch: 'stealth', name: 'IA de Rutas', cost: 3000000, desc: '-20% Heat global, +20% vel. logística', req: 'stealth_drones' },

        { id: 'war_1', branch: 'war', name: 'Entrenamiento Táctico', cost: 20000, desc: '+20% poder de ataque' },
        { id: 'war_2', branch: 'war', name: 'Blindaje', cost: 80000, desc: '+25% defensa en tus plazas', req: 'war_1' },
        { id: 'subs_1', branch: 'war', name: 'Ingeniería Naval', cost: 100000, desc: 'Desbloquea el Semi-Sumergible', req: 'war_2' },
        { id: 'war_3', branch: 'war', name: 'Inteligencia Militar', cost: 300000, desc: '+15 s para reaccionar y -20% ataques rivales', req: 'subs_1' },
        { id: 'war_4', branch: 'war', name: 'Drones Armados', cost: 2000000, desc: '+40% ataque y defensa', req: 'war_3' }
    ],

    // ===== Cárteles rivales =====
    rivals: {
        halcones: {
            id: 'halcones', name: 'Los Zetaz', leader: 'La Dama', color: '#b46cff', hq: 7, startPower: 160,
            aggression: 0.8, truceMult: 1.0, bossPower: 900,
            style: 'Sigilosos. Le pasan información a la policía y atacan tus plazas más débiles.',
            taunts: ['"Te veo, aunque tú no me veas."', '"Un halcón nunca ataca de frente, Patrón."', '"El Golfo de México es mío desde antes que nacieras."']
        },
        golfo: {
            id: 'golfo', name: 'Cártel del Gulfo', leader: 'El Verdugo', color: '#ff4d4d', hq: 6, startPower: 300,
            aggression: 1.4, truceMult: 1.6, bossPower: 2200,
            style: 'Agresivos. Atacan seguido, con todo, y asaltan tus cargamentos en ruta.',
            taunts: ['"Voy a colgar tu nombre en un puente."', '"Aquí no se negocia. Aquí se pelea."', '"Mis hombres no conocen el miedo."']
        },
        serrana: {
            id: 'serrana', name: 'Cártel de Sirnaloa', leader: 'Don Aurelio', color: '#ffae00', hq: 11, startPower: 280,
            aggression: 0.6, truceMult: 0.5, bossPower: 4000,
            style: 'La vieja guardia de la sierra de Sirnaloa. Dueños del Pacífico, inundan el mercado para tirar tus precios y prefieren negociar.',
            taunts: ['"Todo tiene un precio, muchacho. Hasta tú."', '"Cuarenta años en la capital. ¿Y tú quién eres?"', '"Los negocios se hacen en la mesa, no en la calle."']
        }
    },

    // ===== Mapa (coordenadas en un lienzo virtual de 600x430) =====
    // Base del jugador: Mérida, la capital con menos presencia criminal del país
    baseId: 8,
    territories: [
        { id: 0, name: 'Culiacán', x: 180, y: 202, lbl: 'l', owner: 'serrana', power: 260, troops: 20, bonus: { type: 'defense', val: 0.1, text: '+10% Defensa' } },
        { id: 1, name: 'Tijuana', x: 36, y: 26, lbl: 'r', owner: 'serrana', power: 250, troops: 20, bonus: { type: 'price', val: 0.2, text: '+20% Precio de venta' } },
        { id: 2, name: 'Hermosillo', x: 125, y: 111, lbl: 'r', owner: 'serrana', power: 200, troops: 15, bonus: { type: 'speed', val: 0.1, text: '+10% Vel. flota' } },
        { id: 3, name: 'Juárez', x: 193, y: 59, lbl: 'r', owner: 'golfo', power: 220, troops: 20, bonus: { type: 'cap', val: 0.25, text: '+25% capacidad de carga' } },
        { id: 4, name: 'Chihuahua', x: 212, y: 115, lbl: 'r', owner: 'golfo', power: 180, troops: 15, bonus: { type: 'prod', val: 0.15, text: '+15% Producción' } },
        { id: 5, name: 'Nuevo Laredo', x: 327, y: 144, lbl: 'r', owner: 'golfo', power: 300, troops: 25, bonus: { type: 'price', val: 0.15, text: '+15% Precio de venta' } },
        { id: 6, name: 'Monterrey', x: 319, y: 182, lbl: 'r', owner: 'golfo', power: 800, troops: 40, hq: true, bonus: { type: 'launder', val: 0.1, text: '-10% comisión de lavado' } },
        { id: 7, name: 'Veracruz', x: 393, y: 307, lbl: 'r', owner: 'halcones', power: 420, troops: 30, hq: true, bonus: { type: 'speed', val: 0.2, text: '+20% Vel. flota (puerto)' } },
        { id: 8, name: 'Mérida', x: 531, y: 273, lbl: 'b', owner: 'player', power: 50, troops: 0, bonus: { type: 'prod', val: 0.1, text: '+10% Producción' } },
        { id: 9, name: 'Cancún', x: 577, y: 272, lbl: 't', owner: 'halcones', power: 120, troops: 10, bonus: { type: 'price', val: 0.15, text: '+15% Precio de venta' } },
        { id: 10, name: 'Guadalajara', x: 263, y: 280, lbl: 'l', owner: 'serrana', power: 250, troops: 20, bonus: { type: 'chems', val: 1, text: 'Químicos gratis' } },
        { id: 11, name: 'CDMX', x: 347, y: 314, lbl: 'l', owner: 'serrana', power: 1200, troops: 60, hq: true, bonus: { type: 'heat', val: 0.1, text: '-10% Heat' } },
        { id: 12, name: 'Acapulco', x: 333, y: 361, lbl: 'l', owner: 'serrana', power: 280, troops: 20, bonus: { type: 'launder', val: 0.1, text: '-10% comisión de lavado' } },
        { id: 13, name: 'Oaxaca', x: 391, y: 353, lbl: 'r', owner: 'halcones', power: 160, troops: 12, bonus: { type: 'prod', val: 0.1, text: '+10% Producción' } }
    ],
    edges: [[0, 2], [0, 4], [0, 10], [1, 2], [1, 3], [2, 3], [2, 4], [3, 4], [3, 5], [4, 6], [5, 6], [6, 10], [6, 7],
        [10, 11], [10, 12], [11, 12], [11, 7], [11, 13], [12, 13], [7, 13], [7, 8], [8, 9], [8, 13]],

    territoryUpgrades: [
        { id: 'fort', name: 'Fortaleza', icon: '🏰', desc: '+30% defensa por nivel', base: 40000 },
        { id: 'lab', name: 'Lab local', icon: '⚗️', desc: '+8% producción global por nivel', base: 60000 },
        { id: 'bodega', name: 'Bodega', icon: '📦', desc: '+2% capacidad de carga y -5% pérdida en redadas', base: 30000 }
    ],

    // ===== Tenientes =====
    roles: {
        'Logístico': { icon: '🚚', desc: 'Desbloquea la logística automática. +5% vel. de rutas por nivel.' },
        'Químico': { icon: '⚗️', desc: '+20% producción, gasta la mitad de químicos y acelera la investigación (I+D).' },
        'Contador': { icon: '📒', desc: '-20% comisión de lavado (también en fachadas).' },
        'Mecánico': { icon: '🔧', desc: 'Repara la flota automáticamente y más barato.' },
        'Comandante': { icon: '🎖️', desc: '+15% ataque y defensa.' },
        'Relacionista': { icon: '🤝', desc: '-15% Heat ganado y treguas más baratas.' }
    },
    traits: {
        'Leal': { color: '#8fbc8f', desc: 'Pierde lealtad a la mitad de velocidad.', mult: 1.0, decay: 0.5 },
        'Codicioso': { color: '#ffd700', desc: '+25% efecto, pero pierde lealtad el doble. Si traiciona, roba dinero.', mult: 1.25, decay: 2 },
        'Impulsivo': { color: '#ff6b6b', desc: '+15% efecto, a veces provoca broncas (+Heat). Si traiciona, se va con un rival.', mult: 1.15, decay: 1 },
        'Genio': { color: '#3aa0ff', desc: 'Gana experiencia al doble de rápido.', mult: 1.0, decay: 1 }
    },
    ltNames: ['El Güero', 'La Flaca', 'El Tuerto', 'Chuy', 'El Contador Ruiz', 'Doña Lupe', 'El Pelón', 'Kike', 'El Gordo', 'La Chata',
        'El Ingeniero', 'Memo', 'El Chapo Jr.', 'La Tía', 'El Brujo', 'Pancho', 'El Doctor', 'Toño', 'La Morena', 'El Cuervo',
        'Rafa', 'El Mudo', 'Beto', 'La Licenciada', 'El Primo', 'Nacho', 'El Tigre', 'Juanita', 'El Cholo', 'Don Chema'],
    ltLevels: [0, 100, 250, 500, 900], // XP para nivel 1..5

    weather: ['☀️ DESPEJADO', '🌧️ LLUVIA', '⛈️ TORMENTA', '🌫️ NIEBLA'],

    contractClients: ['El Gringo', 'Don Chuy', 'La Güera', 'El Ruso', 'Los Primos', 'El Chino', 'La Viuda', 'El Licenciado', 'El Profe', 'Tío Beto', 'Madame Fleur', 'El Japonés'],

    flavorNews: [
        'Gobierno presenta nueva "estrategia integral" de seguridad',
        'Sube el precio de la tortilla por tercera vez este año',
        'Diputados aprueban aumentarse el sueldo',
        'Ola de calor rompe récord en el norte del país',
        'Selección nacional vuelve a quedar en cuartos de final',
        'Expertos advierten sobre el aumento de la inseguridad en carreteras',
        'Inauguran nuevo puente en la capital; ya tiene baches',
        'Alcalde niega conocer a "empresarios" con los que salió en foto'
    ]
};

/* ===== DESBLOQUEOS DEL MODO HISTORIA =====
   número = capítulo (desde 0) en el que se abre cada menú o función */
Config.unlocks = {
    ops: 0, story: 0, logistics: 0, assets: 0,
    finance: 1, news: 1, achievements: 1,
    hr: 2, autosend: 2,
    war: 3, rivals: 3, contracts: 3,
    fronts: 4, rnd: 4, stocks: 4,
    lifestyle: 5,
    shadow: 8,
    ending: 10, aguila: 10, golpes: 4, familia: 5, cuentas: 3
};
Config.plazaRoles = {
    none: { icon: '·', name: 'Sin rol', desc: '' },
    bastion: { icon: '🛡️', name: 'Bastión', desc: '+30% defensa aquí' },
    acopio: { icon: '📦', name: 'Centro de acopio', desc: '+4% capacidad de carga' },
    halcones: { icon: '👁️', name: 'Red de halcones', desc: 'avisa 15 s antes de ataques aquí y en vecinas' },
    cuartel: { icon: '🏚️', name: 'Cuartel', desc: '+100 espacio para tropas' }
};
Config.unlockNames = { autosend: 'Auto-envío', stocks: 'Wall Street', contracts: 'Encargos', golpes: 'Golpes', familia: 'Familia', cuentas: 'Ajuste de Cuentas' };

/* ===== EL ÁGUILA: el gobierno de Estados Unidos (fin de juego) ===== */
Config.aguila = {
    // Células de venta en EE.UU.: se llevan tu mercancía y la venden a precio gringo
    cities: [
        { id: 'hou', name: 'Houston', icon: '🤠', cost: 20000000, kg: 40, price: 2.5, desc: 'La puerta de entrada. Bodegas, refinerías y carreteras infinitas.' },
        { id: 'la', name: 'Los Ángeles', icon: '🌴', cost: 60000000, kg: 80, price: 2.8, desc: 'Hollywood paga lo que sea por la fiesta.' },
        { id: 'chi', name: 'Chicago', icon: '🌬️', cost: 150000000, kg: 120, price: 3, desc: 'El centro del país. Todo pasa por aquí.' },
        { id: 'mia', name: 'Miami', icon: '🌊', cost: 300000000, kg: 160, price: 3.2, desc: 'Lanchas rápidas, bancos discretos y yates.' },
        { id: 'ny', name: 'Nueva York', icon: '🗽', cost: 600000000, kg: 250, price: 3.5, desc: 'Wall Street también se desvela.' }
    ],
    CELL_MAX: 5,
    // Defensas contra Washington (3 niveles cada una)
    defenses: [
        { id: 'infiltrado', name: 'Infiltrado en la DEA', icon: '🕵️', cur: 'clean', base: 25000000, desc: 'Cada nivel: 25% de probabilidad de frenar una redada y te avisa antes.' },
        { id: 'abogados', name: 'Bufete en Nueva York', icon: '⚖️', cur: 'clean', base: 40000000, desc: 'Cada nivel: las sanciones congelan menos dinero y los amparos cuestan 25% menos. Necesario para liberar cuentas.' },
        { id: 'tuneles', name: 'Túneles bajo la frontera', icon: '🚇', cur: 'dirty', base: 30000000, desc: 'Cada nivel: +25% de venta en tus células y los operativos fronterizos te pegan menos.' }
    ],
    // Acciones para comprar poder en Washington (el costo sube cada vez que las usas)
    acts: [
        { id: 'campana', name: 'Financiar una campaña', icon: '🗳️', cur: 'clean', base: 50000000, inf: 8, att: 6, desc: 'Un congresista más que te debe el favor.' },
        { id: 'chantaje', name: 'Chantajear a un senador', icon: '📸', cur: 'dirty', base: 80000000, inf: 15, att: 10, risk: 0.35, desc: '65% de que funcione. Si sale mal, todo Washington se entera (+25 atención).' },
        { id: 'farma', name: 'Lobby con las farmacéuticas', icon: '💊', cur: 'clean', base: 150000000, inf: 12, att: 3, desc: 'Los que venden las pastillas legales también quieren su parte.' },
        { id: 'pentagono', name: 'Contrato con el Pentágono', icon: '🎖️', cur: 'clean', base: 300000000, inf: 20, att: 12, desc: 'Tus empresas fachada le venden al ejército gringo. Ya no te pueden tocar tan fácil.' }
    ],
    PACT_COST: 500000000,
    PACT_LEGACY: 50
};

/* ===== HISTORIA: capítulos con objetivos y recompensas ===== */
Config.story = [
    {
        title: 'Los Primeros Kilos', goal: 'Vende 30 kg de mercancía',
        text: 'Mérida, 3:00 a.m.\nLa ciudad más tranquila del país. Aquí ningún cártel se ha atrevido a echar raíces.\nTienes una parcela, dos mulas y mucha hambre. Nadie conoce tu nombre... todavía.\n\nMueve tu primera carga y empieza a escribir tu leyenda.',
        progress: () => [State.stats.kgSold, 30], reward: { dirty: 5000 }
    },
    {
        title: 'Dinero que Huele', goal: 'Lava $20,000',
        text: 'El dinero sucio no compra respeto: compra problemas.\nNecesitas que tu fortuna parezca honrada.\n\nVe a FINANZAS o abre un negocio fachada.',
        progress: () => [State.stats.laundered, 20000], reward: { clean: 10000 }
    },
    {
        title: 'La Red', goal: 'Contrata 2 tenientes',
        text: 'Un patrón no trabaja solo.\nNecesitas gente de confianza... aunque la confianza, en este negocio, siempre tiene precio.\n\nCuando tengas una red, la gente empezará a hablar de ti y llegarán los primeros clientes especiales (Encargos).',
        progress: () => [State.lieutenants.length, 2], reward: { dirty: 25000 }
    },
    {
        title: 'La Riviera', goal: 'Conquista Cancún',
        text: 'Cancún: turistas, hoteles y dólares en efectivo.\nLos Zetaz la controlan desde su puerto en Veracruz.\nLa Dama no sabe que vas por ella.\n\nArma a tu gente y cruza la península.',
        progress: () => [State.territories[9].owner === 'player' ? 1 : 0, 1], reward: { dirty: 100000 }
    },
    {
        title: 'Fachadas', goal: 'Ten 2 negocios fachada',
        text: 'Una taquería. Un autolavado. Cada negocio honesto es una lavadora más.\nHacienda no puede auditar lo que no ve.',
        progress: () => [Object.keys(State.fronts).length, 2], reward: { clean: 100000 }
    },
    {
        title: 'La Guerra del Puerto', goal: 'Derrota a Los Zetaz (toma Veracruz)', boss: 'halcones',
        text: 'Veracruz es la fortaleza de La Dama.\nPara llegar a ella tendrás que quitarle Cancún y Oaxaca... y luego entrar a su guarida.\n\nSi cae el puerto, caen Los Zetaz.',
        progress: () => [State.rivals.halcones.defeated ? 1 : 0, 1], reward: { dirty: 1000000 }
    },
    {
        title: 'La Frontera', goal: 'Conquista Nuevo Laredo',
        text: 'Nuevo Laredo es la aduana más transitada del continente.\nEl Verdugo la protege con sangre.',
        progress: () => [State.territories[5].owner === 'player' ? 1 : 0, 1], reward: { dirty: 2000000 }
    },
    {
        title: 'Golfo en Llamas', goal: 'Derrota al Cártel del Gulfo (toma Monterrey)', boss: 'golfo',
        text: 'El Verdugo no negocia. Solo entiende la fuerza.\nMonterrey es su trono de acero.\n\nVe preparado: tanques, élite y todo lo que tengas.',
        progress: () => [State.rivals.golfo.defeated ? 1 : 0, 1], reward: { dirty: 10000000 }
    },
    {
        title: 'El Gabinete', goal: 'Compra 3 mejoras del Gabinete Sombra',
        text: 'Ya no eres un narco: eres un poder.\nY el poder de verdad se ejerce desde la sombra, con jueces, fiscales y periodistas en tu nómina.',
        progress: () => [Object.values(State.shadow).filter(Boolean).length, 3], reward: { clean: 20000000 }
    },
    {
        title: 'El Último Patriarca', goal: 'Derrota al Cártel de Sirnaloa (toma CDMX)', boss: 'serrana',
        text: 'Don Aurelio bajó de la sierra hace cuarenta años y desde entonces manda en la capital.\nPresidentes van y vienen; él se queda.\n\nHasta hoy.',
        progress: () => [State.rivals.serrana.defeated ? 1 : 0, 1], reward: { dirty: 100000000 }
    },
    {
        title: 'El Rey de Reyes', goal: 'Cumple el Plan de Retiro',
        text: 'No queda nadie arriba de ti.\nSolo falta lo más difícil: desaparecer con todo... y que tu nombre viva para siempre.\n\nEl FBI ya te está cazando. Junta el dinero y completa las 5 misiones de tu Plan de Escape (menú RETIRO) antes de que te encuentren.\n\nY al norte alguien ya escribió tu nombre en una lista. El Águila te está mirando (menú EL ÁGUILA).',
        progress: () => [Core.Legacy.goalsMet(), 4], reward: {}
    }
];

/* ===== LOGROS (cada uno con su propia condición) ===== */
const ownedCount = () => State.territories.filter(t => t.owner === 'player').length;
Config.achievements = [
    { id: 'first_k', name: 'Primer Kilo', desc: 'Gana $1,000 sucios', check: () => State.stats.dirtyEarned >= 1000 },
    { id: 'boss', name: 'Jefe de Plaza', desc: 'Controla 3 territorios', check: () => ownedCount() >= 3 },
    { id: 'kingpin', name: 'Capo de Capos', desc: 'Acumula $1M sucios', check: () => State.money.dirty >= 1e6 },
    { id: 'fleet_master', name: 'Flotilla', desc: 'Ten 10 vehículos', check: () => State.fleet.length >= 10 },
    { id: 'fleet_30', name: 'Flota Inmensa', desc: 'Ten 30 vehículos', check: () => State.fleet.length >= 30 },
    { id: 'army_100', name: 'Ejército Privado', desc: 'Ten 100 sicarios libres', check: () => State.army >= 100 },
    { id: 'army_500', name: 'General de Guerra', desc: 'Ten 500 tropas en total', check: () => Core.War.totalTroops() >= 500 },
    { id: 'elite_squad', name: 'Escuadrón de la Muerte', desc: 'Ten 10 de élite', check: () => Core.War.totalElite() >= 10 },
    { id: 'high_roller', name: 'Lavado Masivo', desc: 'Lava $1M en total', check: () => State.stats.laundered >= 1e6 },
    { id: 'clean_10m', name: 'Mano Limpia', desc: 'Acumula $10M limpios', check: () => State.money.clean >= 1e7 },
    { id: 'map_control', name: 'Dueño del País', desc: 'Controla los 14 territorios', check: () => ownedCount() >= 14 },
    { id: 'meth_king', name: 'Heisenberg', desc: 'Ten 100 kg de Cristal', check: () => State.inv.meth >= 100 },
    { id: 'heroin_lord', name: 'Triángulo Dorado', desc: 'Ten 100 kg de Heroína', check: () => State.inv.heroin >= 100 },
    { id: 'chems_50k', name: 'El Alquimista', desc: 'Ten 50,000 L de químicos', check: () => State.inv.chems >= 50000 },
    { id: 'sub_captain', name: 'Capitán Nemo', desc: 'Investiga Ingeniería Naval', check: () => State.techs.includes('subs_1') },
    { id: 'tree_branch', name: 'Científico Loco', desc: 'Completa una rama de I+D', check: () => Config.techBranches.some(b => Config.techs.filter(t => t.branch === b.id).every(t => State.techs.includes(t.id))) },
    { id: 'office_5', name: 'Magnate Inmobiliario', desc: '5 Complejos de Oficinas', check: () => State.investments.office >= 5 },
    { id: 'island_2', name: 'Archipiélago Privado', desc: '2 Islas Privadas', check: () => State.investments.island >= 2 },
    { id: 'lambo_5', name: 'Velocidad Máxima', desc: '5 Lamborghinis', check: () => State.luxuries.lambo >= 5 },
    { id: 'ak47_10', name: 'Armero Mayor', desc: '10 AK-47 de Oro', check: () => State.luxuries.ak47 >= 10 },
    { id: 'tiger_3', name: 'Zoólogo Peligroso', desc: '3 Tigres de Bengala', check: () => State.luxuries.tiger >= 3 },
    { id: 'tank_5', name: 'Jefe de Blindados', desc: 'Compra 5 Tanques T-90', check: () => State.militaryBought[6] >= 5 },
    { id: 'mlrs_3', name: 'Artillería Pesada', desc: 'Compra 3 MLRS', check: () => State.militaryBought[7] >= 3 },
    { id: 'shadow_5', name: 'Cúpula de Poder', desc: '5 mejoras del Gabinete Sombra', check: () => Object.values(State.shadow).filter(Boolean).length >= 5 },
    { id: 'kingmaker', name: 'Hacedor de Presidentes', desc: 'Compra La Presidencia', check: () => State.shadow.presidencia },
    { id: 'padrino_rank', name: 'El Padrino', desc: 'Alcanza el rango Padrino', check: () => State.rank >= 3 },
    { id: 'first_boss', name: 'Cazador de Jefes', desc: 'Derrota a un cártel rival', check: () => State.stats.bossesDefeated >= 1 },
    { id: 'all_bosses', name: 'Sin Competencia', desc: 'Derrota a los 3 cárteles', check: () => State.stats.bossesDefeated >= 3 },
    { id: 'defender', name: 'Muralla', desc: 'Defiende 10 ataques', check: () => State.stats.defended >= 10 },
    { id: 'fronts_5', name: 'Hombre de Negocios', desc: 'Ten 5 negocios fachada', check: () => Object.keys(State.fronts).length >= 5 },
    { id: 'banker', name: 'El Banquero', desc: 'Abre el Banco del Patrón', check: () => !!State.fronts.banco },
    { id: 'gringo', name: 'Al Otro Lado', desc: 'Abre tu primera célula en Estados Unidos', check: () => Object.values(State.aguila.cells).some(x => x > 0) },
    { id: 'aguila_pact', name: 'El Pacto del Águila', desc: 'Doblega al gobierno de Estados Unidos', check: () => State.aguila.done },
    { id: 'dynasty_2', name: 'Nueva Dinastía', desc: 'Empieza una partida después de retirarte', check: () => (State.dynasty || 0) >= 1 },
    { id: 'loan_paid', name: 'Buen Pagador', desc: 'Liquida un préstamo', check: () => State.stats.loansPaid >= 1 },
    { id: 'veteran', name: 'Kilometraje de Leyenda', desc: 'Un vehículo con 20,000 km', check: () => State.fleet.some(v => v.km >= 20000) },
    { id: 'lt_max', name: 'Mano Derecha', desc: 'Un teniente en nivel 5', check: () => State.lieutenants.some(l => l.level >= 5) },
    { id: 'contracts_25', name: 'Proveedor de Confianza', desc: 'Cumple 25 encargos', check: () => State.stats.contractsDone >= 25 },
    { id: 'story_done', name: 'Leyenda', desc: 'Termina la historia', check: () => State.story.chapter >= Config.story.length - 1 }
];

/* ===== EVENTOS ALEATORIOS ===== */
Config.events = [
    {
        title: 'VECINO CHISMOSO', req: () => Core.fame() <= 2,
        desc: 'Doña Chela, la vecina, vio a tu mula salir de madrugada. Ya anda preguntando.',
        opts: [
            { text: 'Regalarle una despensa ($500 sucio)', cost: { dirty: 500 }, effect: () => UI.notify('Doña Chela ya no vio nada.') },
            { text: 'Ignorarla (+8 Heat)', effect: () => { Core.Heat.add(8); UI.notify('Doña Chela le contó a medio barrio.', 'bad'); } }
        ]
    },
    {
        title: 'PRIMER CLIENTE FIJO', req: () => Core.fame() <= 2 && State.inv.weed >= 10,
        desc: 'Un mesero de un hotel en Progreso quiere 10 kg de Mota cada semana. Paga bien, pero es nuevo en esto.',
        opts: [
            { text: 'Venderle 10 kg (x1.5 precio)', effect: () => { State.inv.weed -= 10; const v = Math.floor(10 * Config.products.weed.basePrice * 1.5); State.money.dirty += v; State.stats.kgSold += 10; State.stats.dirtyEarned += v; UI.notify(`+$${fmt(v)} sucios.`); Sfx.cash(); } },
            { text: 'Desconfiar', effect: () => { } }
        ]
    },
    {
        title: 'LA MULA SE PERDIÓ', req: () => Core.fame() <= 1 && State.stats.playTime > 120,
        desc: 'Tu mula tomó el camino equivocado y llegó tarde. El comprador está molesto.',
        opts: [
            { text: 'Darle un descuento ($300 sucio)', cost: { dirty: 300 }, effect: () => UI.notify('El cliente se calmó.') },
            { text: 'Que espere', effect: () => { State.market.weed = Math.max(0.5, State.market.weed - 0.2); UI.notify('Se corre la voz de que eres impuntual: baja el precio de la Mota.', 'bad'); } }
        ]
    },
    {
        title: 'RETÉN MILITAR', req: () => Core.fame() >= 2 && State.fleet.length >= 2, desc: 'El ejército detuvo uno de tus envíos. ¿Qué haces?',
        opts: [
            { text: 'Pagar soborno ($5K sucio)', cost: { dirty: 5000 }, effect: () => UI.notify('Te dejaron pasar.') },
            { text: 'Forzar el paso (+20 Heat)', effect: () => { Core.Heat.add(20); UI.notify('Escapaste, pero te buscan.', 'bad'); } }
        ]
    },
    {
        title: 'REMATE DE QUÍMICOS', req: () => State.ops.meth > 0, desc: 'Un proveedor remata precursores a mitad de precio.',
        opts: [
            { text: 'Comprar 500 L ($10K limpio)', cost: { clean: 10000 }, effect: () => { State.inv.chems += 500; UI.notify('Bodega llena.'); } },
            { text: 'Ignorar', effect: () => { } }
        ]
    },
    {
        title: 'PERIODISTA CURIOSO', req: () => Object.keys(State.fronts).length > 0, desc: 'Un reportero está investigando tus negocios fachada.',
        opts: [
            { text: 'Comprar su silencio ($20K limpio)', cost: { clean: 20000 }, effect: () => UI.notify('La nota nunca salió.') },
            { text: 'Ignorarlo (+35 Heat)', effect: () => { Core.Heat.add(35); Core.News.add('Reportaje exhibe red de empresas fantasma en Yucatán', 'bad', true); } }
        ]
    },
    {
        title: 'HURACÁN EN LA COSTA', req: () => State.fleet.length >= 3, desc: 'Una tormenta tropical amenaza tus rutas.',
        opts: [
            { text: 'Resguardar la flota ($3K limpio)', cost: { clean: 3000 }, effect: () => UI.notify('Flota a salvo.') },
            { text: 'Seguir operando', effect: () => { State.fleet.forEach(v => v.hp = Math.max(0, v.hp - 30)); UI.notify('La tormenta dañó tus vehículos (-30 HP).', 'bad'); Core.News.add('Huracán deja daños en carreteras del Pacífico'); } }
        ]
    },
    {
        title: 'AUGE EN EL NORTE', req: () => Core.fame() >= 3, desc: 'La demanda se disparó. ¿Aprovechas?',
        opts: [
            { text: 'Subir precios (+10 Heat)', effect: () => { Config.productKeys.forEach(k => { State.market[k] = Math.min(2.0, State.market[k] + 0.4); State.sat[k] = 0; }); Core.Heat.add(10); UI.notify('Precios por las nubes.', 'event'); } },
            { text: 'Perfil bajo', effect: () => Config.productKeys.forEach(k => State.market[k] = Math.min(2.0, State.market[k] + 0.15)) }
        ]
    },
    {
        title: 'SICARIO TRAIDOR', req: () => State.army >= 15, desc: 'Uno de tus hombres quiere venderle información a la policía.',
        opts: [
            { text: 'Pagarle más ($8K sucio)', cost: { dirty: 8000 }, effect: () => UI.notify('Lealtad comprada.') },
            { text: 'Dejarlo ir (-10% sicarios, +15 Heat)', effect: () => { State.army = Math.floor(State.army * 0.9); Core.Heat.add(15); UI.notify('Se llevó a varios con él.', 'bad'); } }
        ]
    },
    {
        title: 'AUDITORÍA FISCAL', req: () => Object.keys(State.fronts).length > 0, desc: 'Hacienda revisa tus negocios fachada.',
        opts: [
            { text: 'Contadores creativos (-5% limpio)', effect: () => { State.money.clean = Math.floor(State.money.clean * 0.95); UI.notify('Auditoría superada.'); } },
            { text: 'Arriesgarse (50/50)', effect: () => { if (Math.random() < 0.5) UI.notify('No encontraron nada.'); else { State.money.clean = Math.floor(State.money.clean * 0.8); UI.notify('Multa: -20% limpio.', 'bad'); } } }
        ]
    },
    {
        title: 'INVERSIONISTA MISTERIOSO', req: () => State.money.clean >= 25000, desc: 'Un empresario extranjero ofrece duplicar una inversión... o desaparecer con ella.',
        opts: [
            { text: 'Invertir $25K limpio', cost: { clean: 25000 }, effect: () => { if (Math.random() < 0.55) { State.money.clean += 50000; UI.notify('¡Pagó! +$50K limpio.'); Sfx.cash(); } else UI.notify('Desapareció con tu dinero.', 'bad'); } },
            { text: 'No confiar', effect: () => { } }
        ]
    },
    {
        title: 'OPERATIVO FEDERAL', req: () => State.rank >= 1 || State.heat > State.heatCap * 0.4, desc: 'Viene un operativo grande. Tienes minutos para reaccionar.',
        opts: [
            { text: 'Avisar a tus contactos ($15K limpio)', cost: { clean: 15000 }, effect: () => { State.heat = Math.max(0, State.heat - 40); UI.notify('Operativo desviado.'); } },
            { text: 'Esconder la mercancía (+40 Heat)', effect: () => Core.Heat.add(40) }
        ]
    },
    {
        title: 'RECLUTAS VOLUNTARIOS', req: () => Core.fame() >= 3, desc: 'Gente del barrio quiere unirse a la organización.',
        opts: [
            { text: 'Aceptar 10 (+5 Heat)', effect: () => { State.army += 10; Core.Heat.add(5); UI.notify('+10 sicarios.'); } },
            { text: 'Rechazar', effect: () => { } }
        ]
    },
    {
        title: 'FALLA EN EL LABORATORIO', req: () => Config.productKeys.reduce((n, k) => n + State.labs[k], 0) >= 3, desc: 'Un error en producción arruinó parte de un lote.',
        opts: [
            { text: 'Reparar rápido ($5K sucio)', cost: { dirty: 5000 }, effect: () => UI.notify('Producción restablecida.') },
            {
                text: 'Aceptar la pérdida (-30% de un producto)', effect: () => {
                    const ks = Config.productKeys.filter(k => State.inv[k] > 0);
                    if (ks.length) { const k = pick(ks); State.inv[k] = Math.floor(State.inv[k] * 0.7); UI.notify(`Perdiste 30% de ${Config.products[k].name}.`, 'bad'); }
                }
            }
        ]
    },
    {
        title: 'MENSAJE DE UN RIVAL', req: () => Core.War.owned().length >= 2, desc: 'Un cártel rival propone un cese al fuego temporal.',
        opts: [
            { text: 'Aceptar ($10K sucio, 3 min de paz)', cost: { dirty: 10000 }, effect: () => { const r = Core.Rivals.randomAlive(); if (r) { State.rivals[r].truceUntil = Date.now() + 180000; UI.notify(`Tregua con ${Config.rivals[r].name}.`); } } },
            { text: 'Rechazar (+100 poder rival)', effect: () => { const r = Core.Rivals.randomAlive(); if (r) State.rivals[r].power += 100; UI.notify('El rival se prepara para la guerra.', 'bad'); } }
        ]
    },
    {
        title: 'FIESTA DEL PUEBLO', req: () => State.rank >= 1, desc: 'Ya todos saben quién eres. El barrio quiere una fiesta patronal y te verían como un héroe.',
        opts: [
            { text: 'Pagar la fiesta ($30K sucio)', cost: { dirty: 30000 }, effect: () => { State.lieutenants.forEach(l => l.loyalty = Math.min(100, l.loyalty + 25)); State.army += 5; UI.notify('El pueblo te adora. +lealtad, +5 sicarios.'); } },
            { text: 'No gastar', effect: () => { } }
        ]
    },
    {
        title: 'CHIVATAZO', req: () => State.army >= 20, desc: 'Un informante te avisa de un convoy rival con mercancía.',
        opts: [
            { text: 'Asaltarlo (necesitas 20 sicarios)', effect: () => { if (State.army < 20) return UI.notify('No tienes gente suficiente.', 'bad'); if (Math.random() < 0.6) { const k = pick(Config.productKeys); const q = 50 + Math.floor(Math.random() * 150); State.inv[k] += q; UI.notify(`¡Botín! +${q} kg de ${Config.products[k].name}.`); Sfx.cash(); } else { State.army -= 8; UI.notify('Era una trampa. Perdiste 8 sicarios.', 'bad'); Sfx.gun(); } } },
            { text: 'Dejarlo pasar', effect: () => { } }
        ]
    }
];

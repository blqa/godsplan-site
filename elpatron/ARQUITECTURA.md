# El Patrón: estructura de archivos

```
elpatron/
├── index.html            versión clásica (EP_VERSION = 'clasica')
├── manifest.json         start_url "./"
├── firestore.rules       reglas de seguridad para Firestore
├── css/style.css
└── js/
    ├── firebase-config.js   firebaseConfig de elpatron-b8c32 + EP_VERSION
    ├── config.js            datos del juego (productos, rivales, historia…)
    ├── state.js             State, newState(), guardado local, migraciones y saneamiento
    ├── audio.js  ui.js
    ├── economy.js logistics.js war.js people.js story.js
    ├── aguila.js escape.js persona.js golpes.js familia.js vendetta.js
    ├── cloud.js             acceso Alias+Clave, Firebase y 3 slots (respaldo localStorage)
    └── main.js              arranque y ciclos del juego
```

## Guardado
- Partida en curso: `localStorage['elpatron_save_v32']` (autoguardado de siempre).
- Slots: `profiles/{huella}/slots/{versión}_{1..3}` en Firestore y copia en
  `localStorage['elpatron_slot_{huella}_{versión}_{n}']`. Gana la copia más reciente.
- Slot activo: se autoguarda cada 2 minutos.
- Invitado: solo localStorage.

## Versiones 2D (v1, v2, v3)

```
elpatron/
├── js/vistas/
│   ├── shell.js    baja ../index.html, copia sus menús y carga el MISMO motor en el mismo orden
│   ├── comun.js    HUD mínimo, dock, cajón con los menús, mapa vivo (zoom/arrastre) y paneles rápidos
│   └── rancho.js   el rancho visto desde arriba (lo usan v2 y v3)
├── css/vistas.css  acomodo común de las versiones
├── v1/  index.html · style.css · vista.js · manifest.json   Mapa Vivo a pantalla completa
├── v2/  index.html · style.css · vista.js · manifest.json   El Rancho + mapa táctico
└── v3/  index.html · style.css · vista.js · manifest.json   Híbrido con zoom (rancho ↔ país)
```

- Cada versión define `window.EP_VERSION` ('v1', 'v2', 'v3') antes de cargar el motor:
  su partida en curso es `elpatron_save_v32_{versión}` y sus slots `{versión}_{1..3}`.
  El Legado es compartido entre todas.
- Las mecánicas (personaje, decisiones, golpes, familia, represalias, guerra, nube) viven
  solo en `js/`. Las versiones solo cambian cómo se ve y cómo se toca.
- `Core.War.renderMap(ctx, vista)` dibuja el mapa en cualquier canvas: lo usan el menú
  Guerra y las tres versiones.
- Para agregar una versión nueva: copia una carpeta vN, cambia `EP_VERSION` y escribe su `vista.js`.

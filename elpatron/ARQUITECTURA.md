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

## Versiones futuras (v1, v2, v3)
Cada una es una carpeta con su propio `index.html` y su CSS, que carga el MISMO
motor con rutas relativas (`../js/...`) y define su versión antes de cargarlo:

```html
<script>window.EP_VERSION = 'v1';</script>
<script src="../js/firebase-config.js"></script>
...motor compartido...
<script src="./js/vista.js"></script>   <!-- solo la parte visual propia -->
```

- v1/ Mapa Vivo Full-Screen: el mapa de guerra ocupa la pantalla; los menús son paneles flotantes.
- v2/ Rancho/Base Top-Down: tu base vista desde arriba (laboratorios, bodega, cuartel, garaje) como menú principal.
- v3/ Híbrido con Zoom: del rancho al mapa del país con zoom.

Las mecánicas viven en `js/` y no se duplican; cada versión solo cambia la presentación.
Cada versión tiene sus propios 3 slots gracias a EP_VERSION.

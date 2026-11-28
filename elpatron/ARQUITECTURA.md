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

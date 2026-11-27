# Kit de interfaz de God's Plan

Un solo archivo de JavaScript (`assets/gp-kit.js`, unos 25 KB comprimido) y uno de CSS (`assets/gp-kit.css`) que usan los tres sitios:
godsplan.dev, rig.godsplan.dev y godstap.godsplan.dev. Se copian tal cual a cada repo.

## Qué trae

| Pieza | Herramienta | Cómo se usa en el HTML |
|---|---|---|
| Aparición al bajar, barra de progreso y frase que se enciende | **Motion** (`animateMini`, `inView`, `scroll`), compilado desde su código | `data-reveal` (con `--d` para el retraso) y `data-words` |
| Tarjetas deslizables en celular | **Embla Carousel** 8.6, compilado desde su código | Envolver la lista en `<div data-carousel>` |
| Globos de ayuda anclados | **Floating UI** (`@floating-ui/dom`) | `data-tip="Texto"` (opcional `data-tip-place="top"`) |
| Buscador con Ctrl/⌘ + K | Propio, con el comportamiento de **cmdk** (combobox + lista con flechas) | `<script type="application/json" id="gp-cmdk">[…]</script>` y un botón con `data-cmdk-open` |
| Avisos apilados | Propio, con el comportamiento de **Sonner** | `window.gpToast("Texto")` o un botón con `data-copy="texto"` |
| Bordes animados | CSS con la técnica de **Magic UI** (Border Beam y Shine Border) | `data-beam` o `data-shine` |
| Íconos | **Lucide** (ISC) | Símbolos `<symbol>` copiados de `lucide/icons/*.svg` |
| Historia de la página | **UI UX Pro Max** (patrón "Scroll-Triggered Storytelling") y **Craft** | Clases `gpk-story`, `gpk-two`, `gpk-pains`, `gpk-fit`, `gpk-term` |

Cada opción del buscador es un objeto: `{"group", "label", "hint", "href", "keywords"}` o, para copiar,
`{"label", "action": "copy:texto", "toast": "Mensaje"}`.

Todo respeta "reducir movimiento": sin animaciones, el contenido se muestra completo.

## Cómo volver a compilarlo

```sh
sh kit/fetch.sh        # baja de GitHub el código de Motion y Embla (versiones fijas) a kit/vendor/
node kit/build.mjs     # genera assets/gp-kit.js y assets/gp-kit.css
```

`build.mjs` usa esbuild y `@floating-ui/dom`; si no los tienes, instala `esbuild` y `@floating-ui/dom` con npm
y cambia las rutas del principio del archivo.

## Lo que no se pudo usar todavía

shadcn/ui, Radix UI, cmdk, Sonner, dnd kit, Recharts y Storybook se instalan con npm, y en la máquina donde se
armó este kit npm no tenía internet. Por eso el buscador y los avisos son versiones propias con el mismo
comportamiento. Esas librerías encajan mejor en el panel de GodsTap (gráficas con Recharts, reordenar botones
con dnd kit, avisos con Sonner, diálogos con Radix); se pueden agregar ahí con `npm install` cuando haya red.
Penpot es una aplicación de diseño, no una librería; axe-core se probó con revisiones propias de contraste,
foco y tamaño de botones en Playwright (`tools`) porque su versión lista para usar también se descarga con npm.

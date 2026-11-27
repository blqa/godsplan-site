# Sistema de diseño de God's Plan

Una sola fuente de verdad para **godsplan.dev**, **godstap.godsplan.dev** y **rig.godsplan.dev**.
Si un sitio necesita algo que no está aquí, se agrega aquí primero y luego se usa.

- Implementación de referencia: [`assets/site.css`](assets/site.css) (tokens + componentes de la portada), [`assets/components.css`](assets/components.css) (componentes compartidos que la portada no usa) y [`assets/site.js`](assets/site.js) (interacciones).
- Fuentes: [`assets/fonts/`](assets/fonts/) (archivos `.woff2` + licencias OFL).

---

## 1. Carácter

**Oscuro, editorial y preciso.** Un estudio que opera lo que construye. Se ve así:

- Fondos de negro cálido **en capas**, nunca `#000` plano.
- Líneas de `1px` con poca opacidad separan las cosas. No se usan cajas con sombra para todo.
- Títulos grandes y apretados con carácter. El texto de lectura es tranquilo. Lo técnico (dominios, números, estados) va en monoespaciada.
- El **carmesí se usa con precisión quirúrgica**: solo en acentos, estados activos y el CTA principal. Si toda la pantalla tiene rojo, ya no destaca nada.
- Se muestra el producto real (capturas, dominios en vivo). No se usan adornos en su lugar.

---

## 2. Color

### Tokens (copiar tal cual en `:root`)

```css
:root {
  /* Fondos: negro cálido en capas, nunca #000 plano */
  --gp-bg-0: #0b0a0a;   /* lienzo */
  --gp-bg-1: #110f0f;   /* sección alterna */
  --gp-bg-2: #171414;   /* superficie: paneles, marcos */
  --gp-bg-3: #1e1a1a;   /* superficie elevada: hover, filas activas */

  /* Bordes de 1px con baja opacidad */
  --gp-line: rgba(255, 236, 234, 0.08);
  --gp-line-strong: rgba(255, 236, 234, 0.15);
  --gp-line-accent: rgba(239, 80, 88, 0.45);

  /* Texto */
  --gp-text-1: #f4efee;   /* títulos y texto principal */
  --gp-text-2: #bcb3b1;   /* párrafos */
  --gp-text-3: #958b89;   /* metadatos, etiquetas, dominios */

  /* Carmesí de la marca */
  --gp-crimson-700: #8a0303;  /* relleno del CTA */
  --gp-crimson-600: #a3080c;  /* hover del CTA */
  --gp-crimson-400: #ef5058;  /* texto y acentos sobre oscuro */
  --gp-crimson-300: #ff8a8f;  /* hover de enlaces de acento */
  --gp-crimson-tint: rgba(138, 3, 3, 0.16); /* fondo de estado activo */

  --gp-ok: #3ecf8e;           /* solo el indicador "En línea" */
  --gp-whatsapp: #25d366;     /* solo el glifo de WhatsApp */

  color-scheme: dark;
}
```

### Contraste comprobado (WCAG)

| Texto | sobre `bg-0` | sobre `bg-2` | Uso permitido |
|---|---|---|---|
| `--gp-text-1` | 17.3:1 | 16.1:1 | todo |
| `--gp-text-2` | 9.6:1 | 8.9:1 | párrafos |
| `--gp-text-3` | 6.0:1 | 5.5:1 | metadatos, nunca párrafos largos |
| `--gp-crimson-400` | 5.6:1 | 5.2:1 | acentos de texto, números, enlaces |
| `--gp-crimson-300` | 8.7:1 | 8.1:1 | hover de enlaces |
| Blanco sobre `--gp-crimson-700` | 10.0:1 | | texto del CTA |
| Blanco sobre `--gp-crimson-600` | 8.1:1 | | hover del CTA |

**Regla del rojo:** `#8a0303` (el rojo histórico de la marca) **nunca es color de texto** sobre oscuro: da 2.1:1 y no se lee. Para texto rojo se usa siempre `--gp-crimson-400`. El `#8a0303` solo rellena botones y marca estados activos.

### Dónde va el carmesí (y dónde no)

| Sí | No |
|---|---|
| Botón principal (uno por vista) | Fondos de sección |
| La segunda mitad del logotipo (`Gods`**`Tap`**, `Gods`**`Rig`**) | Íconos decorativos |
| Números de pasos y listas (`01`, `02`) | Bordes de todas las tarjetas |
| Subrayado de la sección activa en el menú | Brillos, halos, sombras de color |
| La palabra clave del título principal | Párrafos completos |

---

## 3. Tipografía

Es la tipografía original de godsplan.dev (la de `main`): **Montserrat** para títulos e **Inter** para el texto. Ahora se aloja dentro de cada sitio y se usa con la escala de abajo. **Martian Mono** se agregó solo para lo técnico.

| Rol | Fuente | Archivo | Pesos | Uso |
|---|---|---|---|---|
| Display | **Montserrat** (variable: `wght` 500–900) | `Montserrat-var.woff2` | 800 títulos y logotipos, 700 frases grandes | Títulos, nombres de producto, logotipo, manifiesto |
| Texto | **Inter** (variable: `wght` 300–700, `opsz` 14–32) | `Inter-var.woff2` | 400 texto, 550 botones, 600 énfasis | Párrafos, botones, menús, datos cortos |
| Mono | **Martian Mono** (variable: `wght` 300–600, `wdth` 75–100 %) | `MartianMono-var.woff2` | 400 | Dominios, números, estados, etiquetas técnicas |

```css
@font-face { font-family: "Montserrat"; src: url("fonts/Montserrat-var.woff2") format("woff2"); font-weight: 500 900; font-style: normal; font-display: swap; }
@font-face { font-family: "Inter"; src: url("fonts/Inter-var.woff2") format("woff2"); font-weight: 300 700; font-style: normal; font-display: swap; }
@font-face { font-family: "Martian Mono"; src: url("fonts/MartianMono-var.woff2") format("woff2"); font-weight: 300 600; font-stretch: 75% 100%; font-display: swap; }

:root {
  --gp-font-display: "Montserrat", "Inter", system-ui, sans-serif;
  --gp-font-sans: "Inter", system-ui, -apple-system, "Segoe UI", sans-serif;
  --gp-font-mono: "Martian Mono", ui-monospace, "SFMono-Regular", Menlo, monospace;
}
```

Las fuentes se **alojan en cada sitio** (sin Google Fonts). Salen del repositorio oficial de Google Fonts (`google/fonts`, licencia OFL, incluida en `assets/fonts/`). Son variables y están recortadas a latín más los signos del español: á é í ó ú ñ ü ¿ ¡ « » “ ” € y flechas. Siempre se precarga la display y la de texto:

```html
<link rel="preload" href="/assets/fonts/Montserrat-var.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/Inter-var.woff2" as="font" type="font/woff2" crossorigin>
```

En Next.js (GodsTap) se cargan los mismos archivos con `next/font/local`, con los mismos rangos de peso, y se asignan a las variables `--gp-font-display` y `--gp-font-sans`. No se usa `next/font/google`.

### Escala

| Elemento | Tamaño | Peso | Tracking | Interlineado |
|---|---|---|---|---|
| Titular de portada (h1) | `clamp(3rem, 1.1rem + 7.6vw, 6rem)`, máx. 14 caracteres por línea | 800 | −0.03em | 1.05 |
| Nombre de producto | `clamp(3.5rem, 1.8rem + 7vw, 6rem)` | 800 | −0.03em | 1 |
| Título de cierre / `--gp-text-h2` | `clamp(2.25rem, 1.2rem + 4.2vw, 4.25rem)` | 800 | −0.025em | 1.05 |
| Manifiesto / frase grande | `clamp(1.75rem, 1.05rem + 2.6vw, 3.25rem)` | 700 | −0.02em | 1.18 |
| Logotipo (`God's Plan`) | 1.0625rem | 800 | −0.02em | 1 |
| Logotipo de producto en accesos | 1.5rem | 800 | −0.025em | 1.1 |
| h3 / títulos de texto legal | 1.25–1.5rem | 700 | −0.02em | 1.2 |
| `--gp-text-lead` | `clamp(1.0625rem, 0.98rem + 0.4vw, 1.3125rem)` | 400 | 0 | 1.5–1.55 |
| `--gp-text-body` | 1rem (16px) | 400 | 0 | 1.6 |
| `--gp-text-small` | 0.875rem | 400 | 0 | 1.5 |
| `--gp-text-mono` | 0.75rem, `font-stretch: 87.5%` | 400 | 0 | 1.4 |

Reglas:
- Montserrat es ancha: en títulos se usa entre **−0.02em y −0.03em** de tracking, **nunca más apretada** (las letras se encimarían). No lleva `font-stretch` ni ajustes de `opsz`.
- Montserrat se usa solo de 700 a 900. Los pesos delgados de Montserrat no se usan; para texto ligero está Inter.
- Los títulos llevan `text-wrap: balance`. Los párrafos miden como máximo **36rem** (unos 70 caracteres).
- La mono **no va en mayúsculas espaciadas**. Va en minúsculas, como se escribe un dominio: `godstap.godsplan.dev`.
- Los números de listas y precios usan `font-variant-numeric: tabular-nums`.

---

## 4. Espacio, retícula, radios y profundidad

```css
:root {
  --gp-space-1: 0.25rem; --gp-space-2: 0.5rem; --gp-space-3: 0.75rem;
  --gp-space-4: 1rem;    --gp-space-5: 1.5rem; --gp-space-6: 2rem;
  --gp-space-7: 3rem;    --gp-space-8: 4rem;   --gp-space-9: 6rem;
  --gp-space-10: 8rem;
  --gp-section: clamp(5rem, 3rem + 7vw, 9rem);    /* padding vertical de cada sección */
  --gp-gutter: clamp(1.25rem, 0.6rem + 2.6vw, 2.5rem); /* margen lateral */
  --gp-max: 78rem;                                 /* ancho máximo del contenido */

  --gp-radius-sm: 6px;   /* botones, chips */
  --gp-radius-md: 10px;  /* capturas dentro de un marco, íconos */
  --gp-radius-lg: 16px;  /* paneles y marcos */

  --gp-shadow-1: 0 1px 0 rgba(255,255,255,.03) inset, 0 12px 32px -16px rgba(0,0,0,.7);
  --gp-shadow-2: 0 1px 0 rgba(255,255,255,.04) inset, 0 32px 64px -24px rgba(0,0,0,.85);
}
```

- **Retícula de 12 columnas** en escritorio. Las composiciones son asimétricas (7/5, 5/7, 3/9). El 6/6 se usa poco.
- Hay más espacio **arriba** de un título que abajo. Los grupos van pegados y las secciones bien separadas.
- **Profundidad**: la dan las capas de fondo (`bg-0` → `bg-3`) y el borde de `1px`. Las sombras son **neutras y con desplazamiento**, nunca de color.
- Puntos de quiebre: `640px` (móvil ↔ tableta: aparecen los enlaces del menú y cambian los recortes de las capturas), `760px` (listas de 3 columnas y accesos en dos columnas) y `900px` (layouts en columnas de `components.css`).
- **Momentos, no secciones:** una página se arma con pocos bloques grandes (en godsplan.dev son tres: portada, productos y manifiesto con contacto), centrados y con mucho aire. Su padding vertical es `clamp(7rem, 4rem + 10vw, 13rem)`. Si un bloque no cabe en una frase de propósito, sobra.
- Textura: un grano SVG fijo al **3.5 %** de opacidad sobre todo el sitio (`body::before`).

---

## 5. Componentes

### Botones

Solo hay dos variantes y un tamaño chico. **Un solo botón principal por vista.**

```html
<a class="btn btn--primary" href="#">Ver proyectos <svg class="icon icon--move"><use href="#i-arrow"/></svg></a>
<a class="btn btn--ghost" href="#">Hablemos de tu proyecto</a>
<a class="btn btn--primary btn--sm" href="#contacto">Contacto</a>
```

| | Fondo | Texto | Borde | Hover |
|---|---|---|---|---|
| `--primary` | `crimson-700` | `#fff` | `crimson-700` | fondo `crimson-600`, la flecha se mueve 3px |
| `--ghost` | transparente | `text-1` | `line-strong` | fondo `bg-2`, borde `text-3` |

Medidas: alto mínimo `2.875rem` (46px, área táctil cómoda), padding `.7rem 1.15rem`, radio `6px`, fuente de texto 15px peso 550. El foco visible es `outline: 2px solid var(--gp-crimson-400); outline-offset: 3px`.

### Superficies (paneles y marcos)

No hay "tarjetas" genéricas. Hay tres piezas con su propio trabajo:

- **Acceso a producto** (`.access__item`): fondo `bg-2`, borde `line`, radio 16px. Lleva el logotipo del producto, una línea de descripción y un círculo con flecha que en hover se rellena de `crimson-700`. Se usa en la portada para saltar directo a cada producto, máximo dos o tres juntos.
- **Panel** (`.status`, en `components.css`): fondo `bg-2`, borde `line`, radio 16px, `shadow-2`. Las filas internas se separan con líneas, no con más cajas. **Nunca hay una tarjeta dentro de otra.**
- **Marco de captura** (`.frame`): fondo `bg-2`, borde `line`, radio 16px y padding 8px. Lleva una barra con el dominio en mono, la captura con radio 10px y un `↗`. En hover el borde pasa a `line-strong`, la imagen escala a 1.015 y la flecha se mueve en diagonal.
- **Lista con líneas** (`.facts` en la portada; `.specs`, `.pillars`, `.channels` y el acordeón en `components.css`): solo líneas de `1px`. En `.facts` cada punto es un título corto en `text-1` peso 600 más una línea en `text-2`, en tres columnas desde 760px.
- **Proceso en línea** (`.process`): los pasos en una sola línea mono (`01 Escuchamos — 02 Cotizamos…`), con el número en `crimson-400` y separadores de `1px`. En celular pasan a una cuadrícula de 2×2 sin separadores. Sustituye a las tarjetas de pasos.

### Chip

```html
<span class="chip chip--accent">Producto estrella</span>
<span class="chip">Soporte técnico</span>
```

Mono 11px, radio 6px, borde `line-strong`. La variante `--accent` lleva borde `line-accent`, texto `crimson-300` y fondo `crimson-tint`. **Máximo un chip de acento por pantalla.**

### Indicador "En línea"

Es un punto de 7px en `--gp-ok` con un anillo suave y **no parpadea**. Va junto a la palabra "En línea" en mono. Solo se usa para servicios que de verdad están publicados.

### Acordeón

Usa `<details>` nativo, así funciona aunque no haya JavaScript. El JS anima la altura en 320ms con `--gp-ease-out`. El ícono es un `+` en un círculo de `1px`, que al abrir se vuelve `−` y rellena el círculo en `crimson-700`.

### Encabezado

Es fijo, de 64px de alto, y empieza transparente. Después de 8px de scroll toma fondo `rgba(11,10,10,.86)` con desenfoque y una línea inferior. Lleva pocos enlaces (en godsplan.dev, los dos productos), el ícono de WhatsApp y el botón Contacto. El enlace de la sección visible se marca con un subrayado de 1px en `crimson-400`. Por debajo de 640px solo quedan el logotipo, WhatsApp y Contacto. Si un sitio necesita más de cuatro enlaces, usa el menú móvil de `components.css`.

### WhatsApp

- Ícono en el encabezado, en todos los tamaños, más un botón principal en el cierre de contacto.
- **No hay botón flotante.** Nunca se pone nada encima del contenido.
- El verde `#25d366` solo se usa en el glifo, nunca como fondo de botón.

### Portada de godsplan.dev: estilo "estudio" (nov 2026)

La portada de la agencia usa un registro más expresivo, inspirado en sitios de estudios web (cápsula flotante, la marca al centro con sus servicios alrededor, secciones que alternan oscuro y claro). Vive en `assets/home.css` y `assets/home.js`; privacidad, términos y 404 siguen con `assets/site.css`. GodsTap y GodsRig **no** adoptan estos componentes: siguen con lo de arriba.

**Tokens extra (solo en `home.css`)**

| Token | Valor | Uso | Contraste sobre `--gp-paper` |
|---|---|---|---|
| `--gp-paper` | `#f5f0ee` | Fondo de la sección clara | — |
| `--gp-paper-2` | `#ebe4e1` | Pestaña sin elegir | `--gp-ink-1` encima: 14.5:1 |
| `--gp-ink-1` | `#1a1414` | Títulos sobre papel | 16.1:1 |
| `--gp-ink-2` | `#5c5150` | Párrafos sobre papel | 6.8:1 |
| `--gp-crimson-ink` | `#a3080c` | Acento sobre papel | 7.2:1 |
| `--gp-radius-xl` | `28px` | Paneles grandes y esquinas de sección | — |

**Componentes**

- **Cápsula flotante (`.hdr`)**: encabezado fijo separado del borde, `border-radius: 999px`, vidrio esmerilado (permitido porque es el encabezado). Marca con mosaico carmesí (`.brand__tile`), enlaces centrados y botón claro "Contacto".
- **Etiqueta entre corchetes (`.tag`)**: mono en mayúsculas, `0.6875rem`, con corchetes de 1px en `--gp-crimson-400` (o `--gp-crimson-ink` sobre papel). Solo una por sección, nunca sobre cada título.
- **Botón claro (`.btn--light`)**: fondo `--gp-text-1`, texto `--gp-ink-1`. Todos los botones de la portada son cápsula (`999px`).
- **Órbita de la marca (`.orbit`)**: en la portada, a la derecha del título. Un cuadro carmesí brillante con la cruz al centro (`.core`), tres anillos finos, dos ondas que salen del centro como una señal NFC y dos carriles que giran (`.lane`): el de fuera lleva cápsulas con soluciones (`.chip-f`, 80 s por vuelta) y el de dentro, círculos solo con ícono (`.badge-f`, 46 s, en sentido contrario). Cada satélite se contra-gira para quedar derecho, y todo se pausa al pasar el mouse. En celular las cápsulas muestran solo el ícono. Es decorativa (`aria-hidden`).
- **Título de la portada**: entra palabra por palabra (sube, se enfoca y se endereza, 110 ms entre palabras).
- **Cinta de soluciones (`.ribbon`)**: dos filas que se deslizan en sentidos contrarios (70 y 80 s); la de arriba en texto sólido y la de abajo solo con contorno. Separadores ✦ en carmesí. Se pausa con el mouse. Decorativa: la lista real está en la sección de soluciones.
- **Soluciones (`.bento`)**: cuadrícula de 4 columnas (2 en tableta, 1 en celular) con tarjetas que son enlaces completos. Algunas ocupan dos columnas (`.card--wide`). Al pasar el mouse la tarjeta sube 4px, el borde se vuelve carmesí, el ícono gira un poco y una luz carmesí sigue al cursor. Tarjetas especiales: `.card--hot` (GodsTap, con ondas NFC), estrellas que se encienden una por una, barras que crecen al aparecer y `.card--ask` (borde punteado, "¿Necesitas algo que no está aquí?"). Las soluciones que se hacen a pedido abren WhatsApp con un mensaje ya escrito.
- **Movimiento extra**: destello que cruza el botón principal al pasar el mouse, los dibujos del método se trazan al aparecer y el resplandor del panel de contacto se mueve despacio. Todo se apaga con `prefers-reduced-motion`.
- **Fondo de la portada**: degradado de negro a rojo intenso hacia la derecha (`#2a0708` → `#5a0a0f`) más un resplandor radial carmesí. Sin franjas ni texturas.
- **Declaración por palabras (`[data-words]`)**: un solo párrafo grande ("Ingeniería aplicada a negocios reales. Sistemas que se usan todos los días, sin relleno.") que se enciende palabra por palabra al bajar; las palabras clave quedan en `--gp-crimson-400`. Sin movimiento reducido se muestra completo.
- **Sección clara (`.light`)**: papel cálido con esquinas superiores de 28px. Se usa una vez, para los productos.
- **Pestañas (`.tabs`)**: cápsulas; la elegida es `--gp-ink-1` con texto papel. Con teclado se cambian con ←/→. Los enlaces `#godstap` y `#godsrig` abren su pestaña.
- **Caso (`.case`)**: panel oscuro de 28px con degradado radial desde la esquina inferior derecha (carmesí para GodsTap, café para GodsRig), puntos de verificación redondos (`.pip`) y capturas inclinadas (teléfonos o ventana de navegador).
- **Panel de método (`.method`)**: panel oscuro redondeado con retícula de puntos de 22px y cuadrícula 2×2 con líneas de 1px. Cada paso lleva un dibujo de línea (1.4px) con un solo punto carmesí.
- **Panel de contacto (`.cta__panel`)**: degradado carmesí oscuro con un resplandor inferior.
- **Palabra gigante del pie (`.ftr__word`)**: "God's Plan" en Montserrat 900 con degradado casi transparente; decorativa.

**Excepciones a la sección 7, solo en esta portada**: texto con degradado en una palabra del título principal y del título del método; resplandores radiales dentro de la portada (incluido el cuadro de la órbita), los casos y el panel de contacto; retícula de puntos solo en el panel de método; una etiqueta entre corchetes por sección.

---

---

## 6. Movimiento

```css
:root {
  --gp-ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --gp-dur-1: 160ms;  /* hover y color */
  --gp-dur-2: 320ms;  /* acordeón, menú, flechas */
  --gp-dur-3: 800ms;  /* aparición al hacer scroll */
}
```

- **Un momento con intención por página.** En godsplan.dev es la entrada de la portada (desenfoque + subida, escalonada 110ms) y la llegada de cada captura (el marco sube 48px y pasa de escala 0.97 a 1 en 1.1s).
- Aparición al hacer scroll: opacidad y `translateY(24px)` → 0, escalonado de 90ms con `--d`.
- **El contenido es visible por defecto.** Las animaciones solo se activan si la clase `motion` está en `<html>`, que se pone cuando hay JS y el usuario no pidió reducir movimiento.
- `prefers-reduced-motion: reduce` apaga todas las transiciones.
- Nunca se usan rebotes, `animate-ping`, parpadeos ni movimientos infinitos.

---

## 7. Prohibido

1. Texto con degradado (`background-clip: text`). *Excepción: portada de godsplan.dev, ver sección 5.*
2. Brillos o halos de color (`box-shadow: 0 0 40px <rojo>`), manchas difuminadas de color de fondo y neón. *Excepción: resplandores radiales de la portada de godsplan.dev.*
3. Fondos de cuadrícula o de puntos decorativos. *Excepción: el panel de método de la portada de godsplan.dev.*
4. Puntos que parpadean o laten (`animate-pulse`, `animate-ping`) para fingir que algo está "vivo".
5. Etiquetas pequeñas en mayúsculas encima de cada título. El título se sostiene solo. *En la portada de godsplan.dev se permite una etiqueta entre corchetes por sección.*
6. Barras de métricas de relleno ("2 productos · MX · 1").
7. Filas de tarjetas iguales con ícono + título + texto como estructura de la página. Tampoco tarjetas dentro de tarjetas.
8. `#8a0303` como color de texto. `#000` puro como fondo de página.
9. Vidrio esmerilado como decoración (solo se permite en el encabezado fijo, donde tiene una función).
10. Barra de color en un solo lado de una caja (borde izquierdo de acento).
11. Sombras duras desplazadas (`4px 4px 0`).
12. Emojis o caracteres Unicode en lugar de íconos. Los íconos son SVG de trazo `1.6px` con extremos redondeados. El único glifo de marca es el de WhatsApp (Font Awesome Free, CC BY 4.0).
13. Tailwind por CDN en producción, Google Fonts y librerías de íconos por CDN.
14. Inventar cifras, testimonios o logos de clientes.

---

## 8. Patrón "by God's Plan" (subdominios ↔ godsplan.dev)

Cada producto lleva el sello en **dos lugares**: junto a su logotipo en el encabezado y en una franja al final del pie. Los dos enlazan a `https://godsplan.dev`.

### HTML

```html
<!-- 1. En el encabezado, junto al logotipo del producto -->
<a class="gp-by" href="https://godsplan.dev" target="_blank" rel="noopener">
  <svg class="gp-by__mark" viewBox="0 0 64 64" aria-hidden="true"><path d="M28 10h8v16h16v8H36v22h-8V34H12v-8h16z"/></svg>
  by God's Plan
</a>

<!-- 2. Franja final del pie (la última línea de cualquier página del producto) -->
<div class="gp-family">
  <div class="gp-family__inner">
    <a class="gp-family__home" href="https://godsplan.dev">
      <svg class="gp-by__mark" viewBox="0 0 64 64" aria-hidden="true"><path d="M28 10h8v16h16v8H36v22h-8V34H12v-8h16z"/></svg>
      <span>Un proyecto de <strong>God's Plan</strong></span>
    </a>
    <nav class="gp-family__links" aria-label="Proyectos de God's Plan">
      <a href="https://godsplan.dev">godsplan.dev</a>
      <a href="https://godstap.godsplan.dev">godstap</a>
      <a href="https://rig.godsplan.dev">rig</a>
    </nav>
  </div>
</div>
```

En la franja, el enlace del sitio actual lleva `aria-current="page"` y se ve en `text-1` con subrayado carmesí.

### CSS (autocontenido: solo necesita los tokens de la sección 2 y 3)

```css
.gp-by { display: inline-flex; align-items: center; gap: .4rem; padding: .2rem .5rem; border: 1px solid var(--gp-line); border-radius: var(--gp-radius-sm, 6px); font-family: var(--gp-font-mono); font-stretch: 87.5%; font-size: .6875rem; color: var(--gp-text-3); text-decoration: none; transition: color 160ms, border-color 160ms; }
.gp-by:hover { color: var(--gp-text-1); border-color: var(--gp-line-strong); }
.gp-by__mark { width: .8rem; height: .8rem; fill: var(--gp-crimson-400); flex: none; }

.gp-family { border-top: 1px solid var(--gp-line); background: var(--gp-bg-0); }
.gp-family__inner { max-width: var(--gp-max, 78rem); margin: 0 auto; padding: 1.1rem var(--gp-gutter, 1.5rem); display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: .75rem 1.5rem; font-family: var(--gp-font-mono); font-stretch: 87.5%; font-size: .75rem; color: var(--gp-text-3); }
.gp-family__home { display: inline-flex; align-items: center; gap: .5rem; color: inherit; text-decoration: none; }
.gp-family__home strong { color: var(--gp-text-1); font-weight: 500; }
.gp-family__links { display: flex; gap: 1.25rem; }
.gp-family__links a { color: var(--gp-text-3); text-decoration: none; transition: color 160ms; }
.gp-family__links a:hover, .gp-family__links a[aria-current="page"] { color: var(--gp-text-1); }
.gp-family__links a[aria-current="page"] { text-decoration: underline; text-decoration-color: var(--gp-crimson-400); text-underline-offset: 4px; }
```

### Reglas de la familia

- El nombre del producto siempre va escrito igual: `Gods` en `text-1` + la segunda mitad en `crimson-400` (`GodsTap`, `GodsRig`), en Montserrat 800.
- El correo de todos los productos es `contacto@godsplan.dev`. El WhatsApp es `https://wa.me/525510590927`.
- El favicon es la cruz `M28 10h8v16h16v8H36v22h-8V34H12v-8h16z` en `#ef5058` sobre `#0b0a0a` con radio 14. Cada producto puede usar su propio favicon, pero con estos mismos colores.

---

## 9. Cómo aplicarlo en cada sitio

**godsplan.dev**: ya aplicado. El archivo `assets/site.css` es la referencia.

**rig.godsplan.dev** (HTML estático):
1. Copiar `assets/fonts/` y el bloque de `@font-face` + `:root` de `assets/site.css`.
2. Quitar Tailwind por CDN, Google Fonts y Font Awesome por CDN. Pasar el título rojo `#8a0303` a `--gp-crimson-400`.
3. Las tarjetas del catálogo se vuelven filas con líneas (nombre a la izquierda, precio en mono `tabular-nums` a la derecha).
4. Poner `.gp-by` junto al logotipo y `.gp-family` al final del pie.

**godstap.godsplan.dev** (Next.js):
1. Copiar las fuentes a `public/fonts/` o cargarlas con `next/font/local` usando las mismas familias y los mismos rangos de pesos.
2. Pegar los tokens en `globals.css`. Si usa Tailwind, mapearlos en `theme.extend` (`colors.gp.bg0: 'var(--gp-bg-0)'`, etc.) y **no** usar valores sueltos.
3. Su modo claro queda fuera de este sistema por ahora. Si se mantiene, se define después como `[data-theme="light"]` con sus propios tokens, revisados al mismo contraste mínimo de 4.5:1.
4. Poner `.gp-by` en el encabezado (hoy dice "by God's Plan" como texto suelto) y `.gp-family` al final del pie.

**Lista de verificación antes de publicar cualquiera de los tres:**
- [ ] Ningún texto bajo 4.5:1 (los títulos grandes, mínimo 3:1).
- [ ] Ningún elemento de la sección 7.
- [ ] Un solo botón principal por vista.
- [ ] El botón de WhatsApp no tapa contenido en 390px de ancho.
- [ ] Funciona con `prefers-reduced-motion` y sin JavaScript.
- [ ] El pie lleva `.gp-family` y los enlaces regresan a `godsplan.dev`.

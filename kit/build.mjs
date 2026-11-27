// Compila el kit: node kit/build.mjs  (antes: sh kit/fetch.sh para bajar el código de Motion y Embla)
import * as esbuild from "/opt/npm-tools/node_modules/esbuild/lib/main.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const vendor = path.join(here, "vendor");
const floating = process.env.FLOATING_UI || "/opt/npm-tools/node_modules/@floating-ui";
const alias = {
  "framer-motion/dom": `${vendor}/motion/packages/framer-motion/src/dom.ts`,
  "motion-dom": `${vendor}/motion/packages/motion-dom/src/index.ts`,
  "motion-utils": `${vendor}/motion/packages/motion-utils/src/index.ts`,
  "embla-carousel": `${vendor}/embla-carousel/packages/embla-carousel/src/index.ts`,
  "@floating-ui/dom": `${floating}/dom/dist/floating-ui.dom.mjs`,
  "@floating-ui/core": `${floating}/core/dist/floating-ui.core.mjs`,
  "@floating-ui/utils/dom": `${floating}/utils/dist/floating-ui.utils.dom.mjs`,
  "@floating-ui/utils": `${floating}/utils/dist/floating-ui.utils.mjs`,
};
const banner = "/*! God's Plan kit · Motion (MIT) · Embla Carousel (MIT) · Floating UI (MIT) · íconos Lucide (ISC) */";
await esbuild.build({
  entryPoints: [path.join(here, "src/gp-kit.js")],
  bundle: true, minify: true, format: "iife", target: ["es2020"],
  outfile: path.join(here, "../assets/gp-kit.js"),
  plugins: [{ name: "alias", setup(b) {
    b.onResolve({ filter: /^(framer-motion\/dom|motion-dom|motion-utils|embla-carousel|@floating-ui\/.+)$/ }, (a) => ({ path: alias[a.path] }));
  } }],
  define: { "process.env.NODE_ENV": '"production"' },
  banner: { js: banner }, logLevel: "warning",
});
await esbuild.build({ entryPoints: [path.join(here, "src/gp-kit.css")], bundle: true, minify: true, outfile: path.join(here, "../assets/gp-kit.css"), logLevel: "warning" });
for (const f of ["gp-kit.js", "gp-kit.css"]) console.log(f, (fs.statSync(path.join(here, "../assets", f)).size / 1024).toFixed(1), "KB");

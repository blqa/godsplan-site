#!/bin/sh
# Baja el código de Motion y Embla Carousel desde GitHub (versiones fijas) a kit/vendor/.
set -e
cd "$(dirname "$0")"
mkdir -p vendor
get() { # repo carpeta commit rutas...
  repo=$1; dir=$2; rev=$3; shift 3
  [ -d "vendor/$dir/.git" ] || git clone -q --filter=blob:none --no-checkout "https://github.com/$repo" "vendor/$dir"
  git -C "vendor/$dir" sparse-checkout set "$@"
  git -C "vendor/$dir" fetch -q --depth 1 origin "$rev" && git -C "vendor/$dir" checkout -q "$rev"
}
get motiondivision/motion motion 6390e6d2ddde40128258aaa0499587505f008f1e packages/config packages/framer-motion packages/motion-dom packages/motion-utils
get davidjerleke/embla-carousel embla-carousel 0fe65834136f1aa35e4c1a4a477e5ccb4bb5ee54 packages/embla-carousel
echo "Listo: kit/vendor"

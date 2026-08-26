#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUTPUT_DIR="$PROJECT_DIR/dist-github"

cd "$PROJECT_DIR"
npx vite build --config vite.github.config.ts

perl -0pi -e 's|const GEMINI_ENDPOINT = "/api/marshadow";|const GEMINI_ENDPOINT = "https://pokemon-eclipse-nexus.grand-finch-8395.chatgpt.site/api/marshadow";|' "$OUTPUT_DIR/marshadow-ai/script.js"
perl -0pi -e 's|="/assets/|="/marshadow-dex/assets/|g; s|href="/"|href="/marshadow-dex/"|g' "$OUTPUT_DIR/marshadow-ai/index.html"

rm -rf \
  "$OUTPUT_DIR/assets/profile/elite" \
  "$OUTPUT_DIR/assets/profile/fanart" \
  "$OUTPUT_DIR/assets/profile/icons"
rm -f \
  "$OUTPUT_DIR/assets/darkrai-domain-v3.png" \
  "$OUTPUT_DIR/assets/darkrai-web.jpg" \
  "$OUTPUT_DIR/assets/darkrai.png" \
  "$OUTPUT_DIR/assets/giratina-aura-4k.jpg" \
  "$OUTPUT_DIR/assets/giratina-domain-v3.png" \
  "$OUTPUT_DIR/assets/giratina-origin.png" \
  "$OUTPUT_DIR/assets/giratina-web.png" \
  "$OUTPUT_DIR/assets/haunter-cursor.gif" \
  "$OUTPUT_DIR/assets/hoopa-domain-v3.png" \
  "$OUTPUT_DIR/assets/hoopa-unbound.png" \
  "$OUTPUT_DIR/assets/hoopa-web.jpg" \
  "$OUTPUT_DIR/assets/marshadow-ai-opening.mp4" \
  "$OUTPUT_DIR/assets/marshadow-aura.gif" \
  "$OUTPUT_DIR/assets/marshadow-dex-opening.mp4" \
  "$OUTPUT_DIR/assets/marshadow-entry-user.gif" \
  "$OUTPUT_DIR/assets/marshadow-intro.png" \
  "$OUTPUT_DIR/assets/marshadow-zenith.png" \
  "$OUTPUT_DIR/assets/marshadow.png" \
  "$OUTPUT_DIR/assets/profile/gengar-neon.jpg" \
  "$OUTPUT_DIR/assets/profile/mimikyu-shadow.jpg" \
  "$OUTPUT_DIR/assets/profile/toxtricity-neon.jpg" \
  "$OUTPUT_DIR/assets/purple-clouds.gif" \
  "$OUTPUT_DIR/file.svg" \
  "$OUTPUT_DIR/globe.svg" \
  "$OUTPUT_DIR/marshadow-ai/marshadow-ai-background.gif" \
  "$OUTPUT_DIR/window.svg"

test -f "$OUTPUT_DIR/.nojekyll"
test "$(find "$OUTPUT_DIR/assets/profile/pinterest" -maxdepth 1 -type f -name 'perfil-*.webp' | wc -l)" -eq 30
test -f "$OUTPUT_DIR/assets/profile/pinterest/perfil-01.webp"
test -f "$OUTPUT_DIR/assets/profile/pinterest/perfil-30.webp"
grep -q '/marshadow-dex/assets/' "$OUTPUT_DIR/marshadow-ai/index.html"
grep -q 'grand-finch-8395.chatgpt.site/api/marshadow' "$OUTPUT_DIR/marshadow-ai/script.js"
! grep -R -qE '"/assets/(marshadow-dex-opening-lite|marshadow-dex-brand|haunter-cursor-transparent|marshadow-zenith-lite)' "$OUTPUT_DIR/assets"/*.js

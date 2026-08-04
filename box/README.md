# Slarmoo's Box — /box deploy folder

Upload the CONTENTS of this folder to the /box directory on your static host.
https://<your-host>/box/ then loads the editor directly. Nothing else is needed.

## What's inside
- index.html — the editor page (loads beepbox_editor.min.js)
- beepbox_editor.js / beepbox_editor.min.js (+ source maps) — the editor bundle
  (stretch notes, flip selection, pitch follower mods, URL format v9)
- samples*.js, drumsamples.js, kirby/wario/mario_paintbox/nintaribox_samples.js — sample packs
- player/ — the song player (the editor's "View in Song Player" links point here)
- theme_resources/ — theme fonts & images
- icons, manifest.webmanifest, browserconfig.xml, favicon.ico, 404.html
- credits / faq / patch_notes / sample_extractor / shortener / macandcheese / snake pages

## Notes
- Everything uses relative paths, so it works in any subfolder (/box, /music, ...).
- The two root-absolute meta tags (/browserconfig.xml, /manifest.webmanifest) were rewritten to
  relative paths in these copies, so no tile/manifest 404s.
- The offline PWA service worker is hardcoded to the domain root in the editor source
  (editor/main.ts registers "/service_worker.js" with scope "/"), so it will not activate in a
  subfolder. The editor still works normally; the registration failure is silently ignored.
- The "Archives" link on credits.html points to ../archive/, which is not included here.
- Requires HTTPS (Web Audio) and standard MIME types — any static host provides these.
- jQuery / select2 / the B612 font load from CDNs; internet is required.

## Regenerating this folder
1. Build: bash scripts/compile_beepbox_editor.sh (and compile_beepbox_player.sh)
2. Copy the needed files from website/ as done here.

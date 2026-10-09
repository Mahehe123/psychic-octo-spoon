# Pickleball Payment Tracker

Offline PWA for tracking pickleball session payments. Data is stored on the device (localStorage) — use **Backup → Export backup** regularly.

## Deploy to GitHub Pages
Repo: https://github.com/Mahehe123/psychic-octo-spoon

1. Repo → **Settings → Pages** → Source: *Deploy from a branch* → `main` / `(root)` → Save.
2. After ~1 min, open https://mahehe123.github.io/psychic-octo-spoon/ in Chrome on Android → ⋮ menu → **Add to Home screen / Install app**.

## Updating the app
Edit files, bump `CACHE` in `sw.js` (e.g. `pickleball-v2`), commit and push. The phone picks it up after opening the app once or twice. Your data is not affected.

## v2 (design trial)
`v2/` is a restyled copy using the court palette (court blue, kitchen green, ball yellow). It's served at https://mahehe123.github.io/psychic-octo-spoon/v2/ and installs as a separate "Pickleball v2" app.
It shares the same on-device data as v1 (same site, same storage key), so both show the same sessions. Bump `CACHE` in `v2/sw.js` when you change v2 files.

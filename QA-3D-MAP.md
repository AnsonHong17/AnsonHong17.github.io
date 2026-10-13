# Kawan CBT 5.0 — 3D Island Map integration QA

## Scope
- Real project: 5.0 All-in-One Beta (33 source files).
- New image: emotion-world-3d.webp, derived from the newly created illustrated image (1672 × 941; ~404 KB).
- New stylesheet: island-3d-map.css.
- index.html updated to load image and stylesheet.
- All main application, CBT, dashboard, submissions, Supabase, password reset code is unchanged byte-for-byte.

## Automated checks
- `node --check` on all JavaScript files: passed.
- HTML local src/href existence: passed; 0 missing assets.
- CSS braces: 40 opening / 40 closing; balanced.
- Headless Chromium DOM/interaction tests using embedded local assets (network navigation was blocked in this environment):
  - 1480 px: illustration loads, 4 hot-spots clickable, three mini-game dialogs open; Teluk Cerita follows the existing story scrolling path.
  - 1024 px: illustration loads, no horizontal overflow.
  - 768 px: responsive preview with four large activity cards; no horizontal overflow.
  - 390 px: responsive preview with four large activity cards; no horizontal overflow; feelings dialog opens.
  - No uncaught page errors in the map-only browser test.

## Limitations
- 3D-looking illustration is a 2D static WebP. There is no WebGL model, free camera orbit, or physics.
- This is a local interaction test, **not** live Supabase / GitHub Pages deployment test or a security audit.
- The generated text/buttons baked into the image are art. Interaction comes from the invisible, keyboard-accessible HTML buttons aligned over the image on desktop.
- Desktop hotspots assume the image retains its 1672/941 aspect ratio; if you replace the scene graphic, review hotspot alignment.
- When testing GBK with a configured Supabase project, use fictitious student data until separate RLS/abuse/privacy checks are completed.

# Motion: performance, reduced motion and regressions

Measured 2026-11-08 on the production build (`vite build`, served by `vite preview`), with headless Chrome 140-series and Lighthouse 12. The spec is in [DESIGN.md](../../DESIGN.md#motion).

## Frame rate

A script recorded every animation frame while scrolling the whole landing page over 8 seconds (GSAP reveals, the steps story, parallax, count-ups running), and for 3 seconds on the style guide's motion section, where the pulse rings and alert banners animate. CPU slowdown uses Chrome's own throttling (`Emulation.setCPUThrottlingRate`); 6x on a 390 px phone viewport stands in for a mid-range Android phone.

| Run | Frame rate | Frames over 25 ms | Frames over 50 ms | Worst frame |
|---|---|---|---|---|
| Landing scroll, 1440x900, no slowdown | 60 fps | 0% | 0 | 17 ms |
| Landing scroll, 1440x900, 4x slower CPU | 60 fps | 0% | 0 | 17 ms |
| Landing scroll, 390x844 phone, 6x slower CPU | 60 fps | 0% | 0 | 33 ms |
| Style guide pulses, 1440x900, no slowdown | 60 fps | 0% | 0 | 17 ms |
| Style guide pulses, 1440x900, 4x slower CPU | 60 fps | 0% | 0 | 17 ms |
| Style guide pulses, 390x844 phone, 6x slower CPU | 60 fps | 0% | 0 | 17 ms |

**Not measured:** a real phone (none available here), and the signed-in console's live map with markers dropping in and pulsing, which needs a session in the measuring browser. The map animates inside MapLibre's WebGL canvas, not the page. Before the demo, open the console on one real mid-range Android phone and watch an alert arrive.

## Lighthouse (landing page)

| | Performance | Accessibility | Best practices | SEO | Largest paint |
|---|---|---|---|---|---|
| Mobile | 96 | 100 | 100 | 100 | 2.2 s |
| Desktop | 100 | 100 | 100 | 100 | 0.5 s |

Two problems found and fixed along the way:

- **The page-change fade also ran on the first load,** so the whole page started transparent and every paint came later (mobile performance 93, largest paint 2.7 s). It now runs only when moving between pages.
- **Scroll reveals hid content with `visibility: hidden`,** which removes it from the accessibility tree: screen-reader users would skip headings they hadn't scrolled to, and Lighthouse flagged heading order and contrast (accessibility 94). Reveals now use opacity only.

## Reduced motion

Checked with Chrome emulating `prefers-reduced-motion: reduce`:

- **Landing page:** all 26 reveal elements visible, no running animations, and GSAP isn't downloaded at all.
- **Style guide:** no running animations; the pulse ring is a static, wider ring at 35% opacity instead of pulsing.
- **Console** (by construction, not measured in a session): transitions finish at once, the map's pulse layers show a static wider ring, the camera jumps instead of gliding, and new markers appear without growing in. The alert sound isn't motion and still plays.

## Regression checklist

| Feature | How it was checked | Result |
|---|---|---|
| Sign in, sign out, role access for all four roles | `npm run check:roles` against Supabase (earlier today) and the API tests | Pass |
| Row level security | 10 database-level tests in `rls.test.ts` | Pass |
| Incident flow: report, acknowledge, verify, assign, dispatch, on scene, resolve, false alarm | API tests (107) | Pass |
| Detection ingest, review queue, snapshots | API tests and detector tests (23) | Pass |
| Incident queue grouping, severity words, selection | Web tests (`IncidentQueue.test.tsx`) | Pass |
| Swipe to dispatch and its tap alternative, segmented control, form fields | UI tests (`ui.test.tsx`) | Pass |
| Landing page content, map, links, no API calls | Web tests (`Landing.test.tsx`) | Pass |
| Contrast of every token pair | `contrast.test.ts` | Pass |
| Motion tokens match between CSS and TypeScript | `motion.test.ts` | Pass |
| Typecheck, lint, production build | `npm run typecheck`, `npm run lint`, `npm run build` | Pass |
| Emergency banner, Acknowledge from the banner, alert sound, tab title, responder assignment banner | Not exercised in a browser session; built on tested pieces, and shown in the style guide | **Check by hand:** sign in as an operator, raise a high incident, confirm the banner, sound and Acknowledge |

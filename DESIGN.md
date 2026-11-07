# BantayBuhay design contract

The reference image (`C:\BantayBuhay\INSPO\BantayBuhayUIUXDesignInspo.jpg`) sets how BantayBuhay looks; BantayBuhay's own data decides what it shows. [The design analysis](docs/design/DESIGN-ANALYSIS.md) explains where each value comes from. The style guide at `/styleguide` renders every token and component.

**Rules:**

1. Screens use components from `apps/web/src/ui` and token classes only. No hex values, pixel radii or ad hoc shadows in feature code.
2. Every change to a color token must keep `src/design/contrast.test.ts` passing.
3. After building or changing a screen, compare it with the reference and log any inconsistency below.

## Themes

**Light is the default for every role,** matching the reference. A dark theme derived from the same language is available through `data-theme="dark"` on `<html>`.

## Tokens

All tokens live in `apps/web/src/index.css`. Theme values are CSS variables (`--bb-*`), exposed to Tailwind as classes such as `bg-card` or `text-fg-2`.

### Color

| Token | Light | Dark | Use |
|---|---|---|---|
| `canvas` | `#F4F3EF` | `#0E1012` | Page and map background |
| `glass` | `#F3F4F5` at 72% + blur | `#1C1E21` at 72% + blur | Large floating panels (`.glass`) |
| `card` | `#FFFFFF` | `#1A1C1F` | Cards, inputs |
| `card-muted` | `#F1F2F4` | `#23262A` | Quiet cards, skeletons, tracks |
| `fg` | `#111315` | `#F2F3F4` | Main text |
| `fg-2` | `#4F565E` | `#A7AEB5` | Secondary text |
| `hairline` | `#E3E6E9` | `#2E3237` | Decorative dividers only |
| `border-ui` | `#7C848D` | `#6F7780` | Input and control borders, at least 3:1 |
| `accent` | `#F7E2B0` | `#F2D58A` | Active nav item, selected option |
| `accent-strong` | `#EFCB72` | `#F7E2B0` | Accent hover and press |
| `on-accent` | `#111315` | `#111315` | Text on the accent, always dark |
| `info`, `info-soft` | `#275E9E`, `#DDEBF7` | `#8FBCEF`, `#1E3045` | Count badges, links, focus |
| `inverse` | `#111315` | `#F2F3F4` | Black pills: rail, callouts, primary buttons, selected cards |
| `on-inverse` | `#FFFFFF` | `#111315` | Text on inverse |

### Severity

The yellow, orange and red follow the PAGASA warning levels responders already know, with blue for low. Every severity has a color, a shape and a word.

| Severity | Fill | Text variant (light) | Shape |
|---|---|---|---|
| Low | `#5AA9F0` | `#1D5FA8` | Circle |
| Medium | `#F2C230` | `#735400` | Triangle |
| High | `#F28C28` | `#9C4700` | Diamond |
| Critical | `#E5484D` | `#BF1F2B` | Square |

Fills always carry dark text (`on-severity`). The critical banner is `#BF1F2B` with white text.

### Type

| Role | Family | Size, weight, line height |
|---|---|---|
| Display | Outfit | 40 px, 600, 1.05, −0.02 em |
| Big numeral | Outfit | 32 px, 300, tabular |
| Section heading | Outfit | 18 px, 500, 1.25 |
| Card title, buttons | Outfit | 15 px, 500, 1.25 |
| Body | Atkinson Hyperlegible Next | 15 px, 400, 1.5 |
| Meta | Atkinson Hyperlegible Next | 13 px, 400 |

Both fonts are self-hosted under the SIL Open Font License.

### Shape, depth, motion

- **Radius:** tile 18 px, control 16 px, card 24 px, rail 32 px, panel 40 px; pills fully round.
- **Shadow:** `soft` for resting cards, `lift` on hover, `float` for overlays. Very low opacity, never harsh.
- **Motion:** see [Motion](#motion) below.
- **Icons:** Lucide outline icons, 1.75 px stroke, 20 or 24 px.

## Motion

Motion explains a change, points to what needs attention, or confirms an action. Nothing moves only to decorate. The character follows the reference: soft and fluid (frosted surfaces settle rather than snap), but quick wherever people work.

### Tokens

Defined in `apps/web/src/ui/motion.ts` for Motion components, mirrored as CSS variables in `index.css` for transitions; `src/design/motion.test.ts` fails if the two differ. Never write a raw duration, curve or spring in a component.

| Token | Value | Use |
|---|---|---|
| `instant` | 100 ms | Press feedback, toggles |
| `fast` | 180 ms | Hover, tint, list reflow, page fade |
| `base` | 280 ms | Panels, toasts, banners, dialogs entering; map markers dropping in |
| `slow` | 460 ms | Sheets, the map camera moving to an incident |
| `expressive` | 760 ms | Landing page only |
| `standard` | `cubic-bezier(0.32, 0.72, 0, 1)` | Between two resting states |
| `enter` | `cubic-bezier(0.22, 1, 0.36, 1)` | Arriving (the reference's curve) |
| `exit` | `cubic-bezier(0.4, 0, 1, 1)` | Leaving, quickly |
| `emphasized` | `cubic-bezier(0.05, 0.7, 0.1, 1)` | Alerts, the landing steps |
| `gentle` spring | stiffness 260, damping 30 | Layout changes, the rail highlight |
| `snappy` spring | stiffness 520, damping 38 | Direct manipulation (swipe handle) |
| `alert` spring | stiffness 700, damping 44 | Emergency banner: firm, no bounce |
| Distances | 4, 8, 16, 32, 64 px | `xs` to `xl`; parallax never exceeds `xl` |
| Stagger | 30, 60, 100 ms | `tight` (console lists), `base`, `loose` (landing) |
| Pulse | critical 1.2 s, high 1.9 s | Map rings and alert icons |

CSS utilities: `duration-instant|fast|base|slow` and `ease-standard|enter|exit|emphasized`.

### Intensity by context

- **Landing page: expressive.** A hero entrance in CSS on first paint, sections that rise in once, the five steps played as a story with their connecting line drawing across, a subtle parallax (tablets and computers only), and the coverage numbers counting up. GSAP runs this, loaded after the page is idle.
- **Console and role views: restrained.** Only state changes move, within `instant` to `base`; data never animates into place on load. Numbers settle in when they change and never count up, so a figure can be read the moment it appears.
- **Emergencies: urgent.** See below. Motion never sits between a person and acknowledging, dispatching or reading.

### Emergencies

- **High and critical, unacknowledged:** a banner arrives with the `alert` spring and stays until someone acknowledges the incident, with **Acknowledge** and **Open** on it and a count of others waiting. Its icon and the map marker pulse, critical every 1.2 s and wider than high's 1.9 s. The tab title says an incident is waiting. With the sound on, a generated tone plays on arrival and repeats, critical every 30 s and high every 60 s, until acknowledged. The banner text never moves after arrival.
- **Medium and low:** a toast, the queue item sliding in, and the map marker dropping in. No banner, pulse or sound.
- **Responders:** a banner for each new assignment until they open it.
- **Sound:** browsers allow audio only after a click or key press on the page. Signing in counts; after a reload, the banner offers **Enable alert sound**. The sound control sits in the console header.
- **Medical warnings (milestone 5):** static, high-contrast, in the critical style (override 6). They never animate, so they can't delay reading.

### Components

| Component | Motion | Purpose |
|---|---|---|
| Button, IconButton | Lift on hover (`fast`), scale to 0.97 on press (`instant`), spinner while `loading` | Confirms the press; shows work in progress and blocks repeat presses |
| Links | Tint on hover (`fast`) | Shows it's interactive |
| Input | Focus ring appears at once; the sign-in form shakes once when refused | Focus is never delayed; a refusal is noticed |
| ListCard | Lift on hover; selected turns black | Selection is unmistakable |
| AnimatedList | Items slide in (`fast`), fade out (`exit`) and reorder smoothly | A live queue's changes can be followed |
| AlertBanner | Arrives with the `alert` spring; icon pulses by severity | Emergency attention |
| Toasts | Rise in (`base`), stack, pause their timer while hovered or focused, swipe away, shrinking timer line | Confirms without blocking |
| Modal | Fades and rises (`base`); backdrop fades; native `<dialog>` keeps the focus trap | Shows where the dialog came from |
| Panels and sheets | Rise in (`base`, sheets `slow`) | Shows the new layer |
| Rail | Butter highlight glides to the active item (`gentle`) | Shows where you are |
| Stat | A changed number settles in (`fast`) | Live values change without jitter (tabular numerals) |
| Page change | Fades in (`fast`), no exit wait | Orientation without delay |
| Skeleton | Highlight slides across (transform only) | Shows loading |
| Map | New markers grow in (`base`); unacknowledged high and critical pulse; the camera moves to a selected incident (`slow`) | Where and how urgent |

Not built yet, so not animated: responder positions (when tracking exists, interpolate between reported positions over the report interval, never extrapolate), marker clusters (expand and collapse with `base` when the camera count needs them), and charts (draw in once with `slow`, then update values without re-drawing). Floating labels are not used: labels stay above their fields, which reads better and suits screen readers.

### Performance and accessibility

- Animate only `transform` and `opacity`. MapLibre animates its own layers on the GPU.
- Reduced motion: transitions finish at once, loops stop, the landing page shows everything in place, and pulses become a static wider ring, so alerts stay perceivable without movement. Sound is not motion and still plays.
- Nothing blocks input: no exit waits on navigation, toasts never take focus, and every animation can be interrupted by the next action.
- Target: 60 fps on a mid-range Android phone (about a PHP 7,000 device, MediaTek Helio G85 or Snapdragon 680 class, 4 GB RAM, Chrome) and the team's i3-1220P laptop. Checked with headless Chrome at 4x and 6x CPU slowdown; check on one real phone before the demo.

## Components

All in `apps/web/src/ui`: `Button`, `IconButton`, `Card`, `IconTile`, `ListCard`, `Stat`, `CountBadge`, `StatusPill`, `SeverityBadge`, `SeverityShape`, `Field`, `Input`, `Select`, `Textarea`, `SegmentedControl`, `ChoiceCard`, `ChoiceGroup`, `Rail`, `MapCallout`, `MapPill`, `AlertBanner`, `Toast`, `Modal`, `Skeleton`, `EmptyState`, `ErrorState`, `OfflineNotice`, `SwipeToConfirm`, `ThemeToggle`, `ToastStack` with `useToasts`, `AnimatedList` and `AnimatedItem`, the motion tokens in `motion.ts`, and the incident icons in `icons.tsx`.

- `Button` has an `inherit` variant for buttons on a colored surface, such as Dismiss on the critical banner.
- `ChoiceCard` wraps a real radio input, so card-style choices keep arrow keys and screen reader support.
- `.glass` is a Tailwind utility, so it works with variants such as `lg:glass`.
- The map can't use classes, so `IncidentMap` reads the `--bb-*` variables at load and is remounted when the theme changes.

## Domain overrides

Emergency use comes before the reference's subtlety:

1. **Severity is never a small dot.** The reference marks alerts with a tiny red dot. Here every severity shows a badge with shape and word, and critical alerts get a full-width red banner.
2. **Map markers get a 2 px ink ring,** because blue, yellow and orange are under 3:1 against the light map.
3. **Body and data text uses Atkinson Hyperlegible Next,** not the reference's geometric face, so medicine names and numbers read unambiguously.
4. **Secondary text is darker** than the reference: 7.4:1 instead of about 2.6:1.
5. **Swipe to confirm always has a tap alternative** (WCAG 2.5.1).
6. **Medicines to avoid will use the critical style** once medical profiles exist.
7. **Text on the accent stays dark in both themes.** A light dark-mode foreground on butter would be about 1.2:1.

## Comparison log

| Date | Screen | Inconsistency with the reference | Status |
|---|---|---|---|
| 2026-11-07 | Operator console, login, responder view | Built before the reference, so they use the legacy dark tokens | Fixed: rebuilt on the component library, legacy tokens and classes deleted |
| 2026-11-07 | Operator console | Matches the reference's layout: full-bleed map, black rail with butter active item, frosted header with light numerals, frosted list column with stacked cards that turn black when selected. Checked in light, dark and at 375 px, with no horizontal overflow | Matches |
| 2026-11-07 | Incident, review and report panels | The reference's large panels are frosted. Map shapes showing through the frost made action text harder to read, so these panels are solid cards. The header and list stay frosted | Deliberate, legibility |
| 2026-11-07 | Incident panel progress | Five step labels crowded each other at 420 px, so the bar shows one line: current step, step number and next step | Deliberate, legibility |
| 2026-11-07 | Map | The reference's map is a soft illustration; BantayBuhay uses OpenFreeMap's Positron (light) and Dark styles so streets and barangay names stay readable. Markers carry a 2 px ink ring | Deliberate, override 2 |
| 2026-11-07 | Report form | The chosen spot is a butter pin with an ink ring; the old screen showed only coordinates | Fixed |
| 2026-11-07 | Toast | On desktop the toast is centered and can sit over the bottom of the incident panel for its 4 seconds | Open: anchor it to the map area |
| 2026-11-07 | Responder view and civilian home | Built with the same components, but not yet checked in the browser after the rebuild | Open: check signed in as a responder and a civilian |
| 2026-11-07 | Style guide | Matches the reference's canvas, glass panel, black rail with butter active item, black pills, butter selection and 24 to 40 px radii. Checked in light, dark and at 375 px, with no horizontal overflow | Matches |
| 2026-11-07 | Style guide, icons | The reference uses 3D illustrations in tiles; BantayBuhay uses outline icons (by design). The person-down icon is a rotated standing figure and reads weakly | Open: replace with a custom icon or the camera snapshot |
| 2026-11-07 | Style guide, severity | The reference marks alerts with a tiny red dot; BantayBuhay shows shape, word and color, and a full red banner for critical | Deliberate, override 1 |
| 2026-11-08 | Landing page | Matches the reference's canvas, frosted pill navigation, black and butter accents, 24 to 40 px radii and light numerals. Checked in light, dark, 1440, 1280, 390 and 320 px with no horizontal overflow. Lighthouse on the production build: mobile 97, 100, 100, 100; desktop 100, 96 before an inert fix, 100, 100 (performance, accessibility, best practices, SEO) | Matches |
| 2026-11-08 | Landing page, hero | The heading is larger than the 40 px display size (40 to 68 px, scaling with the screen), because a public page's first line has to carry from across a room. Only on the landing page | Deliberate |
| 2026-11-08 | Landing page, pictures | The reference uses 3D illustrations and photographs; the landing page shows the real console components with fictional incidents instead, and no photographs, because there are none of the actual operation yet | Deliberate; replace with real photographs when there are some |
| 2026-11-08 | Landing page, coverage map | Drawn as SVG from the official boundaries instead of the console's street map, so the public page loads no map library or tiles and shows no camera locations | Deliberate |
| 2026-11-08 | Motion | The reference is still images, so motion follows its character: soft surfaces that settle (the `enter` curve), quick in the console, expressive only on the landing page. Emergency motion is stronger than anything in the reference: a firm banner and pulse that stay until acknowledged | Deliberate, override 1 |
| 2026-11-08 | Landing motion | Reveals, the steps story, subtle parallax and count-ups at 60 fps down to a 6x slower CPU; Lighthouse mobile 96, 100, 100, 100. See docs/design/MOTION-REPORT.md | Matches |

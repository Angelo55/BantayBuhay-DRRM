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
- **Motion:** press 120 ms, hover 200 ms, entrance 320 ms, sheet 480 ms, eased with `ease-out-soft` (`cubic-bezier(0.22, 1, 0.36, 1)`). Every animation respects reduced motion.
- **Icons:** Lucide outline icons, 1.75 px stroke, 20 or 24 px.

## Components

All in `apps/web/src/ui`: `Button`, `IconButton`, `Card`, `IconTile`, `ListCard`, `Stat`, `CountBadge`, `StatusPill`, `SeverityBadge`, `SeverityShape`, `Field`, `Input`, `Select`, `Textarea`, `SegmentedControl`, `Rail`, `MapCallout`, `MapPill`, `AlertBanner`, `Toast`, `Modal`, `Skeleton`, `EmptyState`, `ErrorState`, `OfflineNotice`, `SwipeToConfirm`, `ThemeToggle`.

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
| 2026-11-07 | Operator console, login, responder view | Built before the reference, so they use the legacy dark tokens | To be rebuilt on the component library after the style guide is approved |
| 2026-11-07 | Style guide | Matches the reference's canvas, glass panel, black rail with butter active item, black pills, butter selection and 24 to 40 px radii. Checked in light, dark and at 375 px, with no horizontal overflow | Matches |
| 2026-11-07 | Style guide, icons | The reference uses 3D illustrations in tiles; BantayBuhay uses outline icons (by design). The person-down icon is a rotated standing figure and reads weakly | Open: replace with a custom icon or the camera snapshot |
| 2026-11-07 | Style guide, severity | The reference marks alerts with a tiny red dot; BantayBuhay shows shape, word and color, and a full red banner for critical | Deliberate, override 1 |

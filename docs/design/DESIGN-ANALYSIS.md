# Design analysis: the reference image

**Reference:** `C:\BantayBuhay\INSPO\BantayBuhayUIUXDesignInspo.jpg` (1024 × 768, a dashboard concept titled "Ambulance Control Centre"). Analyzed 2026-11-07.

**Summary:** a calm, premium, light interface. A soft city map fills the background, under frosted-glass panels with very round corners. Black pill shapes carry navigation and anything selected, and a pale butter yellow marks the active choice. It reads as clinical and expensive rather than dense: few elements, generous space, one accent.

Everything below copies the reference's style, not its content. Values are estimates from a compressed 1024 px image, so they are best estimates rather than exact measurements. The image appears to be a scaled-down 1440 px design, so sizes are given at 1440 px.

## Color

| Role | Reference estimate | Token | Final value | Note |
|---|---|---|---|---|
| Canvas, map land | Warm off-white | `canvas` | `#F4F3EF` | |
| Map water | Pale teal | Map style | `#BEDFE5` | Comes from the basemap |
| Map parks | Soft green | Map style | `#CFE3B5` | Comes from the basemap |
| Glass panel | Translucent cool white | `glass` | `#F3F4F5` at 72%, 24 px blur | Solid `#F3F4F5` where blur isn't supported |
| Card | White | `surface` | `#FFFFFF` | |
| Muted card, list rows | Light grey | `surface-muted` | `#F1F2F4` | |
| Primary text, black pills | Near-black | `ink` | `#111315` | 18.6:1 on white |
| Secondary text | Mid grey, about `#9AA0A6` | `ink-2` | `#4F565E` | **Darkened:** the reference grey is 2.6:1 on white. Now 7.4:1 |
| Text on black | White | `on-inverse` | `#FFFFFF` | |
| Muted text on black | Light grey | `on-inverse-2` | `#B4BAC0` | 9.5:1 |
| Accent | Pale butter yellow | `accent` | `#F7E2B0` | Ink on it is 14.6:1 |
| Accent, stronger | Deeper butter | `accent-strong` | `#EFCB72` | For hover and pressed |
| Info pill | Pale blue with blue text | `info-soft`, `info` | `#DDEBF7`, `#275E9E` | **Darkened:** the first estimate was 4.35:1. Now 5.4:1 |
| Alert dot | Small coral-red dot | Replaced | See severity | Too subtle for emergencies (override 1) |
| Input border | Not shown | `line-strong` | `#7C848D` | 3.8:1, the 3:1 minimum for controls |
| Hairline | Barely visible | `line` | `#E3E6E9` | Decorative only |

The reference has no success, warning or danger colors beyond the red dot. BantayBuhay's semantic colors come from its severity scale (see "Domain overrides").

## Typography

| Role | Reference | Value |
|---|---|---|
| Display headline | Geometric grotesque, medium-bold, tight leading, three short lines | 40 px, weight 600, line height 1.05, letter spacing −0.02 em |
| Big numeral | Same family, light weight, beside a two-line label | 32 px, weight 300, tabular figures |
| Section heading | Medium weight | 18 px, weight 500, line height 1.25 |
| Card title | Medium weight, two lines | 15 px, weight 500, line height 1.25 |
| Body | Regular | 15 px, weight 400, line height 1.5 |
| Meta, such as "15 min" | Small regular | 13 px, weight 400 |

**The typeface** can't be identified with certainty from a 1024 px image. It's a geometric grotesque with round bowls and a single-storey "a", in the family of Gilroy or TT Norms, both commercial. See question 1.

## Layout and spacing

- **Structure:** a full-bleed map as the base layer, a narrow floating rail on the left, a large glass panel in the center for the focused item, and a column of stacked cards on the right.
- **Grid:** spacing follows an 8 px rhythm. Gaps between cards are 16 px, card padding is 16 to 20 px, and outer margins are about 24 px.
- **Density:** low. Each card carries a picture, two words and one number.
- **Alignment:** everything aligns left, including headlines and numerals.

## Shape

| Element | Radius | Border | Shadow |
|---|---|---|---|
| Large glass panel | 40 px | 1 px white at 60% | None, with blur |
| Card | 24 px | None | Very soft |
| Icon tile inside a card | 18 px | None | Soft |
| Side rail | 32 px | None | None, solid black |
| Square button, such as confirm | 16 px | None | None |
| Pills: map callout, route labels | Fully round | None | Soft |
| Zoom buttons | Fully round | None | Soft |

**Shadows:** small `0 1px 2px` and `0 2px 8px` at 4% ink; medium `0 8px 24px` at 8%; large `0 20px 48px` at 12%.

## Components seen

| Reference component | Pattern |
|---|---|
| Side rail | Black rounded pill, thin white outline icons, the active item in a butter square with a dark icon |
| Stat pair | Big light numeral with a two-line label beside it |
| Map callout | Black pill with an image tile and white text, pinned to a point |
| Route label | Small white pill with bold small text on the map |
| Zoom control | Two white circles with thin + and − |
| List card | White card, image tile, two-line title, meta below the tile, optional alert dot |
| Selected list card | The same card in black with white text |
| Option card | A choice card; selected is butter, others white |
| Count badge | Small number in a pale blue circle |
| Swipe to confirm | Pill track, black square handle with a check, chevrons, a light square target |
| Close button | Black rounded square with a white × |

## Icons

Outline icons, about 1.5 px strokes with round caps and joins, 20 to 24 px, in white on black or ink on light. The content cards use 3D illustrations instead, which BantayBuhay won't copy (see question 3). **Chosen set: Lucide** (ISC license), which matches that stroke style.

## Motion

The image is static, so motion is derived from its calm, premium tone:

| Use | Duration | Easing |
|---|---|---|
| Press | 120 ms | `cubic-bezier(0.22, 1, 0.36, 1)`, scale to 0.97 |
| Hover, focus | 200 ms | Same; cards lift 2 px with a medium shadow |
| Panel and card entrance | 320 ms | Same; fade in and rise 8 px |
| Sheet or page | 480 ms | `cubic-bezier(0.65, 0, 0.35, 1)` |
| Swipe handle | Spring | Stiffness 400, damping 32 |

Loading uses skeleton blocks in `surface-muted` with a slow shimmer (1.6 s). Every animation stops under reduced motion.

## Mood

Light, airy, premium, clinical. Contrast between ink and white is high, but secondary text is too faint in the original (fixed above).

## Answers to your four questions

**1. Fonts.** The reference face can't be identified with certainty; it resembles Gilroy or TT Norms, which are commercial. Substitutes, both under the SIL Open Font License and self-hosted:

- **Outfit** for headings, numerals, buttons and navigation. It's the closest open geometric match.
- **Atkinson Hyperlegible Next** stays for body text, labels and data. This is a deliberate departure (override 3): geometric faces confuse I, l and 1, which matters for medicine names and doses.

**2. Theme.** The reference shows **only a light theme**. As you decided, light is the default everywhere, including the DRRM command view. A dark theme derived from the same language is available as an option: black pills become white pills, and white cards become charcoal.

**3. Elements that don't map to BantayBuhay's data:**

| Reference element | Why it doesn't fit | BantayBuhay replacement |
|---|---|---|
| 3D anatomy figure | There's no body or vitals data, and a stock figure would imply clinical data the system doesn't have | Civilian medical summary card: allergies and medicines to avoid, in M5 |
| 3D object illustrations in tiles | Illustrative content | Incident-type icons in tiles, or the camera snapshot when one exists |
| "New calls" and "free ambulances" | Not BantayBuhay's metrics | "Needs attention" count and "Responders available" |
| Ambulance route lines with times | No routing or ETA data, and invented times would mislead | Barangay boundaries and camera points |
| Blood pressure chart | No vitals data | Dropped. The chart style is kept for future detection trends |
| "Choose ambulance" option cards | Different resource | "Assign responder" option cards: name, unit, current load |
| "Swipe to confirm" | Fits well | Confirms **Dispatch**, with a tap and keyboard alternative |
| Medication count badge | Fits | Count of medicines to avoid on the medical card |
| "Dr+" logo | Not ours | BantayBuhay wordmark |

**4. Stack:** Tailwind CSS 4 with tokens as CSS variables (already in the project); a small in-house component library in the shadcn/ui pattern, built on native elements such as `<dialog>`; Motion (MIT) for entrances, layout changes and the swipe drag; Lucide icons; Outfit and Atkinson Hyperlegible Next from Fontsource. GSAP isn't needed, because there's no choreographed sequence.

## Domain overrides

Emergency use takes priority over the reference's subtlety. DESIGN.md records each override:

1. **Severity is never a small dot.** Every severity shows a colored badge with a shape and a word. Critical alerts get a full-width banner in solid red (`#BF1F2B`, white text at 6.1:1).
2. **Map markers get an ink outline.** Blue, yellow and orange are under 3:1 against the light map, so each marker has a 2 px `ink` ring.
3. **Body and data text stays in Atkinson Hyperlegible Next** rather than a geometric face.
4. **Secondary text is darker** than the reference: 7.4:1 instead of about 2.6:1.
5. **Swipe to confirm has a fallback.** WCAG 2.5.1 requires a single-tap alternative to path gestures, so there's always a plain button too.
6. **Medicines to avoid will use the critical style**, never a subtle tag, once medical profiles exist in M5.

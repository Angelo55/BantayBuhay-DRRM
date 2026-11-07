# BantayBuhay design

The operations console is read under stress, often on a wall screen across a room. Every choice serves one job: show what needs action, where it is, and how serious it is, at a glance.

## Severity

Severity uses the yellow, orange and red alert levels people in the Philippines already know from PAGASA weather warnings, plus blue for low. Color is never the only signal: every severity also has its own shape and its word.

| Severity | Color | Shape | Contrast |
|---|---|---|---|
| Low | `#5AA9F0` blue | Circle | 6.3:1 as text on panels |
| Medium | `#F2C230` yellow | Triangle | 9.4:1 |
| High | `#F28C28` orange | Diamond | 6.4:1 |
| Critical | `#FF6166` red | Square | 5.3:1 |

Badges use dark text (`#0F1B24`) on the severity color, with at least 5.9:1 contrast.

## Base palette

| Token | Value | Use |
|---|---|---|
| `ground` | `#0F1B24` | Page and map background, a night-river blue rather than black |
| `surface` | `#16252F` | Panels |
| `raised` | `#1D3140` | Selected rows, inputs |
| `line` | `#3A5262` | Borders and barangay outlines |
| `ink` | `#E8EEF1` | Main text, 13.4:1 on panels |
| `muted` | `#9FB2BD` | Secondary text, 7.2:1 on panels |
| `action` | `#6CC4D4` | Buttons, links, focus rings. Kept apart from every severity hue |

Dark is the default for the operations console. A light theme is planned for daytime field use.

## Type

Atkinson Hyperlegible Next, self-hosted so it loads without internet. It was designed for readers with low vision, and its letterforms stay distinct at small sizes and a distance. Scale: 13, 15, 17, 21 and 27 px. Times use tabular figures.

## Layout

- **Wide screens:** incident queue on the left, map in the center, incident detail on the right.
- **Tablets and phones:** a switch between the queue and the map, and the detail opens over both.
- Everything aligns left. Touch targets are at least 44 px.

## The one bold element

The map tints each barangay by its most serious active incident, so the whole city's state reads in one look. An unacknowledged high or critical incident pulses until someone acknowledges it. That's the only motion that isn't a response to the user, and it stops when the system asks for reduced motion.

## Words

Sentence case. Buttons say exactly what happens: "Acknowledge", "Verify incident", "Dispatch", "Close as false alarm". No all-caps labels. Errors say what happened and what to do next.

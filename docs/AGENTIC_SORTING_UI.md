# Agentic Sorting — Interface Manual

> Purpose: a complete, code-free inventory of every screen region, control, panel, overlay, and
> readout in the **Agentic Sorting** app (route `#/agentic-sorting`), plus an explicit account of
> how it uses — and deviates from — the shared **AppShell** chrome. Scope: this single app and its
> relationship to the shell. Captured **as built** (it is not a spec), described in present tense.
> All facts are grounded in `src/animations/AgenticSorting/AgenticSorting.tsx`, `agenticSorting.css`,
> `README.md`, `EXPLAINER.md`, and the shared `AppShell.tsx` / `ActionFloater.tsx`.

---

## 0. What the app is

Agentic Sorting is a concurrent, agent-based sorting simulation. A population of values (each value
in the range −100…+100) is held in a one-dimensional array; every slot is an autonomous **agent**
that follows one of five rival local strategies. On each simulation cycle a random ~15% subset of
agents "wakes up" and applies its own rule (a comparison and possible swap), so sorted order
emerges from the interaction of many independent actors racing concurrently rather than from one
top-down algorithm. It is a CSS/DOM app (no Three.js, no canvas) rendered entirely as positioned
`<div>` elements.

---

## 1. Screen layout

Below the shared AppShell top bar, the app renders its own full-height scrolling container
(`.as-app`, dark `#020617` background). It contains a short centered subtitle header and a
two-column CSS grid (`.as-layout`, `1fr 2fr`, max-width 1200px): a **sidebar** of control cards on
the left and a **main view** (arena + legend) on the right.

```
┌──────────────────────────────────────────────────────────────────────┐
│  [shared AppShell top bar: ⌂ ☰ ƒ  Agentic Sorting  ⚙ ▶ ? ]           │
├──────────────────────────────────────────────────────────────────────┤
│            CONCURRENT BEHAVIORAL SORTING SIMULATION   (subtitle)       │
│                                                                        │
│  ┌── SIDEBAR (1fr) ───────────┐  ┌── MAIN VIEW (2fr) ───────────────┐ │
│  │ Card: controls             │  │  ┌── ARENA ──────────────────┐   │ │
│  │  [ ▶ START ]  [ ⟲ ]        │  │  │              Positive Value│   │ │
│  │  Global Density   60 Agents│  │  │  bars/dots rise from a     │   │ │
│  │  ───────●──────────        │  │  │  central midline           │   │ │
│  │  Processing Delay   20ms   │  │  │  ─────────────────────────  │   │ │
│  │  ─●─────────────────       │  │  │  (negative values below)   │   │ │
│  │  [ BARS | DOTS ]           │  │  │              Negative Value│   │ │
│  │                            │  │  └────────────────────────────┘   │ │
│  │ Card: Population Mix       │  │  ┌── LEGEND (5 cards) ────────┐   │ │
│  │  ● Standard        20%     │  │  │ 👤 🎲 🏃 👮 🧐  + blurbs    │   │ │
│  │  ● Blind Date      20% ... │  │  └────────────────────────────┘   │ │
│  │ Card: Cycles | Wakeups |   │  └──────────────────────────────────┘ │
│  │       Swaps  (stats)       │                                        │
│  └────────────────────────────┘                                       │
└──────────────────────────────────────────────────────────────────────┘
```

Responsive behavior (from CSS):
- **≤900px**: grid collapses to a single column; `.as-main` is given `order: -1` so the arena
  appears first and the controls scroll below it. Legend drops from 5 columns to 3.
- **≤600px**: tighter padding, smaller fonts, larger slider thumbs (14px→22px), arena height shifts
  from 60vh/60dvh (min 280px / max 640px) to 55vh/55dvh (min 220px / max 500px), dot size 10px→8px.
- **≤500px**: legend becomes a 2-column grid.

---

## 2. Shared chrome, as this app uses it

The app calls exactly two shell hooks and renders **everything else in its own page body**.

| Shell facility | Used? | Detail |
|---|---|---|
| `useAppHeader(title, subtitle?)` | Yes | `useAppHeader('Agentic Sorting')` — title only, **no subtitle**. |
| `useAppExplainer(markdown)` | Yes | Registers `EXPLAINER.md` (`?raw`), so the **?** button is active. |
| `useAppFunctions(...)` | No | Never called; the **ƒ** top-bar button stays **dimmed** and the Function tab shows "No function picker for this view." |
| `<ShellSettings>` | **No** | Settings tab is empty ("No settings for this view."); **⚙** stays **dimmed**. All settings live in the in-page sidebar instead. |
| `<ShellActions>` | **No** | Actions tab is empty ("No actions for this view."); **▶** stays **dimmed**. Play/pause/reset live in the in-page sidebar instead. |
| Generic `ActionFloater` | Not shown | Because no actions are registered (`hasActions` is false), the floater renders inactive (`af-inactive`) and is effectively absent. Not explicitly suppressed via `useActionFloaterOff()`. |

Top-bar button states for this app, left to right:
- **⌂ Home** — active (visible, since route ≠ `/`).
- **☰ Apps** — active.
- **ƒ Function** — **dimmed** (no function picker registered).
- **Title** — shows `Agentic Sorting`, no formula subtitle; clicking it opens the Settings tab if
  populated, otherwise the Apps tab — here it falls back to **Apps** because no settings are
  registered.
- **⚙ Settings** — **dimmed**.
- **▶ Actions** — **dimmed**.
- **? Explainer** — active; opens the help popup.

Net: of the four drawer tabs, only **Apps** and (via the **?** popup, not a tab) the explainer are
meaningful for this app; **Function**, **Settings**, and **Actions** tabs are all empty. The app is
self-contained chrome-wise, exposing its controls entirely through its own DOM.

> Note on class-name collision: the AppShell uses an `as-` CSS prefix (e.g. `as-bar`, `as-drawer`)
> and this app **also** uses an `as-` prefix (e.g. `as-app`, `as-bar`, `as-button`). `agenticSorting.css`
> defines its own `.as-bar` (the colored value bar in the arena) distinct from the shell's `.as-bar`
> (the top bar). They do not visually clash today only because the selectors target different DOM
> subtrees, but the shared prefix is a latent collision.

---

## 3. The arena & interactions

The arena (`.as-arena`) is the central visualization: a rounded, inset dark panel with a faint
horizontal **midline** (`.as-arena-midline`) at 50% height representing value 0. Each agent occupies
an equal-width column (`width: 100/N %`) laid out left-to-right across the array order (`.as-arena-bars`,
`justify-content: space-between`).

Two display modes (toggled by the in-page Bars/Dots control):
- **Bars** (`display === 'bars'`, default): a rounded-pill rectangle (`.as-bar`, width 75% of its
  column) growing from the midline. Height = `|value| / 2 %`. Positive values anchor `bottom: 50.1%`
  (rise upward); negative values anchor `top: 50.1%` (drop downward).
- **Dots** (`display === 'dots'`): a small fixed circle (`--as-dot-size`, 10px desktop / 8px phone)
  centered horizontally, positioned vertically at `50% + value/2`. Used so dense populations stay
  readable where adjacent bars would merge.

Two corner labels mark polarity: **"Positive Value"** (`.as-arena-label-top`, top-right) and
**"Negative Value"** (`.as-arena-label-bottom`, bottom-right), both small monospace `#334155`.

Agent visualization / status colors (each agent's resting color reflects its strategy):
- Standard `#06b6d4` (cyan), Blind Date `#818cf8` (indigo), Nomadic `#fb923c` (orange),
  Patrolling `#a78bfa` (violet), Perfectionist `#f472b6` (pink).
- **Active** this cycle (`.as-bar-active`): yellow `#facc15` with glow, raised z-index 10.
- **Swapping** this cycle (`.as-bar-swapping`): white `#fff` with strong glow, z-index 20.

Position/height/color transitions animate over 0.15s. **There are no pointer interactions on the
arena** — no click, drag, hover, or tap handlers; agents move only under simulation control. All user
input is via the sidebar controls.

---

## 4. Settings (drawer ⚙)

**The Settings drawer tab is empty.** No `<ShellSettings>` is rendered. Every "setting" lives in the
in-page **sidebar**, documented here because that is where they actually are.

### Sidebar Card 1 — Controls (top card)

| Control | Type | Label | Range / options | Default | Behavior |
|---|---|---|---|---|---|
| Start / Pause | button | "START" (▶ Play icon) / "PAUSE" (⏸ Pause icon) | toggle | not running | Toggles `isRunning`; starts/stops the `setInterval` loop. Green when stopped, amber (`as-button-pause`) when running. |
| Reset | button | ⟲ icon only (RotateCcw) | — | — | Regenerates the population from current count + weights, zeroing stats. |
| Global Density | range slider | "Global Density" (Users icon) + live "{n} Agents" readout | min **10**, max **150**, step 1 (browser default) | **60** | Sets agent count; changing it regenerates the population and **stops** the sim. Green thumb. |
| Processing Delay | range slider | "Processing Delay" (Zap icon) + "{ms}ms" readout | min **1**, max **500**, step 1 | **20** | Milliseconds between cycles (the `setInterval` period). Amber thumb. Lower = faster. |
| Display mode | segmented buttons | "BARS" / "DOTS" | two-way | **Bars** | Switches arena rendering (see §3). Active button highlighted `#334155`/white. `role="group"`, `aria-pressed`. |

### Sidebar Card 2 — Population Mix

Header "POPULATION MIX" (Target icon, cyan). Five weight sliders, one per agent type, rendered in a
column with a colored dot + name on the left and a `%` value on the right:

| Slider | Range | Step | Default | Behavior |
|---|---|---|---|---|
| Standard | 0–100 | 1 | 20 | Relative weight for spawning this type. |
| Blind Date | 0–100 | 1 | 20 | "" |
| Nomadic | 0–100 | 1 | 20 | "" |
| Patrolling | 0–100 | 1 | 20 | "" |
| Perfectionist | 0–100 | 1 | 20 | "" |

Weights are **relative**, not normalized; the per-label `%` text shows the raw slider value (not a
normalized share). Spawning normalizes by the running sum at generation time. Editing a weight does
**not** regenerate the population on its own — it takes effect on the next Reset (or density change).
Weight slider thumbs turn white on hover.

---

## 5. Actions

**The Actions drawer tab is empty** and the generic floating `ActionFloater` is inactive (no
`<ShellActions>` registered). All action-style controls instead live **in the in-page sidebar
Controls card** (Card 1, §4):

| Action | Where it lives | What it does |
|---|---|---|
| Start / Pause | In-page sidebar (top-left button) | Runs or halts the cycle loop. |
| Reset | In-page sidebar (button beside Start) | Re-seeds the population, resets stats to zero. |

There is **no step** (single-cycle) control, no reseed-with-same-values, and no add/remove-agent
action — count is governed only by the Global Density slider. Speed control is the Processing Delay
slider (§4). This placement diverges from the shared convention of routing playback through
`<ShellActions>` (drawer Actions tab + ActionFloater).

---

## 6. App-specific panels / overlays / readouts

- **Stats row** (`.as-stats-row`, bottom sidebar card): three live counters separated by thin
  dividers — **Cycles**, **Wakeups**, **Swaps**. Cycles increments once per simulation step;
  Wakeups accumulates the agents activated each step (~15% of N per cycle); Swaps accumulates
  performed swaps. All reset to 0 on Reset or density change. Large white values over small
  uppercase gray labels. There is **no leaderboard or per-agent-strategy scoreboard** — stats are
  global, not broken down by agent type.
- **Legend** (`.as-legend`, below the arena): five cards, one per strategy, each with the strategy's
  emoji icon, its name in the strategy color, and a one-line description (see §8). 5-column grid
  shrinking to 3 (≤900px) then 2 (≤500px).
- **Arena polarity labels**: "Positive Value" / "Negative Value" (see §3).
- No progress meter / "percent sorted" gauge, no completion indicator — the sim runs indefinitely
  while playing.

---

## 7. Explainer popup (?)

The **?** top-bar button opens the shell help modal rendering `EXPLAINER.md`. Its content:

- Framing: sorting not as one top-down algorithm but as **many little agents** each following a
  simple local rule, with order emerging from their interaction (emergence).
- Each array slot holds an agent; each cycle a random subset wakes and applies its rule; the array
  marches toward sorted order despite no agent having a global view.
- A table of the five strategies and their classic-sort analogs (see §8).
- "Why mixes win": Blind Date converges fastest alone (long-distance jumps remove large-scale
  disorder); Perfectionist is expensive per wake-up (full scan) but places exactly; mixed
  populations often beat any single type via a division of labor between long-range movers and local
  refiners.
- "The knobs": global density, processing delay, population mix.

(`README.md` covers the same concept in slightly more depth — agent table, parameters, and
observations — and is the longer write-up, but is not surfaced through any in-app About panel here.)

---

## 8. Domain notes

**The five strategies** (from `AGENT_TYPES` and the per-cycle logic):

| Agent | Icon | Local rule (as coded) | Classic analog |
|---|---|---|---|
| Standard | 👤 | Compare a random *adjacent* neighbor (idx±1); swap if out of order. | Bubble sort |
| Blind Date | 🎲 | Pick a random agent *anywhere* in the array; swap if misordered. | Randomized compare-swap |
| Nomadic | 🏃 | If smaller than its **left** neighbor, swap left (drift toward start). | Insertion-style left drift |
| Patrolling | 👮 | Move in its current `direction`; swap on contact; if no swap (or at an edge), reverse direction. | Cocktail-shaker sort |
| Perfectionist | 🧐 | Scan the entire right tail, find the minimum; if smaller than itself, swap it into place. | Selection sort |

**Concurrency / race model**: each cycle, `runSimulationStep` resets all agents to idle, then picks
a random non-repeating subset of size `max(1, floor(N * 0.15))` (~15% of the population) to "wake
up." Each woken agent independently applies its rule against the *current* array snapshot for that
step, mutating a shared working copy in iteration order (so within one cycle later wakeups see
earlier wakeups' swaps). This models many agents acting on a shared array per tick rather than truly
parallel threads. Spawning assigns each agent a type by weighted random draw over the Population Mix
weights, a random value in −100…+100, and a random initial direction (±1, used by Patrolling).

**How "sorted" is measured**: it is **not** explicitly measured or displayed. There is no sortedness
metric, completion check, or auto-stop; the only feedback is the visual arena and the global
Cycles/Wakeups/Swaps counters. "Sorted" is judged by eye (values ascending left-to-right, i.e. the
bar/dot profile sloping from negative on the left to positive on the right).

---

## 9. Persistence

**Nothing persists.** The app does not import or use `usePersistentState`; all state is plain
`useState`. On reload or navigation away and back, everything resets to defaults:

| State | Persisted? | Default |
|---|---|---|
| `itemCount` (Global Density) | No (transient) | 60 |
| `simulationSpeed` (Processing Delay) | No | 20 |
| `isRunning` | No | false |
| `display` (Bars/Dots) | No | bars |
| `weights` (Population Mix ×5) | No | 20 each |
| `items` (the population) | No | regenerated each load |
| `stats` (cycles/wakeups/swaps) | No | all 0 |

This diverges from the toolkit convention where settings persist via `usePersistentState` /
`useParticleState({ storageKey })`.

---

## 10. Component / file map

| Concern | File |
|---|---|
| Whole app component (state, sim loop, all controls, arena, legend) | `src/animations/AgenticSorting/AgenticSorting.tsx` |
| All styling (layout, cards, sliders, buttons, arena, dots, agent colors, responsive) | `src/animations/AgenticSorting/agenticSorting.css` |
| Explainer popup content (? button) | `src/animations/AgenticSorting/EXPLAINER.md` |
| Longer write-up (concept, agent table, observations) | `src/animations/AgenticSorting/README.md` |
| Shared chrome (top bar, drawer tabs, header/explainer hooks) | `src/components/AppShell.tsx` |
| Generic floating action panel (unused here) | `src/components/ActionFloater.tsx` |
| Icons (Play, Pause, RotateCcw, Zap, Users, Target) | `lucide-react` |

---

## 11. Seams & observations for the redesign

The most important section for refining the shared shell. Agentic Sorting is one of the strongest
**deviators** from the AppShell contract among the apps.

1. **Bypasses `ShellSettings` and `ShellActions` entirely.** All settings (density, delay, display
   mode, population mix) and all actions (start/pause, reset) are hand-rolled into an in-page
   left sidebar of `.as-card` panels. As a result the **⚙ Settings** and **▶ Actions** top-bar
   buttons and their drawer tabs are permanently **dimmed/empty**, and the generic ActionFloater
   never appears. A user trained on other apps to find controls in the drawer finds nothing there.
   This is the single biggest consistency gap and the prime candidate for the redesign: either the
   shell should accommodate an app-owned control sidebar as a first-class layout, or this app should
   migrate its controls into `ShellSettings`/`ShellActions`.

2. **Inconsistent action placement.** Play/Pause/Reset sit inside the app's own card, not in the
   drawer Actions tab or the draggable ActionFloater that other apps standardize on. There is also
   no Step control, which the shared playback idiom might otherwise provide.

3. **Custom UI primitives instead of `ControlPanel`.** The app uses raw `<input type="range">`,
   raw `<button>`, and a bespoke segmented toggle rather than the shared `Section` / `Slider` /
   `Pills` / `Select` / `Checkbox` primitives. Slider styling, value-readout formatting, and the
   collapsible-section pattern are all re-implemented in `agenticSorting.css`, so it does not inherit
   shared theming and will drift from other apps over time.

4. **CSS prefix collision with the shell.** Both the shell and this app use the `as-` class prefix
   (e.g. both define `.as-bar`). It works today only by DOM-subtree separation; a future shared
   stylesheet change to `.as-bar` could leak into the arena. The app prefix would be safer as
   something app-unique (e.g. `agts-`).

5. **No persistence.** Unlike apps using `usePersistentState`, none of this app's settings survive a
   reload — a UX inconsistency the redesign could close by routing its controls through the shared,
   already-persisting primitives.

6. **Redundant in-page subtitle.** The app renders its own centered subtitle ("CONCURRENT BEHAVIORAL
   SORTING SIMULATION") in a page header, duplicating the role of the shell's title/subtitle slot
   (which it leaves as title-only). The shell already supports a monospace subtitle next to the
   title; using it would remove the bespoke header.

7. **No sortedness/progress readout.** Stats are global counters only; there is no per-strategy
   leaderboard or "percent sorted" gauge, which the explainer's competitive framing ("rival
   strategies racing") might lead a user to expect. Out of scope for the shell itself, but worth
   noting as an app-level gap surfaced during this review.

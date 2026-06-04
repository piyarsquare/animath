# Agentic Sorting — Interface Manual

> Purpose: a complete, code-free inventory of every screen region, control, panel, overlay, and readout in the **Agentic Sorting** app (route `#/agentic-sorting`). Scope covers both this app's custom DOM/CSS interface **and** how it sits inside the shared AppShell chrome, since this manual feeds a design review aimed at making the shell more reusable. Captured **as built** from source — not a spec. Present tense throughout.

## 0. What the app is

Agentic Sorting is a concurrent, behavioral sorting simulation. Each slot in an array holds an autonomous **agent** carrying a value in the range −100…+100. On every simulation cycle a random subset of agents "wakes up" and applies its own local strategy (a swap or a move). No agent has a global view, yet the population marches toward sorted order — an emergent property arising from many independent local actions. Five rival agent strategies (Standard, Blind Date, Nomadic, Patrolling, Perfectionist) can be mixed in any proportion to compare how different local rules cooperate or compete. The app is a CSS/DOM app (no Three.js, no canvas) rendered as a grid of HTML elements.

## 1. Screen layout

The app fills the AppShell content area with a vertically scrollable, dark page (`.as-app`, background `#020617`, centered column, `padding: 16px`). Below the shared top bar it renders, top to bottom:

- **In-page header** (`.as-header`): a single centered subtitle line — `Concurrent behavioral sorting simulation` (uppercase, letter-spaced, muted `#64748b`). The app name itself lives in the AppShell bar, not here.
- **Two-column layout** (`.as-layout`, `max-width: 1200px`, CSS grid `1fr 2fr`, `gap: 24px`):
  - **Left: Sidebar** (`.as-sidebar`) — three stacked cards: a Controls card, a Population Mix card, and a Stats card.
  - **Right: Main view** (`.as-main`) — the Arena (the visualization) plus a 5-card strategy Legend below it.

Responsive behavior:
- At `max-width: 900px` the grid collapses to a single column and the Main view is reordered **above** the sidebar (`.as-main { order: -1 }`); the legend grid drops from 5 columns to 3.
- At `max-width: 600px` paddings shrink, slider thumbs enlarge for touch, and the arena reserves more relative height.
- At `max-width: 500px` the legend grid becomes 2 columns.

```
┌──────────── AppShell top bar (shared chrome) ──────────────┐
│ ⌂  ☰  ƒ(dim)   Agentic Sorting   ⚙(dim) ▶(dim) ?           │
└────────────────────────────────────────────────────────────┘
        Concurrent behavioral sorting simulation   (in-page subtitle)
┌───────────────────────┬────────────────────────────────────┐
│  SIDEBAR (1fr)        │  MAIN (2fr)                          │
│ ┌───────────────────┐ │ ┌────────────────────────────────┐ │
│ │ Controls card     │ │ │ Arena                Positive  │ │
│ │  [START][⟲ reset] │ │ │   │bars/dots about midline│     │ │
│ │  Global Density   │ │ │  ─┼──────── midline ─────────┼─ │ │
│ │  Processing Delay │ │ │   │                      Negative │ │
│ │  [Bars][Dots]     │ │ └────────────────────────────────┘ │
│ └───────────────────┘ │ ┌──┬──┬──┬──┬──┐ Legend (5 cards)  │
│ ┌───────────────────┐ │ │👤│🎲│🏃│👮│🧐│                  │
│ │ Population Mix    │ │ └──┴──┴──┴──┴──┘                  │
│ │ 5 weight sliders  │ │                                    │
│ └───────────────────┘ │                                    │
│ ┌───────────────────┐ │                                    │
│ │ Cycles│Wakeups│Sw │ │                                    │
│ └───────────────────┘ │                                    │
└───────────────────────┴────────────────────────────────────┘
```

## 2. Shared chrome, as this app uses it

The app integrates with the AppShell through **only two hooks** and renders **all of its own controls in the page body**, bypassing the shell's portal slots.

| Shell feature | Used? | Detail |
|---|---|---|
| `useAppHeader(title, subtitle?)` | Yes | Called as `useAppHeader('Agentic Sorting')` — title only, **no subtitle**. The bar shows `Agentic Sorting` with no monospace formula. |
| `useAppExplainer(markdown)` | Yes | Registers `EXPLAINER.md` (imported `?raw`). The top-bar **?** button is active and opens the help popup. |
| `useAppFunctions(reg)` | No | Never called → top-bar **ƒ** button is dimmed; the Function drawer tab shows "No function picker for this view." |
| `<ShellSettings>` | No | Never used → top-bar **⚙** is dimmed (`hasSettings = false`); the Settings drawer tab shows "No settings for this view." |
| `<ShellActions>` | No | Never used → top-bar **▶** is dimmed (`hasActions = false`); the Actions drawer tab shows "No actions for this view." |
| `useActionFloaterOff()` | No | Not called. The generic `ActionFloater` is still mounted by the shell, but because `hasActions` is false it renders with the `af-inactive` class (hidden); the app neither populates nor explicitly suppresses it. |

Net effect on the top bar (left to right): **⌂ Home** active, **☰ Apps** active, **ƒ Function** dimmed, **Agentic Sorting** title (clicking it opens the Apps tab, since `hasSettings` is false), **⚙ Settings** dimmed, **▶ Actions** dimmed, **? Explainer** active.

Drawer tabs filled by this app: **Apps** (shell-provided catalog) and **Function/Settings/Actions** all empty-state. Only the **Explainer** popup carries app content.

Consequence: every interactive control — start/pause, reset, density, speed, display mode, population-mix weights, and the stats readout — lives inside the app's own `.as-sidebar` cards, **not** in the shared drawer or floater.

## 3. The arena & interactions

The Arena (`.as-arena`) is a rounded, inset panel (background `#020617`, 2px `#0f172a` border, `border-radius: 24px`). Its height scales with the viewport: `60dvh`, clamped to `min 280px / max 640px` (on phones `55dvh`, `220px`–`500px`). It contains:

- **Midline** (`.as-arena-midline`): a 1px horizontal line at 50% height (`#0f172a`) representing value 0. Positive values render above it, negative below.
- **Bars container** (`.as-arena-bars`): a flex row spanning the arena, one **column** per agent. Each column's width is `100 / items.length %`, so columns evenly divide the arena width and shrink as population grows.
- **Corner labels**: `Positive Value` top-right (`.as-arena-label-top`), `Negative Value` bottom-right (`.as-arena-label-bottom`) — monospace, muted `#334155`.

Each agent is drawn as one element (`.as-bar`, width 75% of its column, fully pill-rounded), positioned by the active display mode:

- **Bars mode**: a rectangle growing from the midline. Height = `|value| / 2` % of arena height. Positive values anchor `bottom: 50.1%` (extend upward); negative values anchor `top: 50.1%` (extend downward).
- **Dots mode** (`.as-bar-dot`): a fixed-size circle (`--as-dot-size`, 10px desktop / 8px ≤600px) centered horizontally, with `bottom: calc(50% + value/2% − dotSize/2)`, so its vertical position encodes value. Dots stay legible at high agent counts where adjacent bars merge.

Agent visual state (transitions over 0.15s):
- **Idle**: filled with its strategy color (see §6 legend / §3 color table below).
- **Active** (`.as-bar-active`): just woke this cycle — yellow `#facc15` with a glow, `z-index: 10`.
- **Swapping** (`.as-bar-swapping`): involved in a swap this cycle — white `#fff` with a stronger glow, `z-index: 20`.

Agent strategy colors (idle fill):

| Strategy | Fill hex |
|---|---|
| Standard | `#06b6d4` (cyan) |
| Blind Date | `#818cf8` (indigo) |
| Nomadic | `#fb923c` (orange) |
| Patrolling | `#a78bfa` (violet) |
| Perfectionist | `#f472b6` (pink) |

**Interactions in the arena: none.** The arena is non-interactive — there is no click, drag, hover, or tap behavior on agents or the arena itself. All control is exercised through the sidebar. Movement is driven entirely by the simulation timer.

## 4. Settings (drawer ⚙)

The drawer's Settings tab is **empty** for this app ("No settings for this view."). All settings are rendered as in-page sidebar controls. They are documented here because they are the app's settings in every functional sense.

### 4.1 Controls card (`.as-card`, first sidebar card)

| Control | Type | Label / text | Range / options | Default | Behavior |
|---|---|---|---|---|---|
| Start / Pause | Toggle button | `START` (Play icon) when stopped; `PAUSE` (Pause icon) when running | — | stopped (`isRunning = false`) | Starts/stops the simulation timer. Green `#10b981` when showing START; amber `#f59e0b` (`as-button-pause`) when showing PAUSE. |
| Reset | Icon button | `RotateCcw` icon only | — | — | Regenerates the population from current density + weights, resetting stats. Slate `#1e293b`. |
| Global Density | Range slider | `Global Density` (Users icon) / value shown as `{n} Agents` | min 10, max 150, step 1 (HTML default) | **60** | Sets agent count; changing it regenerates the population and pauses the sim. Green thumb. |
| Processing Delay | Range slider | `Processing Delay` (Zap icon) / value shown as `{ms}ms` | min 1, max 500, step 1 | **20** ms | Milliseconds between cycles (the `setInterval` period). Amber thumb. Lower = faster. |
| Display mode | 2-button segmented toggle | `Bars` / `Dots` | bars \| dots | **bars** | Switches the arena render style (§3). Active button styled `as-display-btn-active` (`#334155` bg, white text). |

Slider track styling: 4px tall, `#1e293b` track, round thumbs (`#94a3b8` default); density thumb green, speed thumb amber, weight thumbs turn white on hover.

### 4.2 Population Mix card (`.as-card`, second sidebar card)

Title `Population Mix` with a cyan Target icon (`#06b6d4`). Five weight sliders, one per strategy, in this fixed order:

| Strategy slider | Color dot | Range | Step | Default |
|---|---|---|---|---|
| Standard | cyan `#06b6d4` | 0–100 | 1 | **20** |
| Blind Date | indigo `#818cf8` | 0–100 | 1 | **20** |
| Nomadic | orange `#fb923c` | 0–100 | 1 | **20** |
| Patrolling | violet `#a78bfa` | 0–100 | 1 | **20** |
| Perfectionist | pink `#f472b6` | 0–100 | 1 | **20** |

Each row shows the strategy name with a colored dot, the current weight as a monospace `{n}%` readout, and a slider beneath. Weights are **relative proportions**, not required to sum to 100: when a population is generated, each agent's type is chosen by weighted random selection (each weight divided by the total of all weights). A non-numeric input coerces to 0. Changing weights does **not** auto-regenerate — the new mix takes effect on the next Reset (or density change).

## 5. Actions

The drawer's Actions tab is **empty** ("No actions for this view."), and the generic floating ActionFloater is inactive/hidden. The app exposes **no actions through the shell at all**.

The only action-like controls — the **Start/Pause** toggle and the **Reset** button — live **in the sidebar's Controls card** (documented in §4.1), not in the Actions drawer tab and not in a floater. There is no step-by-cycle control, no reseed-distinct-from-reset, and no add/remove-agent control; population size is changed only via the Global Density slider (which regenerates). Reset uses the same seed mechanism every time (fresh `Math.random`), so it doubles as a reseed.

## 6. App-specific panels / overlays / readouts

### 6.1 Stats card (`.as-card.as-stats-row`, third sidebar card)

A horizontal three-cell readout separated by thin dividers (`.as-stat-divider`). Each cell shows an uppercase label (`#64748b`) over a large bold white value:

| Readout | Meaning |
|---|---|
| **Cycles** | Number of simulation cycles run since the last reset (one per timer tick). |
| **Wakeups** | Cumulative count of agent wake-ups across all cycles. |
| **Swaps** | Cumulative count of successful swaps performed. |

All three reset to 0 on Reset and on density change.

### 6.2 Legend (`.as-legend`, below the arena)

A responsive grid of five cards (5 cols → 3 → 2 as the viewport narrows), one per strategy. Each card shows an emoji icon, the strategy name colored to match its arena fill (`*-text` color class), and a one-line description:

| Strategy | Icon | Description (verbatim) |
|---|---|---|
| Standard | 👤 | Compares with a random adjacent neighbor. Traditional bubble-logic. |
| Blind Date | 🎲 | Picks a random agent anywhere in the population. Decimates global entropy. |
| Nomadic | 🏃 | A "left-drifter." Moves toward the start as long as it is smaller than neighbors. |
| Patrolling | 👮 | Maintains momentum. If happy with a neighbor, it flips direction to keep moving. |
| Perfectionist | 🧐 | Scans its entire future (all agents to the right) for the perfect placement. |

There is no leaderboard, per-agent stat tooltip, or progress/sortedness meter — the only quantitative feedback is the Cycles/Wakeups/Swaps stats row.

## 7. Explainer popup (?)

The top-bar **?** opens the shell's help modal with `EXPLAINER.md` rendered as markdown. Its content:

- **Premise** — sorting reframed as many small agents each following a simple local rule; order emerges from their interaction.
- **Emergent sorting** — each array slot holds an agent; each cycle a random subset wakes and applies its rule (a swap or move); sortedness emerges from purely local actions with no global view.
- **The strategies and their classic analogues** — a table mapping each agent's local rule to a textbook sort: Standard ↔ Bubble sort; Blind Date ↔ randomized compare-swap; Nomadic ↔ Insertion sort; Patrolling ↔ Cocktail-shaker sort; Perfectionist ↔ Selection sort.
- **Why mixes win** — Blind Date converges fastest alone (long-distance comparisons remove large-scale disorder in single jumps); Perfectionist is expensive per wake-up (a full scan) but places an element exactly; mixed populations often beat any single type via a division of labor between long-range movers and local refiners.
- **The knobs** — global density, processing delay, population mix.

(The longer `README.md` carries the same material plus an Observations section; it is not surfaced in any in-app About panel — this app renders no README.)

## 8. Domain notes

**Population.** `generateItems(count, weights)` creates `count` agents. Each agent gets a value `floor(random*201) − 100` (integer in −100…+100), a type chosen by weighted random pick over the current weights, an initial `status: 'idle'`, and a random initial `direction` of +1 or −1 (used by Patrolling).

**Concurrency / race model.** A `setInterval` fires `runSimulationStep` every `simulationSpeed` ms while running. Each step:
1. Resets all agents to idle.
2. Computes a wake-up budget of `max(1, floor(n * 0.15))` — about 15% of the population — and selects that many distinct random indices to "wake."
3. Each woken agent is marked `active` and applies its strategy; a successful swap marks both participants `swapping`. Wakeups and swaps for the step are accumulated into the global stats.

Because woken agents act within the same step against a shared array snapshot processed in index order, multiple agents can target overlapping positions in a cycle — this is the simulated "race" between concurrent actors.

**Per-strategy rules (as implemented).**
- **Standard**: pick a random adjacent neighbor (idx±1, if in bounds); swap if out of order relative to position.
- **Blind Date**: pick any random index ≠ self; swap if out of order relative to position.
- **Nomadic**: if not at the left edge, swap leftward when this agent's value is smaller than its left neighbor's (left drift).
- **Patrolling**: look at the neighbor in the current `direction`. If at a boundary, reverse direction. Otherwise swap if out of order; if already in order ("happy"), reverse direction to keep moving.
- **Perfectionist**: scan the entire right tail (idx+1…n−1) for the minimum value; if that minimum is smaller than this agent's value, swap it into this position.

**How "sorted" is measured.** It is **not** measured. There is no sortedness metric, completion detection, or auto-stop; the simulation runs until the user pauses. Progress is judged visually (the bar/dot field becoming monotonic) and indirectly via the Swaps/Cycles counters.

## 9. Persistence

**Nothing persists.** The app uses plain `useState` for every piece of state — `itemCount`, `simulationSpeed`, `isRunning`, `display`, `weights`, `items`, `stats` — and does **not** import or use `usePersistentState`. All settings revert to their defaults (density 60, delay 20 ms, all weights 20, bars mode, paused) on reload, and the population/stats are transient and regenerated on mount.

## 10. Component / file map

| Concern | File |
|---|---|
| App component, state, simulation loop, strategy rules, all DOM/controls | `src/animations/AgenticSorting/AgenticSorting.tsx` |
| All styling: layout grid, cards, arena, bars/dots, sliders, buttons, legend, strategy colors, responsive rules | `src/animations/AgenticSorting/agenticSorting.css` |
| Explainer popup content (`?raw`, fed to `useAppExplainer`) | `src/animations/AgenticSorting/EXPLAINER.md` |
| Longer write-up (not rendered in-app) | `src/animations/AgenticSorting/README.md` |
| Shared chrome: top bar, drawer tabs, hooks (`useAppHeader`, `useAppExplainer`), portal slots | `src/components/AppShell.tsx` |
| Generic floating action panel (mounted but inactive here) | `src/components/ActionFloater.tsx` |
| Form primitives (Section/Slider/Pills/Select/Checkbox) — **not used by this app** | `src/components/ControlPanel.tsx` |
| Route registration | `src/index.tsx` (`#/agentic-sorting`) |
| Catalog entry | `src/apps.ts` |

## 11. Seams & observations for the redesign

This is the most consequential section for the shared-shell review. Agentic Sorting is a near-total opt-out of the shell's control surface, which makes it a useful stress test for "how much should an app be allowed to ignore the shell, and what breaks when it does."

1. **Settings and Actions bypass the shell entirely.** The app renders every control (Start/Pause, Reset, Global Density, Processing Delay, Bars/Dots, the five weight sliders, the stats readout) in its own `.as-sidebar` cards instead of `<ShellSettings>` / `<ShellActions>`. As a result the top-bar **⚙** and **▶** buttons are permanently dimmed and their drawer tabs show empty-state text, even though the app is rich with settings and has two clear actions. A user trained on other apps to look in the Settings/Actions drawer finds nothing here — a discoverability and consistency gap. This is the single biggest deviation.

2. **Inconsistent action placement vs. the rest of the toolkit.** Other apps surface Start/Pause/Reset-style actions through `<ShellActions>` (and thus also the draggable `ActionFloater`). Here they are baked into the sidebar's Controls card. The generic `ActionFloater` is still mounted by the shell but sits inactive because `hasActions` is false — the app neither uses it nor calls `useActionFloaterOff()` to intentionally suppress it. The floater is effectively dead weight for this route.

3. **CSS class namespace collision risk.** Both this app (`agenticSorting.css`) and the shell (`AppShell.css`) use the `as-` prefix (`.as-app`, `.as-bar`, `.as-active`, `.as-header`, etc.). The app's `.as-app`/`.as-header`/`.as-active` are distinct DOM nodes from the shell's, but the shared prefix means the two stylesheets are one rename away from leaking into each other. A redesign that scopes shell styles (e.g. a reserved prefix or CSS modules) would remove this hazard.

4. **No use of the `ControlPanel` primitives.** All sliders, buttons, and the segmented toggle are hand-rolled raw `<input type="range">` / `<button>` elements with bespoke CSS, rather than the shared `Slider` / `Pills` / `Section` components. This is why the controls look and behave differently from drawer-hosted apps (no collapsible Sections, different slider styling, custom segmented control). If the shell wants visual consistency, it needs either to host these controls or to offer primitives compelling enough that an in-page layout still adopts them.

5. **Duplicated subtitle convention.** The app title comes from the shell bar (`useAppHeader('Agentic Sorting')`), but a second, app-local subtitle line ("Concurrent behavioral sorting simulation") is rendered in `.as-header` instead of being passed as the header's `subtitle` argument. The shell already supports a subtitle slot; using it would consolidate the heading and free vertical space.

6. **No persistence despite many settings.** Unlike apps that adopt `usePersistentState`, none of this app's settings survive a reload. If persisted settings become a shell-level expectation, this app is an outlier that resets everything (density, delay, mix, display mode) on every visit.

7. **No structured feedback channel.** The app's only quantitative output is a custom stats card; there is no sortedness/progress readout and no completion signal. A shared "metrics/readout" slot in the shell (if one is contemplated) would have no obvious hook here, since the app doesn't register actions or settings to anchor it.

---

Summary: Agentic Sorting is a CSS/DOM simulation in which a population of −100…+100 valued agents, each following one of five rival local strategies (Standard, Blind Date, Nomadic, Patrolling, Perfectionist), wakes in random ~15% batches each cycle and swaps toward sorted order, visualized as bars or dots about a midline. The top seams for the redesign: it bypasses `ShellSettings`/`ShellActions` entirely — putting all controls and both actions (Start/Pause, Reset) in its own sidebar so the shell's ⚙/▶ stay dimmed and the mounted ActionFloater is dead weight; it shares the `as-` CSS prefix with the shell (collision risk); and it ignores the `ControlPanel` primitives, header subtitle slot, and `usePersistentState`, making it the toolkit's clearest "opt-out of the shell" outlier.

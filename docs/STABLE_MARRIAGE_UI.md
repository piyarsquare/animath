# Stable Marriage — Interface Manual

> Purpose: a complete, code-free inventory of every screen region, control, panel, overlay, and readout in the **Stable Marriage** app (route `#/stable-marriage`) of the animath toolkit. Scope: this app plus how it uses (or deviates from) the shared **AppShell** chrome. Captured as built from source — present tense, not a spec. This is a CSS/DOM app (no Three.js); its layout, panels, and lucide-react icons are described as they actually render.

## 0. What the app is

Stable Marriage is a two-part visualizer of the Gale–Shapley stable-matching process under a *mixed-proposer* model. The **Visualizer** generates ranked preference lists for two equal groups ("men" and "women"), then lets the user step or auto-play through proposals, watch tentative matches form, and read average-rank / distribution / stability statistics. The **Lab** runs many fast headless simulations across a grid of consensus levels and renders four heatmaps of the average-rank outcomes. The two parts are mutually exclusive views inside one component, switched by an in-page toggle.

## 1. Top-level structure

The app renders one full-bleed scrollable container (`.sm-app`, dark theme, 32px padding) below the persistent AppShell bar. It has **two views (modes)** selected by an in-page toggle, never both at once:

- **Visualizer** (`appMode === 'visualizer'`, the default) — the step-through animation plus its controls, result tabs, and the two participant columns.
- **Lab** (`appMode === 'lab'`) — the consensus sweep plus a 2×2 grid of heatmaps.

Switching is done by the **Visualizer / Lab** button pair in the app's own in-page header (`.sm-mode-toggle`), top-right of the content area — *not* via the shell. The active mode button uses the `primary` (filled blue) variant; the inactive one uses `outline`.

```
+----------------------------------------------------------------------+
|  AppShell bar:  ⌂  ☰  ƒ(dim)   Stable Marriage   ⚙(dim) ▶(dim) ?     |  <- shared chrome
+----------------------------------------------------------------------+
| .sm-app (scrolls)                                                     |
| .sm-header:                                                           |
|   "Explore how proposal bias and preference        [Layers Visualizer]|
|    consensus shape stable matches."                 [Zap   Lab      ] |
+----------------------------------------------------------------------+
| VISUALIZER mode:                  | LAB mode:                          |
| +-------------------------------+ | +--------------------------------+ |
| | Card: Visualizer Controls     | | | Card: Consensus Lab            | |
| |  sliders/number + action bar  | | |  pop / bias / resolution + Run | |
| +-------------------------------+ | +--------------------------------+ |
| | Card: Result (tabs)           | | | .sm-lab-grid (2x2 heatmaps):   | |
| |  Summary | Distribution | Stab| | |  [Men Avg]    [Women Avg]      | |
| +-------------------------------+ | |  [Men−Women]  [Asker−Asked]    | |
| | Card: Participants            | | +--------------------------------+ |
| |  Men column   |  Women column | |                                    |
| +-------------------------------+ |                                    |
+----------------------------------------------------------------------+
```

## 2. Shared chrome, as this app uses it

This app is a **minimal consumer** of the AppShell. It calls only two shell hooks and renders everything else as its own in-page DOM.

| Shell feature | This app |
|---|---|
| `useAppHeader` | Called as `useAppHeader('Stable Marriage')` — sets the bar **title** only. No subtitle/formula passed. |
| Bar title/subtitle | Title `Stable Marriage`; no monospace subtitle. (The catalog `apps.ts` entry uses icon `♥` and the blurb "Step through the Gale–Shapley algorithm and probe the stability of its matchings.") |
| `useAppExplainer` | Called with `EXPLAINER.md` (`?raw`), so the top-bar **?** button is **active**. |
| `useAppFunctions` | **Not called** → ƒ button **dimmed**; Function tab shows "No function picker for this view." |
| `ShellSettings` | **Not used** → ⚙ Settings button **dimmed**; Settings tab shows "No settings for this view." |
| `ShellActions` | **Not used** → ▶ Actions button **dimmed**; Actions tab shows "No actions for this view." |
| Generic `ActionFloater` | Effectively **absent**. Because `hasActions` is never set true, the floater stays inactive (`af-inactive`); the app does not call `useActionFloaterOff` and does not ship its own floater. |

**Active top-bar buttons:** ⌂ Home, ☰ Apps, **?** Explainer, plus the clickable title. **Dimmed:** ƒ Function, ⚙ Settings, ▶ Actions.

**Key deviation (most important data point for the redesign):** this app puts **none** of its controls or actions into the shell's Settings/Actions portals. Every knob, button, stat, and view-toggle lives in the app's own in-page cards. The drawer's Settings and Actions tabs are empty for this app.

## 3. The main view(s)

### Visualizer — Participants panel (`.sm-people`)

Two side-by-side columns inside the "Participants" card (`.sm-people-card`), header "Participants" with a `User` icon and the caption "Active proposals highlight in yellow, receivers in purple."

- **Men column** — heading `User` icon + "Men"; rows aligned to the **right** (`sm-person-row-right`); person disc icon is `User`, tinted blue.
- **Women column** — heading `Heart` icon + "Women"; rows aligned to the **left** (`sm-person-row-left`); person disc icon is `Heart`, tinted pink.
- Each column scrolls independently (`max-height: 520px`, 320px on phones). Each person row is a fixed 64px tall (`ROW_HEIGHT`).

**Per-person disc (`.sm-person`, 42px circle, 36px on phones):**
- Default: dark fill, neutral border.
- **Matched** (`sm-person-matched`): green-tinted fill + green border.
- **Active proposer** (`sm-person-active`): amber border, amber glow, scaled 1.08 — the disc currently proposing.
- **Target / receiver** (`sm-person-target`): purple border, purple glow, scaled 1.08 — the disc being proposed to.
- **Role badge** (`.sm-role-badge`, bottom-right): appears once matched — **"A"** (blue, role `asker`) or **"R"** (orange, role `asked`).
- **Rank badge** (`.sm-rank-badge`): shown only when `n <= 30`. Text `Rank: #k` (1-based rank of the partner in this person's list). Color class: `rank-best` (rank 1, green), `rank-mid` (rank < n/2, blue), `rank-low` (otherwise, amber). For men the badge renders to the left of the disc; for women, to the right.

Interactions in this panel are **display-only** — discs are not clickable; animation is driven by the action bar (§5). There is no on-grid cell-click matching editor.

### Lab — heatmap grid (`.sm-lab-grid`)

A responsive 2×2 grid of `Card`s, each holding a `Heatmap` (see §6). Heatmaps populate after the user runs the lab; before that, each shows an empty state (`Grid` icon + "Run simulation to see heatmap").

## 4. Settings (drawer ⚙)

**There are no controls in the shell Settings tab** — it shows "No settings for this view." All settings live in the **in-page** cards described below. They are documented here because functionally they are this app's settings.

### Visualizer Controls card (`.sm-controls`)

Card header: `Info` icon + "Visualizer Controls", caption "Generate preferences, play through proposals, and inspect resulting matches."

| Control | Type | Label / suffix | Min | Max | Step | Default | Behavior |
|---|---|---|---|---|---|---|---|
| Population | number input | "Population" | 4 | 100 (`MAX_POPULATION`) | 1 | 20 | Group size per side; clamped 4–100. Changing it regenerates preferences and resets the run. |
| Men Consensus | range slider | "Men Consensus", value shown as `{n}%` | 0 | 100 | 1 | 0 | How strongly men's prefs follow shared "quality" vs private noise. |
| Women Consensus | range slider | "Women Consensus", value shown as `{n}%` | 0 | 100 | 1 | 0 | Same, for women's prefs. |
| Proposer Bias | range slider | "Proposer Bias", value shown as `{n}% men` | 0 | 100 | 1 | 50 | Probability a given proposal originates from the men's side. |
| Speed | range slider | "Speed" (no numeric readout) | 10 | 100 | 1 | 50 | Auto-play tempo; interval = `max(20, 400 − speed*3.5)` ms. |
| Sort by popularity | checkbox | "Sort by popularity" | — | — | — | off | When on, both columns reorder by descending "quality". |

Changing Population, Men Consensus, or Women Consensus regenerates the preference data and resets the simulation (via the `resetSimulation` effect). Bias and Speed take effect live without a reset; the popularity toggle only reorders display.

### Consensus Lab card (`.sm-controls`, Lab mode)

Card header: `FlaskConical` icon + "Consensus Lab", caption "Scan consensus levels and track average ranking outcomes."

| Control | Type | Label / suffix | Min | Max | Default | Behavior |
|---|---|---|---|---|---|---|
| Population | number input | "Population" | 10 | 100 | 50 (`labN`) | Per-side size used in every headless run; clamped 10–100. |
| Proposer Bias | range slider | "Proposer Bias", value `{n}% men` | 0 | 100 | 100 (`labBias`) | Bias applied to every cell's headless run. Default 100% = men-only proposing. |
| Resolution | number input | "Resolution" | 5 | 30 | 20 (`labResolution`) | Grid side length; total cells = resolution². Clamped 5–30 (run-time clamp 2–30). |

The Lab card also shows a meta readout: `Cells: {resolution²}` and `Status: Running / Idle`.

## 5. Actions

**There are no actions in the shell Actions tab** — it shows "No actions for this view." All action buttons live in **in-page** bars.

### Visualizer action bar (`.sm-actions`, inside the Controls card, separated by a top border)

| Button | Variant | Icon | Label | Enabled when | Behavior |
|---|---|---|---|---|---|
| Play / Pause | primary | `Play` / `Pause` | "Play" or "Pause" | always | Toggles auto-run; label/icon flip while running. |
| Step | secondary | `SkipForward` | "Step" | disabled while running | Advances exactly one proposal. |
| Finish | secondary | `FastForward` | "Finish" | always | Stops auto-run, then runs to completion in a loop (cap `n*n*5`). |
| Reset | outline | `RotateCcw` | "Reset" | always | Regenerates preferences and clears matches/status/stability. |

Meta readout at the end of the bar (`.sm-meta`): `Proposals: {count}` and `Status: {idle|running|paused|complete}`.

### Lab action (`.sm-control-group`, inside the Consensus Lab card)

| Button | Variant | Icon | Label | Enabled when | Behavior |
|---|---|---|---|---|---|
| Run Lab | primary | `FlaskConical` | "Run Lab" (becomes `Running {progress}%` while busy) | disabled while running | Runs `resolution²` headless simulations in batches of 25 (via `setTimeout` chunks), filling the heatmaps incrementally. |

There is no swap-proposing-side button (bias is a continuous slider instead) and no reseed-separate-from-reset; Reset both reseeds and resets.

## 6. App-specific panels / overlays / readouts

### Result card (`.sm-result-card`, Visualizer)

A tabbed stats card with three in-card tabs (`.sm-tabs`, not shell tabs):

- **Summary** (`BarChart2`) — four stat tiles (`.sm-summary`): **Men avg rank**, **Women avg rank**, **Asker avg rank**, **Asked avg rank**, each a 2-decimal number.
- **Distribution** (`PieChart`) — a `DistributionChart`: side-by-side bars per preference rank, Men in blue `#60a5fa`, Women in pink `#f472b6`, with a legend, per-column hover tooltip (`Rank k: Men=…, Women=…`), and an x-axis caption "Preference Rank". Bar height is normalized to the max count.
- **Stability** (`ShieldCheck`) — a banner that reads "Stable: No blocking pairs detected." (green `ok`) once a completed run has zero blocking pairs, "Unstable: {count} blocking pairs." (amber `warn`) if any, or "Run to completion to verify stability." before completion. Followed by an explanatory paragraph.

The result header also always shows a meta cluster (`.sm-result-meta`): `Activity` icon + "Avg askers: {x.xx}" and `ArrowDownUp` icon + "Avg asked: {x.xx}".

### Heatmap component (`.sm-heatmap`, Lab — four instances)

Each heatmap has a centered title, a rotated left-axis label "Women Consensus (0% → 100%)", a square grid plotting `resolution²` absolutely-positioned cells (x = men consensus 0→100% left→right, y = women consensus bottom→top), an x-axis label "Men Consensus (0% → 100%)", and a legend bar.

The four panels:
1. **Men Avg Rank** — `dataKey=menAvg`, standard palette.
2. **Women Avg Rank** — `dataKey=womenAvg`, standard palette.
3. **Men Avg − Women Avg** — `dataKey=diff`, diverging palette, legend "Men Better" ↔ "Women Better".
4. **Asker Avg − Asked Avg** — `dataKey=askerDiff`, diverging palette, legend "Askers Better" ↔ "Asked Better".

**Color scales:**
- *Standard*: HSL hue ramp from green (`hsl(120,…)` = avg rank 1, best) through to red (`hsl(0,…)` = worst rank `maxRank`); legend gradient green→yellow→red, labeled "Avg Rank 1 (Best)" … "Avg Rank {maxRank} (Worst)".
- *Diverging*: blue `#3b82f6` (negative) → light gray `#e5e7eb` (zero) → pink `#f472b6` (positive), normalized against `±maxRank/2`.

**Heatmap interactions:** hovering a cell shows a centered tooltip (`.sm-heatmap-tooltip`) with `M-Consensus`, `W-Consensus`, and the four averages (Men / Women / Asker / Asked, 1 decimal). Clicking a cell **pins** it (cell gets `.pinned` brighten); clicking the pinned cell again, or clicking empty grid background, unpins.

### Legends / swatches

Distribution legend swatches and the heatmap legend bars are the only standalone legends. Semantic colors throughout: blue = men/proposer-side accent, pink = women, green = matched/best, amber = active proposer/low-rank, purple = receiver target.

## 7. Explainer popup (?)

The **?** button opens the shell help modal rendering `EXPLAINER.md`. It covers: the stable-matching problem and the definition of a **blocking pair** / stable matching; the **Gale–Shapley** loop (propose to next-preferred, tentative accept/replace, rejected proposers move on) and the 1962 theorem that it always terminates with a stable result (which the Stability tab verifies by counting blocking pairs); **proposer advantage** (Gale–Shapley is proposer-optimal / receiver-pessimal, made visible by the Asker-vs-Asked averages); and the knobs — **Consensus** (0% = random noise, 100% = one shared ranking with fiercest competition), **Proposer bias** (share of proposals from the men's side), and the **Lab** sweep over both groups' consensus.

The longer `README.md` ("Stable Marriage Lab") is not surfaced by an in-app About section; this app does not render `README.md` (no `ParticleViewerShell` and no custom About panel).

## 8. Domain notes

- **Model:** `generatePreferences(n, corrM, corrW)` assigns each person a random `quality` in [0,1]; each ranker scores the other side as `corr * quality + (1−corr) * noise` and sorts descending. "Consensus" is `corr` — high consensus makes everyone agree on who is desirable.
- **Algorithm:** a mixed-proposer Gale–Shapley. Each step picks a proposing side (men with probability `bias/100`, unless only one side still has eligible proposers), picks a random single proposer on that side, proposes to their next-untried choice. The receiver accepts if single, or if it prefers the new proposer to its current tentative partner (then the displaced partner becomes single). Matches carry a `role` of `asker` or `asked`.
- **Stability:** `verifyStability` double-loops all m×w pairs counting **blocking pairs** (both would prefer each other to their current partners). A completed proposer-driven run yields zero.
- **What the heatmaps measure:** average preference rank of one's assigned partner (1 = top choice). Men/Women panels show absolute average rank; the diff panels show which side does better. Lower (greener) is better. Proposer advantage shows up as the asker side scoring lower (better) average ranks.

## 9. Persistence

**Nothing persists.** This app does **not** use `usePersistentState` / `clearPersistedState`; all state is plain `useState`/`useRef`. Every setting (population, consensus, bias, speed, popularity toggle, lab parameters), the mode toggle, the current result-tab, and all simulation state (matches, proposals, status, stability, heatmap data) reset on reload. Within a session, switching between Visualizer and Lab preserves each side's separate state (they use distinct state variables: `n/corrMen/corrWomen/bias/speed` vs `labN/labBias/labResolution`).

## 10. Component / file map

| Concern | File |
|---|---|
| Whole app: both views, all controls, algorithm, headless runner, sub-components | `src/animations/StableMarriage/StableMarriage.tsx` |
| All styling, theme tokens (`--sm-*`), responsive rules | `src/animations/StableMarriage/stableMarriage.css` |
| Explainer popup content (`?raw` → `useAppExplainer`) | `src/animations/StableMarriage/EXPLAINER.md` |
| Longer write-up (imported nowhere in the component) | `src/animations/StableMarriage/README.md` |
| Catalog entry (icon `♥`, blurb) | `src/apps.ts` |
| Route registration | `src/index.tsx` |
| Shared chrome / hooks consumed (`useAppHeader`, `useAppExplainer`) | `src/components/AppShell.tsx` |
| In-file sub-components | `Card`, `Button`, `PersonRow`, `Heatmap`, `DistributionChart` (all in `StableMarriage.tsx`) |
| Icons | `lucide-react` (Activity, AlertTriangle, ArrowDownUp, BarChart2, FastForward, FlaskConical, Grid, Heart, Info, Layers, Pause, PieChart, Play, RotateCcw, ShieldCheck, SkipForward, User, Zap) |

## 11. Seams & observations for the redesign

The biggest finding is that **this app almost entirely bypasses the shared shell's control surfaces.** Specific seams:

1. **No `ShellSettings` / `ShellActions` — controls and actions live in-page.** The ⚙ Settings, ▶ Actions tabs and the generic `ActionFloater` are all empty/inactive for this app. Every knob (population, consensus, bias, speed, popularity, lab params) and every action (Play/Pause/Step/Finish/Reset/Run Lab) is rendered in custom in-page `Card`s. A user who has learned to find controls in the drawer for the particle/fractal apps will find this app's drawer blank and must discover the on-page panels instead. This is the central inconsistency for a reusability review.

2. **Custom button + control primitives instead of `ControlPanel`.** The app ships its own `Button` (variants primary/secondary/ghost/outline), raw `<input type="range">` / `<input type="number">` / `<input type="checkbox">`, its own `.sm-tabs`, and a full private `--sm-*` color token set — duplicating `Section/Slider/Pills/Select/Checkbox` from `ControlPanel.tsx`. The visual language (rounded cards, dark surfaces) is hand-tuned to *resemble* the shell rather than reuse it, so any shell restyle won't propagate here.

3. **Mode switching is app-private, parallel to the shell's notion of an "app".** The Visualizer/Lab toggle is a bespoke in-header button pair. It is essentially a second-level navigation the shell has no concept of — a candidate for a shared "view/mode" affordance (analogous to `useAppFunctions`, which this app also does not use). Today the two modes are two unrelated state islands with their own (non-persisted) parameters.

4. **Smaller frictions:** Slider/number readouts are inconsistent (Men/Women Consensus and Bias show a value; Speed shows none); Speed has no displayed units while its effect is non-linear. Rank badges silently disappear above `n=30` with no in-UI indication. Stability is only meaningful after Finish, but the Stability tab is always selectable. Nothing persists, so a user's chosen population/consensus is lost on reload — unlike apps that adopt `usePersistentState`.

---

Summary: Stable Marriage is a CSS/DOM Gale–Shapley visualizer with a step-through animation (Visualizer) and a headless consensus-sweep heatmap explorer (Lab), switched by an in-page toggle. The top three seams for the AppShell redesign: (1) it bypasses `ShellSettings`/`ShellActions`/`ActionFloater` entirely, rendering all controls and action buttons in custom in-page cards so the drawer's Settings/Actions tabs are empty; (2) it reimplements buttons, sliders, tabs, and a full color-token theme instead of reusing `ControlPanel` primitives; and (3) its Visualizer/Lab mode toggle is an app-private second navigation level the shell has no shared concept of.

# Trinary System — Interface Manual & Component Snapshot

> **Purpose.** A complete, code-free snapshot of the **Trinary System** app's
> interface — every button, control, panel, overlay, and readout; where each
> lives and what it does — covering both the generic framework chrome and the
> two app views (Observatory, Lab). Intended as a baseline for evaluating how to
> better present and integrate the controls. See §7 for noted overlaps/friction.
>
> _Captured from the implementation as of this writing; update when the UI changes._

---

## 1. Top-level structure

The app is one catalog entry (`Trinary System`) that hosts **two views** behind a
single screen, swapped by a floating tab bar:

- **Observatory** (`#/trinary`) — drop a planet into a three-star system and watch
  its future diverge, live in 3D.
- **Lab** (`#/trinary-lab`) — run thousands of those worlds headlessly and
  map/tally their fates.

The hash route is the single source of truth for which view is active, so deep
links and cross-link buttons stay consistent. Each view writes its own
configuration into the URL query for shareable/reproducible links.

Three layers are always stacked on screen:
1. **The global AppShell chrome** — top bar + slide-out drawer (shared by every app).
2. **The active view** — Observatory or Lab, filling the screen beneath the bar.
3. **Floating/overlay elements** — the view-switch tab bar (bottom center), the
   guided Tour (first visit), the draggable Action Floater, and the SkyView overlay.

---

## 2. The global AppShell chrome (generic — shared by all apps)

### 2.1 Top bar (fixed, across the top)
Icon buttons clustered on the left:

| Button | Glyph | Location | Action |
|---|---|---|---|
| **Home** | ⌂ | far left (hidden on menu) | Navigate to landing menu (`/`). |
| **Apps** | ☰ | next | Open drawer on the **Apps** tab. |
| **Function** | ƒ | next | Open drawer's **Function** tab. **Dimmed** — Trinary registers none. |
| **Title / subtitle** | text | center-left | "**Trinary System**" / "**Trinary Lab**" + monospace subtitle: scenario name, and in the Lab the instrument ("· destiny map" / "· census"). **Click opens Settings.** |
| **Settings** | ⚙ | right of title | Open drawer's **Settings** tab (main controls). |
| **Actions** | ▶ | next | Open drawer's **Actions** tab. |
| **Explainer** | ? | next | "**What am I looking at?**" help popup. Active in Observatory; Lab registers none (dimmed). |

A spacer absorbs leftover width so the cluster stays left.

### 2.2 The drawer (slides in from the side)
Header (× close, "Menu") + **four tabs**:
- **Apps** — list of all animath apps; clicking one navigates away and closes the drawer; current app highlighted.
- **Function** — empty here ("No function picker for this view").
- **Settings** — portal target; the active view renders its controls here. Primary control surface for the Observatory; *shared system setup* for the Lab.
- **Actions** — portal target for the view's action buttons.

Dimmed tab labels = empty. Scrim closes the drawer; **Escape** closes the help popup first, then the drawer.

### 2.3 Action Floater (draggable on-canvas mirror of Actions)
Whatever a view puts in **Actions** is *also* rendered into a floating, draggable panel:
- **Collapsed**: small **▶** button with a drag grip (⠿).
- **Expanded**: header (grip ⠿, app title, × collapse) + the action controls.
- Draggable anywhere; hidden when there are no actions.

→ Observatory actions are reachable **two ways** (drawer Actions tab *and* this floater). The Lab uses an in-page action bar instead (see §5).

### 2.4 Explainer popup (?)
Centered modal rendering the app's markdown explainer (title + × close). Observatory-only.

### 2.5 Control primitives (building blocks of Settings/Actions)
- **Section** — collapsible group, icon + ▸ chevron; some open by default.
- **Slider** — labeled range + live formatted value.
- **Pills** — segmented mutually-exclusive buttons (selected highlighted).
- **Select** — labeled dropdown.
- **Checkbox** — labeled toggle.

---

## 3. Trinary host: view switch + guided tour

### 3.1 View-switch tab bar (bottom center, floating pill)
Always on top of either view:
- **✸ Observatory** — switch to the live view.
- **▦ Lab** — switch to the Lab.
- **?** — (re)open the guided **Tour**.

Active tab filled cyan.

### 3.2 Guided Tour (modal carousel)
Auto-shows on first visit (persisted "seen" flag); re-openable via **?**. Centered card:
- Kicker ("Guided tour · n / 5"), step title, body.
- Progress **dots** (active elongates).
- Buttons: **Skip** (left), **Back** (if not first), **Next →** / **Got it** (last).
- Click-outside or **Escape** closes.

Five steps: welcome → pick a system (Settings ⚙) → watch chaos → look around/tune → open the Lab.

---

## 4. The Observatory (live 3D sandbox)

### 4.1 Layout / scene
- **Full-screen Three.js scene**: dark background, faint ground grid.
- **Three stars** as glowing spheres — **gold (Star 1), orange (Star 2), blue (Star 3)** — orbiting under mutual gravity, with optional trails.
- **A reference planet** (bright green) + a swarm of **"ghost" planets** (smaller, semi-transparent magenta) from near-identical ICs — they start together and fan out (the chaos demo).
- Optional **consumption flares** (orange bursts) when a planet falls into a star.

### 4.2 Canvas interactions (on the scene)
- **Drag** — orbit the camera.
- **Wheel** — zoom (dolly).
- **In "Place planet" mode** — click-drag to set a launch point and drag out a velocity arrow; release launches the planet (and ghosts) from there.

### 4.3 Live divergence readout (top-left HUD, non-interactive)
- **cloud spread** — max distance of any ghost from the reference planet.
- **Lyapunov λ** — running largest-Lyapunov estimate (hidden "shadow" planet).
- **sim time** — elapsed simulation time.
- When placing: a "**click + drag to launch**" hint.

### 4.4 Planet sky overlay — "View from the planet" (SkyView)
When enabled, a **first-person sky panel fills the top ~36%** (overlay, non-interactive): horizon, ground, suns wheeling overhead as the planet spins; sky color tracks climate (frozen-dark → temperate blue → searing white). Top strip: temperature label, suns up, insolation (× home).
- **On planet destruction** (falling into a star): the sky **detonates** (white-out flaring orange, expanding) then **holds dark** with a "PLANET DESTROYED" readout. Restores when the planet lives again (reset/replay).

### 4.5 Bottom status & timeline strip (non-interactive)
Pinned to the **bottom**, present once a run has data:
- **Status line** (color-coded): "☉☉☉ three stars · planet bound", "☄ Planet destroyed", "❄ Planet ejected — frozen wanderer", "⊘ Star n ejected → binary", or "⚠ planet unbound".
- **Climate dot** (HABITABLE/HOT/COLD) + **habitable %**, **paradise %**, **longest stable** era.
- **Insolation bar** — current starlight on a log scale, habitable band highlighted, with a current-value marker.
- **Era timeline** — segments the run into colored eras: **Paradise** (green), **Warm·precarious** (amber), **Calm·barren** (blue), **Chaotic** (dark red); vertical lines mark events (star ejection white, planet event pink).
- **Legend** for the four bins + "│ event".

### 4.6 Observatory — Actions (drawer ▶ tab AND the floating panel)
- **▶ Play / ❚❚ Pause** — toggle the simulation.
- **↺ Reset** — re-seed and restart the configuration.
- **✛ Place planet by hand** — toggle placement (pauses; waits for a click-drag launch; highlights amber while active).
- **✦ Scatter ghosts here** — re-spawn the ghost cloud around the reference planet's current position.
- **🌅 View from the planet / Exit planet sky** — toggle SkyView.
- **📊 Open statistics lab** — jump to the Lab.
- **Speed** slider — simulation speed (0.1×–4×).

### 4.7 Observatory — Settings (drawer ⚙ tab)
Top: a **Simple / Advanced** toggle controls how many sections show. Sections:
- **System** (✸, open) — scenario **Pills** (*Figure-Eight, Moth, Pythagorean, Binary + Star*) + blurb. Picking resets launch/masses to that preset.
- **Chaos demo** (∿, open) — **Ghost planets** (1–120); **Perturbation ε** (10⁻⁵…10⁻¹).
- **Stars** (☉, *Advanced*) — **Star 1/2/3 mass** sliders (× multipliers, color-labeled gold/orange/blue); **Softening**; **Star size (collision)** (0 = pass-through); **⟲ Reset star masses**; note.
- **Planet launch** (◐, open) — **Orbit around** pills (Barycenter / Star 1 / Star 2 / Star 3 / Inner binary if applicable); **Start radius**; **Start speed**; **◯ Circular orbit speed**; note.
- **Planet sky** (🌅, *Advanced*) — **View from the planet** On/Off; **Day length (spin)**; **Axial tilt (seasons)**; note.
- **Climate model** (🌡, *Advanced*) — **Habitable floor/ceiling (×ref)**; **Luminosity exponent β**; **Calm threshold**; note.
- **View** (◑) — **Trail length** (0 = off); **Trails** On/Off.
- **Reference frame** (✛, *Advanced*) — **Center on** (Select) + **Align +x to** (Select: None=inertial or a body); **frame preset buttons** + **⟲ Reset frame**; note. *Pure viewpoint transform* (physics unchanged); trails reset on change.
- **Settings** (⚙) — **↺ Reset settings to defaults** (clears persisted, reloads); note.

> Most Observatory settings **persist to localStorage**; transient state (paused, placing) does not. A Lab deep-link world overrides stored launch settings.

---

## 5. The Lab (headless ensemble + maps)

Fills the screen with a **scrollable dark page**. System setup lives in the
**shared Settings drawer**; instrument-specific controls/visualizations live in
the **page body**.

### 5.1 Lab — shared Settings (drawer ⚙ tab) — used by BOTH instruments
- **System** (✸, open) — scenario **Pills** + blurb; **Orbit around** pills.
- **Star masses & physics** (✷) — Star 1/2/3 mass; Softening; **⟲ Reset stars**.
- **Simulation & climate** (⏱, open) — **Time budget / world**; **Habitable floor/ceiling**; note.

### 5.2 Lab — top action bar (page body)
- **Instrument selector**: **▦ Destiny Map** / **∑ Census**.
- **← Single run** — back to the Observatory.
- *(Census)* **▶ Run census / ❚❚ Pause / ▶ Resume**, **↺ Reset**, **🎲 Reseed**.
- **worlds/s** rate readout.
- **🔗 Copy link** (→ "✓ Copied").
- *(Census)* **⬇ JSON**, **⬇ CSV**.

### 5.3 Destiny Map instrument
Intro panel + two columns: **controls** (left), **map + legend** (right).

**Controls column:**
- **Plane** — *Start position / Radius × speed / Angle × speed* (which 2D slice the axes show).
- **Lens** — *Exact (1 world/px)* / *Statistical* (mini-census per pixel).
- **Color by** *(Exact)* — *Fate* / *Chaos (λ)*. — OR — **Show** *(Statistical)* — *Happy % / Habitable / Destroyed % / Survived %* + **Worlds / pixel**.
- **Color range** *(chaos or statistical)* — *Auto-fit* (stretch palette to data, re-fit each render/zoom) / *Absolute*.
- *(Start-position + Exact)* **Launch from each point** — *Tangential / At rest*; if tangential, **Speed × circular**.
- *(Start-position, any lens)* **Reference frame** — *Barycenter / Star A / Star B / Star C* (co-moving star frame; each pixel = offset from that star).
- *(Radius×speed, Exact)* **Fixed angle (°)**; *(Angle×speed, Exact)* **Fixed radius**; *(non-position, Exact)* **Direction** Prograde/Retrograde.
- *(Start-position)* **Star paths** — Show/Hide (overlays star trajectories; in a star frame that star pins at the origin with a ⌖ crosshair).
- **Resolution** — Exact 96²–256², Statistical 48²–128².
- *(Exact)* **Samples / pixel** — *1 (crisp) / 4 (smooth) / 9*.
- **Engine** — *GPU (exp) / Workers ×N / CPU* (notes: GPU can't do λ; GPU is 32-bit, may differ slightly).
- **Buttons**: **▦ Render map** (→ **❚❚ Stop** while busy), **⤢ Reset zoom**, *(Radius×speed)* **∑ Census this box**.
- *(Exact)* **Dimension readout** — small box-counting plot + **D** (boundary dimension), **α** (uncertainty exponent), boundary %.
- **Legend** — fate swatches, or chaos/stat color ramp with live numeric range; caption (and, in a non-barycenter frame, a note).

**The map (right):**
- Square canvas; renders **progressively** (coarse → fine, sharpening in place).
- **Hover** — axis coords + that world's outcome/λ/fraction.
- **Drag a box** — zoom into that region (re-renders); on the radius×speed plane this also re-aims the Census sampling box.
- **Click a point** — opens that exact world in the Observatory **in a new tab**.

### 5.4 Census instrument
- **Counter panel** — big "**N / target N worlds explored**", **happy-ending %**, green progress bar.
- **Sampling panel** — two columns:
  - **Controls**: **Engine** (CPU / Workers ×N / GPU exp + warning); **Runs (target N)**; **Launch radius min/max**; **Speed × circular min/max**; **Launch direction** (Pro+retro / Prograde only).
  - **LaunchSpace plot**: scatter of candidate worlds in (radius × speed) space, circular & escape-√2 reference lines, current cyan sampling box; "changing any setting clears the tally."
- **LIVE SAMPLES panel** — grid of 8 tiny live **MiniSim** previews + **outcome bars** (Happy ending / Survived / Planet ejected / Planet destroyed / Numerical blow-up, color-coded %) + **mean habitable**, **mean stable era**, **longest ever**.
- **DISTRIBUTIONS panel** — three histograms (sharpen with N): habitable fraction, longest stable era, time-to-star-ejection.
- **LONGEST STABLE ERAS panel** — ranked table (#, stable era, hab%, radius, speed, direction, outcome).

---

## 6. Navigation, deep links & persistence (cross-cutting)

- **Switching views**: bottom tab bar (✸/▦), Observatory "📊 Open statistics lab", Lab "← Single run", or a Destiny-Map pixel click (opens Observatory in a new tab).
- **Shareable URLs**: the Lab continuously syncs its full config to the hash query; "🔗 Copy link" copies it. Observatory launch points arrive via query params (`px,py,vx,vy`, masses, etc.).
- **Persistence**: Observatory settings save to localStorage (Settings ⚙ → "↺ Reset settings to defaults"). The Lab's config is URL-driven rather than localStorage-driven.

---

## 7. Observations for the redesign (overlaps & friction points)

1. **Settings live in two different places depending on view.** Observatory puts
   *all* controls in the drawer (⚙). The Lab splits controls between the **drawer**
   (system/masses/climate) and the **page body** (per-instrument + a second engine
   selector + sampling). Hard to know which surface owns a given control.
2. **Reference frame exists twice, different scope and UI.** Observatory has a rich
   *view-only* frame (center + align, presets) in Settings; the Destiny Map has a
   *physical* co-moving star-frame (Barycenter/Star A–C) in its own controls. Same
   word, different meaning and location.
3. **Duplicated system controls.** "Orbit around"/target body, star masses,
   softening, and the habitable band all appear in both Observatory and Lab with
   near-identical sliders.
4. **Engine selector appears twice in the Lab** (Census sampling panel and Destiny
   Map controls) — independent states.
5. **Inconsistent action model.** Observatory actions are mirrored (drawer Actions
   tab + floating panel); the Lab's actions (Run/Pause/Reset/export) are an in-page
   bar instead.
6. **Climate/habitable parameters drive three readouts** (Observatory timeline,
   SkyView tint, Lab census/maps) but are configured in two separate Settings panels.
7. **Simple/Advanced** is Observatory-only; the Lab shows everything at once (denser).

These are the seams where consolidation — a shared "system + physics + climate"
model surfaced once, a consistent action placement, and a single unified
"reference frame" concept — would most reduce duplication.

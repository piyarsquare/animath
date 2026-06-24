---
kind: three-hats
session: 2026-06-24-S01
date: 2026-06-24
title: "Argand review — Hat 5: Video Game Designer (UX & interaction feel)"
branch: claude/argand-plane-review-51egvz
slug: argand-plane-review-51egvz
status: completed
build: passed
signals:
  - visual-unverified
---

# Argand review — Hat 5: the Video Game Designer (UX & interaction feel)

I am the fifth hat: a video game designer evaluating Argand the way I'd evaluate
a toy before it becomes a game. My questions are not "is the math right" (Hat 3's
job) or "is the layout clean" (Hat 4's job) — they are: *what can you do in the
first ten seconds, does it feel good to do it, and is there a reason to keep
doing it?* I care about moment-to-moment feedback, discoverability, the "toy"
hook, and whether a large mode space ever leaves the player asking "where am I?"

## Plan under review

<details>
<summary>Original request</summary>

> Review the Argand app (#/argand, src/animations/Argand/) — its visual design and
> user experience. ADD TWO HATS beyond the usual three: (4) a graphic designer
> focused on whether the display is clean and the concepts are well-articulated
> visually, and (5) a video game designer focused on user experience and
> interaction feel.

</details>

I read the four screenshots as images, the full `Argand.tsx` (panels, the bottom
HUD, the Play clock, layouts, modes wiring), `ArgandPlane.tsx` (every pointer
handler, the handle glyphs and their hit targets, snapping), `curves.ts`, and
`EXPLAINER.md` (so I can judge whether the *interaction* delivers what the prose
promises). I cross-checked the gesture vocabulary against CLAUDE.md's
"Interaction conventions" so my suggestions stay consistent with sibling apps.

---

## TL;DR for the orchestrator

Argand has a genuinely strong toy core: **grab a colored handle, the whole
picture answers instantly.** That single verb is juicy and self-evident. But the
app surrounds that core with a *transport rig built for a different, more linear
experience* (Play / scrub / stops / speed / fine-scrub / a second j² transport),
a feed switcher that appears in **three** places, and a mode space of
**108 distinct states** with no in-world "you are here" signal beyond the
equation readout. The result feels like a sandbox with a control panel bolted to
the front of it — lots of knobs, no pull. My headline recommendations: lean
*harder* into direct manipulation (it's the win), **collapse the transport to one
control**, kill the redundant feed switchers, add hover/active "game feel" to the
handles, and seed three or four **goal-shaped presets** ("make f a pure
rotation", "find a fixed point", "spiral inward") to turn fiddling into a loop
with a payoff.

---

## The first ten seconds (onboarding walkthrough)

I role-played a cold landing on `#/argand`, desktop, no prior knowledge.

| t (sec) | What I see | What I'm thinking | Verdict |
|---|---|---|---|
| 0–1 | A dark plane, axes labeled `i` / `Re`, a faint dashed circle, several colored shapes near the origin with single-letter labels (`z`, `α₁`, `α₀`, `f(z)`, `z*`), an orange arc, a teal dashed arc. Top-right: a colored equation `f(z) = α₁·z + α₀`. | "Okay — a graph of something. Lots of little markers." | Visually rich, slightly busy, but legible. |
| 1–3 | A pill hovering dead-center over the diagram: *"drag z · α₁ · α₀ · pinch or scroll to zoom · two-finger or shift-drag to pan · double-click to recenter."* | "It's telling me the controls. So I drag." | The hint is doing the onboarding the *interaction* should be doing — see GOTCHA below. |
| 3–6 | I grab the cyan `z` circle and drag. Everything re-flows live: `f(z)` moves, the two legs redraw, the value panel ticks. | "Oh — *nice*. This thing is alive." | **This is the hook.** Strong, immediate, satisfying. |
| 6–10 | I notice the orange diamond `α₁`. I drag it; the whole transformation spins and scales. The fixed point slides. | "I'm steering a *transformation*, not just a point." | The core loop reveals itself naturally — good. |

> [!NOTE]
> **The toy hook is real and it lands fast.** Within ~5 seconds an unguided user
> is dragging a handle and getting a whole-picture response. That is exactly the
> "the controls *are* the game" property I look for. The math is in your hands,
> not behind a Play button. Everything below is about protecting and amplifying
> this core, and removing the scaffolding that competes with it.

> [!CAUTION]
> **The center hint pill is a tell that the UI doesn't fully trust itself.** A
> persistent text label listing five gestures, parked over the most important
> region of the screen, is the interaction-design equivalent of a tutorial popup
> that never dismisses. On desktop it's tolerable (clear of the action). On phone
> (screenshot `2026-06-24-S01-phone.png`) it **covers the entire diagram** — the
> handles are a tiny cluster *behind* the pill, and the pill is bigger than the
> playable area. A new mobile user's first ten seconds are spent reading a label
> that obscures the thing the label is describing. This is a must-fix.

### What's missing in the first 10 seconds

- **No grab feedback.** The handles set `cursor: grab` (good) but there is no
  hover state (no glow, no scale-up, no ring), and no `grabbing` cursor on press.
  In game-feel terms there's no "telegraph" that a thing is grabbable and no
  "confirmation" that you grabbed it. You only learn a handle is interactive by
  trying it.
- **No first-touch reward beyond the redraw.** Dragging is responsive but
  *flat* — no easing, no micro-animation, no settle. It's correct, not *juicy*.
- **The richest payoff (Iterate spiral, the j² morph, View-from-z*) is hidden**
  behind checkboxes in panels and a second transport. A cold user will never
  discover the spiral — arguably the single most beautiful thing the app does —
  in the first minute.

---

## Direct manipulation & feedback (the core verb)

Dragging `z` / `α₁` / `α₀` / `α₂` on the plane is the heart of the app, and the
plumbing under it is genuinely good: pointer-capture drag, a generous invisible
28px hit-halo around each unlocked handle (`ArgandPlane.tsx:408`), shapes that
differ per role (circle / diamond / square / triangle), and a lock-ring glyph.
That's solid affordance design. Where it falls short is *feel*.

| Aspect | Current state | Game-feel read |
|---|---|---|
| Hit target | 28px transparent halo on unlocked handles (`:408`) | Good — forgiving, especially for touch. |
| Cursor | `grab` when unlocked, `default` when locked (`:407`) | Good telegraph of lockedness; missing `grabbing` on active drag. |
| Hover state | None | Miss — handles don't "wake up" on approach. |
| Active/press feedback | None (no scale, no glow) | Miss — no confirmation you've latched on. |
| Response latency | Immediate, every-frame redraw | Excellent — this is the win. |
| Easing / settle | None | Neutral for a math tool; a tiny ease on snap would add polish. |
| Sound | None | Correct for this app — see below. |

> [!TIP]
> **Cheap juice that would pay off immediately (in priority order):**
> 1. **Hover:** scale the handle to ~1.15× and add a 2px soft ring on
>    pointer-enter. Pure SVG, no new state beyond a hovered-handle ref.
> 2. **Grabbing cursor:** set `cursor: grabbing` on the SVG root while
>    `dragRef.current` is set.
> 3. **Snap "click":** when snapping engages and the handle jumps to a lattice
>    point, pulse the handle (a 120ms scale 1→1.25→1 tween) so the snap *reads as
>    an event*, not a mysterious teleport. This converts the most confusing
>    behavior (below) into the most satisfying.

### Snap: help or fight?

`Snap to nice values` is **on by default** (`Argand.tsx:48`) and snaps every
dragged handle to the lattice, the unit curve, and π/6 angles (`onMove` →
`snap(q)` at `ArgandPlane.tsx:184`).

This is a classic game-design tension: snapping is *help* when the user wants a
clean value and *fight* when they want freedom — and right now the user gets no
signal about which mode they're in.

> [!WARNING]
> **Default-on snap with no visible feedback is a stealth fight.** A first-time
> dragger expects continuous motion. Instead the handle "sticks" at intervals
> with no explanation — it reads as jank or lag, not intent. Two fixes, either
> acceptable: **(a)** keep snap on but make it *visible* (snap target ghost dots
> that light up as you near them, plus the pulse above), so the stickiness reads
> as magnetism; or **(b)** invert the modifier convention used everywhere in
> games and CAD: **free by default, hold a modifier (Shift/Ctrl) to snap** — but
> note Shift is already taken for pan here, so this needs care. I lean toward
> (a): keep the helpful default, just make it *legible*.

---

## State-space / "where am I?" analysis

This is where I'm most worried, and it's the analysis I think is most valuable
to the orchestrator. Let me enumerate the mode space honestly.

| Dimension | Values | Count |
|---|---|---|
| Feed | Point / Shape / Grid | 3 |
| Degree | Linear / Quadratic | 2 |
| Number system (j²) | Complex / Dual / Split (+ the continuum between) | 3 (discrete stops) |
| Iterate | on / off (Point only) | 2 |
| View-from-z* | on / off | 2 |
| Shape preset (when Shape) | Flag / Circle / Square / Segment | 4 |

Multiplying the orthogonal toggles: 3 feeds × 2 degrees × 3 systems × 2 iterate ×
2 view-from = **72** macro-states, and the Shape feed fans into 4 presets, so the
honest catalog is on the order of **~100 distinct pictures** the same UI can
show. That is a *lot* of surface for an "entry-point app for complex numbers."

For each state the user must be able to answer "what am I looking at and how do I
change it." Today the answers live in scattered places:

| Mode info | Where it's shown | Is it legible at a glance? |
|---|---|---|
| Current feed | Top-bar pills **and** bottom HUD pills **and** Input panel pills (three places) | Over-shown — see below |
| Degree | Function panel pills + the equation gaining an `α₂z²` term | Yes, the equation is a good in-world signal |
| Number system | Subtitle text, the HUD `Cx/Du/Sp` pills, the j² slider, **and** the unit-curve shape changing | Yes — the unit-curve morph is a *great* in-world signal |
| Iterate | A checkbox buried in the Play panel | No — invisible unless you opened that panel |
| View-from-z* | A checkbox in the Function panel; the plane silently recenters | **No** — this is a teleport with no signposting |

> [!CAUTION]
> **The feed switcher appears in three places and that is one too many — maybe
> two too many.** Top-bar mode pills (`Argand.tsx:495`), the bottom HUD's own
> pill row (`:404`), and the Input panel's `Pills` (`:239`) all set the same
> `feed` state. Redundancy *can* be reassuring (a control you can always reach),
> but three copies of the same three buttons reads as the UI not having decided
> where its primary control lives. It also triples the maintenance surface and
> the "did I just change two things?" confusion. **Pick one home.** Since `feed`
> is the app's top-level "what am I transforming" choice, the **top-bar mode
> pills are the right home** (that's exactly what the framework's mode pills are
> for). Drop the HUD copy and the Input-panel copy — or, if the HUD must keep it
> for fullscreen, drop only the Input-panel one.

> [!WARNING]
> **"View from z*" is the worst "where am I" trap.** Toggling it silently
> recenters the entire plane onto the fixed point and *locks panning* (`panByClient`
> early-returns at `ArgandPlane.tsx:132`). A user who toggles it, then tries to
> pan and finds pan dead, has no way to know why — there's no on-screen "centered
> on z*" badge and the toggle is in a different panel than the thing that moved.
> This is a navigation lock with no indicator. Add a small persistent chip on the
> plane ("◎ centered on z* — click to release") whenever the lock is active.

### Modes that should be in-world, not in a menu

Game design lesson: a mode the player can *see and touch in the world* beats a
mode hidden behind a checkbox. Two candidates:

- **View-from-z\*** could be a click on the gold `z*` handle itself ("click z* to
  orbit from here / click empty space to release") rather than a panel checkbox.
  The locus is already drawn; make it the control.
- **Iterate** could be triggered by a verb on the `z` handle or an action-strip
  button rather than a checkbox three panels deep. The orbit spiral is a payoff;
  it deserves a front-row verb.

---

## The transport ("Play / scrub") — over-built for a sandbox

This is my strongest structural objection, and it aligns with the backlog note
the prompt quoted: *"make the scrubber pay its way — the arc is the payload, not
the slider."*

Inventory of transport controls currently shipped:

| Control | Location | What it does |
|---|---|---|
| `t` slider | Bottom HUD (`:417`) **and** Play panel "Fine scrub" (`:280`) | Scrub 0→1 around the loop |
| Play/Pause (t) | HUD (`:420`) **and** Play panel (`:275`) | Animate the pen around the loop |
| Reset ↺ (t→0) | HUD (`:421`) | Jump to t=0 |
| Speed slider | Play panel (`:278`) | Pen units/sec |
| Three "jump to a stop" buttons | Play panel (`:268`) | Snap t to a waypoint |
| `j²` slider | HUD (`:426`) **and** System panel (`:226`) | Morph the number system |
| Play/Pause (j²) | HUD (`:429`) | Ping-pong j² between −1 and +1 |
| `Cx / Du / Sp` jump pills | HUD (`:430`) | Snap j² to a stop |

That's **two independent transports** (a `t` transport and a `j²` transport),
each with its own slider + play + jump-stops, plus a speed knob and a duplicate
fine-scrub. For an app whose core verb is *drag a handle*, this is a second,
heavier interaction model competing for the user's attention — and it's the one
the bottom HUD foregrounds.

> [!CAUTION]
> **Pressing Play does not currently *reward* a cold user, because they don't
> know what they're watching.** The animation traces the two-leg path (×α₁ spiral,
> then +α₀ slide) and returns along the diagonal — which is a *lovely* idea once
> you understand the decomposition. But a new user pressing Play sees a dot crawl
> around a loop with no narration, no "here is leg 1 / leg 2" call-out synced to
> the motion, and no goal. It's an animation, not a game beat. The arc *is* the
> payload, exactly as the backlog says — so the slider, the speed knob, and the
> fine-scrub are scaffolding around a payload that should mostly play itself.

### What I'd do with the transport

> [!TIP]
> **Collapse to one transport with a payoff, in three moves:**
> 1. **One Play button, auto-paced.** Keep the arc-length pacing (it's good), drop
>    the user-facing Speed slider to an Advanced/Detail panel. Most users never
>    want to set pen speed in units/sec — that's an instrument, not a toy control.
> 2. **Fold "Fine scrub" and the HUD `t` slider into a single scrubber** that
>    *appears only while or after Play has run* — i.e., the scrubber earns its
>    place by being the thing you grab to inspect the arc you just watched. A
>    persistent always-visible scrubber on a sandbox reads as "this is a video,"
>    which fights the "this is a toy" core.
> 3. **Narrate the legs in-world.** As Play crosses t=0.25 / 0.5, flash the
>    leg label at the pen ("×α₁" → "+α₀" → "back: all at once"). This turns the
>    animation from decoration into a taught beat — the payload paying its way.
> 4. **Separate the j² transport entirely.** Morphing the number system is a
>    *different verb* from tracing the path; stacking them in one HUD row invites
>    "which Play did I press?" confusion. The HUD already shows them as two rows;
>    I'd move j² out of the transport metaphor and present it as a single labeled
>    morph slider (it already has the great unit-curve in-world feedback).

---

## Friction, traps & error states

| Trap | Severity | Notes |
|---|---|---|
| Pan/zoom away and lose the action | Medium | Double-click recenters the *pan* (`ArgandPlane.tsx:438`) but does **not** reset `extent` (zoom). A user who scroll-zooms to 16× and panned off has a two-step recovery and may not find it. **Reset-view should restore both pan and zoom.** |
| View-from-z* locks pan silently | High | Covered above — no indicator. |
| Snap fights free dragging | Medium | Covered above — no feedback that it's on. |
| Extent slider to 16 / down to 1 | Low | Self-correcting; double-click + re-zoom recovers. |
| Split-complex null cone (degenerate math) | Low–Med | The code *detects* unreliable power (`powReliable`, `:339`) and falls back to straight segments — good defensive design. But the user gets no hint that they've entered a degenerate regime; the red null-cone lines are the only clue and they're unexplained in-world. |
| No global undo | Medium | There's a buried "Reset settings to defaults" (Detail panel, `:346`) that **reloads the page** — a sledgehammer, not an undo. A single "reset view" (pan+zoom+t) verb would cover 90% of "I'm lost" moments without nuking persisted settings. |
| Phone: hint pill covers diagram | High | Covered in onboarding. Also the diagram itself is tiny (screenshot) — the immersive plane is squeezed between the top bar and the bottom HUD+dock. |

> [!WARNING]
> **Two destructive-feeling controls, no gentle one.** The only "start over"
> affordances are (a) double-click (pan only) and (b) a settings-nuking reload.
> There's nothing that says "put the picture back where it was." Add a single
> **Reset view** action (recenters pan, resets extent to default, sets t=0,
> releases view-from-z*) — ideally as an action-strip button so it's reachable in
> fullscreen and on phone.

### Phone experience specifically

From `2026-06-24-S01-phone.png`: the bottom dock (Function / System / Input /
Plane / Play / Val…) is good and consistent with the framework. But the playable
plane is a thin band, the central hint pill eats most of it, and the handle
cluster is ~40px wide near center. Dragging four distinct handles out of a 40px
cluster on a touchscreen is a fat-finger nightmare. On phone the app needs either
(a) a larger default `extent` so handles spread out, or (b) the hint pill to
auto-dismiss after first touch, or both.

---

## Progression & depth ("easy to learn, hard to master")

Right now everything is on at once: a cold user sees the full Linear story
(handles, legs, diagonal, fixed point, unit curve) immediately, and the deeper
layers (Quadratic, three number systems, Iterate, View-from-z*) are toggles of
equal visual weight scattered across panels. There is no sense of *unlocking* —
and, more importantly, **no pull**: nothing tells you what to *try*, so a curious
user fiddles, gets a pretty picture, and leaves. A sandbox with no feedback loop.

The math here is *full* of natural goals. Turning a few into light, optional
challenges/presets would give the toy a loop without dumbing anything down:

> [!TIP]
> **Seed 4–6 goal-shaped presets (a "Try this" shelf).** Each is one click that
> sets the coefficients/mode *and* states a tiny objective the user can then chase
> by dragging. Concretely:
>
> | Preset / challenge | Sets | The "aha" it delivers |
> |---|---|---|
> | **Make f a pure rotation** | α₁ on the unit circle, α₀=0; goal text "drag α₁ around the dashed circle — keep \|α₁\|=1 and watch f spin without scaling" | rotation = multiply by a unit number |
> | **Find the fixed point** | random α₁,α₀; goal "drag z onto the gold z\* — it's the one point f leaves alone" | what a fixed point *is*, kinesthetically |
> | **Spiral inward** | Iterate on, \|α₁\|<1; goal "shrink α₁ until the orbit spirals into z\*" | attractor dynamics — the prettiest payoff, surfaced |
> | **Make the line bend** | Degree=2, Grid feed; goal "this used to keep lines straight — add α₂ and watch them curve" | the linear→nonlinear threshold |
> | **Break multiplication** | Split system; goal "slide j² positive and find the red null cone where ×α₁ collapses" | why the number system's *sign* matters |
> | **Shear, don't spin** | Dual system; goal "in dual numbers, ×α₁ is a shear — watch the circle become a slid stack" | the parabolic middle case |
>
> These are not a tutorial gate — they're a *menu of toys*, the explorable-
> explanations move (Nicky Case): "here are interesting buttons, press one." Each
> doubles as discoverability for a feature (Iterate, Quadratic, the systems) that
> is currently buried.

This is the single change most likely to convert "pretty but I bounced" into
"oh, I want to find all of these." It's also cheap: presets are just a list of
state objects + a goal string + an optional success check (e.g. "α₁ within 2° of
the unit circle → ✓").

---

## Consistency with the framework's gesture vocabulary

I checked Argand's controls against CLAUDE.md's "Interaction conventions" so my
suggestions don't break sibling apps:

- **Drag = manipulate, gestures = look** is honored: 1-finger drag on a handle
  manipulates; 2-finger / shift / right-drag pans; pinch/wheel zooms;
  double-click recenters. This matches the particle viewers' "separate looking
  from navigating" principle. Good.
- **Shift+drag = pan** matches the established convention — which is *why* I'd
  avoid hijacking Shift for "snap toggle." Use Ctrl/Cmd or a panel toggle instead.
- **Action strip:** the app passes `immersive` (good — the plane fills the stage)
  but passes **no `actions`** to the Workspace. The framework explicitly supports
  an always-on action strip (≤5 buttons) for apps with primary verbs, surviving
  fullscreen and phone. Argand's primary verbs (Play, Reset view, Iterate,
  View-from-z*) are exactly what that strip is for, yet they're scattered in
  panels and a bespoke HUD instead. **Adopting the action strip would solve the
  "buried verbs" and "reset is buried" problems in one move** and align with
  Polygon Worlds' immersive pattern.

> [!NOTE]
> The bespoke bottom HUD (`controlHud`) was built to survive fullscreen — but the
> framework's `actions` strip *already* survives fullscreen by design. The HUD is
> reinventing a wheel the chrome ships. Migrating its essential verbs to `actions`
> + the top-bar mode pills would remove the HUD, kill the triple feed-switcher,
> and let the plane breathe (especially on phone).

---

## Verdict

**What I endorse (don't touch):**

- The **core verb** — grab a colored handle, the whole picture answers live. This
  is the app's soul; it's genuinely good game feel and it teaches by doing.
- **Color-coding** handles to the equation (z cyan, α₁ orange, α₀ violet, f green,
  z\* gold) — the picture reads like the formula. Excellent.
- **In-world mode signals that already exist:** the unit-curve morphing across
  Complex/Dual/Split, and the equation gaining an `α₂z²` term. Keep leaning on
  these — *that's* where modes should live.
- The **generous 28px hit halos** and the defensive null-cone fallback.

**Must-fix (onboarding & legibility — these block the experience):**

1. **Phone hint pill covers the diagram.** Auto-dismiss on first touch; shrink/
   reposition it; or move guidance into a one-time coachmark. (High)
2. **"View from z\*" locks pan silently.** Add an on-plane "centered on z\* —
   release" chip; ideally make z\* itself the clickable control. (High)
3. **One Reset-view verb** that restores pan + zoom + t (and releases view-from-z\*),
   reachable in fullscreen/phone via the framework `actions` strip. (High)
4. **Collapse the triple feed-switcher to one home** (top-bar mode pills). (Med-High)

**Should-fix (the toy→game pull):**

5. **A "Try this" preset shelf** of 4–6 goal-shaped states — the biggest lever for
   giving the sandbox a loop and surfacing buried features. (High value, low cost)
6. **Tame the transport:** one auto-paced Play, a scrubber that earns its place,
   in-world leg narration, Speed/fine-scrub demoted to Advanced. (Medium)
7. **Make snap legible** (target ghosts + a snap pulse) instead of silent
   stickiness. (Medium)

**Nice-to-have (juice):**

8. Handle **hover** (scale + ring) and **grabbing** cursor. (Low cost, real feel)
9. Surface **Iterate** as a front-row verb, not a checkbox three panels deep, so
   the spiral payoff gets discovered. (Medium)

**On sound:** none, and that's correct for a math tool embedded in a gallery —
audio would be intrusive and accessibility-fraught. The "juice" budget belongs in
*visual* feedback (hover, pulse, leg narration), not sound.

The honest one-line summary: **Argand is a great toy wearing a VCR's control
panel.** Strip the transport down, make the modes visible in the world, give the
player a few things to chase — and the thing that already feels good in your hands
becomes something with a reason to come back.

---

## Augmentation (2026-06-24) — the complex–dual–split slider as a cross-app "unitary spaces" lens

Dan wants to take Argand's `p = j²` dial (rotation → shear → boost) and treat it
not as an Argand quirk but as a **suite-wide lens**: complex numbers are the
*familiar* door, but even ℂ is "a foreigner we need to understand" — one stop on a
continuum, not the privileged home. From a game/UX seat this is a fantastic
**curiosity engine** and a dangerous **consistency/affordance hazard** at the same
time. The deciding factor is staging.

### 1. The cross-app interaction contract (so it's one meta-dial, not five toggles)

A control that appears in several apps only builds a transferable mental model if
**the same gesture means the same thing, in the same place, with the same
feedback, everywhere it appears.** If app A puts it bottom-center as a slider with
Cx/Du/Sp pills and app B puts it in a panel as a dropdown, players learn *two*
controls and trust neither. Concretely, the contract I'd lock:

| Contract clause | Rule | Why (game-feel) |
|---|---|---|
| **Identity** | One named thing across the suite — call it the **Space dial** (`p = j²`), never "number system" in one app and "geometry" in another | A control needs *one* name to become a verb players say to themselves |
| **Placement** | Always the same anchored slot — Argand's bottom-HUD row is the reference; replicate that position (or the framework `actions`-strip equivalent) in every app that has it | Muscle memory: "the dial is *there*" must hold across apps |
| **Range & stops** | Always −1…+1, always three labeled stops **Complex / Dual / Split** with the same `Cx/Du/Sp` jump pills and the same continuous morph between | Identical scale = identical mental model; a different range reads as a different control |
| **In-world feedback** | The **unit curve is the shared truth-teller** — ellipse → two lines → hyperbola+null-cone — and must render the same way in every app that shows a plane | This is the single best "the rules just changed" signal Argand already has; it's the dial's *face*. Reuse it verbatim. |
| **Color/motion grammar** | The same gesture (×α₁) reads as spin / shear / boost with the same coloring and the same handle behavior | If the *feel* of multiply differs cosmetically per app, transfer breaks |
| **Persistence** | The dial's value should **not** silently travel between apps via persistence; each app opens at ℂ unless a deliberate handoff carries `p` | A returning/linked user must not land in Split-space wondering why "multiply" feels wrong (this is my round-1 §4 "weird-state-greets-new-user" trap, amplified across apps) |

> [!CAUTION]
> **The function-handoff link is the place this contract gets tested.** Complex
> Particles ↔ Plane Transform already hand off *function identity* via URL. If both
> grow a Space dial, the handoff must decide explicitly whether `p` rides along.
> My call: **carry `p` only when both endpoints support it for that function, and
> show a one-beat "carried over: Split-space" confirmation on arrival** — never a
> silent inheritance. A handoff that silently changes what "multiply" means is the
> cross-app version of the round-1 "View-from-z\* locks pan silently" trap.

### 2. Defamiliarization as a hook — staging the "wait, the rules changed" moment

"Treat ℂ as a foreigner" is, in game terms, a **subverted-expectation beat** — the
best kind of hook, and the easiest to fumble into disorientation. The craft is to
make the foreignness a *reveal the player triggers*, not a state they wake up in.

- **Earn it; don't open with it.** A beginner must first build the ℂ intuition
  (multiply = spin-and-scale) so there's an expectation *to* subvert. The dial
  should be **dimmed/absent until the player has done at least one rotation**, then
  appear with a tiny "there's more than one kind of multiply" nudge. Surprise
  requires a baseline.
- **The reveal is a slide, not a jump.** Argand's continuous morph is the right
  instinct: drag `p` off −1 and watch the circle *open into a hyperbola* and the
  spiral *peel into a boost* in real time. The continuity is what makes it "whoa"
  instead of "huh — broken." Default-snapping to Cx/Du/Sp would kill the reveal;
  keep the continuum draggable.
- **Name the foreignness in-world.** When the dial leaves ℂ, flash the regime at
  the locus the way I proposed flashing leg labels in round 1: "rotation" →
  "shear" → "boost (rapidity)". One word, at the moment of change, turns confusion
  into a lesson.

> [!NOTE]
> **Which app earns the dial first: Argand — keep it the home.** Argand is the
> entry-point app, it already has the dial, and its single draggable point makes
> "the same gesture, three feels" maximally legible (the round-1 "Shear, don't
> spin" and "Break multiplication" presets are exactly this beat). The journey:
> **learn multiply-as-rotation in Argand → meet the foreigner via the dial in
> Argand → carry the foreigner into Plane Transform** (where you watch a whole
> *plane* boost, not just a point) **→ and only much later, if ever, into the
> fractal apps.** The dial graduates outward from the toy where it's clearest, not
> the spectacle where it's prettiest.

### 3. The inert-dial trap (the affordance must never lie)

A prominent control that does nothing — or emits garbage — in an app where the
math doesn't generalize is a **broken promise**, and players punish broken
promises harder than missing features. The honesty constraint (only
affine/polynomial/rational maps generalize over `p`; exp/sin/Γ don't) means the
dial is *legitimately* meaningless for much of Complex Particles' function zoo.

Decision rule, by how meaningful the dial is *for the current function*:

| Situation | UI behavior | Rationale |
|---|---|---|
| App + current function fully generalize (affine/poly/rational) | **Show, live** — full slider + Cx/Du/Sp pills, unit-curve feedback | The real feature |
| App supports the dial, but the *current function* doesn't (e.g. you picked `exp` in Plane Transform) | **Show, but locked with a why** — dial greyed, Cx pinned, a one-line "Only affine/polynomial maps live in other spaces — pick one to explore" | Teaches the constraint instead of hiding it; the lock *itself* is a lesson about what generalizes |
| App fundamentally can't carry it (e.g. a transcendental-only viewer) | **Hide entirely** | A control you can't ever use is clutter; absence is honest |

> [!WARNING]
> **Never the fourth option: present a live dial that silently produces nonsense.**
> A boost applied to a map where the power isn't well-defined is the cross-app
> version of Argand's null-cone degeneracy — and Argand *already* handles its own
> case well (the `powReliable` fallback). The cross-app rule is the same:
> **detect, then either lock-with-reason or fall back visibly — never emit a
> garbage picture under a confident-looking control.** "Lock with a why" is
> strictly better than "hide" wherever the function is the only blocker, because it
> converts a dead end into a discoverable rule ("oh — *these* functions travel,
> those don't").

### 4. A light cross-app progression carrying the idea

This is where the "unitary spaces" thesis becomes a *loop* instead of a slider.
Extend the round-1 "Try this" preset shelf into a small **cross-app quest line** —
each step states a goal, sets state, and *hands you to the next app* when you clear
it:

| Step | App | Goal | Hands off → |
|---|---|---|---|
| 1 | Argand | "Make `f` a pure rotation — keep \|α₁\|=1." | unlocks the dial |
| 2 | Argand | "Slide the Space dial to Split. Same gesture — now it's a **boost**. Find the null cone." | — |
| 3 | Plane Transform | "You rotated a point; now **boost a whole plane**." (carries `p`=Split + the function) | Complex Particles |
| 4 | Complex Particles | "See the boost as a 4D graph — and notice this only works for the maps that *travel*." | (curated function subset only) |

> [!TIP]
> **Frame it as "passport stamps," not a tutorial.** "You made a rotation in
> Argand — now boost it in Plane Transform" is a *carried verb*, the explorable-
> explanations move at suite scale. It also quietly solves discoverability and the
> inert-dial trap at once: the quest only ever routes you into apps/functions where
> the dial is meaningful, so a player following the thread never meets a locked or
> dead control. The shelf stays optional (a "Try this" rail, not a gate) — but for
> the player who pulls the thread, the foreigner becomes a *place you travel
> through the whole suite*, which is exactly Dan's hook turned into a loop.

### Augmented verdict (delta)

- **Endorse the cross-app dial — but only under a hard interaction contract**
  (same name, slot, range, pills, and the unit-curve as its shared face). Without
  that contract it's five inconsistent toggles and erodes trust; with it, it's the
  suite's signature transferable verb.
- **Argand keeps the dial as home and earns it first.** Graduate it outward
  (Plane Transform next, fractals last/never), gated behind one learned rotation so
  the defamiliarization *subverts* an expectation instead of bewildering a cold
  user. Keep the morph continuous — the slide *is* the reveal.
- **Resolve the inert-dial trap with "show-live / lock-with-a-why / hide," and
  never the silent-garbage fourth option.** Lock-with-reason is the default when
  the function (not the app) is the blocker — it teaches what generalizes.
- **The biggest upside is the cross-app quest line**: it converts the "unitary
  spaces" thesis from a clever slider into a passport-stamp loop that *only* routes
  players where the dial is honest — extending round-1's preset shelf to suite
  scale and giving the whole complex-function family the "pull" Argand alone lacks.
- **New risk flagged:** persistence/handoff carrying `p` silently between apps is a
  cross-app re-run of the round-1 silent-state traps; require an explicit "carried
  over" confirmation on every handoff that changes what *multiply* means.

---

## Self-reflection

1. **What would you do with another session?** Prototype the "Try this" preset
   shelf and the single Reset-view action against the real running app, and
   measure whether removing two of the three feed-switchers actually reduces
   confusion or whether one redundancy is load-bearing for fullscreen/phone reach.
2. **What would you change about what you produced?** I reasoned about feel from
   source + four static screenshots; I could not actually *feel* the drag latency,
   the snap stickiness, or the Play pacing. Some of my "juice" calls (e.g. how
   janky snap reads) are inferences from the code path, not lived experience.
3. **What were you not asked that you think is important?** Accessibility of the
   direct-manipulation core — keyboard users and screen-reader users currently
   have no way to grab a handle at all. A "game" that's mouse/touch-only excludes
   players. Worth a dedicated pass.
4. **What did we both overlook?** Whether the persisted state (everything is
   `usePersistentState`) means a returning user lands in whatever weird 1-of-100
   state they left — a Quadratic/Split/Iterate combo could greet a *new* user on a
   shared machine with no obvious way back. The buried page-reload "reset" is the
   only escape. The default-state guarantee matters for onboarding.
5. **What did you find difficult?** Judging "fun" and "pull" from a static
   artifact. The toy hook is evident in code; the *absence* of a loop is an
   inference about player psychology I can't fully validate without playtesting.
6. **What would have made this task easier?** A short screen-capture clip of an
   actual drag + Play session, and one of the phone touch experience, to confirm
   the feel claims (snap stickiness, Play reward, phone fat-finger).
7. **How did you verify this, and does each passing check test the user-visible
   claim?** Method: reasoning over source (`Argand.tsx`, `ArgandPlane.tsx`,
   `curves.ts`, `EXPLAINER.md`) plus reading four static screenshots as images. No
   app was run; no drag/Play was felt; phone touch was judged from one screenshot.
   All feel/latency/feedback claims are code-and-image inferences, not device-
   verified — flagged `visual-unverified`. The state-space count (~100) is
   arithmetic over the enumerated dimensions and is reliable; the "no pull"
   conclusion is a design judgment, not a measured one.
8. **Follow-up value:** MEDIUM — conclusions are sound and actionable, but the
   feel-specific claims (snap jank, Play reward, phone touch) deserve a live
   playtest before any are treated as settled, and accessibility was out of scope.
   The 2026-06-24 augmentation (cross-app Space dial) is a *design proposal*, not a
   review of built behavior — its contract and quest-line ideas are untested and
   would need a real cross-app prototype to validate the handoff/persistence claims.

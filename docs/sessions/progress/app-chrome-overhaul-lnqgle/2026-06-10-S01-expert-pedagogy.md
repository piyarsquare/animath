---
kind: three-hats
session: 2026-06-10-S01
date: 2026-06-10
title: Three hats — Math-Viz & Pedagogy on CHROME-REVIEW
branch: claude/app-chrome-overhaul-lnqgle
slug: app-chrome-overhaul-lnqgle
status: completed
build: unknown
---

# Three hats — Math-Visualization & Pedagogy review of CHROME-REVIEW.md

## Plan under review

<details>
<summary>Original request</summary>

> "I would like you to run a design review of the Chrome for all of the different applications. something I think we did not address properly in the original design spec is that some spaces require buttons to be present. always on screen. for example, an app without a play button for things like stable matching generates an unsatisfying result. the user does not know where to begin. another issue I have found is that in full screen mode, I sometimes still want to access some controls. One other catch is treating the planer plots as two different windows in the complex plane plot code."
>
> — followed by: "I think a three hats review of your plan and plan documents is an excellent idea. please begin."

</details>

The full plan is **`docs/redesign/CHROME-REVIEW.md`** (2026-06-10, this branch). Its proposals, condensed:

| # | Proposal | Mechanism | Claims to fix |
|---|---|---|---|
| P1 | **Action strip** | `WorkspaceProps.actions?: ActionDef[]` — ≤5 always-on verb buttons, chrome-rendered (bottom-center pill on desktop, row above the dock on phone, persists in fullscreen); a *projection* of an existing drive/playback panel, not a 12th archetype | F1, F2, F7 |
| P2 | **Start hints** | `ViewDef.hint?: string` — dismissable overlay in the view until first pointer interaction ("click to pick c", "drag to pan…") | F4 |
| P3 | **Legitimize the HUD** | `ViewDef.hud?: React.ReactNode` — chrome-rendered in-view overlay; migrate TopologyWalk / PolygonWorlds MovePads | F3 |
| P4 | **Fullscreen keeps controls** | panels render above the fullscreen view (`z 110+`); action strip persists; staged Esc; phone keeps dock + sheet reachable | F5, F6, F7 |
| P5 | **Split view** | `ViewDef.panes?` — one window body renders panes side-by-side, equal flex split; Plane Transform becomes one window `Plane: z ↦ f(z)`; Correspondence explicitly stays two windows | F8–F10 |

Recommended order: P4a (bug fix) → P1 → P5 → P2 → P3 → P4b.

I read the plan against the shipped code: `PlaneTransform.tsx` + `polarViews.ts`, `Correspondence.tsx` + `FractalPane.tsx`, `StableMatching.tsx`, `TopologyWalk.tsx`, `PhoneWorkspace.tsx`, `theme.css`, the relevant `EXPLAINER.md`s, and `DESIGN-SPEC.md`.

---

## 1. Mathematical fidelity — the P5 geometric-error claim, verified and weighed

This is the load-bearing factual claim of the plan, so I checked it line by line.

### What the code actually does

- Each pane renders its WebGL canvas as the **inscribed square** of its container (`Math.min(w, h)`, `PlaneTransform.tsx:195`), and the SVG curve overlay maps math → NDC via `clipFromMath` (`polarViews.ts:72-86`) → pixels via *that same pane's* inscribed square (`CurveSvg`, `PlaneTransform.tsx:618-625`).
- Both panes share one `viewExtent`, one geometry, one uniform set; wheel/pinch in either pane mutates the single shared extent (`PlaneTransform.tsx:458, 472`).
- Freehand strokes invert through `mathFromClip` against the input pane's own square, so drawn z-values are exact regardless of pane size.

### Verdict on F9: mechanism correct, severity wording overstated — but the fix is still right

> [!IMPORTANT]
> **"Mismatched panes make drawn curves geometrically wrong" is imprecise.** Within each pane, the curve overlay and the GPU points go through the *same* inscribed square and the *same* `clipFromMath`, so each pane remains an internally correct plot of `[-E, E]²` no matter how the windows are sized. Nothing false is drawn *inside* a pane. What actually breaks when the windows diverge is **cross-pane commensurability**: the same mathematical length renders at different pixels-per-unit in the two panes.

Why I still endorse P5 strongly: cross-pane commensurability *is the pedagogical content* of the two-plane picture. The whole point of domain-beside-image (Needham's classic presentation) is that the eye compares: how much did `f` stretch this circle? Is the image of the unit square bigger or smaller? Those judgments — effectively reading off `|f′(z)|` by eye — are only valid when both panes share one pixel scale. With mismatched inscribed squares, the picture silently *invites a false inference* (e.g. `e^z` near 0 looks like a contraction because the output window happens to be smaller). A display that is locally true but comparatively misleading is exactly the kind of "pretty but not true" I am here to catch — the plan caught it; it just labeled the failure mode at the wrong layer. I'd reword F9 in the doc: *"each pane stays self-consistent, but the panes become incommensurable — the cross-pane size comparison, which is the pedagogical payload, silently lies."*

The other half of F9 is fully correct and serious: **collapse, fullscreen, or a layout can hide one pane**, and a domain with no image (or an image with no domain) is not a weaker version of the visualization — it is a different, broken one. P5's "the pair is one window" fixes this structurally, including fullscreen-takes-both for free. The embed route (`.am-embed-row` with two equal flex panes, F10 — verified) already proves the model.

### Is forced equal 50/50 split always right? (the |f(z)|-grows-huge question)

Yes — and the reasoning matters, because the intuitive objection ("range needs more room") points at the wrong variable:

- Both panes display the **same coordinate extent** `±viewExtent`. Whether `f(z) = z²` at `E = 3` overflows the output square (|w| up to 9, points beyond NDC ±1 clipped; giants clamped at `1e3`) is governed entirely by the **extent**, not by pane *pixels*. Giving the range pane more width would not show one more point of the image — it would only re-break the shared scale.
- Equal split + equal height ⇒ equal inscribed squares ⇒ one pixels-per-unit for both planes. That invariant is the fix; an unequal or draggable divider would reintroduce F9 by hand. If a draggable divider is ever added (the plan floats it as "optional later"), it must come with the explicit understanding that it trades away commensurability — **I recommend not adding it.**
- The real future answer to "the image is huge" is an *optional independent output extent* (or a "fit image" toggle) — a deliberate, labeled break of the shared scale, like log-log axes — plus the app's existing **log-polar plane mode**, which already compresses magnitude into `log|·|` and is the mathematically honest way to look at `e^z` or `1/z`. Out of scope for P5; worth a line on the ledger.
- Phone stacking (column under a width threshold) keeps equal squares too (same width, half height each) — verified reasoning holds.

### Side-by-side vs overlay vs morph

Side-by-side is the right *primary* presentation for this app: the color correspondence ("same color = same point", per the EXPLAINER) is the linking mechanism, and a static pair lets the learner dwell. An overlay would superimpose two colored point clouds of the same hue field — unreadable. A **morph** (`(1−t)·z + t·f(z)` slide) is a genuinely valuable third mode — it answers "which point went where" kinetically and would fill the app's currently-empty `motion` archetype — but it is an app feature, not a chrome concern, and P5's single-window structure is the prerequisite for doing it well (morphing between two *windows* is meaningless). Sequence is right: P5 first.

> [!NOTE]
> Factual slip in the audit table: Plane Transform's primary action is listed as **"morph; draw curves"** — there is **no morph in the shipped app** (no `motion` section in `sections`, no morph code; DESIGN-SPEC §3 listed "motion Morph" as *designed*, flagged "validate against real capabilities"). The primary action today is draw curves / change function. Harmless for the proposals, but the audit row should be corrected.

---

## 2. Conceptual clarity — does P1 "play" teach, or just reassure?

The right question per app is **watching vs doing**. The action strip is a *watching* affordance (transport verbs). It is the correct first affordance exactly where the mathematics is a *process in time*:

| App | Is the math a process? | Strip verdict |
|---|---|---|
| Stable Matching / Stable Marriage | Yes — rounds of deferred acceptance *are* the theorem (the monotone trade-up is why stability holds) | **Play/Step/Reset belongs on the strip.** Step > Play pedagogically: the round-by-round narration (`narrate()`) is the lesson |
| Agentic Sorting | Yes — concurrency is the subject | Strip: Run/Reset ✓ |
| Trinary (Observatory) | Yes — launch + watch dynamics | Strip: Launch/Reset ✓ |
| Correspondence | **No** — the subject is a *parameter dependence*, c ↦ J(c). The learner learns by *picking c*, not by watching | Strip should carry **"Pick c"** (a mode toggle) and possibly "Play path" as secondary — but see the fix below |
| Plane Transform | No — the subject is a static map; "Draw" is the doing-verb | Strip: "Draw curve" toggle, or rely on P2 hint |
| Complex Particles | Animates immediately; self-evident | No strip (actions optional — the plan gets this right) |
| Fractals (GPU) | No — exploration by gesture; Trace is the doing-verb | P2 hint is the fix, not a strip |
| Topology Walk / Polygon Worlds | Doing, already solved in-view | P3 HUD ✓ |

So: P1 fixes the four simulation apps (and is the honest fix there); P2/P3 fix the doing-apps. The plan's three-way split (strip = app transport, hint = gesture invitation, HUD = view-scoped manipulation) is the right taxonomy and I endorse it. One sharpening: **at most one `primary: true` action, and for the algorithm apps it should arguably be Step, not Play** — Play produces motion, Step produces understanding; at minimum both must be on the strip (the plan's example list includes step ✓).

### The Correspondence audit row is factually wrong — and it changes the P2 wording

> [!WARNING]
> **F4 / audit table error: "click works, no hint" is false as shipped.** `Correspondence.tsx:38-42` gates picking on `selecting`: `handlePick` early-returns unless the user has first pressed **"Pick Julia c by tap"** in the Seed panel. A plain click/tap on the Mandelbrot does nothing. So the proposed P2 hint text *"click to pick c"* would be a **false affordance** — the worst kind of hint — unless the gating changes.

Two consistent resolutions, and I recommend the first:

1. **Make tap-to-pick always on.** `useViewportGestures` already distinguishes tap from drag (`FractalPane.tsx:182-189` wires `onTap` unconditionally); the arming lives only in the app. Remove the gate (keep it only while `drawingPath` is active), keep the c-marker crosshair as feedback, keep numeric entry in the Seed panel. Then the hint "tap the Mandelbrot to choose c · drag to pan" is true, and the app teaches by *doing* from second one. Risk of accidental picks is low (tap threshold already separates pan), and a mis-pick is self-evidently reversible — the Julia pane reacts instantly, which is itself the lesson.
2. If the gate stays, the hint must say "press **Pick c**, then tap the Mandelbrot" and the strip must carry the Pick-c toggle (`ActionDef.active` exists for exactly this).

Either way, this row of the audit should be corrected before the plan is executed, because P2's hint copy is downstream of it.

### Are start hints the actual pedagogical fix?

For the gesture apps, yes — with two constraints the plan should make explicit:

- **Hints must be verbs anchored to the mathematics**, not generic gesture lists: "draw on the z-plane — watch f bend it" beats "drag to pan · pinch to zoom". The hint is the first sentence of the lesson.
- **Dismissal on first interaction is right; never re-show within a session.** A hint that lingers over a fractal is chartjunk on the most information-dense pixels in the project.
- Plane Transform's hint should point at *drawing* (`"✎ Draw on the z-plane"`), which currently requires opening the hidden Draw panel and toggling draw mode — so either the hint's tap should *arm draw mode itself* (hint-as-button), or the strip carries the Draw toggle. A hint that names an action the user still can't perform without spelunking the rail repeats the Correspondence mistake.

---

## 3. Honest framing — is "play" honest where the run is precomputed?

Verified: Stable Matching computes the entire run up front (`runRounds` in a `useMemo`, `StableMatching.tsx:282`) and Play/Step replay the event log (`applyLog`) on a timer; the resolver likewise replays precomputed RVV steps. Is a "play" verb honest here?

**Yes — defensibly.** The rounds *are* the algorithm's semantics: deferred acceptance is defined as a round process, and replaying its trace at human speed is the standard, honest mode of algorithm visualization (the alternative — actually executing per tick — would be indistinguishable on screen and worse engineering). The honesty line is crossed only if the chrome implies the *outcome is being discovered* live when it's known — and this app already inoculates against that: the solution-space metric, the stable-pair footprint, and the lattice all display instance-level facts *before* play begins, openly. The narration "Round 3: all free A's proposed at once…" describes what the round *did*, not a pretense of suspense. No change needed; I'd only resist any future temptation to add spinner-like "computing…" theater to the strip.

One genuine honesty nuance for the strip: Stable Matching has **two distinct transports** (the GS run and the RVV stabilization replay) sharing one playback panel with context-switched buttons (`StableMatching.tsx:688-708`). The strip must mirror that context (its Play/Step must drive whichever replay is active), or it will desynchronize verb from meaning. `ActionDef` as proposed (plain `onClick`/`active`) can express this since apps pass fresh defs per render — fine — but the plan should note the strip *is allowed to relabel/swap actions contextually*, since "≤5 static verbs" reads as more rigid than apps need.

Also honest and worth keeping: the strip-as-projection constraint (actions must correspond to an existing drive/playback section). That keeps the 11-archetype vocabulary intact and prevents the strip from becoming a junk drawer. Endorse exactly as written, including "§3 stays at 11 archetypes."

---

## 4. Fullscreen (P4) — which controls are *pedagogically* essential?

The findings are verified: rail z 200 floats above fullscreen z 100 while panels sit at ~25-40 (`theme.css:322, 392-396`; `Panel.tsx`), so the rail-click-opens-invisible-panel bug (F5) is real and P4a is a straight bug fix. Phone Esc clears sheet and fullscreen in one keystroke (`PhoneWorkspace.tsx:52-58`) — F6 verified; staged Esc is correct (it matches the mental model of peeling layers).

What *must* survive fullscreen, by app class:

| App class | Essential in fullscreen | Covered by |
|---|---|---|
| Algorithm apps (SM, SM², Sorting) | Step / Play / Reset; speed is nice-to-have | Strip (P1 persists) + P4a for the speed slider |
| Complex viewers (Particles, Plane) | Function choice — fullscreening the cloud and switching `sin → 1/z` is a core compare-loop | P4a: rail → subject panel floats above |
| Fractals / Correspondence | Pick c / Trace toggles; palette is secondary | Strip toggle + P4a |
| Walkers | MovePad | P3 HUD (already in-view, must survive — the plan says HUDs survive fullscreen ✓) |

P4a's design — *the same panels, floating above the canvas* — is better than inventing a fullscreen-specific control surface, because it preserves the one-vocabulary rule: the learner who found the Function panel on the stage finds the identical panel in fullscreen. Endorse. On phone, keeping the dock visible ("fullscreen = hide the other cards") is the right reading of what fullscreen *means* at that size; a hidden-grip dock would cost more discoverability than the ~60px buys.

> [!TIP]
> One omission: the plan doesn't say what happens to the **top bar** in fullscreen (z 30, buried). That's mostly fine — immersion — but the **? explainer** is a control a stuck learner reaches for. Either let the rail carry a ? affordance in fullscreen, or accept Esc-then-? as the path and say so explicitly.

---

## 5. Semantic hygiene — names

- **Merged window title `Plane: z ↦ f(z)`** — the `z ↦ f(z)` part is exactly how mathematicians write it; the `Plane:` prefix is filler. Since the top bar already shows the function name and formula, I'd title the window **`z ↦ f(z)`** alone, or `w = f(z)` as the classical alternative.
- **Pane labels.** Current `z-plane (input)` / `f(z)-plane` are good. If P5 relabels, prefer **`z — domain`** and **`w = f(z) — image`** over "range": *image* is the correct word for `f(domain)` (range is ambiguous between codomain and image, and this plot shows the image). "Input/output" is friendlier for learners and also fine; **avoid "range."** Introducing `w` quietly gifts the learner the classical w-plane vocabulary they'll meet in every textbook.
- **`ActionDef` honesty in naming:** the strip's verbs should be imperative and specific — "Step round", "Launch planet", "Pick c" — not bare icons. The plan's `label` field (aria + tooltip, optionally shown on phone) supports this; I'd make labels *always* visible on phone for the simulation apps (an unlabeled ▶ above the dock under-serves the first-run user the whole proposal exists for).
- F11's Correspondence carve-out is semantically right and worth preserving in the spec text: the two fractals are linked by a *parameter*, not by a *scale* — the opposite of Plane Transform, whose panes are linked by a *metric*. That one sentence ("linkage by parameter vs linkage by scale") would make the DESIGN-SPEC delta teach future app authors when to use `panes` vs two views.

---

## 6. Accessibility of the idea — phone first-run

F1 is verified (`PhoneWorkspace.tsx:24` — `sheet` starts `null`; nothing actionable above the dock) and it is the single biggest pedagogical hole: 8 of 10 apps open inert on the device most casual learners hold. The action row above the dock fixes the *verb*; is it enough?

- **Stable Matching**: nearly — the matrix card's own narration already says "Press Play or Step to run the rounds" (`narrate()`, `StableMatching.tsx:517`), and with a labeled Play/Step row directly below, verb and invitation meet. **I recommend against auto-stepping on first run.** Auto-play robs the learner of the cause→effect moment ("I pressed Step and the gold rings appeared") and contradicts the project's own doing-over-watching grain; a one-time subtle pulse on the primary action is the most theater this needs.
- **Correspondence on phone**: with tap-to-pick always on (§2), the first tap anywhere on the Mandelbrot card *is* the aha — the Julia card reorganizes below it. That beats any hint text. This is the strongest argument for resolution 1 above.
- **Plane Transform on phone**: the P5 single card with stacked panes plus a "draw" hint is a real improvement over today's two separately-scrolled cards where the correspondence can be off-screen — on a phone, *both halves visible at once* is the difference between a transformation and two unrelated pictures.

---

## 7. Findings scorecard (F1–F11)

| Finding | Verdict | Notes |
|---|---|---|
| F1 phone opens inert | **Verified** | `PhoneWorkspace.tsx:24`; dock-only start |
| F2 desktop fragile via persistence | **Verified in mechanism** | ✕-close persists under `ws:<appId>`; generic empty-stage hint |
| F3 apps went around the chrome | **Verified** | MovePad inside view node, `TopologyWalk.tsx:344`; gesture-isolation comment at 330-340 |
| F4 hidden drive panels / unhinted click | **Half right** | Hidden panels ✓; but Correspondence's click is *armed*, not merely unhinted — audit cell "click works" is **false** (`Correspondence.tsx:38-42`) |
| F5 rail-above-fullscreen latent bug | **Verified** | z 200 vs 100 vs panels 25-40 (`theme.css:322, 392, 358`) |
| F6 Esc collapses layers at once on phone | **Verified** | `PhoneWorkspace.tsx:52-58` |
| F7 immersion vs access framing | **Agree** | Judgment, not fact; correctly framed |
| F8 no pairing concept in engine | **Verified** | `workspace/types.ts` has no linkage |
| F9 inscribed-square divergence makes curves "geometrically wrong" | **Mechanism verified; severity overstated** | Each pane stays internally correct; what breaks is cross-pane commensurability — which is the pedagogical payload, so the fix stands (§1) |
| F10 embed shows the right model | **Verified** | `am-embed-row`, two equal flex panes |
| F11 Correspondence is different | **Verified & endorsed** | Independent `mandelView`/`juliaView` by design |

Plus the audit-table slip: Plane Transform has no shipped morph (§1 note).

---

## Verdict

**Endorse, with corrections.** The plan's central insight — that all three reported gaps stem from "every control lives in a dismissible panel, and no two views can be bound" — is correct, and the proposed vocabulary (strip = app transport, hint = gesture invitation, HUD = view manipulation, panes = metrically-linked pair) is a clean, closed extension that keeps the 11 archetypes intact. The work order (bug fix first, strip second, split third) matches pedagogical priority.

**Endorsed as-is:**
- P4a (panels above fullscreen + staged Esc) — a bug fix that also restores the compare-loop (fullscreen + change function) central to how these apps teach.
- P1's projection constraint (strip ⊆ existing drive/playback panel) and the per-app optionality (Complex Particles gets no strip).
- P5's equal, non-negotiable 50/50 split — equal inscribed squares are the invariant that makes the two-plane picture truthful; do **not** add the floated draggable divider.
- F11: Correspondence stays two windows; linkage-by-parameter ≠ linkage-by-scale.
- Stable Matching's "play" over a precomputed log is honest; no reframing needed.

**Concerns / required corrections before implementation:**
1. **Fix the Correspondence audit row and the P2 hint copy** — clicking does *not* pick c today (it's gated behind the Seed panel's arm button). Preferably remove the gate (tap-to-pick always on; tap is already gesture-disambiguated) so the hint "tap to choose c" becomes true; otherwise word the hint around the arming.
2. **Reword F9**: mismatched panes are *incommensurable*, not internally wrong — the doc's claim as written will fail review by anyone who traces `CurveSvg`. The fix is equally justified under the precise wording, because the cross-pane comparison is the content.
3. **Correct the audit's Plane Transform "morph"** — no morph ships; and note that a future morph (a real `motion` panel) is the natural sequel to P5, not a substitute for it.
4. P1 spec should state that strip actions may be **contextual** (Stable Matching's strip must follow the GS-run ↔ RVV-replay switch), that **Step is first-class** beside Play for algorithm apps, and that phone strips show **labels**, not bare glyphs.
5. P4 should say one sentence about the **? explainer** in fullscreen.

**What I would change/add (small):**
- Title the merged window `z ↦ f(z)`; pane labels `z — domain` / `w = f(z) — image` (avoid "range").
- Hints should be math-anchored verbs ("draw on the z-plane — watch f bend it"), and the Plane Transform hint should arm draw mode itself rather than naming a buried toggle.
- No auto-stepping on phone first-run; a one-time pulse on the primary strip action at most.
- Ledger items for later: optional independent output extent ("fit image") for Plane Transform as a *labeled* break of shared scale; Correspondence zoom-lock toggle (already noted in the plan).

## Self-reflection

1. **What would you do with another session?** Verify the remaining apps I sampled only via the plan's audit table (StableMarriage, AgenticSorting, Trinary, PolygonWorlds default layouts and in-view affordances), and prototype the Correspondence ungated tap-to-pick to confirm the tap/drag disambiguation threshold in `useViewportGestures` doesn't produce accidental picks during fast pans.
2. **What would you change about what you produced?** The §2 watching-vs-doing table compresses Trinary to one row; the Observatory/Lab mode split probably deserves per-mode strip analysis. I also asserted phone-stacked panes keep equal inscribed squares by reasoning rather than by reading the (not-yet-written) P5 CSS — it's a constraint on the implementation, not a verified fact.
3. **What were you not asked that you think is important?** Whether `ViewDef.hint` should be string-only — a hint that can *perform* its action on tap (hint-as-button) is materially better for Plane Transform's draw mode and Fractals' trace mode, and the type as proposed (`hint?: string`) forecloses it.
4. **What did we both overlook?** Keyboard access to the action strip (the walkers already guard form-control focus; strip buttons will become new focusable elements inside the stage tab order, and Space-to-toggle-play vs Space-to-write-on-wall in TopologyWalk could collide if the strip ever takes focus by default). Also `prefers-reduced-motion` for any pulse/hint animation.
5. **What did you find difficult?** Adjudicating F9's "geometrically wrong" — the claim is wrong at the layer it names (in-pane rendering) but right at the layer that matters (cross-pane inference), and saying both clearly without seeming to either rubber-stamp or torpedo P5 took care.
6. **What would have made this task easier?** Line-number anchors in CHROME-REVIEW's audit table for the per-app "Desktop default / In-view affordance" cells — the two cells that turned out to contain errors (Correspondence "click works", Plane Transform "morph") were exactly the unanchored ones.
7. **Follow-up value:** **MEDIUM** — the analysis is grounded in verified code for every load-bearing claim, but two recommendations (ungated tap-to-pick; phone pane stacking) rest on reasoning that a quick prototype or the other two hats could stress-test.

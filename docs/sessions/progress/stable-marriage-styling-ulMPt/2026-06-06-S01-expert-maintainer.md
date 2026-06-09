---
kind: three-hats
session: 2026-06-06-S01
date: 2026-06-06
title: Three Hats — Framework Maintainer (Stable Marriage)
branch: claude/stable-marriage-styling-ulMPt
slug: stable-marriage-styling-ulMPt
status: completed
build: unknown
followup: null
pr: null
---

# Three Hats — Framework Maintainer (Stable Marriage)

## Scope & method

I reviewed the four subject files as-is — `StableMarriage.tsx` (1243 lines), `stableMarriage.css` (752 lines), `EXPLAINER.md`, `README.md` — against the framework contract in `CLAUDE.md`, the integration API in `components/AppShell.tsx`, the shared primitives in `components/ControlPanel.tsx`, and the closest peer lab, `AgenticSorting`. I also skimmed `Correspondence/PlaybackFloater.css` for the project's "advanced effects" vocabulary (backdrop-filter glass, draggable floaters). I did not run `npm run build`; this is a static read, so I flag the one place where I am uncertain about a compile-level concern.

My lens is institutional. I care whether this app understands *why* the framework is shaped the way it is, whether it repeats abandoned patterns, whether it is safe to merge alongside the other in-flight branches, and whether the code is healthier or messier than the surrounding corpus. I am skeptical of cleverness that no app needs and biased toward working code.

## Verdict up front

This is a **competent, self-contained DOM/CSS lab that conforms to the framework where it matters and is parallel-branch safe**. It correctly uses `useAppHeader` + `useAppExplainer`, ships both markdown files, scopes all CSS under `.sm-*`, and touches no shared files in its own folder. The Gale–Shapley core is essentially correct, with one subtle modeling caveat worth a sentence in the explainer. The biggest gaps are: (1) it **hand-rolls its entire control/action surface inside the canvas** instead of using `ShellSettings`/`ShellActions` — defensible by peer precedent but a real divergence from the bar/drawer model; (2) it **persists nothing** despite `usePersistentState` being the documented norm; and (3) the styling, while clean, is a notch below the "advanced effects" peers and duplicates a fair amount of chrome the framework already supplies. None of this blocks a merge. See the prioritized list in the [Verdict](#verdict) section.

## Framework / AppShell conformance

### What it does right

- **Header + explainer hooks.** `useAppHeader('Stable Marriage')` and `useAppExplainer(explainerText)` at `StableMarriage.tsx:519–520` are exactly the contract. The explainer is imported via `./EXPLAINER.md?raw` (line 24), matching the documented convention and the peer.
- **Self-contained folder.** Everything lives under `src/animations/StableMarriage/`; the component imports only from `../../components/AppShell` and its own CSS. No edits to other apps' code. This is the single most important parallel-branch property and it holds.
- **CSS namespacing.** Every selector is prefixed `.sm-*` (or scoped under `.sm-app`, e.g. the token block at `stableMarriage.css:6–31`), so it cannot leak into the shell or a sibling app. The peer uses an `.as-*` prefix the same way. Good hygiene.
- **It does not fight the shell.** The inline header at `StableMarriage.tsx:1182–1198` deliberately omits the app name (the comment at 1183–1184 shows the author understood the name lives in the bar) and keeps only a subtitle + mode toggle. That awareness is exactly what I want to see.

### The divergence: hand-rolled UI vs ShellSettings / ShellActions

The framework's whole reason for existing is that apps render controls into the **Settings** and **Actions** drawer tabs (and the `ActionFloater`) via `` / `` portals (`AppShell.tsx:270–302`), built from the shared `ControlPanel` primitives (`Section`, `Slider`, `Pills`, `Select`, `Checkbox`). StableMarriage uses **none** of them. Its "Visualizer Controls", play/step/finish/reset actions, and lab controls are all hand-built ``, custom ``, and custom `` components rendered inline in the canvas (`StableMarriage.tsx:859–952`, `1087–1133`).

> [!NOTE]
> **Context** This is **not unprecedented**. The closest peer, `AgenticSorting`, does the same: it imports only `useAppHeader` + `useAppExplainer` (verified — `AgenticSorting.tsx:6` is its only AppShell import; no `Shell*` reference) and renders its own sidebar of cards. The grep confirms which apps *do* use the portals: ComplexParticles, PlaneTransform, the Trinary trio, TopologyWalk, FractalsGPU, Correspondence — i.e. the 3D/2D viewers, where the shell chrome is the only UI surface. The two CSS/DOM labs both opted out. So the maintainer-honest read is: *the DOM labs have established their own sub-convention of an in-canvas control panel.* StableMarriage follows the peer, not the headline framework.

> [!WARNING]
> **Concern** The cost is real, even if precedented. With a hand-rolled surface: (a) the bar's **▶ Actions** button stays dim and the Actions/Settings drawer reads "No actions for this view" / "No settings for this view" — a user who opens the drawer (the framework's primary affordance) finds nothing, which is mildly confusing; (b) the app reimplements buttons, sliders, number inputs, a collapsible-section feel, and tab styling that `ControlPanel.css` + `ControlPanel.tsx` already provide, including the touch-friendly range thumbs at `stableMarriage.css:733–748` that duplicate the peer's and the primitives'; (c) it can drift visually from the rest of the suite. I would *not* demand a rewrite — the peer precedent makes that an over-correction — but the framework would be healthier if at least the transport controls (Play/Step/Finish/Reset) lived in `ShellActions` so the bar button lights up and the floater works. That is the single highest-leverage conformance change.

| Contract | Status | Reference |
| --- | --- | --- |
| `useAppHeader` | yes | tsx:519 |
| `useAppExplainer` + `EXPLAINER.md?raw` | yes | tsx:24,520 |
| `README.md` shipped | yes (but unrendered — see below) | README.md |
| `ShellSettings` / `ShellActions` | not used | peer parity w/ AgenticSorting |
| `ControlPanel` primitives | not used | hand-rolled, tsx:259–280 |
| `usePersistentState` for settings | not used | plain `useState` throughout |
| Self-contained folder / no shared-file edits | yes | — |
| CSS namespaced | yes | `.sm-*` |

### README.md is shipped but never rendered

The app ships a `README.md` (the longer "About" write-up), but nothing imports it. `ParticleViewerShell` viewers render their README automatically; custom apps render it if they choose. StableMarriage chose not to — the longer description is dead content. Either wire it into an About surface or fold its one extra sentence into the EXPLAINER and drop the file. As-is it is the kind of orphan the tech-debt list warns about (cf. the "Orphaned utilities" item in `CLAUDE.md`).

## Persistence (the missing usePersistentState)

`CLAUDE.md` is explicit: "*Persisted settings: `usePersistentState` … is a drop-in `useState` that mirrors to localStorage … so a user's controls survive a reload.*" StableMarriage uses plain `useState` for every setting: `n`, `corrMen`, `corrWomen`, `bias`, `speed`, `sortByPopularity`, `appMode`, and the lab knobs (`StableMarriage.tsx:521–549`). On reload everything resets to defaults.

> [!IMPORTANT]
> **Recommendation** These are textbook *settings* (not transient view state), so they should be `usePersistentState('stable-marriage:n', 20)` etc. This is a small, mechanical, low-risk change and a clear framework-norm gap. (To be fair, AgenticSorting also doesn't persist — the grep shows no `usePersistentState` in any animation file — so this is a corpus-wide soft spot, not a StableMarriage-specific sin. But "the peer also skipped it" is not a reason to keep skipping it.)

## Gale–Shapley correctness

There are two simulators: the interactive stepper (`stepSimulation`, `tsx:593–678`) and the headless batch runner for the lab (`runHeadlessSimulation`, `tsx:134–253`). They implement the *same* algorithm twice — a duplication concern I return to below — and both are essentially correct deferred-acceptance with a twist.

### The "mixed proposer" model is non-standard but internally consistent

Classic Gale–Shapley has one fixed proposing side. This app lets *both* sides propose, choosing each round's proposer by a `bias` coin flip (`tsx:620–642`). A man holds a `menNextProposal` cursor and proposes down his own list; a woman does the symmetric thing. Acceptance is the standard "receiver keeps whoever they prefer" test (`tsx:647–664`). This is a legitimate generalization and it still converges and still produces a stable matching *at termination* — the receiver-improvement invariant holds regardless of which side proposes, because a receiver only ever trades up.

> [!NOTE]
> **Subtlety worth one sentence** The classic **proposer-optimality theorem** (every proposer gets their best stable partner) is a property of the *single-side* algorithm. The EXPLAINER states it flatly under "Proposer advantage." With a *mixed*-proposer process the matching reached is still stable but is **not** guaranteed to be the proposer-optimal one for either side — the outcome depends on the random proposal order. The Asker-vs-Asked averages the app shows are an empirical statistical effect (askers tend to do better), which is fine and pedagogically nice, but the explainer's phrasing ("every proposer gets the best partner they could have in any stable matching") is the textbook theorem applied to a non-textbook process. I'd soften it to "the side that proposes tends to do better" to stay honest. This is a math-pedagogy nit; flagging it for the pedagogy hat.

### Stability verification is correct

`verifyStability` (`tsx:99–132`) does an O(n²) blocking-pair scan using `indexOf` rank lookups, treating an unmatched partner as rank +∞ so a single person plus anyone they both prefer counts as blocking. The completion path calls it and surfaces the count (`tsx:582–591`, banner at `tsx:1024–1038`). For a fully completed run this will correctly report zero. Logic is sound.

### Termination guards

Both runners cap iterations at `n*n*5` (`tsx:142`, `tsx:700`), and the interactive path also treats `Object.keys(currentMatches).length >= n*2` as complete (`tsx:671`). The `n*n*5` bound is generous-enough heuristic insurance rather than a tight theoretical bound, which is the pragmatic right call here. One minor smell: `completeSimulation` can be reached via two distinct branches (the "no valid proposers" branch at 614–618 and the "everyone matched" branch at 671–675); both are correct, but the dual exit makes the state machine slightly harder to read.

### Performance footnote

Rank lookups use `Array.prototype.indexOf` on preference lists everywhere (`tsx:117–122`, `198–199`, `656–657`, `765`, …). That makes each acceptance test O(n) and the lab's per-cell simulation effectively O(n³)-ish; with the default lab of `n=50` at resolution 20 (400 cells) it is fine, but a precomputed inverse-rank table (`menRank[m][w]`) would be the standard fix and would make the lab snappier at higher resolutions. Not a bug — a known, acceptable shortcut.

## Architecture & maintainability

### One 1243-line file, two apps, duplicated engine

The file is a single component hosting two distinct experiences (Visualizer and Lab) plus four presentational sub-components (`Card`, `Button`, `PersonRow`, `Heatmap`, `DistributionChart`) plus two copies of the matching engine (`stepSimulation` and `runHeadlessSimulation`). `CLAUDE.md`'s "Anatomy of an app" explicitly encourages pulling simulation logic into helper `.ts` modules ("e.g. `physics.ts` + `presets.ts`"), and the Trinary app's `lib/nbody` is the in-repo model. Here the algorithm lives inline and is written twice.

> [!IMPORTANT]
> **Recommendation** Extract a single `galeShapley.ts` (preference generation + one step function + headless runner + stability check) and have both the stepper and the lab consume it. That removes the most dangerous maintenance hazard in the file: the two engines can silently diverge, and a future bug-fix to one will be missed in the other. The `Heatmap` and `DistributionChart` components could also move to their own files, but that is cosmetic next to the engine duplication.

### Custom Card / Button reinvent ControlPanel + AppShell idioms

The local `Card` (`tsx:255–257`) and `Button` (`tsx:259–280`) duplicate styling that the shared primitives and the shell chrome already carry. This is the same "near-identical viewer" smell the project already paid down once when it consolidated the three complex viewers into `lib/particles` — I'd rather not see the DOM labs grow a parallel, un-shared mini-design-system. If AgenticSorting and StableMarriage both ship their own `Card`/`Button`/slider CSS, that is a future consolidation target, not net-new shared code today.

### Imperative refs mirroring state

The four mirror refs (`matchesRef`, `nextProposalRef`, `statusRef`, `dataRef`, synced in the effects at `tsx:551–565`) exist so the `setInterval` callback can read fresh values without re-subscribing. This is a legitimate React pattern for an rAF/interval loop and the cleanup (`tsx:708–736`) is correct (interval cleared on status change *and* on unmount). It is, however, the kind of state-duplication that is easy to get wrong; it reads fine here but adds cognitive load. No change required.

### Minor correctness/robustness nits

- **NaN on empty number input.** The population field does `Number.parseInt(e.target.value, 10)` inside `Math.max(4, …)` (`tsx:869`); clearing the field yields `NaN`, and `Math.max(4, NaN)` is `NaN`, which would feed `NaN` into `n`. The shared `ControlPanel.NumberInput` (`ControlPanel.tsx:198–236`) exists precisely to handle this (commit-on-blur, revert on unparseable). Another argument for using the primitive.
- **In-place sort of a fresh array.** `orderedMen`/`orderedWomen` (`tsx:804–816`) sort an array created that render, so no external mutation — fine, but worth a comment.
- **Heatmap object key collision guard.** The cell key ``${point.x}-${point.y}-${index}`` (`tsx:402`) leans on `index` to stay unique, which is correct but suggests x/y aren't reliably unique keys on their own.

## Styling gap vs the other labs

The brief asks specifically about the "styling gap vs other labs (advanced visual effects, transitions, polish)." My read: **the CSS is clean, well-tokenized, and genuinely responsive, but it is plainer than the project's showpieces and slightly out of step with the shell's palette.**

- **Good:** a proper token block (`--sm-bg` … `--sm-shadow`, `stableMarriage.css:6–31`), semantic accent colors documented in the header comment, and a thorough mobile pass (`@media` blocks at 680–749) including touch-sized range thumbs. Transitions exist on the meaningful elements — person nodes scale/glow on active/target (`271, 287–297`), heatmap cells brighten on hover (`614–619`), distribution tooltips fade (`500–517`). This is solid, not neglected.
- **Below the bar set by peers:** the "advanced effects" the prompt points at — `backdrop-filter: blur()` glass panels, draggable floaters with collapse states — live in `PlaybackFloater.css`/`PlaneCurveFloater.css` (e.g. the glass panel at `PlaybackFloater.css:13–19`). StableMarriage has none of that because it has no floater (it doesn't use the Actions surface). Its surfaces are flat opaque cards with a single box-shadow. That is the visible "gap": it looks like a tidy dashboard, not like the rest of the animath suite.
- **Palette drift.** The CSS comment claims it is "matched to the AppShell chrome," but the tokens are an independent dark theme (`#0c0c10` background) and the primary button is hard-coded `#2563eb` (`112`), not a shell variable. AgenticSorting uses a different dark palette again (`#020617`). Each lab has invented its own near-but- not-identical dark theme. From a steward's chair this is the slow accretion of inconsistency the framework was meant to prevent.
- **Animation polish:** matches "pop" via a border/background swap with no enter transition (a node going from unmatched → matched changes instantly; only the active/target scale is animated). A subtle transition on `.sm-person-matched` and a drawn "proposal line" between proposer and target would close most of the perceived polish gap without new dependencies. The Asker/Asked "A"/"R" badges (`tsx:330–333`) are a nice touch already.

> [!NOTE]
> **Maintainer's caution** I'd resist the temptation to chase "advanced effects" for their own sake. The right styling work here is *convergence* — move the transport controls into `ShellActions` so the app inherits the shared floater/glass treatment for free, and align the palette to the shell — not a bespoke particle-shader-grade effect that this DOM lab doesn't need. Polish that comes from using the framework is durable; polish that comes from a one-off CSS flourish is the next session's debt.

## Parallel-branch & operational safety

- **Append-only shared files:** the app already exists in `apps.ts` and `index.tsx` (it's a shipped route), so this styling branch should be editing only files inside `src/animations/StableMarriage/`. Nothing in the four subject files touches a shared file. safe
- **No new dependencies:** imports are React + `lucide-react` (already a project dep) + own CSS/MD. No bundle-size or supply-chain surprise.
- **No asset paths:** the app loads no public assets, so the `import.meta.env.BASE_URL` / `/animath/` base concern doesn't apply here.
- **Build:** I did not run `tsc && vite build`. Reading the types, I see no obvious compile error — but the *only* CI gate is the build, so whoever finalizes must run it. One thing to watch: `HeatmapPoint` spreads `...metrics` after setting `diff`/`askerDiff` (`tsx:837–843`); the field order is fine and the spread doesn't overwrite them, but confirm the build is clean before merge. verify build

## Verdict

### Endorse

- Self-contained, namespaced, parallel-branch-safe. This is a good framework citizen on the dimensions that protect the rest of the suite.
- Correct header/explainer integration and a genuinely good, well-written EXPLAINER.
- A sound (if non-standard mixed-proposer) Gale–Shapley implementation with a correct stability check and reasonable termination guards.
- Clean, tokenized, responsive CSS with real mobile and touch handling.

### Concerns

- Hand-rolled UI bypasses `ShellSettings`/`ShellActions` and the `ControlPanel` primitives, leaving the bar's Actions button dim and the drawer empty. Precedented by AgenticSorting, but still a divergence from the headline model.
- No persistence despite `usePersistentState` being the documented norm.
- The matching engine is duplicated (stepper vs headless) — a real divergence hazard.
- Bespoke per-lab dark palette + flat cards leave it looking a notch below the floater/glass peers and subtly out of step with the shell.
- Shipped-but-unrendered `README.md`; an empty-input `NaN` edge in the population field.

### What I would change (prioritized)

1. **Extract the engine to one `.ts` module** consumed by both the stepper and the lab. Highest maintainability payoff; kills the divergence hazard.
2. **Move the transport controls (Play/Step/Finish/Reset) into `ShellActions`** and the knobs into `ShellSettings` using `ControlPanel` primitives. Lights up the bar, gets the floater + glass treatment for free, and is the real fix for the "styling gap."
3. **Adopt `usePersistentState`** for n / consensus / bias / speed / sort / appMode / lab knobs. Mechanical, low-risk, on-spec.
4. **Align the palette to the shell** (use shell variables / a shared dark token set) rather than a private theme; resolve the comment that claims it already matches.
5. **Soften the proposer-optimality claim** in the EXPLAINER to reflect the mixed-proposer process; either render `README.md` or fold it in and delete it.
6. *Nice-to-have:* precompute inverse-rank tables (drop `indexOf`), add a matched-state enter transition / proposal line, fix the population-field `NaN` edge.

Net: **mergeable as a working app**; the framework-conformance items (1–3) are what I'd want addressed before I'd hold it up as an exemplar of the pattern.

## Self-reflection

1. **What would you do with another session?** Run `npm run build` and actually exercise the app in the browser — several of my UI claims (dim Actions button, empty drawer, instant match pop) are inferred from the code, not observed. I'd also diff this CSS against AgenticSorting's token set to quantify the "each lab invents its own palette" claim precisely.
2. **What would you change about what you produced?** I leaned on peer precedent (AgenticSorting also opts out of the portals) to soften the conformance criticism; a stricter reviewer might say both labs are wrong and the precedent is itself debt. I chose the pragmatic read but flagged both views.
3. **What were you not asked that you think is important?** Whether the DOM-lab "in-canvas control panel" should become a *sanctioned* sub-pattern in CLAUDE.md (with a shared component) or be migrated to the portals. Two apps doing the same off-spec thing is the moment to decide, not ignore.
4. **What did we both overlook?** Accessibility: the heatmap is mouse/hover-driven with click-to-pin but no keyboard path, and the custom controls lack the ARIA the shell primitives would supply. The brief's "polish" framing didn't surface a11y and I nearly missed it.
5. **What did you find difficult?** Judging the "styling gap" fairly without running the app — CSS reads tidy on paper, but perceived polish is a runtime property. I bounded my claims to what the source supports.
6. **What would have made this task easier?** A screenshot or a live preview URL, and a one-line statement of whether the DOM-lab in-canvas-panel pattern is considered sanctioned.
7. **Follow-up value:** MEDIUM — conclusions are sound from a static read, but a build + browser pass would confirm the UX claims and let me prioritize the styling work concretely.

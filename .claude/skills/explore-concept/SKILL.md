---
name: explore-concept
description: "Explore a mathematical concept from many independent perspectives — history/originator, genetic build-up, natural & applied appearances, reframings, geometric essence, framework fit — then synthesize into 2-4 candidate animath app concepts and a draft build plan. Invoke before designing a new app, when the user or an agent asks to explore/scope a concept (e.g. /explore-concept quaternions) — do not auto-invoke spontaneously."
argument-hint: "<a math concept to explore — e.g. quaternions>"
---

# Explore a Concept

The **divergent gathering phase** that comes *before* designing a new animath app.
Given a mathematical concept, gather a wide, genuinely independent set of
perspectives on it, then converge to **2–4 candidate app concepts** scored for
animath, recommend one, and draft its build plan. The pipeline this skill opens:

> **explore-concept** (diverge → candidates → draft plan) → **/three-hats**
> (stress-test the chosen plan) → **BUILDING_AN_APP.md** (build).

The whole skill is filtered through one animath-specific question: *what is the
single best first visualization to build here?* A concept can be explored a
hundred ways; we want the one or two that land in the framework's sweet spot
(3D/4D particle viewers via `lib/particles`, 2D shader viewers, CSS/DOM
algorithm visualizers, the draggable-window workspace) **and** carry the most
pedagogical payoff.

## Input

The user provides: `$ARGUMENTS` — the concept to explore (e.g. `quaternions`,
`the Fourier transform`, `Gaussian curvature`). A bare concept name is fine; this
skill's job is to widen it. If the argument is empty, ask the user for the
concept in one line before proceeding.

## Output Files

**Every agent writes its complete output to a file.** Nothing is lost to context.

Resolve the **branch slug** first: `git branch --show-current`, strip a leading
`claude/`, replace `/` with `-`. All outputs go in that branch's progress folder,
matching the current session. Get the `YYYY-MM-DD-SNN` identifier from the most
recent file in `docs/sessions/progress/<branch-slug>/`; if there is no progress
report yet, use today's date with `S01`. Write these files (`{id}` = that
identifier):

- `docs/sessions/progress/<branch-slug>/{id}-concept-foundation.md` — Phase 1 research base
- `docs/sessions/progress/<branch-slug>/{id}-lens-originator.md` — The Originator
- `docs/sessions/progress/<branch-slug>/{id}-lens-foundations.md` — Foundations
- `docs/sessions/progress/<branch-slug>/{id}-lens-in-the-wild.md` — In the Wild
- `docs/sessions/progress/<branch-slug>/{id}-lens-new-light.md` — New Light
- `docs/sessions/progress/<branch-slug>/{id}-lens-geometer.md` — The Geometer
- `docs/sessions/progress/<branch-slug>/{id}-lens-builder.md` — The Builder
- `docs/sessions/progress/<branch-slug>/{id}-concept-plan.md` — Synthesis + candidates + draft build plan (`kind: plan`)

Each file is **Markdown + YAML frontmatter** per `docs/sessions/REPORT_STYLE.md`:
frontmatter (`kind`, `session`, `date`, `title`, `branch`, `slug`, `status`,
`build`), then `##` sections, GitHub-alert callouts (`> [!IMPORTANT]` etc.) and
Markdown tables. They read on GitHub as-is and `npm run sessions` renders them to
the rich HTML view.

## Phase 1 — Foundation (deep research)

Build a cited, fact-checked evidence base **first**, so every perspective downstream
argues from the same facts rather than from model memory. Invoke the **`deep-research`
skill** (via the Skill tool) with a prompt assembled from the concept and the lenses
below, scoped tightly enough that it does not need to ask clarifying questions —
something like:

> Research **<concept>** for the purpose of designing an educational, interactive
> visualization. Cover, with sources: (1) **history & originator** — who introduced
> it, when, what problem they were actually trying to solve, and the key moment/insight;
> (2) **genetic origin** — how it emerges from simpler, well-understood ideas;
> (3) **natural & applied appearances** — where it shows up in physics, engineering,
> nature, or other math; (4) **the standard visual representations** people use to
> teach it, and which reveal vs. obscure the structure; (5) **canonical learner
> confusions / pitfalls**. Prefer authoritative sources.

Capture the result into `{id}-concept-foundation.md` (frontmatter `kind: research`).
If the `deep-research` skill is unavailable, do a lighter targeted web pass (WebSearch
+ WebFetch) covering the same five points and write the same file. This foundation
file is passed verbatim to every Phase 2 agent.

Also do a quick **codebase prior-art scan** (for the Builder lens and the synthesis):
note what already exists that a new app could lean on — e.g. `src/math/quat4.ts`,
`src/controls/QuarterTurnControls`, the `src/lib/particles/` engine +
`ParticleViewerShell`, the 4D projection modes, `lib/colormaps.ts`, the CSS/DOM app
pattern — and skim `docs/BUILDING_AN_APP.md` and the closed archetype vocabulary
(`src/chrome/workspace/archetypes.ts`).

## Phase 2 — Perspectives (parallel lenses)

Launch the six lens agents **in parallel** using the Agent tool (subagent_type:
"general-purpose"). Each agent receives: (1) the concept; (2) the **full text** of
`{id}-concept-foundation.md`; (3) its role below; (4) instruction to write a focused
**150–300 line** analysis to its designated output file as Markdown + YAML
frontmatter (`kind: lens`), opening — right after the H1 — with a collapsible
`<details><summary>Concept under exploration</summary> … </details>` block naming
the concept, then the analysis as `##` sections; (5) instruction to end with a
**Takeaways for a visualization** section — the 2–3 things *this lens* says the app
must show or let the user do; (6) the **Self-Reflection Protocol**
(`.claude/prompts/self-reflection.md`), appended as a `## Self-reflection` section.

### Lens 1: The Originator (first-person)

> You **are** the mathematician who originated <concept> (identify them from the
> foundation research). Write substantially **in the first person, in their voice and
> era**: what problem obsessed you, what you tried that failed, the insight that broke
> it open, and — crucially — **the visualization you wish you'd had**: the picture or
> interactive scene that would have made the idea obvious to you and to your
> contemporaries. Be historically faithful (use the foundation's facts) but vivid.
> Your gift to the app is *motivation* and a *narrative spine*.

### Lens 2: Foundations (genetic build-up)

> You are a teacher who never introduces an idea before its prerequisites. Trace how
> <concept> **grows from simpler ideas the audience already owns** — the minimal chain
> of familiar concepts that makes it feel inevitable rather than arbitrary. Identify
> the single best **on-ramp**: the prior concept the app should open from, and the one
> move that turns it into the new idea. Your gift is the app's *starting point*.

### Lens 3: In the Wild (natural & applied)

> You are an applied scientist. Catalog where <concept> **actually shows up** — in
> physics, engineering, computer graphics, biology, other mathematics, everyday
> phenomena. Pick the **most visceral, recognizable** appearances (the ones a learner
> already has intuition for). Your gift is concrete *hooks* and an honest answer to
> "why should I care?"

### Lens 4: New Light (reframing)

> You are the mathematician who loves saying "that's just ___ in disguise." Show
> <concept> as **a new view of a well-understood concept** — the reframing that
> collapses apparent complexity (e.g. rotations as multiplication, a transform as a
> change of basis). Identify the single most clarifying re-description. Your gift is
> the *aha* that reorganizes everything.

### Lens 5: The Geometer (visual essence + traps)

> You are a geometer and visualizer. Strip <concept> to **the picture**: what *moves*,
> what stays *invariant*, what the *surprising image* is. Then name the **canonical
> learner confusions** the picture must make tangible (not hide) — the things people
> get wrong. Your gift is the *essential scene* and the misconceptions the app must
> resolve.

### Lens 6: The Builder (animath framework fit)

> You are the animath framework engineer (you know `CLAUDE.md`, `BUILDING_AN_APP.md`,
> the `lib/particles` engine + `ParticleViewerShell`, the 2D shader viewers, the
> CSS/DOM apps, the closed 11-archetype panel vocabulary, the `<Workspace>` contract,
> and the existing quaternion/4D machinery). For the kinds of pictures the other
> lenses imply, assess **what animath can render well and cheaply** vs. what would
> fight the framework. Cite concrete prior art to reuse and realistic build cost. Your
> gift is *feasibility* — the filter that keeps candidates buildable.

## Phase 3 — Synthesis: candidates + draft build plan

After all six lenses return, read every file and write
`{id}-concept-plan.md` (frontmatter `kind: plan`, `status: proposed`). It opens with
the collapsible `Concept under exploration` block, then:

1. **Synthesis of perspectives** — what the six lenses converge on; the tensions
   (e.g. the most beautiful picture vs. the most buildable one); blind spots.
2. **Candidate app concepts** — **2–4** distinct concepts, each a short pitch (what
   you see, what you do, what it teaches) scored in a Markdown table on three axes:
   **framework fit** · **pedagogical payoff** · **visual appeal** (each Low/Med/High,
   with a one-line justification).
3. **Recommendation** — the single best first course of action, and why.
4. **Draft build plan for the recommendation** — concrete enough to hand to
   `BUILDING_AN_APP.md`: the engine to build on; the **`SectionDef[]` panels** (each
   tagged with an archetype from the closed vocabulary); the **`ViewDef[]` view(s)**;
   the **default / on-ramp view** (the most illuminating first frame); the
   **explainer angle**, ideally using the Originator's framing for the `?` text; the
   route/registry edits (`index.tsx`, `apps.ts`, `catalog.ts`); and the honest
   caveats the Geometer flagged (what the picture distorts or approximates).
5. **Next steps** — recommend running `/three-hats <path to this plan>` to
   stress-test before building.

End the plan with the **Self-Reflection Protocol** as a `## Self-reflection` section.

## After Synthesis

Present a condensed summary in the conversation: the recommended concept and the
runner-up, the scoring at a glance, and the one-paragraph build plan — with pointers
to the full files. Then **stop and let the user choose** the direction before any
implementation; offer `/three-hats` on the plan as the natural next step.

## Rules

- This is **exploration and planning only** — do **not** write app code or edit the
  registry during this skill. The deliverable is the plan.
- Keep the perspectives genuinely independent: each lens agent argues its own view;
  reconciliation happens only in the synthesis.
- Update the session progress report after each phase transition (Phase 1 done,
  agents dispatched, synthesis written) per the progress-report rule.
- Commit and push the new report files when the skill completes.

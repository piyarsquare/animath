# Three possible futures for AniMath

October 21, 2026. Decision brief, not an adopted roadmap.

AniMath could become **a living mathematics notebook**, **a garden of connected instruments**, or **a visual mathematics workbench**. Each preserves its strongest existing idea: let someone change a mathematical object and follow what happens across representations. They differ in what organizes the experience: a question, a place to explore, or a task to perform.

My recommendation is the **garden**, with short notebook walks into its instruments. This extends the Number Planes direction without requiring every app to become a chapter. Keep workbench capabilities local until a concrete investigation needs them. This is a recommendation for Dan to consider, not a decision he has made.

## What the existing work teaches

The reviewed catalog describes AniMath as a modular browser toolkit and records Dan's direction: “Everything there could use a better vision or way of envisioning.” Its area labels distinguish code that is present from outcomes that were recorded. They do not establish that an experience teaches well. The catalog and source do not settle the intended audience or which future Dan prefers.

| Source examined | What is there | Lesson about showing information flow |
|---|---|---|
| [Number Planes notebook, PR #246](https://github.com/piyarsquare/animath/pull/246) | A cover, three chapters, cards, and a staged walk-in. Chapter II's `setP` updates one state and renders the multiplication view, labels, and related plates from it. | One intervention can explain several consequences. Keep symbols and the controlling quantity recognizable as the reader moves between equation, picture, and explanation. |
| [Journal and dual room, open PR #251](https://github.com/piyarsquare/animath/pull/251) | The journal gives questions a sequence. The dual room keeps a pocket dial reachable while its derivative plate compares centered difference, the dual slot, and complex step. `WALKS.md` proposes entry through senses, theorems, or tools. | A visitor can enter through a useful machine and discover its mathematics. Different routes can share the same instrument; chronology need not govern every visit. |
| [Complex Particles explainer](../src/animations/ComplexParticles/EXPLAINER.md) | Input and output form a 4D graph; projections, color, sampling, and render modes expose different aspects. A link carries the chosen function to Plane Transform. | Preserve the identity of the object across views, and disclose what each view retains or discards. A beautiful transition needs an explanation of its meaning. |

**Source boundaries matter.** GitHub reports #246 merged on July 16 into `number-plane-guide`, not `main`. #251 remains open against that same branch at `dd4586e187364932399f7cba0d679e6d08547aac`. Neither notebook source is present in this brief's starting main checkout. Read #246 at [its merge snapshot](https://github.com/piyarsquare/animath/blob/531bbe565840bc04c844917e8ccb01d7958183ce/public/number-planes/chapter-2.html), and #251 at the pinned [dual-room source](https://github.com/piyarsquare/animath/blob/dd4586e187364932399f7cba0d679e6d08547aac/public/number-planes/dual.html) and [walks document](https://github.com/piyarsquare/animath/blob/dd4586e187364932399f7cba0d679e6d08547aac/docs/design/notebook-handoff/WALKS.md). The PRs report browser checks and outstanding device checks; this brief inspected source and records, not those live interactions.

The dual-room implementation is a bounded demonstration: at zero it uses the selected function's manually supplied derivative (`F.df`) for each preset, rather than a general expression-evaluating autodiff engine. Its nearby estimators illustrate the relationship for the supplied functions. That is good material for explaining a tool, but not evidence that a general calculator is already built.

Complex Particles supplies a particularly useful honesty rule: Torus normalization loses overall size; Sphere collapses common-phase fibers; intermediate slider positions are visual morphs. The explainer also identifies clamps and incomplete branch families. AniMath should put these distinctions beside the relevant action, not rely only on a long explainer.

## 1. A living mathematics notebook

**Promise:** “Follow a question until you can change the answer yourself.” The primary audience is a curious reader who wants a guided encounter and may not know which tool to open.

Imagine opening “Does the number plane have to be complex?” Drag two numbers, switch addition to multiplication, then change `j² = p`. The next paragraph and adjacent plates help connect the changed product to the changed geometry. At a natural stopping point, open the full instrument with the same settings. An analogous complex-functions walk would carry one function from its plane map into its graph and explain each projection's losses.

Information flows from **question → controlled intervention → visible consequence → explanation → independent exploration**. The page exposes tools exactly where the question makes them useful. A chapter should still make sense when animation is paused.

**First slice:** author one short passage about one function, with two linked views, explicit input/output labels, and a handoff to the full app. State transfer beyond existing function links would be new work. A useful review would ask whether a reader can predict one change and then explain what they saw.

**Cost and risk:** relatively little new rendering machinery, but sustained mathematical and editorial attention. Linear pacing can crowd out wandering; text and controls can disagree if they duplicate state. This future makes authoring good passages a central project activity.

## 2. A garden of connected instruments

**Promise:** “Enter anywhere, find something worth manipulating, and discover what it connects to.” The audience includes returning explorers as well as people arriving through a short guided walk.

Imagine a Number Planes room with its dial always within reach. Multiplication, the level curve, and the derivative plate are neighboring instruments. A small route introduces the dual slot through a practical derivative question. Another route arrives through geometry. Elsewhere, Complex Particles and Plane Transform are neighboring views of the same function, with a clear explanation of what the move between them preserves.

Information flows from **object → several linked representations → neighboring question**, with optional walks providing sequence. Exploration is primarily nonlinear and re-enterable; the notebook vision instead makes an authored sequence the primary experience. The journal becomes one authored route through reusable exhibits. This develops the sculpture-garden frame already recorded in #251; it does not claim that all its proposed walks or missing instruments exist.

**First slice:** specify one three-stop route using existing instruments: multiplication, derivative, and graph/map correspondence. Mark a change of mathematical object explicitly at the boundary between number-system arithmetic and complex functions. Give each stop a question, its controlling state, a visible consequence, and an onward link. Prototype only the smallest missing connection after Dan chooses this direction.

**Cost and risk:** moderate navigation and state-handoff work; substantial curation. Attractive rooms can become an unstructured collection. A useful review would ask whether a visitor can explain why two stops belong together and return to the starting state without getting lost. Phone layouts need the essential control and consequence together, not a miniature desktop room.

## 3. A visual mathematics workbench

**Promise:** “Set up an investigation and keep enough of it to compare or repeat.” The audience is someone who already has a question: a teacher preparing an example, a programmer examining a derivative method, or an explorer testing a conjecture.

Imagine choosing a function and a sample point, comparing a map with its graph, labeling the projection, and saving the settings with a short observation. In the derivative instrument, compare the displayed estimate against its reference while changing the step. Return to the same case later. A record distinguishes the mathematical setup from camera, color, and rendering choices.

Information flows from **configured input → transformation → measurement or view → saved comparison**. Notebook passages become worked examples that open an investigation.

**First slice:** one reproducible complex-function comparison with two saved configurations, a visible state summary, and reset. Existing workspace layouts and persisted settings are useful foundations, but are not a complete portable experiment record. A useful review would ask whether another person can reconstruct the claimed comparison from the saved case.

**Cost and risk:** highest engineering commitment of the three: portable state, versioning, trustworthy readouts, and coordinated views. Rendering clamps and sampling artifacts could be mistaken for mathematical evidence. An attractive general workbench could consume effort before there is a specific investigation that needs it.

## The choice and a bounded next move

| If AniMath should primarily help people… | Lead with… | Main recurring investment |
|---|---|---|
| Understand a question through a crafted encounter | Living notebook | Exposition and pacing |
| Discover relationships by wandering and manipulating | Connected garden | Instruments, routes, and meaningful connections |
| Compare and repeat their own investigations | Visual workbench | State, measurements, and reproducibility |

These are qualitative tradeoffs, not measured effort estimates. The catalog's D25/C15/V50 estimates describe the task of sketching these visions, not the cost of implementing them.

I recommend **garden first, notebook walks as the way in**. It preserves the existing apps' independence, takes the recorded Number Planes frame seriously, and makes the graph/map connection a model for further connections. Its first deliverable would be one short route specification, not a gallery-wide redesign. Defer a general workbench until a real comparison exposes a specific missing capability.

The current architecture supports an incremental choice: [`src/index.tsx`](../src/index.tsx) owns routing, [`src/App.tsx`](../src/App.tsx) is the Complex Particles route component, and [`ARCHITECTURE.md`](../ARCHITECTURE.md) explicitly marks its older folder proposal as historical. None of these visions requires adopting that obsolete layout or replacing the shared workspace.

**Still for Dan:** Which vision, or mix of them, should AniMath grow toward? The sketches are complete; choosing a direction and implementing it are separate work. No roadmap priority or feature-branch merge is implied by this brief.

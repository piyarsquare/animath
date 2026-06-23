<!-- docs/sessions/RECIPES.md — the trigger-indexed cookbook.
================================================================================
WHY THIS FILE EXISTS. The promoted lessons in RECURRING_LESSONS.md are written as
*norms* ("verify visual claims", "test pure logic"). Norms are true but easy to
skim past in the moment. A RECIPE binds the same lesson to a recognizable TRIGGER
and a literal ACTION with a STOP condition, so when the trigger fires the next
step is unambiguous. Rules get ignored; recipes get followed.

Each recipe is the enacted form of a ledger entry — the `from Lx` tag points back
to RECURRING_LESSONS.md, where the diagnosis, frequency, and check status live.
Read this file at session start (it's wired into /start-session). When a lesson
recurs enough to promote (≥3×), add its recipe here, not just a rule.

KEEP RECIPES LITERAL. A good recipe names the trigger in words you'd recognize
mid-task, gives the exact command/step, and states when you're done. If you can't
write a clean trigger, it's a judgment call, not a recipe — leave it in the ledger
as a practice.
================================================================================
-->

# Recipes · animath

If-this-then-that cookbook for the habits that recur often enough to be worth
making reflexive. Each recipe is the enacted form of a
[recurring lesson](RECURRING_LESSONS.md); the `from Lx` tag links the diagnosis.

> **Use:** scan the **WHEN** lines. The moment one matches what you're about to do,
> run its **THEN** before moving on, and stop at **DONE WHEN**.

---

## R1 — Verify a visual change with your eyes &nbsp;<sub>(from [L1](RECURRING_LESSONS.md))</sub>

**WHEN** my diff changes anything rendered — geometry, a shader, CSS, layout,
decor, colors.

**THEN** before I claim it works:

```bash
npm run build && (npm run preview &) && sleep 3
node scripts/shoot.mjs '#/<route>' shot.png
```

…then **Read `shot.png`** and confirm the pixels match the intent.

**DONE WHEN** I've actually looked at the image. If the claim is about touch,
"feel", or real-device behavior that a headless shot can't show, set
`signals: visual-unverified` (or `phone-needed`) in the report and write "verified
headless only" in self-reflection Q7 — never let a visual claim ship as if checked.

---

## R2 — Separate exploring from guessing &nbsp;<sub>(from [L2](RECURRING_LESSONS.md))</sub>

**WHEN** the request is visual or multi-mode and building the full version costs
more than a few minutes. First tell the two cases apart:

- **Exploratory** — neither of us yet knows what the result should look like;
  building *is* the thinking. This is legitimate and often the fastest path —
  don't suppress it with up-front planning that "gets us nowhere." Build a small,
  cheap, *reversible* probe and show it.
- **Avoidable thrash** — the target *was* knowable (there's a reading I could have
  asked about, or a reference I could have matched) and I'm about to build the
  maximal or a guessed interpretation anyway.

**THEN** for the avoidable case, *before writing code*: state my reading plus the
maximal/minimal interpretations in one line, and either pick the obvious default
and say so, or ask **one** disambiguating `AskUserQuestion` — and ask for a
**reference in any modality** (image, sketch, an existing app to point at, a
gesture at a comparable), since a picture sharpens a request that prose can't.
For the exploratory case, keep the first build *small and reversible* so iterating
is cheap, and say plainly it's a probe to react to.

**DONE WHEN** I've either pinned a knowable target before committing, or shipped a
deliberately small probe and named it as one. The failure to avoid is the
*third* build/revert cycle on something a cheap reference would have settled —
not the honest first exploration. (Caveat from Dan, 2026-06-23: lots of planning
can get us nowhere, and the target is often only discoverable by building; the
lever is sharper inputs — other modalities — not more planning.)

---

## R3 — Make sure a green check is a *real* check &nbsp;<sub>(from [L3](RECURRING_LESSONS.md))</sub>

**WHEN** I'm about to cite a passing check — a test, invariant, or probe — as
evidence the feature works.

**THEN** ask: does this check observe the **user-visible result**, or a proxy?
(H₁/χ can match on a visually broken complex; a chirality probe can stay green on
a teleporting world.) If it's a proxy, say so and add or note the missing
observation.

**DONE WHEN** self-reflection Q7 names the verification method and flags any green
that only tests a proxy.

---

## R4 — Test extractable pure logic on write &nbsp;<sub>(from [L4](RECURRING_LESSONS.md))</sub>

**WHEN** I add or change a pure `.ts` helper — math, an engine, an algorithm — with
no DOM/WebGL in it (`physics.ts`, `complexOps.ts`, `associahedron.ts`, …).

**THEN** in the **same commit** add a `__tests__/*.test.ts` and run `npm test`.
Don't verify pure logic with a throwaway `/tmp` script — it never lands, so the
next session can't re-run the check. Don't unit-test the React/Three view; **do**
test the extractable math.

**DONE WHEN** `npm test` is green and the test is committed alongside the helper.

---

*Lessons still rule-only or intrinsic (L5 near-parallel copy, L6 read-before-estimate,
L7 orientation/chirality) live in [RECURRING_LESSONS.md](RECURRING_LESSONS.md);
they become recipes here once they have a clean enough trigger to enact.*

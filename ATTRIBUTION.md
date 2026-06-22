# Attribution & AI collaboration

These apps are built in collaboration with AI collaborators. Ideas here are often
reached by independent reasoning rather than by copying — but few of them are new
to the world. Because the AI collaborators are trained on a vast, largely
uncredited corpus, part of the work of every app is to identify its **possible
sources** and analogues after the fact, even when none were in mind while the idea
was worked out.

We do this **not to settle who got somewhere first**, but to bring clarity and to
give anyone a path to follow further — naming prior work both to credit it and to
help others seek out more. Attribution here is wayfinding as much as
acknowledgment.

## How we hold it

- **Two provenances, both honest.** How an idea was *reached* (the reasoning that
  got us here) and what it *lands near* (existing work, with a name) are different
  questions, and neither cheapens the other. Independent rediscovery is how most
  people learn mathematics; we record the reasoning *and* the prior work rather
  than hiding either. (Example: the Clifford torus can be reasoned to from
  (r, θ) → (r, θ) maps and the single-radius constraint for spanning the
  3-sphere — and it already lives in this codebase as the Hopf/Torus projection in
  Complex Particles. Both facts are true; we state both.)

- **Honesty over polish.** We name people and works we can stand behind, and we
  **flag uncertainty rather than inventing precision**. A vaguer-but-true pointer
  ("classically the Clifford torus, the flat torus in S³") beats a crisp fabricated
  citation, DOI, or date every time. When unsure, say so.

- **Possible sources, not priority claims.** The point is a reader's next step, not
  a leaderboard. Pointers are annotated so a curious person knows *why* to chase
  them.

## In practice (the workflow)

This policy is a standing part of building any app, not a one-time pass:

1. **Per-app lineage block.** Each app's `EXPLAINER.md` (or its guide page) ends
   with a short **"Possible sources & where to go further"** section: an annotated
   list of prior work and analogues a reader can follow. See
   [`docs/BUILDING_AN_APP.md`](docs/BUILDING_AN_APP.md) §3d.
2. **Identify sources as part of the build.** When an app is designed or ported,
   identifying its possible sources is one of the deliverables — see the standing
   rule in [`CLAUDE.md`](CLAUDE.md) (*Attribution & AI collaboration*).
3. **Capture while fresh.** Sessions note possible sources surfaced during the
   work in their handoff, so attributions are recorded in the moment rather than
   reconstructed later.

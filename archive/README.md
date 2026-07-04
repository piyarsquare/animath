# Archive

Retired code kept for reference — **not part of the build**. Nothing under
`archive/` is compiled (`tsconfig` includes only `src/`), routed, or imported by
the live app. It's here so we can search its bones, not run it.

Because these modules were moved out of `src/`, their relative imports
(`../../chrome/…`, `../../components/…`) no longer resolve — reviving one means
fixing paths, not just moving it back.

## Contents

### `animations/TopologyWalk/` — retired 2026-07-02
First-person walk on a closed surface: a twisting/knotted **Möbius corridor** and
a flat **torus / Klein bottle / RP²**. Superseded by **Polygon Worlds** (which
absorbed the flat/spherical surfaces and its scene "looks") and **Solid Worlds**.
The one thing with no live successor is the Möbius **corridor** engine
(`corridorEngine.ts` + `corridorGeometry.ts` + `shaders/`) — the place to look if
we ever want that twisting-corridor visualization back.

Was reachable at `#/topology-walk` (plus legacy `#/mobius`, `#/wrap-world`); those
hashes now fall back to the gallery.

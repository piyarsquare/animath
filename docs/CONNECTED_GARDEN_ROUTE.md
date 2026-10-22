# A notebook walk into the connected garden

October 21, 2026. Route specification only. No instruments, navigation, or state transfer are implemented by this document.

Dan chose: “Grow toward the connected garden, with the notebook as the guided way into each part.” He then accepted: “Yes: add the three-stop route spec (multiplication, derivative, graph/map) as the first slice.” These decisions are recorded in Arrange updates 180 and 189 and the reviewed route-spec aim. They supersede the open direction question in [Three possible futures](ANIMATH_VISIONS.md), not the separate decision to build anything.

## The walk: What can multiplication tell us about a function?

The notebook offers a short guided entry for a curious reader comfortable with coordinates and squaring, without assuming familiarity with dual numbers or four-dimensional graphs. That audience is a design assumption, not a catalog finding. The same three instruments remain independently enterable. No locked chapters, completion gates, or replacement gallery are proposed.

The opening passage reads: “A point can be a number. Change how numbers multiply, and a familiar function reveals something different. Try one product, read a derivative from it, then see a complex function as both a map and a graph.”

| Stop | Question | Controlling state | Visible consequence | Onward action |
|---|---|---|---|---|
| 1. Multiplication | What changes when the rule for j² changes? | Operands u = a + bj, v = c + dj; j² = p | uv = (ac + pbd) + (ad + bc)j | **Use this product to read a derivative** |
| 2. Derivative | What does the second slot of a square remember? | f(t) = t²; dual input a + bε, ε² = 0 | f(a + bε) = a² + 2abε; for b = 1 the second slot is f′(a) | **Change to complex numbers: see the map and graph** |
| 3. Graph/map | How can two pictures show the same function? | f(z) = z² on ℂ; selected input z; map/graph view | Same input/output pair in a plane map and a graph in ℝ⁴ | **Return to my multiplication** or **Explore this instrument** |

## Stop 1: Change the multiplication rule

Enter with u = v = 1 + j and p = −1. The notebook shows the product formula beside the multiplication picture and asks: “Before moving the dial, which coordinate of the product will change?” Offer labeled −1, 0, and +1 presets alongside the dial. The worked sequence gives 2j, 1 + 2j, and 2 + 2j. The second coordinate stays 2; the first moves because j² changes. Label these complex, dual, and split-complex arithmetic respectively. The dial changes the algebra, not just a camera or a drawing style.

Keep operand dragging available for wandering, but provide **Restore this example**. The guided onward action explicitly sets p = 0 and u = v = 1 + j. If the reader changed either operand, disclose that reset before proceeding and retain their multiplication state for the return action. Do not silently reinterpret an arbitrary product as a square.

The boundary passage reads: “At j² = 0 we call j epsilon, ε. Now square a + bε. The ε² term vanishes, leaving a second slot that remembers how the square changes.” The relationship between stops is an algebraic calculation, not a numerical limiting animation.

## Stop 2: Read a derivative from the square

Start at a = 1, b = 1, p = 0 and f(t) = t². Show the expansion, the two output slots, and the real graph y = a² with its tangent at a. The output is 1 + 2ε and the tangent slope is 2. Ask the reader to predict the second slot at a = 2, then change a: the output becomes 4 + 4ε and the slope becomes 4.

The guided control is a. Keep b = 1 visible and fixed for this passage. An optional expansion lets the reader change b and explains that the slot is b f′(a), a directional change, not always the derivative itself. At b = 0 the slot is zero; do not divide it by b. “Exact” refers to this algebraic identity, not unlimited floating-point precision or a tiny nonzero ε.

The pinned dual-room source has a derivative plate, but its presets do not include the bare square. It supplies each preset's derivative manually through `F.df` at p = 0. The proposed square passage therefore needs a bounded worked-example preset and labels if built. It does not require or claim a general autodiff engine. Centered difference, complex step, and arbitrary functions remain optional neighboring material outside this route.

The onward passage must be explicit: “We are leaving dual numbers. Keep the rule ‘square the input,’ but now use ordinary complex numbers, where i² = −1. The ε coefficient was a derivative slot; the imaginary output here is a coordinate of the function value.”

Initialize z = 1 + i and show z² = 2i. This is a new complex example, not a transfer of the dual input or its tangent. Retain the derivative settings only for returning. The same written polynomial works in both algebras, but its domain and multiplication rule have changed.

## Stop 3: Recognize a map and a graph

Use the existing Complex Particles and Plane Transform square function. The map displays an input z in one complex plane and its output w = z² in another. The graph represents each pair as (Re z, Im z, Re w, Im w) in ℝ⁴. At the starting point, the pair is (1, 1, 0, 2). At z = 2 + i it is (2, 1, 3, 4). Ask: “Where did the input go in each picture?” The map relates two points; the graph keeps input and output together as one point.

For the guided graph set both coordinate charts to Cartesian, reset 4D rotation to the identity, disable automatic 4D rotation, and use the flat orthographic projection dropping Im w (DropV), retaining (Re z, Im z, Re w). Label the omitted coordinate, Im w, and keep its numeric value in the paired readout. Do not imply that a 3D picture contains all four coordinates visibly. A shared selected-point marker and readout are proposed connection work, not capabilities established by the existing function links.

The map and graph should retain the same function and selected input when switching. Camera, zoom, sampling, and display modes are view-specific. Labels and readouts, not color alone, establish correspondence. In independent exploration, explain that Torus normalization loses size, Sphere collapses common-phase fibers, and intermediate morphs are visual transitions. Sampling and rendering clamps are display limits, not mathematical behavior.

End the passage with: “Multiplication gave us a derivative slot in one algebra. In another, it gave us a complex map whose graph keeps every input paired with its output.” Offer **Return to my multiplication**, **Back to derivative**, and **Explore this instrument**. There is no fourth required stop.

## Entry, state, and return contract

These are proposed behaviors, not a new URL format or a portable workbench schema.

- The notebook cover offers the titled walk and a visible three-stop outline. Each stop shows its title, a short context sentence, and links to the other stops. A direct visitor can choose **Start the worked example** or stay in the instrument.
- Keep one mathematical state per stop so equations, labels, and pictures agree. Store the reader's multiplication operands/p, derivative a/b, and complex function/input separately. Never carry p = 0 into an app that assumes ℂ.
- Forward guided boundaries use the explicit example resets above. Back and return restore the last visited stop's settings and passage position within the same visit. **Restart walk** resets all three; **Restore this example** resets only the current stop. On a fresh visit, use the documented defaults and make no promise of cross-device persistence.
- Within stop 3, function and selected input survive map/graph switching. Existing app links carry function settings only. Selected input, passage position, and return context need a small connection layer if this route is approved for building.
- If the reader chooses a different function in free exploration, returning to the guided passage offers **Resume square example** explicitly. Do not continue square-specific prose against another function.
- On a phone, keep the active control, its consequence, and the next action in one sequential column. A map/graph toggle may replace side-by-side views while preserving the selected pair. No essential control should be hidden in a distant panel.
- Provide labeled keyboard-operable controls and numeric alternatives to dragging. The prose, equations, and readouts must explain the example with motion paused or reduced. No timed action is required.

## What exists, and what this spec asks to connect

| Evidence read | Supported observation | Remaining work if separately authorized |
|---|---|---|
| Number Planes chapter II at [#246 merge snapshot 531bbe5](https://github.com/piyarsquare/animath/blob/531bbe565840bc04c844917e8ccb01d7958183ce/public/number-planes/chapter-2.html) | `setP` drives multiplication and related plates; operands are draggable; notebook/cover/chapter links exist | Author the bounded passage and return behavior. This merge was into `number-plane-guide`, not evidence of release on main. |
| Dual room at [snapshot dd4586e](https://github.com/piyarsquare/animath/blob/dd4586e187364932399f7cba0d679e6d08547aac/public/number-planes/dual.html) | Shared p dial and derivative plate; preset derivatives supplied manually | Square example and route entry. The vision records this as PR #251 work; this spec does not claim that PR is now merged. |
| [Complex Particles explainer](../src/animations/ComplexParticles/EXPLAINER.md), [Plane Transform README](../src/animations/PlaneTransform/README.md), and both apps' link handlers | Complementary graph/map views and bidirectional function handoff | Selected-pair correspondence and notebook return context |
| [Router](../src/index.tsx) and [historical architecture banner](../ARCHITECTURE.md) | Real app routes use the shared workspace; the old proposed layout is not authoritative | No framework replacement or invented active notebook route |

The notebook and dual-room files are absent from the starting main-based checkout at 729c212. Their pinned source was inspected through local Git objects. Catalog area labels and source presence do not prove usability, learning outcomes, or released integrations. No browser or device test is claimed here.

## Review before building

A paper walkthrough should establish these acceptance criteria before any implementation task is accepted:

1. A reader can predict the three products at stop 1 and identify the coordinate that changes.
2. They can explain why the second slot of (2 + ε)² is 4, and why that statement depends on ε² = 0 and b = 1.
3. They notice the explicit domain change and do not mistake Im(z²) for a derivative slot.
4. They can locate input and output in the map/graph example, name the graph coordinate omitted by the displayed projection, and return to their original multiplication settings.
5. A phone or keyboard storyboard preserves the essential control, result, and onward/return actions without relying on motion or color.

These are proposed review criteria, not measured results. This deliverable is complete as a spec. Before building, Dan can accept or revise this concrete walk and authorize a separate implementation slice. That next slice must decide how to integrate the notebook sources and connect state; neither feature-branch merging nor a general workbench is authorized here.

## Implementation authorization

Dan subsequently said “authorized for implementation.” The bounded implementation is the [Number Planes Notebook](../src/animations/GardenWalk/README.md), at `#/garden`, adapting these three stops into the current workspace and reusing the graph/map renderers. The original spec above is retained as the design contract. Implementation and verification evidence are recorded in [the implementation run](execution/2026-10-21-garden-implementation/run.md).

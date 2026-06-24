---
kind: lens
session: 2026-06-18-S05
date: 2026-06-18
title: "Quaternions — design lens: Educator"
branch: claude/quaternion-exploration-app-ig4jmy
slug: quaternion-exploration-app-ig4jmy
status: completed
build: n/a
app: general
---

# Quaternions — Educator's Design Lens

**I back Candidate A — The Belt — as the sole entry point.** Do not fold B or C in as layouts. Build A to mastery; leave B and C as sequels.

---

## The learning arc: from first contact to fluency

The learner enters with three expectations: rotations = three numbers; a matrix works fine; why complicate it? The arc defuses each expectation sequentially, building confidence at each step that complexity is *forced*, not chosen.

### **Step 1: Feel the resistance (no ramp)**
**Atlas:** C1 (why not three?)  
**What the learner DOES:** Drag the block one full turn, watch the ribbon twist once, try to untwist it by hand/shaking — fail repeatedly.  
**Why:** Embodied frustration is the entry. Nora's own opening ("a rotation is three numbers, surely") is the learner. The belt that "won't come loose" is a felt impossibility, just as Hamilton's triplets were. No explanation first; the contradiction precedes the reason.  
**Self-check:** "Can I undo this twist without turning the block again?" (Answer: No. Good — you've hit the wall C1 lives on, the "fourth slot exists to catch what three can't hold," but in felt form.)

### **Step 2: Recognize the pattern, earn the pivot (720° insight)**
**Atlas:** C6 (the double cover, $q \to -q \to q$)  
**What the learner DOES:** With the hint "try two full turns," drag the block to 720° total rotation and watch the twist vanish. Repeat with different axes.  
**Why:** This single observation is the entire concept. The belt becomes a *meter* of something the block hides. Progressive disclosure: the sign dial (the great circle $q$ and $-q$ projected) springs into view after the first failure, labeled "where the quaternion is" — a readout, not an explanation. The learner reads: after 360°, the quaternion jumped from $q$ to $-q$ (antipodal on the dial), and the block returned visually but the belt kept score. At 720°, both the block *and* the quaternion returned to their starts.  
**Which confusion it dissolves:** #1 (double cover: $q$ and $-q$ the same rotation), #2 (the 720° spinor weirdness). The learner now owns it kinetically.  
**Self-check:** "Why did turning twice work but once didn't?" (To pass: learner must link the belt-slack to the sign dial, not yet to $q,-q$ algebraically, but to the *marker* that showed the jump.)

### **Step 3: Name the structure (the matrix comparison)**
**Atlas:** C6 (still; the closing wall)  
**What the learner DOES:** Toggle a "Compare" readout: side-by-side, the ghost $3×3$ matrix (returns at 360°) and the belt state (does not). Click to inspect the readout, which states plainly: "After one turn, the matrix forgets; the belt remembers. The quaternion is the belt."  
**Why:** This is the Skeptic's own resolution, spoken aloud. It stops the anxiety ("isn't this just matrix with extra steps?") dead. The learner now has a metaphor: a matrix is the block's *final pose*; a quaternion is the *path* — and the path can have hidden knots.  
**Which confusion it dissolves:** #5 (confusing the unit quaternion with the rotation it encodes — here they're visually split: the block = rotation, the belt/sign dial = the quaternion).  
**Self-check:** "Show me a position where the matrix and the belt disagree." (Learner should recognize: 360° on any axis.)

### **Step 4: Understand the cost of the sandwich (why angle/2)**
**Atlas:** C3 (the half-angle via two-sided action)  
**What the learner DOES:** In a progressive-disclosure "Sandwich" drive panel, set an axis–angle, then hit "Animate sandwich." Watch a small arrow (a vector $v$) live in 3D, then watch the *staged* animation: left-multiply (the arrow tilts and a scalar part blooms, leaving 3-space), right-multiply by the inverse (the scalar cancels, rotation doubles). Slider shows: object turns by $\theta$, but each side of the sandwich turns by $\theta/2$.  
**Why:** The learner now understands that the half-angle isn't *in the quaternion*; it's the *mechanical cost of acting from both sides*. This builds on Step 2 (they saw the belt reach $-q$ halfway) — now they see *why* the belt had to travel that far to keep the vector from getting a scalar part.  
**Which confusion it dissolves:** #3 (why half-angle), #6 (the two-sided conjugation vs. one-sided multiply).  
**Self-check:** "If I use only left-multiply, what goes wrong?" (Learner should be able to reason: the vector picks up a scalar part, which rotations are not supposed to do; you need the inverse to cancel it back out, and that doubles the effect.)

### **Step 5: See the unit surface and gimbal lock (why practitioners chose this)**
**Atlas:** C4 (gimbal lock as the foil), C5 (the unit surface as the earned stage)  
**What the learner DOES:** Toggle a second view/layout called "Racer" (or leave this as a future mode — my recommendation: leave it for Session 2). If included: set two poses and watch Euler angles race vs. SLERP; scrub near a gimbal-lock configuration to see the Euler whip. Small inset shows the two poses as points on a unit sphere; SLERP is the arc between them.  
**Why:** The learner now earns *why* practitioners switched from matrices/Euler to quaternions — not because it's elegant, but because it works. The gimbal-lock whip is a fail mode they expected to live with; quaternions eliminate it. The unit surface is no longer abstract; it's the stage where the arc (SLERP) lives.  
**Which confusion it dissolves:** none new; it *reinforces* the practical payoff so a beginning learner does not leave thinking quaternions are theoretical toys.  
**Self-check:** "Where does Euler go wrong, and why does SLERP not?" (Learner should point to gimbal lock and the smooth arc.)  
**Recommendation:** *Do not build this now.* A learner who completes Steps 1–4 owns the core. Step 5 is a sequel; save it for a follow-up app or a second layout once The Belt ships and has real usage data. Building it now risks diffusing the focus.

### **Step 6: (Omitted: non-commutativity = cross product)**
**Atlas:** C7  
**Recommendation:** *Do not include this in the first version.* C7 (the cross product as the hidden non-commutativity) is intellectually rich but orthogonal to Steps 1–4. A learner who has felt the belt, named the path-structure, and learned the sandwich already owns the concept's core. The cross-product connection is an *optional depth* exercise that belongs in the Explainer or a bonus panel ("Advanced: why multiplication isn't commutative"), not in the main arc.

---

## Differences for beginner vs. mathematician

### **Curious beginner (first encounter with quaternions)**
- **Entry:** Step 1 is pure kinetic; no formulas anywhere on screen.
- **Explainer:** Opens with Hamilton's own frustration (foundation §1, the decade of struggle), then Frobenius's concrete counterexample ($3 = 1^2+1^2+1^2$, $21 = 4^2+2^2+1^2$, product $63$ cannot be three squares). The learner reads *why* a fourth slot was forced before touching the app.
- **Panels:** Axis–angle dials are labeled in plain English; quaternion components $(a,b,c,d)$ appear in the sign dial with a small note: "the four numbers that remember the path."
- **Sequence:** Steps 1–2 are mandatory. Step 3 is the lightbulb. Step 4 is fluency. Do not rush past Step 2.

### **Working mathematician (e.g., computer graphics developer; familiar with matrices and Euler angles)**
- **Entry:** Same Step 1, but faster — they skip the frustration and jump to "show me why this works."
- **Explainer:** Emphasizes the topological content: $S^3$ (unit quaternions) is simply connected; SO(3) is not; SU(2) double-covers SO(3). The belt is the *visualization* of that cover.
- **Panels:** The sign dial includes a toggle to show the full $S^3$ (stereographic projection, optional advanced view, quarantined by default). Quaternion components show the axis–angle form *and* the $(s,\mathbf{v})$ (scalar + vector) decomposition side-by-side.
- **Sequence:** Steps 1–3 are the walk; Step 4 is the formalism check. Step 5 (gimbal lock) is immediate motivation — they already know Euler is broken and want the why-not-just-fix-Euler answer. The Sandwich (Step 4) is a "nice to know" but they often skip it.

**Implementation:** Same app, different initial settings. `usePersistentState` remembers "first time? show the slow lane" vs. "returning user? show the dense panels."

---

## The self-check mechanism: prediction-then-reveal

Every step has a built-in **predict-then-reveal** that lets the learner verify their own understanding without touching a single formula.

1. **After Step 1 (the wall):** "Can you undo the twist without re-turning the block?" (Learner predicts: No. Reveals: Correct. They own the impossibility.)
2. **After Step 2 (the 720° insight):** "Without looking at the readout: if you turn one more full rotation (from 720° to 1080°), what will the belt do?" (Learner predicts: twist again, then undo. Reveals: exactly right — it's periodic with period 720°.)
3. **After Step 3 (the matrix comparison):** "At what angle does the matrix return to identity? At what angle does the belt?" (Learner names: matrix at 360°, belt at 720°. Reveals: correct. They own the divergence.)
4. **After Step 4 (the sandwich):** "Why can't I just rotate the vector using only the left-multiply $qv$?" (Learner tries (in the "Sandwich" panel), sees the scalar part bloat, predicts "it stops being a vector." Reveals: exactly — and then showing right-multiply fixes it.)

These are not quizzes; they're *interaction loops* where the learner's expectation meets the world and confirms understanding in action.

---

## Map to canonical confusions (foundation §5) and atlas crossings

| Confusion | Which step defuses it | How |
|---|---|---|
| #1 — double cover ($q,-q$ same rotation) | Step 2, Step 3 | Belt slack at 360° only, sign dial jumps to $-q$; matrix comparison shows it's hidden. |
| #2 — 720° spinor weirdness | Step 2 | Learner feels it: undo at 720°, not 360°. |
| #3 — half-angle mystery | Step 4 | Two-sided sandwich animation; each side carries $\theta/2$; mechanical necessity, not magic. |
| #4 — non-commutativity order-dependence | Omitted from v1 | Optional advanced panel; not load-bearing for core concept. |
| #5 — conflating quaternion with rotation | Step 3 | Visual split: block = the rotation (a pose); belt/dial = the quaternion (a 4D point, the path). |
| #6 — sandwich vs. one-sided multiply | Step 4 | Learner watches the vector corrupt under left-multiply alone; inverse fixes it. |
| #7 — "4D is unvisualizable" | Step 2 | "You only see a 2D slice (the sign dial). It works because $S^3 \to S^1$ is faithful." |
| #8 — pure vs. unit vs. general | Progressive-disclosure panels | Begin with unit only (the belt is always on the unit surface); optional detail panels name the taxonomy. |
| #9 — scalar + vector decomposition | Step 4 | Sandwich animation shows $(s, \mathbf{v})$ split; the scalar part that has to be canceled. |

---

## Takeaways

1. **Do not fold candidates B and C into A.** The Belt owns C6 (the felt-equals-formal crossing). SLERP and the sandwich are *sequels*, not layers. A that tries to carry all three collapses into overstuffing; build A tight, ship it, then grow.

2. **Prediction-then-reveal is non-negotiable.** The self-check must be *kinetic*, not textual — a learner who turns the belt and watches it refuse to undo owns the concept; one who reads an explanation owns words. Make every step a small surprise the learner's hands confirm.

3. **Name the path-structure explicitly and early (Step 3).** "The quaternion is the belt — it carries the path" is the single sentence that stops the "this is just notation" objection. Say it clearly once the learner has *felt* it, then move on.

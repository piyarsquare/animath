# Self-Reflection Protocol

Append this as the **last** section of your handoff (or analysis / three-hats report).
Session reports are **Markdown**, so write the Markdown below — a `## Self-reflection`
heading followed by the numbered list. Answer each question honestly. If the honest
answer is "nothing," say so — an empty answer is more valuable than a forced one.

The exact `## Self-reflection` heading and the final `**Follow-up value:** <LEVEL> — …`
line matter: the cross-branch control center (`npm run sessions`) scrapes them to
build its **Reflections** view (the exit-interview digest), reading `<LEVEL>` to color
each entry's follow-up badge. Keep `<LEVEL>` one of CRITICAL / HIGH / MEDIUM / LOW / NONE.

```markdown
## Self-reflection

1. **What would you do with another session?** …
2. **What would you change about what you produced?** …
3. **What were you not asked that you think is important?** …
4. **What did we both overlook?** …
5. **What did you find difficult?** …
6. **What would have made this task easier?** …
7. **How did you verify this, and does each passing check test the user-visible
   claim?** State the method (automated tests / headless screenshot / real device /
   reasoning only / not verified) and call out any green check that only tests a
   proxy. If a visual or device-specific result was checked headless or by
   reasoning, say so — and set the matching `signals:` (`visual-unverified` /
   `phone-needed`) so it isn't under-reported. …
8. **Follow-up value:** LOW — [one-line justification]
```

If a lesson here is one already promoted in
[`docs/sessions/RECURRING_LESSONS.md`](../../docs/sessions/RECURRING_LESSONS.md)
(e.g. L1 "verified headless", L2 "build then ask", L4 "untested pure logic"), say so
plainly — a promoted lesson recurring means the rule isn't landing and the ledger
entry should be reopened, not just re-logged.

Follow-up value scale:

- **CRITICAL** — I would not trust my own conclusions; there are unchecked
  assumptions or uninvestigated areas that could invalidate the output.
- **HIGH** — output may be incorrect or misleading without follow-up.
- **MEDIUM** — output is correct but incomplete; follow-up would add significant
  value.
- **LOW** — output is complete; follow-up would add polish or depth.
- **NONE** — nothing meaningful left to do.

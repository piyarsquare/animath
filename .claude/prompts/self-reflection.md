# Self-Reflection Protocol

Append this section at the end of your analysis, report, or handoff. Session reports
are **HTML**, so append the HTML `<section>` below (just before `</main>`), filling
in each answer. Answer each question honestly. If the honest answer is "nothing,"
say so — an empty answer is more valuable than a forced one.

For the follow-up value, use the matching badge class: `badge-bad` for
CRITICAL/HIGH, `badge-warn` for MEDIUM, `badge-ok` for LOW/NONE.

```html
<section class="self-reflection">
  <h2>Self-reflection</h2>
  <ol>
    <li><strong>What would you do with another session?</strong> …</li>
    <li><strong>What would you change about what you produced?</strong> …</li>
    <li><strong>What were you not asked that you think is important?</strong> …</li>
    <li><strong>What did we both overlook?</strong> …</li>
    <li><strong>What did you find difficult?</strong> …</li>
    <li><strong>What would have made this task easier?</strong> …</li>
    <li><strong>Follow-up value:</strong>
        <span class="badge badge-ok">LOW</span> — [one-line justification]</li>
  </ol>
</section>
```

Follow-up value scale:

- **CRITICAL** — I would not trust my own conclusions; there are unchecked
  assumptions or uninvestigated areas that could invalidate the output.
- **HIGH** — output may be incorrect or misleading without follow-up.
- **MEDIUM** — output is correct but incomplete; follow-up would add significant
  value.
- **LOW** — output is complete; follow-up would add polish or depth.
- **NONE** — nothing meaningful left to do.

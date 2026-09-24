# evals

One scenario case, in the layout `claude plugin eval` expects
(`<case>/prompt.md` plus `<case>/graders/*.md`), so it runs unchanged the day
that command is out of early access. **There is no runner in this repository on
purpose**: the cases are the asset and a runner is a detail.

🔴 **FOUR RULES, EACH LEARNED THE HARD WAY** and written down here because they
are what makes a scenario eval tell the truth.

1. **A run that exhausts `max_turns` returns no text, and then every content
   grader fails for want of anything to grade.** That reads as "the skill did
   not work" when what happened is that the budget ran out. Fail loudly on empty
   output, naming `max_turns`, rather than scoring it. Misreading this cost two
   debugging detours.
2. **Budget 25 turns.** Anything less was too few, twice.
3. **Assert the claim you want. Never assert an absence.** A correct answer may
   legitimately mention the very thing you hoped it would avoid, so "does not say
   X" fails good runs.
4. **An indicator is not a score.** `scored: false` graders say the skill was
   reached, which is a much smaller claim than the skill being any good. A skill
   that fired and then gave bad advice must not pass on the strength of having
   fired.

⚠️ **THE GRADER VOCABULARY IS `type: regex` AND `type: tool_used`**, both
deterministic against the transcript rather than judged, with one extension:
`input_contains` on a `tool_used` grader, because "it read a pricing page" is a
claim about WHICH page was fetched and the bare vocabulary cannot say it. The
prose body of every grader carries the same claim in words, so an LLM judge
reading these files gets the same test.

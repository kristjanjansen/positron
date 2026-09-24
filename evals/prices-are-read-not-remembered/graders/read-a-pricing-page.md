---
type: tool_used
tool: WebFetch
input_contains: developers.cloudflare.com
min: 1
---
The skill carries NO prices, deliberately, and tells the agent to read them now
and give today's number. This is the grader that decision exists for: it passes
only if a Cloudflare pricing page was actually fetched during the run.

It is also the regression test. If somebody ever writes a price back into the
skill, an agent will answer from the file instead of the web, this fetch will
not happen, and the case goes red for the right reason.

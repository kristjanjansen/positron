---
type: regex
pattern: (as of|today|checked|current(ly)?|pricing page|20\d\d-\d\d-\d\d)
match: contains
target: last_message
---
A number without a date is the failure this repository keeps paying for, and the
skill says to give today's number AND say where it was read and when. Asserted
as the claim we want rather than as the absence of a bare figure: a good answer
may quote several numbers, and an absence assertion would fail it. That is rule
three of the four below.

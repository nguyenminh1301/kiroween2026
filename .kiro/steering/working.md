---
inclusion: always
---

# How to work in this repo

- Do not use sub-agents, parallel agents or delegated task runners. Do every task yourself, one at a time, in the current chat.
- Run spec tasks in order. Finish one top-level task (code, its tests, test and lint, commit), then start the next.
- Skip tasks marked optional (`*`) unless the prompt names them.
- Read only the part of a spec, file or log you need. Do not re-read whole design documents for each task. Work from tasks.md and the requirement numbers it cites.
- Keep new specs short: requirements under 150 lines, design under 200 lines, about 8 top-level tasks, no more than 6 property tests per spec. Put a test in the same task as the code it tests.
- Do not paste whole files or long logs into the chat. When reporting, give only the summary lines.
- If something blocks you, stop and say what it is in two or three lines. Do not try many different approaches in a row.

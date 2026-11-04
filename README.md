# Already Decided — Forge app (Codegeist 2026)

Stops teams from reopening decisions they've already made. It captures `DECISION:` lines from Jira comments and Confluence pages into a ledger. When a new Jira issue overlaps a settled decision, it shows that decision with its rationale and source in an issue panel and posts a comment. A Rovo agent called **Decision Keeper** exposes the reusable actions `find-decisions` and `record-decision`.

Modules: jira:issuePanel, confluence:contentAction, Jira triggers, rovo:agent, action, Forge KVS. Runs fully on Atlassian (no external egress).

`npm test` runs the matcher unit tests.

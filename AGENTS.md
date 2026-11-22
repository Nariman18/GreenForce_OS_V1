# GreenForce OS working agreement

At the start of work, read `MEMORY.md`, `docs/implementation-roadmap.md` and the latest entries in
`docs/implementation-progress.md`. Treat saved notes as context; verified code/output and current user instructions prevail.

- Product: address → property intelligence → setup → requirements/verdicts → evidence → materials/suppliers → funding → compliance passport.
- Initial launch scope is Denmark and Germany only. The owner's 2026-11-17 direction supersedes the older PDF's geography.
- Keep demo data and demo rule interpretations clearly labelled. German legal editions/state-specific rules and funding are not fully modelled.
- After meaningful work, update `MEMORY.md` and `docs/implementation-progress.md` with changes, checks actually run, limitations and next steps.
- The owner makes all git commits and pushes; do not commit or push.
- See README for seed sources and reset commands. Reset deletes all domain records and evidence in the configured database/storage; never reset the owner's data merely to run tests. Backend integration tests use isolated schemas.
- Respect `frontend/AGENTS.md` when editing the frontend.

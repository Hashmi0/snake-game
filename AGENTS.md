# Snake Garden

Before starting or resuming, read `docs/BUILD_PLAN.md` and `docs/PROGRESS.md`, then inspect the actual working tree and Git diff. Preserve partial work and continue the first unfinished task.

Mark each task in progress before editing. Record its affected files, commands and results, evidence, failures, and exact next action in the progress journal. Commit verified milestones locally. A skipped check is unverified, never passing.

The user approved the full design and independent implementation. Continue through the phases without repeating design approval. The plan is self-contained; optional skills must not become execution dependencies.

Keep simulation independent of DOM, rendering, audio, and wall-clock time. Test controls belong only in the dedicated E2E build. Verify production separately at root and repository subpath.

Use the scripts in package.json for checks and development. Keep plan, progress, and actual files consistent. On interruption, leave a recoverable checkpoint. Prepare hosting configuration; publish only to an identified, authorized destination.

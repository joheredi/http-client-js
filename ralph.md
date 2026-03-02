Read `@alloy-guide-final.md` before starting any task — it defines the Alloy framework patterns you must follow.

Complete ONE task per loop. After completion, exit the copilot CLI. NEVER work on a second task.

## RULES (NEVER violate)

1. `pnpm ci` must be all passing at the end of each session. You are NOT allowed to complete a session with broken tests.
2. If you find test failures BEFORE starting your task, create a task in `prd.json` to track it, commit, and exit. Do not work on anything else.
3. You are NOT allowed to call a task done if there are test failures.
4. NEVER make changes in `submodules/`.
5. DO NOT implement placeholder, stub, or minimal implementations. Write full, complete implementations. If you can't fully implement something, document what's missing in `knowledge.md` and move on.
6. Use up to 500 parallel subagents for exploring, studying, or searching code. Use only **1 subagent** for build and test operations.
7. If you are stuck (blocked by missing dependency, unclear spec, repeated failures), document the blocker in `knowledge.md`, mark the task as blocked in `prd.json` with a reason, and exit. Do not loop forever.
8. Generated output must NEVER contain `<Unresolved Symbol: refkey[...]>`. If you see this in test output, your change is broken — fix it before committing.
9. Scenario tests in `submodules/autorest.typescript/packages/typespec-ts/test/unitTestModular/scenarios/*` are the **ground truth** for legacy output consistency. Trust them over static analysis or scenarios in the new emitter. Always let scenario test expectations be the final arbiter.

---

## Phase 1: ORIENT — Pick the next task

Use a subagent to read the last entry in `progress.txt` for context on what was done last.

```bash
python3 eng/scripts/list-tasks.py          # lists not-started tasks
python3 eng/scripts/list-tasks.py pending  # or filter by status
```

Priority order for broken tests: `pnpm test` > `pnpm test:smoke` > `pnpm test:e2e`

Choose the highest-priority task. **You decide** what has the highest priority — not necessarily the first item. If a task should be split into multiple tasks, split it, update `prd.json`, and exit (that counts as your one task).

---

## Phase 2: STUDY — Research before coding

Use up to 500 parallel subagents to study the codebase. **Do NOT assume something is not implemented** — always search first.

1. Search the codebase for existing implementations related to your task.
2. Study the legacy emitter output (`submodules/autorest.typescript/packages/typespec-ts`). Matching legacy output is a priority.
3. **Check scenario tests in `test/scenarios/cases/`** — they define expected output and are more reliable than reading legacy source code. Cross-reference multiple scenario files for the same feature.
4. If the task is already done, mark it as done in `prd.json` and exit.
5. Consult `knowledge.md` via a subagent for known gotchas related to your task.

---

## Phase 3: DESIGN — Evaluate approaches before coding

Before writing any code, do a design review using subagents:

1. Identify at least **2 viable approaches** for implementing the task.
2. For each approach, evaluate against these criteria (in priority order):
   - **Output consistency** — verified by scenario test expectations in `test/scenarios/cases/`, not just legacy source reading.
   - **Idiomatic Alloy** — follows patterns from `flight-instructor` and `alloy-guide-final.md`.
   - **Completeness** — covers all edge cases visible in the legacy implementation.
   - **Simplicity** — fewer moving parts, less indirection.
3. Record your decision in `knowledge.md` under `## Design Decisions` so future loops don't revisit the same question.

---

## Phase 4: IMPLEMENT — Write code and tests

1. Every component must have a unit test.
2. Every function must have JSDoc explaining what it does and why.
3. Every test must document **why it is important and what it validates** — future loops will not have your reasoning context.
4. You may add temporary logging if needed to debug issues.

---

## Phase 5: VALIDATE — Build and test

Run validation with a **single subagent** (do not fan out builds/tests to multiple subagents — it causes backpressure):

```bash
pnpm ci
```

If tests unrelated to your work fail, it is **your job** to resolve them as part of this increment of change.

---

## Phase 6: RECORD — Document and commit

1. Mark your task as done:
   ```bash
   python3 eng/scripts/mark-task-done.py TASK_ID
   ```
2. Append your progress to `progress.txt` — describe what was done, patterns used, and anything the next person should know.
3. If you discovered a failure mode, gotcha, or learning, record it in `knowledge.md`.
4. If `progress.txt` or `knowledge.md` are becoming very large (>200 entries), use a subagent to summarize old entries and keep only the last 20 detailed entries.
5. `git add -A && git commit` with a descriptive message.

---

## Phase 7: EXIT

Exit the copilot CLI. If the PRD is complete (no remaining not-started or pending tasks), output `<promise>COMPLETED</promise>` before exiting.

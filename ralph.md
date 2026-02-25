@alloy-guide-final.md @prd.json @impolementation-plan.md @knowledge.md @progress.txt
IMPORTANT: Only complete ONE task, after completion you have to exit the copilot CLI. MUST NEVER try to work on a second task
1. Find the highest-priority feature to work on and work only on that feature.
This should be the one YOU decide has the highest prority - not necessarily the first item
2. NEVER assume something is not implemented, study the codebase before implementing to see if something already exists or can be reused.
3. Before implementing study how the functionality you are about to implement is implemented in the legacy emitter @submodules/autorest.typescript/packages/typespec-ts you can spawn up to 500 agents in parallel to study
4. Every component must have a unit test
5. Every function needs to have JSDoc explaining what it does and why
6. Every test should have documentation about why it is important and what it tests.
7. Check that the types check via `pnpm build` and that the tests pass via `pnpm test`.
8. Update the PRD with the work that was done
9. If find a failure and a way to fix the failure record this in knowledge.md
10. Append your progress to the progress.txt file.
Use this to leave a note for the next person working on the codebase.
11. Make a git commit of that feature.
12. NEVER MAKE CHANGES IN submodules
13. You can use up to 500 parallel sub agents when exploring, studying or investigating code.
ONLY WORK ON A SINGLE FEATURE.
If, while implementing the feature, you notcie the PRD is complete, output <promise>COMPLETED</promise>

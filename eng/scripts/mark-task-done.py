import json
import sys

if len(sys.argv) < 2:
    print("Usage: python3 eng/scripts/mark-task-done.py <TASK_ID>")
    sys.exit(1)

task_id = sys.argv[1]

with open('prd.json') as f:
    prd = json.load(f)

found = False
for t in prd['tasks']:
    if t['id'] == task_id:
        t['status'] = 'done'
        found = True
        break

if not found:
    print(f'Task {task_id} not found')
    sys.exit(1)

with open('prd.json', 'w') as f:
    json.dump(prd, f, indent=2)

print(f'Marked {task_id} as done')

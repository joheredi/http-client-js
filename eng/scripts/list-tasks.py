import json
import sys

with open('prd.json') as f:
    tasks = json.load(f)['tasks']

status_filter = sys.argv[1] if len(sys.argv) > 1 else 'not-started'
filtered = [t for t in tasks if t['status'] == status_filter]

for t in filtered:
    pri = t.get('priority', '')
    deps = ', '.join(t.get('dependencies', []))
    print(f'[{t["id"]}] {t["title"]} | {t["category"]} | pri={pri} | deps=[{deps}]')

print(f'\n{len(filtered)} tasks {status_filter}')

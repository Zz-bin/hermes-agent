"""Seed empty/large discussion fixtures in an already asserted isolated database."""
import argparse
import json
import os
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--root', required=True)
args = parser.parse_args()
root = Path(args.root).resolve()
assert root.is_relative_to(Path(os.environ['TMPDIR']).resolve())
info = json.loads((root / 'fixture.json').read_text())
assert info['root'] == str(root) and info['fixture'].startswith('real isolated DB')
for key in list(os.environ):
    if key.startswith('HERMES_KANBAN_'):
        os.environ.pop(key)
os.environ.update(HOME=str(root / 'user'), HERMES_HOME=str(root / 'user' / '.hermes'), HERMES_KANBAN_HOME=str(root / 'board'), HERMES_KANBAN_DB=str(root / 'board' / 'kanban.db'))
from hermes_cli import kanban_db as kb, kanban_db_connect as kbc
assert kb.kanban_home().resolve() == root / 'board'
assert kb.kanban_db_path().resolve() == root / 'board' / 'kanban.db'
result = {}
with kbc.connect() as conn:
    for name, count in [('empty', 0), ('large', 240)]:
        task_id = kb.create_task(conn, title=f'Isolated {name} directory', assignee='builder', initial_status='blocked')
        for index in range(count):
            kb.add_comment(conn, task_id, 'builder', f'Original edge floor {index + 1}')
        result[name] = task_id
(root / 'edge-fixtures.json').write_text(json.dumps(result, indent=2))
print(json.dumps(result))

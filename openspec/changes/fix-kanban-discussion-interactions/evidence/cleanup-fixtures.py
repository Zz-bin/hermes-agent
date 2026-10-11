import json
import os
from pathlib import Path

import psutil

workspace = Path('/home/capz/worktrees/hermes-kanban-detail').resolve()
evidence = workspace / 'openspec/changes/fix-kanban-discussion-interactions/evidence'
roots = {str((Path(os.environ['TMPDIR']) / f'kanban-interactions-532e415b-{name}').resolve()) for name in ('z3', 'z4')}
fixture = evidence / 'integration-server.py'
vite = evidence / 'native/vite.mjs'
original = {pid: psutil.Process(pid).create_time() for pid in (1378918, 1379337)}
targets = []
for process in psutil.process_iter(['pid']):
    try:
        args = process.cmdline()
        cwd = Path(process.cwd())
        scripts = {(cwd / arg).resolve() for arg in args[1:] if arg.endswith(('.py', '.mjs'))}
        is_fixture = fixture in scripts and '--root' in args and args[args.index('--root') + 1] in roots
        is_vite = vite in scripts
        if not (is_fixture or is_vite):
            continue
        ports = {connection.laddr.port for connection in process.net_connections(kind='inet') if connection.status == psutil.CONN_LISTEN}
        assert ports & ({43312, 43313} if is_fixture else {43311}), process.pid
        assert process.pid not in original
        targets.append(process)
    except (psutil.NoSuchProcess, psutil.AccessDenied):
        continue
assert len(targets) == 3, [process.pid for process in targets]
for process in targets:
    process.terminate()
gone, alive = psutil.wait_procs(targets, timeout=5)
for process in alive:
    process.kill()
_, alive = psutil.wait_procs(alive, timeout=5)
assert not alive
assert all(psutil.Process(pid).create_time() == start for pid, start in original.items())
result = {'stopped_validation_pids': [process.pid for process in targets], 'validation_ports': [43311, 43312, 43313], 'original_processes_unchanged': original, 'production_restart': False}
(evidence / 'cleanup.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result))

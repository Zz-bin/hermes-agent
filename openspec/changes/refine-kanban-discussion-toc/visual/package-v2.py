"""Package only this change's public planning materials, never user state."""
import hashlib
import json
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

root = Path(__file__).resolve().parents[1]
assert root.name == 'refine-kanban-discussion-toc'
files = [root / name for name in ['.openspec.yaml', 'README.md', 'proposal.md', 'design.md', 'requirements.md', 'specs/kanban-detail-inspection/spec.md', 'evidence/investigation.md']]
files += sorted(p for p in (root / 'visual').iterdir() if p.suffix in {'.html', '.css', '.tsx', '.mjs', '.py', '.json', '.png'})
assert all(p.is_file() and p.resolve().is_relative_to(root) for p in files)
manifest = {
    'version': 'v2', 'change': root.name, 'branch': 'feature/kanban-development',
    'base_commit': '0b662c0e6e05450568f6d9bd4f158e2aa80bfc60',
    'target_commit': '0b662c0e6e05450568f6d9bd4f158e2aa80bfc60',
    'scope': 'planning and synthetic visual prototype only; no implementation permission',
    'files': {str(p.relative_to(root)): hashlib.sha256(p.read_bytes()).hexdigest() for p in files},
}
manifest_path = root / 'evidence/package-manifest-v2.json'
manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
standalone = root / 'visual/kanban-discussion-demo-v2.zip'
with ZipFile(standalone, 'w', ZIP_DEFLATED) as archive:
    archive.write(root / 'visual/index.html', 'index.html')
full = root / 'visual/approval-package-v2.zip'
with ZipFile(full, 'w', ZIP_DEFLATED) as archive:
    for p in [*files, manifest_path]:
        archive.write(p, str(p.relative_to(root)))
for path in [standalone, full]:
    with ZipFile(path) as archive:
        assert archive.testzip() is None
        for item in archive.infolist():
            source = root / 'visual/index.html' if path == standalone else root / item.filename
            assert archive.read(item) == source.read_bytes()
    print(json.dumps({'path': str(path), 'bytes': path.stat().st_size, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest(), 'verified_zip_bytes': True}))

"""ZIP only the reviewed manifest; Git metadata is never part of a release archive."""
import hashlib
import json
import sys
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

source = Path(sys.argv[1]).resolve()
info = json.loads((source / 'release-info.json').read_text(encoding='utf-8'))
version = info['version']
archive_path = source.parent / f'ai-learning-studio-v{version}.zip'
if archive_path.exists():
    raise SystemExit('Archive already exists; review it before replacing.')
entries = []
for line in (source / 'SHA256SUMS.txt').read_text(encoding='utf-8').splitlines():
    expected, name = line.split('  ', 1)
    relative = Path(name)
    if relative.is_absolute() or '..' in relative.parts or '.git' in relative.parts:
        raise SystemExit('Invalid manifest path')
    file = source / relative
    if file.is_symlink() or not file.is_file():
        raise SystemExit('Manifest entry is not a regular file')
    if hashlib.sha256(file.read_bytes()).hexdigest() != expected:
        raise SystemExit('Checksum mismatch: ' + name)
    entries.append(name)
entries.append('SHA256SUMS.txt')
with ZipFile(archive_path, 'w', ZIP_DEFLATED) as archive:
    for name in entries:
        archive.write(source / name, f'ai-learning-studio-v{version}/{name}')
digest = hashlib.sha256(archive_path.read_bytes()).hexdigest()
archive_path.with_suffix('.zip.sha256').write_text(digest + '  ' + archive_path.name + '\n', encoding='utf-8')
print(json.dumps({'archive': archive_path.name, 'files': len(entries), 'sha256': digest}))

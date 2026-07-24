import json
from graphify.cache import check_semantic_cache
from pathlib import Path

detect = json.loads(Path('.graphify_detect_incremental.json').read_text())
all_files = [f for files in detect.get('new_files', {}).values() for f in files]

res = check_semantic_cache(all_files)
cached_nodes = res[0]
cached_edges = res[1]
uncached = res[3]

if cached_nodes or cached_edges:
    Path('.graphify_cached.json').write_text(json.dumps({'nodes': cached_nodes, 'edges': cached_edges}))
Path('.graphify_uncached.txt').write_text('\n'.join(uncached))
print(f'Cache: {len(all_files)-len(uncached)} files hit, {len(uncached)} files need extraction')

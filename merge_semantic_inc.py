import json
from pathlib import Path

nodes = []
edges = []

for f in ['sem1.json', 'sem2.json', 'sem3.json']:
    if Path(f).exists():
        try:
            data = json.loads(Path(f).read_text())
            nodes.extend(data.get('nodes', []))
            edges.extend(data.get('edges', []))
        except Exception as e:
            print(f"Error reading {f}: {e}")

Path('.graphify_semantic_new.json').write_text(json.dumps({'nodes': nodes, 'edges': edges}, indent=2))
print(f"Merged semantic new: {len(nodes)} nodes, {len(edges)} edges")

import sys, json
from pathlib import Path

ast_file = Path('.graphify_ast.json')
semantic_new_file = Path('.graphify_semantic_new.json')
cached_file = Path('.graphify_cached.json')

results = []
if ast_file.exists(): results.append(json.loads(ast_file.read_text()))
if semantic_new_file.exists(): results.append(json.loads(semantic_new_file.read_text()))
if cached_file.exists(): results.append(json.loads(cached_file.read_text()))

final_nodes = {}
final_edges = []
in_tok = 0
out_tok = 0

for res in results:
    for n in res.get('nodes', []):
        final_nodes[n['id']] = n
    final_edges.extend(res.get('edges', []))
    in_tok += res.get('input_tokens', 0)
    out_tok += res.get('output_tokens', 0)

final = {
    'nodes': list(final_nodes.values()),
    'edges': final_edges,
    'input_tokens': in_tok,
    'output_tokens': out_tok
}
Path('.graphify_extract.json').write_text(json.dumps(final, indent=2))
print(f'Final new extraction: {len(final["nodes"])} nodes, {len(final["edges"])} edges')

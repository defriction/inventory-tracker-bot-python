import sys, json
from graphify.build import build_from_json
from graphify.export import to_json
from networkx.readwrite import json_graph
import networkx as nx
from pathlib import Path

existing_data = json.loads(Path('graphify-out/graph.json').read_text())
G_existing = json_graph.node_link_graph(existing_data, edges='links')

new_extraction = json.loads(Path('.graphify_extract.json').read_text())
G_new = build_from_json(new_extraction)

Path('.graphify_old.json').write_text(json.dumps(existing_data))

G_existing.update(G_new)

# Graphify build needs community detection so let's just write to .graphify_extract.json 
# the merged dict and let build_graph.py do its thing!
# Wait! build_from_json returns a NetworkX graph.
# I should convert it back to extraction format OR let build graph do the community detection.
# Let's save the G_existing nodes/edges back into `.graphify_extract.json` format 
# so that the standard build pipeline works.
merged_nodes = []
merged_edges = []
for n, data in G_existing.nodes(data=True):
    # networkx node data is dict
    merged_nodes.append({'id': n, **data})
for u, v, data in G_existing.edges(data=True):
    merged_edges.append({'source': u, 'target': v, **data})

merged_extract = {'nodes': merged_nodes, 'edges': merged_edges, 'input_tokens': 0, 'output_tokens': 0}
Path('.graphify_extract.json').write_text(json.dumps(merged_extract))
print(f'Merged extraction: {len(merged_nodes)} nodes, {len(merged_edges)} edges')

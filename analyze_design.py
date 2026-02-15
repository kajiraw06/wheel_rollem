import json

# Load the Figma data
with open('figma_design_data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

def explore_node(node, depth=0):
    """Recursively explore and print the node structure"""
    indent = "  " * depth
    node_type = node.get('type', 'UNKNOWN')
    node_name = node.get('name', 'Unnamed')
    node_id = node.get('id', '')
    
    info = f"{indent}├─ [{node_type}] {node_name}"
    
    # Add additional details
    if 'absoluteBoundingBox' in node:
        bbox = node['absoluteBoundingBox']
        info += f" ({bbox.get('width', 0):.0f}x{bbox.get('height', 0):.0f})"
    
    if 'characters' in node:
        text = node['characters'][:50]
        info += f' - "{text}"'
    
    print(info)
    
    # Recurse through children
    if 'children' in node and depth < 10:  # Limit depth to avoid too much output
        for child in node['children']:
            explore_node(child, depth + 1)

# Start exploration from document
print("=" * 80)
print(f"FIGMA FILE: {data.get('name', 'Unknown')}")
print(f"Last Modified: {data.get('lastModified', 'Unknown')}")
print("=" * 80)
print("\nDESIGN STRUCTURE:")
print()

document = data.get('document', {})
explore_node(document)

# Print color styles if any
print("\n" + "=" * 80)
print("STYLES:")
print("=" * 80)
styles = data.get('styles', {})
if styles:
    for key, value in styles.items():
        print(f"  {key}: {value}")
else:
    print("  No styles defined")

# Print components if any
print("\n" + "=" * 80)
print("COMPONENTS:")
print("=" * 80)
components = data.get('components', {})
if components:
    for key, value in components.items():
        print(f"  {value.get('name', key)}: {value.get('description', 'No description')}")
else:
    print("  No components defined")

import requests
from urllib.request import urlretrieve
import os

FIGMA_FILE_KEY = "umLng8LozH8lWdqmAtpLed"
FIGMA_TOKEN = os.getenv("FIGMA_TOKEN", "")

# Export specific sub-nodes: pointer, button, wheel ring, giveaways box, list frame, rectangle 1
nodes = {
    "pointer": "0:23",       # pointer inside Wheel group
    "button_1": "0:28",      # button 1 inside Wheel group
    "wheel_ring": "0:24",    # Mask group (ring)
    "wheel_inner": "0:7",    # Union (the actual wheel face)
    "giveaways_box": "0:5",  # Giveaways box
    "list_frame": "0:31",    # list frame
    "list_content": "0:30",  # list content
    "rectangle_1": "0:33",   # Rectangle 1 (cyan button)
}

os.makedirs('exports', exist_ok=True)

# Get node IDs from Figma data
import json
with open('figma_design_data.json', 'r') as f:
    data = json.load(f)

# Collect all node IDs from the design
def collect_ids(node, results=None):
    if results is None:
        results = {}
    results[node.get('name', '')] = node.get('id', '')
    for child in node.get('children', []):
        collect_ids(child, results)
    return results

frame = data['document']['children'][0]['children'][0]
all_ids = collect_ids(frame)
print("All node IDs:")
for name, nid in all_ids.items():
    print(f"  {name}: {nid}")

# Export these specific nodes
export_nodes = {
    "pointer": all_ids.get("pointer", ""),
    "button_1": all_ids.get("button 1", ""),
    "giveaways_box": all_ids.get("Giveaways box", ""),
    "list_frame": all_ids.get("list frame", ""),
    "list_content": all_ids.get("list", ""),
    "rectangle_1": all_ids.get("Rectangle 1", ""),
    "wheel_spin": all_ids.get("Union", ""),
}

# Filter out empty
export_nodes = {k: v for k, v in export_nodes.items() if v}
print(f"\nExporting {len(export_nodes)} nodes...")

node_ids = list(export_nodes.values())
url = f"https://api.figma.com/v1/images/{FIGMA_FILE_KEY}"
headers = {"X-Figma-Token": FIGMA_TOKEN}
params = {
    "ids": ",".join(node_ids),
    "format": "png",
    "scale": 2
}

response = requests.get(url, headers=headers, params=params)
if response.status_code == 200:
    result = response.json()
    images = result.get('images', {})
    for name, nid in export_nodes.items():
        if nid in images and images[nid]:
            filepath = f"exports/{name}.png"
            try:
                urlretrieve(images[nid], filepath)
                print(f"  ✓ {name} -> {filepath}")
            except Exception as e:
                print(f"  ✗ {name}: {e}")
        else:
            print(f"  - No image for {name}")
else:
    print(f"Error: {response.status_code}")
    print(response.text)

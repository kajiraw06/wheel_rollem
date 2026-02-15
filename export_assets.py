import json
import requests
import os
from urllib.request import urlretrieve

FIGMA_FILE_KEY = "umLng8LozH8lWdqmAtpLed"
FIGMA_TOKEN = os.getenv("FIGMA_TOKEN", "")

def get_all_node_ids(node, node_list=None):
    """Recursively collect all node IDs"""
    if node_list is None:
        node_list = []
    
    if 'id' in node:
        node_list.append({
            'id': node['id'],
            'name': node.get('name', 'Unnamed'),
            'type': node.get('type', 'UNKNOWN')
        })
    
    if 'children' in node:
        for child in node['children']:
            get_all_node_ids(child, node_list)
    
    return node_list

def export_images():
    """Export images from Figma"""
    # Load the design data
    with open('figma_design_data.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Get the main frame (Desktop - 1)
    document = data['document']
    main_frame = document['children'][0]['children'][0]  # Page 1 -> Desktop - 1
    
    # Collect nodes to export (all direct children + the wheel group)
    nodes_to_export = []
    for child in main_frame.get('children', []):
        node_info = {
            'id': child['id'],
            'name': child.get('name', 'Unnamed'),
            'type': child.get('type', ''),
            'bbox': child.get('absoluteBoundingBox', {})
        }
        nodes_to_export.append(node_info)
    
    print(f"Found {len(nodes_to_export)} nodes to export")
    
    # Create exports directory
    os.makedirs('exports', exist_ok=True)
    
    # Export in batches (Figma API has limits)
    batch_size = 10
    for i in range(0, len(nodes_to_export), batch_size):
        batch = nodes_to_export[i:i + batch_size]
        node_ids = [node['id'] for node in batch]
        
        # Request image URLs
        url = f"https://api.figma.com/v1/images/{FIGMA_FILE_KEY}"
        headers = {"X-Figma-Token": FIGMA_TOKEN}
        params = {
            "ids": ",".join(node_ids),
            "format": "png",
            "scale": 2
        }
        
        print(f"\nExporting batch {i//batch_size + 1}...")
        response = requests.get(url, headers=headers, params=params)
        
        if response.status_code == 200:
            result = response.json()
            images = result.get('images', {})
            
            # Download each image
            for node in batch:
                node_id = node['id']
                if node_id in images and images[node_id]:
                    image_url = images[node_id]
                    # Clean filename
                    filename = node['name'].replace(' ', '_').replace('/', '_')
                    filepath = f"exports/{filename}.png"
                    
                    try:
                        urlretrieve(image_url, filepath)
                        print(f"  ✓ {node['name']} -> {filepath}")
                    except Exception as e:
                        print(f"  ✗ Failed to download {node['name']}: {e}")
                else:
                    print(f"  - No image for {node['name']}")
        else:
            print(f"  Error: {response.status_code}")
            print(response.text)
    
    print("\n✓ Export complete! Images saved to exports/")

def generate_css_layout():
    """Generate CSS with layout information"""
    with open('figma_design_data.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    document = data['document']
    main_frame = document['children'][0]['children'][0]
    
    css_output = []
    css_output.append("/* Generated CSS from Figma Design */")
    css_output.append(f"/* File: {data.get('name', 'Unknown')} */")
    css_output.append(f"/* Frame: {main_frame.get('name', 'Unknown')} - {main_frame.get('absoluteBoundingBox', {}).get('width', 0):.0f}x{main_frame.get('absoluteBoundingBox', {}).get('height', 0):.0f}px */\n")
    
    css_output.append(".roulette-container {")
    css_output.append(f"  width: {main_frame.get('absoluteBoundingBox', {}).get('width', 1920):.0f}px;")
    css_output.append(f"  height: {main_frame.get('absoluteBoundingBox', {}).get('height', 1080):.0f}px;")
    css_output.append("  position: relative;")
    css_output.append("  background-color: #000000;")
    css_output.append("}\n")
    
    # Generate CSS for each component
    for child in main_frame.get('children', []):
        name = child.get('name', 'unnamed').lower().replace(' ', '-')
        bbox = child.get('absoluteBoundingBox', {})
        
        # Get fill color if available
        fills = child.get('fills', [])
        bg_color = ""
        if fills and len(fills) > 0 and fills[0].get('type') == 'SOLID':
            color = fills[0].get('color', {})
            r = int(color.get('r', 0) * 255)
            g = int(color.get('g', 0) * 255)
            b = int(color.get('b', 0) * 255)
            a = color.get('a', 1)
            if a == 1:
                bg_color = f"  background-color: #{r:02x}{g:02x}{b:02x};"
            else:
                bg_color = f"  background-color: rgba({r}, {g}, {b}, {a});"
        
        css_output.append(f".{name} {{")
        css_output.append(f"  position: absolute;")
        css_output.append(f"  left: {bbox.get('x', 0):.0f}px;")
        css_output.append(f"  top: {bbox.get('y', 0):.0f}px;")
        css_output.append(f"  width: {bbox.get('width', 0):.0f}px;")
        css_output.append(f"  height: {bbox.get('height', 0):.0f}px;")
        if bg_color:
            css_output.append(bg_color)
        css_output.append("}\n")
    
    # Save CSS
    with open('layout.css', 'w', encoding='utf-8') as f:
        f.write('\n'.join(css_output))
    
    print("✓ Generated layout.css")

if __name__ == "__main__":
    print("=" * 80)
    print("EXPORTING FIGMA DESIGN ASSETS")
    print("=" * 80)
    
    export_images()
    generate_css_layout()
    
    print("\n" + "=" * 80)
    print("EXPORT COMPLETE!")
    print("=" * 80)
    print("\nNext steps:")
    print("  1. Check the exports/ folder for all design assets")
    print("  2. Review layout.css for positioning and sizing")
    print("  3. Start building the roulette game!")

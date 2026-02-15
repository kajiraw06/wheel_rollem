import requests
import json
import os

# Figma API configuration
FIGMA_FILE_KEY = "umLng8LozH8lWdqmAtpLed"
FIGMA_NODE_ID = "0-3"
FIGMA_TOKEN = os.getenv("FIGMA_TOKEN", "")  # Set FIGMA_TOKEN environment variable

def fetch_figma_file():
    """Fetch the Figma file data"""
    url = f"https://api.figma.com/v1/files/{FIGMA_FILE_KEY}"
    headers = {
        "X-Figma-Token": FIGMA_TOKEN
    }
    
    print(f"Fetching Figma file: {FIGMA_FILE_KEY}...")
    response = requests.get(url, headers=headers)
    
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Error: {response.status_code}")
        print(response.text)
        return None

def fetch_figma_images(node_ids):
    """Fetch rendered images for specific nodes"""
    url = f"https://api.figma.com/v1/images/{FIGMA_FILE_KEY}"
    headers = {
        "X-Figma-Token": FIGMA_TOKEN
    }
    params = {
        "ids": ",".join(node_ids),
        "format": "png",
        "scale": 2
    }
    
    print(f"Fetching images for nodes: {node_ids}...")
    response = requests.get(url, headers=headers, params=params)
    
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Error: {response.status_code}")
        print(response.text)
        return None

def extract_colors(data):
    """Extract color palette from the design"""
    colors = set()
    
    def traverse(node):
        if isinstance(node, dict):
            # Check for fills
            if 'fills' in node:
                for fill in node['fills']:
                    if fill.get('type') == 'SOLID' and 'color' in fill:
                        color = fill['color']
                        r = int(color.get('r', 0) * 255)
                        g = int(color.get('g', 0) * 255)
                        b = int(color.get('b', 0) * 255)
                        a = color.get('a', 1)
                        if a == 1:
                            colors.add(f"#{r:02x}{g:02x}{b:02x}")
                        else:
                            colors.add(f"rgba({r}, {g}, {b}, {a})")
            
            # Check for strokes
            if 'strokes' in node:
                for stroke in node['strokes']:
                    if stroke.get('type') == 'SOLID' and 'color' in stroke:
                        color = stroke['color']
                        r = int(color.get('r', 0) * 255)
                        g = int(color.get('g', 0) * 255)
                        b = int(color.get('b', 0) * 255)
                        a = color.get('a', 1)
                        if a == 1:
                            colors.add(f"#{r:02x}{g:02x}{b:02x}")
                        else:
                            colors.add(f"rgba({r}, {g}, {b}, {a})")
            
            # Traverse children
            if 'children' in node:
                for child in node['children']:
                    traverse(child)
    
    traverse(data)
    return sorted(list(colors))

def extract_text_styles(data):
    """Extract typography information"""
    text_styles = []
    
    def traverse(node):
        if isinstance(node, dict):
            if node.get('type') == 'TEXT':
                style = {
                    'name': node.get('name', 'Unnamed'),
                    'fontFamily': node.get('style', {}).get('fontFamily', ''),
                    'fontSize': node.get('style', {}).get('fontSize', ''),
                    'fontWeight': node.get('style', {}).get('fontWeight', ''),
                    'lineHeight': node.get('style', {}).get('lineHeightPx', ''),
                    'letterSpacing': node.get('style', {}).get('letterSpacing', 0),
                }
                text_styles.append(style)
            
            if 'children' in node:
                for child in node['children']:
                    traverse(child)
    
    traverse(data)
    return text_styles

def extract_components(data):
    """Extract component information"""
    components = []
    
    def traverse(node):
        if isinstance(node, dict):
            node_type = node.get('type', '')
            if node_type in ['FRAME', 'COMPONENT', 'INSTANCE']:
                component = {
                    'id': node.get('id', ''),
                    'name': node.get('name', ''),
                    'type': node_type,
                    'width': node.get('absoluteBoundingBox', {}).get('width', 0),
                    'height': node.get('absoluteBoundingBox', {}).get('height', 0),
                    'x': node.get('absoluteBoundingBox', {}).get('x', 0),
                    'y': node.get('absoluteBoundingBox', {}).get('y', 0),
                }
                components.append(component)
            
            if 'children' in node:
                for child in node['children']:
                    traverse(child)
    
    traverse(data)
    return components

def main():
    if not FIGMA_TOKEN:
        print("Error: FIGMA_TOKEN not set!")
        print("Please set your Figma personal access token:")
        print("  - As an environment variable: export FIGMA_TOKEN='your_token'")
        print("  - Or edit this file and set FIGMA_TOKEN directly")
        return
    
    # Fetch the file data
    file_data = fetch_figma_file()
    
    if not file_data:
        print("Failed to fetch Figma file")
        return
    
    # Save complete file data
    with open('figma_design_data.json', 'w', encoding='utf-8') as f:
        json.dump(file_data, f, indent=2)
    print("✓ Saved complete design data to figma_design_data.json")
    
    # Extract and save specific information
    document = file_data.get('document', {})
    
    # Extract colors
    colors = extract_colors(document)
    print(f"\n✓ Found {len(colors)} colors:")
    for color in colors[:10]:  # Show first 10
        print(f"  - {color}")
    
    # Extract text styles
    text_styles = extract_text_styles(document)
    print(f"\n✓ Found {len(text_styles)} text elements")
    
    # Extract components
    components = extract_components(document)
    print(f"\n✓ Found {len(components)} components/frames:")
    for comp in components[:10]:  # Show first 10
        print(f"  - {comp['name']} ({comp['type']}) - {comp['width']}x{comp['height']}px")
    
    # Save extracted data
    extracted_data = {
        'colors': colors,
        'textStyles': text_styles,
        'components': components,
        'metadata': {
            'name': file_data.get('name', ''),
            'lastModified': file_data.get('lastModified', ''),
            'version': file_data.get('version', '')
        }
    }
    
    with open('figma_extracted_data.json', 'w', encoding='utf-8') as f:
        json.dump(extracted_data, f, indent=2)
    print("\n✓ Saved extracted data to figma_extracted_data.json")
    
    # Get node IDs for image export
    node_ids = [comp['id'] for comp in components[:5]]  # Get first 5 components
    if node_ids:
        print(f"\n✓ You can export images for these nodes:")
        for node_id in node_ids:
            print(f"  - {node_id}")

if __name__ == "__main__":
    main()

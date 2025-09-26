#!/usr/bin/env python3
"""
Update token TypeScript files to use single-line animated sprites.
Changes animation type from 'rowColumn' to 'line' and updates URLs and dimensions.
"""

import os
import re
import glob
from typing import List, Dict

def get_converted_tokens() -> Dict[str, List[str]]:
    """Get list of tokens that have been converted to line format."""
    converted = {}
    
    # Find all line sprite files
    line_files = glob.glob("client/static/tokens/*/*.png")
    
    for file_path in line_files:
        if "-animated-line.png" in file_path:
            parts = file_path.split('/')
            token_name = parts[3]  # tokens/TOKEN_NAME/file.png
            filename = parts[4]    # 1-animated-line.png
            
            level = filename.split('-')[0]  # Get level number
            
            if token_name not in converted:
                converted[token_name] = []
            converted[token_name].append(level)
    
    # Sort levels for each token
    for token_name in converted:
        converted[token_name].sort()
    
    return converted

def update_token_file(token_file: str, converted_levels: List[str]) -> bool:
    """Update a single token TypeScript file to use line animations."""
    
    with open(token_file, 'r') as f:
        content = f.read()
    
    original_content = content
    updates_made = 0
    
    # Find building section
    building_match = re.search(r'building:\s*{(.*?)},?\s*}\s*as const', content, re.DOTALL)
    if not building_match:
        # Try simpler pattern
        building_match = re.search(r'building:\s*{(.*?)}\s*}', content, re.DOTALL)
        if not building_match:
            print(f"✗ No building section found in {token_file}")
            return False
    
    building_content = building_match.group(1)
    
    # Process each converted level
    for level in converted_levels:
        # Find the specific building level
        level_pattern = rf'{level}:\s*{{(.*?)(?=\d+:\s*{{|\s*}}\s*}})'
        level_match = re.search(level_pattern, building_content, re.DOTALL)
        
        if not level_match:
            continue
            
        level_content = level_match.group(1)
        original_level_content = level_content
        
        # Update the animation URL
        url_pattern = r"url:\s*['\"]([^'\"]*)['\"]"
        url_match = re.search(url_pattern, level_content)
        if url_match:
            old_url = url_match.group(1)
            # Replace -animated.png with -animated-line.png
            new_url = old_url.replace('-animated.png', '-animated-line.png')
            level_content = re.sub(url_pattern, f"url: '{new_url}'", level_content)
            updates_made += 1
        
        # Update animation type from rowColumn to line
        type_pattern = r"type:\s*['\"]rowColumn['\"]"
        if re.search(type_pattern, level_content):
            level_content = re.sub(type_pattern, "type: 'line'", level_content)
            updates_made += 1
        
        # Remove width and height properties (not needed for line animations)
        level_content = re.sub(r',?\s*width:\s*\d+,?\s*', '', level_content)
        level_content = re.sub(r',?\s*height:\s*\d+,?\s*', '', level_content)
        
        # Replace the level content in the original content
        if level_content != original_level_content:
            content = content.replace(original_level_content, level_content)
    
    # Only write if changes were made
    if content != original_content:
        with open(token_file, 'w') as f:
            f.write(content)
        print(f"✓ Updated {os.path.basename(token_file)}: {updates_made} animations converted to line format")
        return True
    else:
        print(f"- No changes needed for {os.path.basename(token_file)}")
        return False

def main():
    """Main entry point."""
    print("🚀 Updating token metadata to use line animations...")
    
    # Get converted tokens
    converted_tokens = get_converted_tokens()
    print(f"📋 Found {len(converted_tokens)} tokens with line sprites")
    
    updated_count = 0
    
    # Process each token
    for token_name, levels in converted_tokens.items():
        token_file = f"client/src/lib/tokens/{token_name}.ts"
        
        if not os.path.exists(token_file):
            print(f"✗ Token file not found: {token_file}")
            continue
        
        print(f"\n🔄 Processing {token_name} (levels: {', '.join(levels)})")
        
        if update_token_file(token_file, levels):
            updated_count += 1
    
    print(f"\n🎉 Update complete: {updated_count}/{len(converted_tokens)} token files updated")

if __name__ == "__main__":
    main()
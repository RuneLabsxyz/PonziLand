#!/usr/bin/env python3
"""
Update token TypeScript files to use the single combined sprite per token.
Updates URLs and frame ranges to use the combined sprite files.
"""

import os
import re
import json
from typing import Dict

def load_frame_offsets() -> Dict:
    """Load frame offset data from the JSON file."""
    try:
        with open('frame_offsets.json', 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        print("✗ frame_offsets.json not found. Run combine_token_sprites.py first.")
        return {}

def calculate_total_frames(frame_data: Dict) -> int:
    """Calculate total frame count for a token."""
    total = 0
    for level_data in frame_data.values():
        total += level_data['frame_count']
    return total

def update_token_file(token_name: str, frame_data: Dict) -> bool:
    """Update a token TypeScript file to use combined sprite."""
    
    token_file = f"client/src/lib/tokens/{token_name}.ts"
    
    if not os.path.exists(token_file):
        print(f"✗ Token file not found: {token_file}")
        return False
    
    with open(token_file, 'r') as f:
        content = f.read()
    
    original_content = content
    changes_made = 0
    total_frames = calculate_total_frames(frame_data)
    
    # Process each building level
    for level, level_data in frame_data.items():
        level_num = int(level)
        offset = level_data['offset']
        frame_count = level_data['frame_count']
        
        # Calculate new frameRange
        new_start = offset
        new_end = offset + frame_count - 1
        
        print(f"  Level {level_num}: frames {new_start}-{new_end} ({frame_count} frames)")
        
        # Find the building level section
        level_pattern = rf'({level_num}:\s*{{.*?}})\s*(?=,\s*\d+:\s*{{|\s*}}\s*}})'
        level_match = re.search(level_pattern, content, re.DOTALL)
        
        if not level_match:
            print(f"  ⚠️ Could not find level {level_num} in {token_name}")
            continue
        
        level_content = level_match.group(1)
        original_level_content = level_content
        
        # Update URL to point to combined sprite
        url_pattern = r"url:\s*['\"][^'\"]*['\"]"
        new_url = f"url: '/tokens/{token_name}/animated-combined.png'"
        level_content = re.sub(url_pattern, new_url, level_content)
        changes_made += 1
        
        # Update width to total frame count
        width_pattern = r"width:\s*\d+"
        new_width = f"width: {total_frames}"
        level_content = re.sub(width_pattern, new_width, level_content)
        changes_made += 1
        
        # Update frameRange
        frame_range_pattern = r"frameRange:\s*\[\s*\d+,\s*\d+\s*\]"
        new_frame_range = f"frameRange: [{new_start}, {new_end}]"
        level_content = re.sub(frame_range_pattern, new_frame_range, level_content)
        changes_made += 1
        
        # Replace the level content in the main content
        content = content.replace(original_level_content, level_content)
    
    # Write back if changes were made
    if content != original_content:
        with open(token_file, 'w') as f:
            f.write(content)
        print(f"✓ Updated {token_name}.ts: {changes_made} changes made")
        return True
    else:
        print(f"- No changes needed for {token_name}.ts")
        return False

def main():
    """Main entry point."""
    print("🔧 Updating token files to use combined sprites...")
    
    # Load frame offset data
    frame_offsets = load_frame_offsets()
    if not frame_offsets:
        return
    
    print(f"📋 Processing {len(frame_offsets)} tokens")
    
    updated_count = 0
    
    for token_name, frame_data in sorted(frame_offsets.items()):
        print(f"\n🔄 Processing {token_name}")
        total_frames = calculate_total_frames(frame_data)
        print(f"  Total frames: {total_frames}")
        
        if update_token_file(token_name, frame_data):
            updated_count += 1
    
    print(f"\n🎉 Update complete: {updated_count}/{len(frame_offsets)} files updated")

if __name__ == "__main__":
    main()
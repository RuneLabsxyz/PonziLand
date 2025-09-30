#!/usr/bin/env python3
"""
Fix level 3 sprite references that weren't updated properly.
"""

import os
import re
import json

def load_frame_offsets() -> dict:
    """Load frame offset data."""
    try:
        with open('frame_offsets.json', 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        return {}

def fix_level3_references(token_name: str, frame_data: dict) -> bool:
    """Fix level 3 references that still use individual sprites."""
    
    token_file = f"client/src/lib/tokens/{token_name}.ts"
    
    if not os.path.exists(token_file):
        return False
    
    with open(token_file, 'r') as f:
        content = f.read()
    
    original_content = content
    changes_made = 0
    
    # Calculate total frames for this token
    total_frames = sum(level_data['frame_count'] for level_data in frame_data.values())
    
    # Get level 3 data
    if '3' not in frame_data:
        return False
    
    level3_data = frame_data['3']
    offset = level3_data['offset']
    frame_count = level3_data['frame_count']
    new_start = offset
    new_end = offset + frame_count - 1
    
    # Look for level 3 entries that still reference individual line sprites
    pattern = r'(3:\s*{[^}]*?url:\s*[\'\"]/tokens/' + re.escape(token_name) + r'/3-animated-line\.png[\'\"],[^}]*?})'
    
    def replace_level3(match):
        nonlocal changes_made
        level_block = match.group(1)
        
        # Replace URL
        level_block = re.sub(
            r"url:\s*['\"][^'\"]*['\"]",
            f"url: '/tokens/{token_name}/animated-combined.png'",
            level_block
        )
        
        # Replace width
        level_block = re.sub(
            r"width:\s*\d+",
            f"width: {total_frames}",
            level_block
        )
        
        # Replace frameRange
        level_block = re.sub(
            r"frameRange:\s*\[\s*\d+,\s*\d+\s*\]",
            f"frameRange: [{new_start}, {new_end}]",
            level_block
        )
        
        changes_made += 1
        return level_block
    
    content = re.sub(pattern, replace_level3, content, flags=re.DOTALL)
    
    if content != original_content:
        with open(token_file, 'w') as f:
            f.write(content)
        print(f"✓ Fixed level 3 in {token_name}.ts: {changes_made} changes")
        return True
    else:
        print(f"- No level 3 fixes needed for {token_name}.ts")
        return False

def main():
    """Main entry point."""
    print("🔧 Fixing level 3 sprite references...")
    
    frame_offsets = load_frame_offsets()
    if not frame_offsets:
        print("✗ No frame offset data found")
        return
    
    fixed_count = 0
    
    for token_name, frame_data in sorted(frame_offsets.items()):
        if fix_level3_references(token_name, frame_data):
            fixed_count += 1
    
    print(f"\n🎉 Level 3 fixes complete: {fixed_count} files updated")

if __name__ == "__main__":
    main()
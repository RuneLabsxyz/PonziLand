#!/usr/bin/env python3
"""
Final fix for any remaining rowColumn entries in token files.
"""

import os
import re
import glob

def fix_remaining_rowcolumn(token_file: str) -> bool:
    """Fix any remaining rowColumn entries in a token file."""
    
    with open(token_file, 'r') as f:
        content = f.read()
    
    original_content = content
    changes_made = 0
    
    # Find and replace rowColumn entries with -animated.png files
    def replace_animation_block(match):
        nonlocal changes_made
        block = match.group(0)
        
        # Replace URL from -animated.png to -animated-line.png
        if '-animated.png' in block:
            block = re.sub(r'-animated\.png', '-animated-line.png', block)
            changes_made += 1
        
        # Replace type from rowColumn to line
        if 'rowColumn' in block:
            block = re.sub(r"type:\s*['\"]rowColumn['\"]", "type: 'line'", block)
            changes_made += 1
        
        # Remove width and height properties
        block = re.sub(r',?\s*width:\s*\d+\s*,?\s*', ',\n          ', block)
        block = re.sub(r',?\s*height:\s*\d+\s*,?\s*', '', block)
        
        # Clean up formatting
        block = re.sub(r',\s*,', ',', block)  # Remove double commas
        block = re.sub(r',\s*\n\s*,', ',\n          ', block)  # Clean up line breaks
        
        return block
    
    # Match animation blocks that contain rowColumn
    pattern = r'{\s*url:.*?animations:\s*\[[^\]]+\].*?}'
    content = re.sub(pattern, replace_animation_block, content, flags=re.DOTALL)
    
    # Write back if changes were made
    if content != original_content:
        with open(token_file, 'w') as f:
            f.write(content)
        print(f"✓ Fixed {changes_made} remaining issues in {os.path.basename(token_file)}")
        return True
    else:
        print(f"- No issues found in {os.path.basename(token_file)}")
        return False

def main():
    """Main entry point."""
    print("🔧 Final fix for remaining rowColumn entries...")
    
    # Get all token files
    token_files = glob.glob("client/src/lib/tokens/*.ts")
    token_files = [f for f in token_files if not f.endswith('index.ts')]
    
    fixed_count = 0
    
    for token_file in sorted(token_files):
        if fix_remaining_rowcolumn(token_file):
            fixed_count += 1
    
    print(f"\n🎉 Final fix complete: {fixed_count} files updated")

if __name__ == "__main__":
    main()
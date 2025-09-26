#!/usr/bin/env python3
"""
Fix token TypeScript files to use rowColumn with height=1 and appropriate width.
Changes from 'line' type back to 'rowColumn' with correct dimensions for single-row sprites.
"""

import os
import re
import glob

def calculate_frame_width(frame_range_str: str) -> int:
    """Calculate the width (number of frames) from frameRange."""
    match = re.search(r'\[\s*(\d+),\s*(\d+)\s*\]', frame_range_str)
    if match:
        start, end = int(match.group(1)), int(match.group(2))
        return end - start + 1
    return 10  # Default fallback

def fix_token_file(token_file: str) -> bool:
    """Fix a token file to use rowColumn with height=1."""
    
    with open(token_file, 'r') as f:
        content = f.read()
    
    original_content = content
    changes_made = 0
    
    # Find all animation blocks that use line sprites
    def fix_animation_block(match):
        nonlocal changes_made
        block = match.group(0)
        
        # Only process blocks that reference -animated-line.png files
        if '-animated-line.png' not in block:
            return block
        
        # Change type from 'line' back to 'rowColumn'
        if "type: 'line'" in block:
            block = re.sub(r"type:\s*'line'", "type: 'rowColumn'", block)
            changes_made += 1
        
        # Find the frameRange to calculate width
        frame_range_match = re.search(r'frameRange:\s*\[\s*(\d+),\s*(\d+)\s*\]', block)
        if frame_range_match:
            start, end = int(frame_range_match.group(1)), int(frame_range_match.group(2))
            frame_count = end - start + 1
            
            # Add width and height properties after type
            type_pattern = r"(type:\s*'rowColumn'),(\s*)"
            replacement = rf"\1,\2width: {frame_count},\2height: 1,\2"
            block = re.sub(type_pattern, replacement, block)
            changes_made += 1
        
        return block
    
    # Match animation blocks
    pattern = r'{\s*url:.*?animations:\s*\[[^\]]+\].*?}'
    content = re.sub(pattern, fix_animation_block, content, flags=re.DOTALL)
    
    # Write back if changes were made
    if content != original_content:
        with open(token_file, 'w') as f:
            f.write(content)
        print(f"✓ Fixed {os.path.basename(token_file)}: {changes_made} animations updated")
        return True
    else:
        print(f"- No changes needed for {os.path.basename(token_file)}")
        return False

def main():
    """Main entry point."""
    print("🔧 Fixing token files to use rowColumn with height=1...")
    
    # Get all token files that use line sprites
    converted_tokens = [
        'BITCOIN', 'BONK', 'BROTHER', 'DOG', 'DREAMS', 'EKUBO', 
        'ETHEREUM', 'LORDS', 'PAL', 'SCHIZODIO', 'SISTER', 
        'SLAY', 'SOLANA', 'STARKNET', 'USDC'
    ]
    
    fixed_count = 0
    
    for token_name in converted_tokens:
        token_file = f"client/src/lib/tokens/{token_name}.ts"
        
        if os.path.exists(token_file):
            if fix_token_file(token_file):
                fixed_count += 1
        else:
            print(f"✗ File not found: {token_file}")
    
    print(f"\n🎉 Fix complete: {fixed_count} files updated")

if __name__ == "__main__":
    main()
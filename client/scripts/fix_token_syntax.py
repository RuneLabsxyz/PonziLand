#!/usr/bin/env python3
"""
Fix syntax errors in token TypeScript files after the automated update.
"""

import os
import re
import glob

def fix_token_file(token_file: str) -> bool:
    """Fix syntax errors in a token TypeScript file."""
    
    with open(token_file, 'r') as f:
        content = f.read()
    
    original_content = content
    
    # Fix the malformed type property
    # Replace 'type: 'line'animations: [' with 'type: 'line',\n          animations: ['
    content = re.sub(
        r"type:\s*'line'animations:\s*\[",
        "type: 'line',\n          animations: [",
        content
    )
    
    # Write back if changes were made
    if content != original_content:
        with open(token_file, 'w') as f:
            f.write(content)
        print(f"✓ Fixed syntax in {os.path.basename(token_file)}")
        return True
    else:
        print(f"- No syntax issues found in {os.path.basename(token_file)}")
        return False

def main():
    """Main entry point."""
    print("🔧 Fixing syntax errors in token files...")
    
    # Get all token files
    token_files = glob.glob("client/src/lib/tokens/*.ts")
    token_files = [f for f in token_files if not f.endswith('index.ts')]
    
    fixed_count = 0
    
    for token_file in sorted(token_files):
        if fix_token_file(token_file):
            fixed_count += 1
    
    print(f"\n🎉 Fix complete: {fixed_count}/{len(token_files)} files fixed")

if __name__ == "__main__":
    main()
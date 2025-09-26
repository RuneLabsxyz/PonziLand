#!/usr/bin/env python3
"""
Complete the token file updates to ensure all building levels use line animations.
"""

import os
import re
import glob

def complete_token_update(token_file: str) -> bool:
    """Complete the update for a token file, ensuring all levels use line animations."""
    
    with open(token_file, 'r') as f:
        content = f.read()
    
    original_content = content
    
    # Find all animation objects that still use rowColumn
    pattern = r'({\s*url:\s*[\'\"]/tokens/[^/]+/(\d+)-animated\.png[\'\"]\s*,\s*type:\s*[\'\"]rowColumn[\'\"]\s*,\s*width:\s*\d+\s*,\s*height:\s*\d+\s*,\s*animations:\s*\[[^\]]+\](?:\s*,\s*[^}]*)?})'
    
    def replace_animation(match):
        full_match = match.group(1)
        level = match.group(2)
        
        # Replace the URL
        new_content = re.sub(
            r'/tokens/([^/]+)/(\d+)-animated\.png',
            r'/tokens/\1/\2-animated-line.png',
            full_match
        )
        
        # Replace type
        new_content = re.sub(
            r'type:\s*[\'\"]rowColumn[\'\"]\s*,',
            "type: 'line',",
            new_content
        )
        
        # Remove width and height properties
        new_content = re.sub(r',?\s*width:\s*\d+\s*,?\s*', '', new_content)
        new_content = re.sub(r',?\s*height:\s*\d+\s*,?\s*', '', new_content)
        
        # Clean up any double commas
        new_content = re.sub(r',\s*,', ',', new_content)
        
        return new_content
    
    # Apply replacements
    content = re.sub(pattern, replace_animation, content, flags=re.DOTALL)
    
    # Write back if changes were made
    if content != original_content:
        with open(token_file, 'w') as f:
            f.write(content)
        print(f"✓ Completed update for {os.path.basename(token_file)}")
        return True
    else:
        print(f"- {os.path.basename(token_file)} already up to date")
        return False

def main():
    """Main entry point."""
    print("🔄 Completing token file updates...")
    
    # Get all token files that should have line sprites
    converted_tokens = [
        'BITCOIN', 'BONK', 'BROTHER', 'DOG', 'DREAMS', 'EKUBO', 
        'ETHEREUM', 'LORDS', 'PAL', 'SCHIZODIO', 'SISTER', 
        'SLAY', 'SOLANA', 'STARKNET', 'USDC'
    ]
    
    updated_count = 0
    
    for token_name in converted_tokens:
        token_file = f"client/src/lib/tokens/{token_name}.ts"
        
        if os.path.exists(token_file):
            if complete_token_update(token_file):
                updated_count += 1
        else:
            print(f"✗ File not found: {token_file}")
    
    print(f"\n🎉 Update complete: {updated_count} files needed additional updates")

if __name__ == "__main__":
    main()
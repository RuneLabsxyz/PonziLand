#!/usr/bin/env python3
"""
Combine individual line sprites into one sprite file per token.
Creates a single horizontal sprite containing all building levels for each token.
"""

import os
import glob
from PIL import Image
from typing import Dict, List, Tuple

def get_token_sprites() -> Dict[str, List[str]]:
    """Get all line sprite files organized by token."""
    tokens = {}
    
    # Find all line sprite files
    sprite_files = glob.glob("client/static/tokens/*/*-animated-line.png")
    
    for file_path in sprite_files:
        parts = file_path.split('/')
        token_name = parts[3]  # tokens/TOKEN_NAME/file.png
        filename = parts[4]    # 1-animated-line.png
        
        if token_name not in tokens:
            tokens[token_name] = []
        tokens[token_name].append(file_path)
    
    # Sort sprite files by level number
    for token_name in tokens:
        tokens[token_name].sort(key=lambda x: int(os.path.basename(x).split('-')[0]))
    
    return tokens

def combine_token_sprites(token_name: str, sprite_files: List[str]) -> bool:
    """Combine multiple line sprites into one horizontal sprite."""
    
    if not sprite_files:
        return False
    
    print(f"🔄 Combining {len(sprite_files)} sprites for {token_name}")
    
    # Load all images and get dimensions
    images = []
    max_height = 0
    total_width = 0
    
    for sprite_file in sprite_files:
        try:
            img = Image.open(sprite_file)
            images.append(img)
            max_height = max(max_height, img.height)
            total_width += img.width
            print(f"  - {os.path.basename(sprite_file)}: {img.width}x{img.height}")
        except Exception as e:
            print(f"  ✗ Error loading {sprite_file}: {e}")
            return False
    
    # Create combined image
    combined_img = Image.new('RGBA', (total_width, max_height), (0, 0, 0, 0))
    
    # Paste images horizontally
    current_x = 0
    for img in images:
        # Center vertically if heights differ
        y_offset = (max_height - img.height) // 2
        combined_img.paste(img, (current_x, y_offset))
        current_x += img.width
    
    # Save combined image
    output_path = f"client/static/tokens/{token_name}/animated-combined.png"
    combined_img.save(output_path, 'PNG', optimize=True)
    
    print(f"  ✓ Saved combined sprite: {output_path} ({total_width}x{max_height})")
    return True

def calculate_frame_offsets(token_name: str, sprite_files: List[str]) -> Dict[int, Dict]:
    """Calculate frame offsets and counts for each building level."""
    offsets = {}
    current_offset = 0
    
    for i, sprite_file in enumerate(sprite_files):
        level = int(os.path.basename(sprite_file).split('-')[0])
        
        try:
            img = Image.open(sprite_file)
            frame_width = img.width
            frame_height = img.height
            
            # Try to determine frame count from metadata file
            token_file = f"client/src/lib/tokens/{token_name}.ts"
            frame_count = 10  # Default
            
            if os.path.exists(token_file):
                with open(token_file, 'r') as f:
                    content = f.read()
                
                # Look for frameRange for this level
                import re
                level_pattern = rf'{level}:.*?frameRange:\s*\[\s*(\d+),\s*(\d+)\s*\]'
                match = re.search(level_pattern, content, re.DOTALL)
                if match:
                    start, end = int(match.group(1)), int(match.group(2))
                    frame_count = end - start + 1
            
            # Calculate individual frame dimensions
            individual_frame_width = frame_width // frame_count
            
            offsets[level] = {
                'offset': current_offset,
                'frame_count': frame_count,
                'individual_frame_width': individual_frame_width,
                'sprite_width': frame_width,
                'sprite_height': frame_height
            }
            
            current_offset += frame_count
            
        except Exception as e:
            print(f"  ✗ Error processing {sprite_file}: {e}")
    
    return offsets

def main():
    """Main entry point."""
    print("🚀 Combining line sprites into single files per token...")
    
    # Get all token sprites
    token_sprites = get_token_sprites()
    print(f"📋 Found sprites for {len(token_sprites)} tokens")
    
    combined_count = 0
    frame_data = {}
    
    for token_name, sprite_files in sorted(token_sprites.items()):
        print(f"\n🔄 Processing {token_name}")
        
        # Calculate frame offsets first
        offsets = calculate_frame_offsets(token_name, sprite_files)
        frame_data[token_name] = offsets
        
        print(f"  Frame layout:")
        for level, data in offsets.items():
            print(f"    Level {level}: offset {data['offset']}, {data['frame_count']} frames")
        
        # Combine sprites
        if combine_token_sprites(token_name, sprite_files):
            combined_count += 1
    
    print(f"\n🎉 Combination complete: {combined_count}/{len(token_sprites)} tokens processed")
    
    # Save frame offset data for the TypeScript update script
    import json
    with open('frame_offsets.json', 'w') as f:
        json.dump(frame_data, f, indent=2)
    print("💾 Saved frame offset data to frame_offsets.json")

if __name__ == "__main__":
    main()
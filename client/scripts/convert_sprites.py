#!/usr/bin/env python3
"""
Sprite conversion script for PonziLand tokens.
Converts token PNG sprites from grid format to single line format using metadata.

Usage:
    # Convert all tokens
    python convert_sprites.py
    
    # Convert specific tokens
    python convert_sprites.py BITCOIN ETHEREUM SOLANA
    
    # With virtual environment
    source venv/bin/activate && python convert_sprites.py

The script reads token metadata from client/src/lib/tokens/*.ts files to determine:
- Grid dimensions (width x height)
- Frame count and range
- Input PNG file paths

Output files are saved as *-animated-line.png in the same directory as input files.
"""

import os
import sys
import re
import glob
from PIL import Image
from typing import Dict, List, Tuple, Optional


class SpriteConverter:
    def __init__(self, client_dir: str = "client"):
        self.client_dir = client_dir
        self.tokens_dir = os.path.join(client_dir, "src", "lib", "tokens")
        self.static_dir = os.path.join(client_dir, "static", "tokens")
    
    def parse_token_metadata(self, token_file: str) -> Dict:
        """Parse a token TypeScript file to extract animation metadata."""
        with open(token_file, 'r') as f:
            content = f.read()
        
        metadata = {}
        
        # Extract token name from filename
        token_name = os.path.basename(token_file).replace('.ts', '')
        if token_name == 'index':
            return metadata
            
        metadata['name'] = token_name
        metadata['buildings'] = {}
        
        # Find building definitions using simpler approach
        # Look for building: { pattern first
        building_section_match = re.search(r'building:\s*{(.*?)},?\s*}\s*as const', content, re.DOTALL)
        if not building_section_match:
            # Try simpler pattern
            building_section_match = re.search(r'building:\s*{(.*?)}\s*}', content, re.DOTALL)
            if not building_section_match:
                return metadata
        
        building_content = building_section_match.group(1)
        
        # Now find individual building levels
        building_pattern = r'(\d+):\s*{(.*?)},?\s*(?=\d+:\s*{|$)'
        
        for match in re.finditer(building_pattern, building_content, re.DOTALL):
            building_level = int(match.group(1))
            building_block = match.group(2)
            
            # Look for animations array within this building
            # Use a more specific pattern to capture the full animation object including nested arrays
            animations_match = re.search(r'animations:\s*\[(.*?)\]\s*,?\s*(?=\w+:|$)', building_block, re.DOTALL)
            if not animations_match:
                continue
                
            animations_content = animations_match.group(1)
            
            # Extract animation details from the first animation object
            url_match = re.search(r"url:\s*['\"]([^'\"]*)['\"]", animations_content)
            width_match = re.search(r"width:\s*(\d+)", animations_content)
            height_match = re.search(r"height:\s*(\d+)", animations_content)
            # Look for frameRange within animations array inside the animation object
            frame_range_match = re.search(r"frameRange:\s*\[\s*(\d+),\s*(\d+)\s*\]", animations_content)
            
            if url_match and width_match and height_match and frame_range_match:
                metadata['buildings'][building_level] = {
                    'url': url_match.group(1),
                    'grid_width': int(width_match.group(1)),
                    'grid_height': int(height_match.group(1)),
                    'frame_start': int(frame_range_match.group(1)),
                    'frame_end': int(frame_range_match.group(2))
                }
        
        return metadata
    
    def convert_grid_to_line(self, input_path: str, output_path: str, 
                           grid_width: int, grid_height: int, 
                           frame_start: int, frame_end: int) -> bool:
        """Convert a grid-based sprite sheet to a single line."""
        try:
            # Open the input image
            img = Image.open(input_path)
            img_width, img_height = img.size
            
            # Calculate frame dimensions
            frame_width = img_width // grid_width
            frame_height = img_height // grid_height
            
            # Calculate total frames to extract
            total_frames = frame_end - frame_start + 1
            
            # Create output image (single line)
            output_img = Image.new('RGBA', (frame_width * total_frames, frame_height))
            
            # Extract frames from grid and place in line
            frame_index = 0
            for row in range(grid_height):
                for col in range(grid_width):
                    current_frame_num = row * grid_width + col
                    
                    # Only include frames in the specified range
                    if frame_start <= current_frame_num <= frame_end:
                        # Calculate source coordinates
                        src_x = col * frame_width
                        src_y = row * frame_height
                        
                        # Extract frame
                        frame = img.crop((src_x, src_y, src_x + frame_width, src_y + frame_height))
                        
                        # Place in output image
                        dst_x = frame_index * frame_width
                        output_img.paste(frame, (dst_x, 0))
                        frame_index += 1
            
            # Save the output image
            output_img.save(output_path, 'PNG', optimize=True)
            print(f"✓ Converted: {input_path} -> {output_path}")
            print(f"  Grid: {grid_width}x{grid_height}, Frames: {frame_start}-{frame_end}, Output: {frame_width * total_frames}x{frame_height}")
            
            return True
            
        except Exception as e:
            print(f"✗ Error converting {input_path}: {e}")
            return False
    
    def process_token(self, token_name: str) -> bool:
        """Process all sprites for a single token."""
        token_file = os.path.join(self.tokens_dir, f"{token_name}.ts")
        
        if not os.path.exists(token_file):
            print(f"✗ Token metadata not found: {token_file}")
            return False
        
        print(f"\n🔄 Processing token: {token_name}")
        
        # Parse token metadata
        metadata = self.parse_token_metadata(token_file)
        
        if not metadata.get('buildings'):
            print(f"✗ No building animations found in {token_file}")
            return False
        
        success_count = 0
        total_count = 0
        
        # Process each building level
        for level, building_data in metadata['buildings'].items():
            total_count += 1
            
            # Construct paths
            relative_url = building_data['url']
            if relative_url.startswith('/'):
                relative_url = relative_url[1:]  # Remove leading slash
            
            input_path = os.path.join(self.client_dir, "static", relative_url)
            
            # Generate output filename
            output_filename = f"{level}-animated-line.png"
            output_dir = os.path.join(self.static_dir, token_name)
            output_path = os.path.join(output_dir, output_filename)
            
            # Create output directory if it doesn't exist
            os.makedirs(output_dir, exist_ok=True)
            
            # Check if input file exists
            if not os.path.exists(input_path):
                print(f"✗ Input file not found: {input_path}")
                continue
            
            # Convert the sprite
            if self.convert_grid_to_line(
                input_path, output_path,
                building_data['grid_width'], building_data['grid_height'],
                building_data['frame_start'], building_data['frame_end']
            ):
                success_count += 1
        
        print(f"✓ Token {token_name}: {success_count}/{total_count} sprites converted")
        return success_count > 0
    
    def process_all_tokens(self) -> None:
        """Process all token files."""
        print("🚀 Starting sprite conversion for all tokens...")
        
        # Find all token TypeScript files
        token_files = glob.glob(os.path.join(self.tokens_dir, "*.ts"))
        token_files = [f for f in token_files if not f.endswith('index.ts')]
        
        if not token_files:
            print("✗ No token files found")
            return
        
        processed_count = 0
        total_tokens = len(token_files)
        
        for token_file in sorted(token_files):
            token_name = os.path.basename(token_file).replace('.ts', '')
            if self.process_token(token_name):
                processed_count += 1
        
        print(f"\n🎉 Conversion complete: {processed_count}/{total_tokens} tokens processed")
    
    def process_specific_tokens(self, token_names: List[str]) -> None:
        """Process specific tokens by name."""
        print(f"🚀 Starting sprite conversion for tokens: {', '.join(token_names)}")
        
        processed_count = 0
        
        for token_name in token_names:
            if self.process_token(token_name):
                processed_count += 1
        
        print(f"\n🎉 Conversion complete: {processed_count}/{len(token_names)} tokens processed")


def main():
    """Main entry point."""
    converter = SpriteConverter()
    
    if len(sys.argv) == 1:
        # No arguments - process all tokens
        converter.process_all_tokens()
    else:
        # Process specific tokens
        token_names = sys.argv[1:]
        converter.process_specific_tokens(token_names)


if __name__ == "__main__":
    main()
#!/usr/bin/env python3
"""
Script to rearrange spritesheet PNGs in token directories.
Converts spritesheets from 3-column grid format to single-row format based on metadata.
"""

import os
import json
import sys
from PIL import Image
from pathlib import Path

def load_frame_offsets():
    """Load frame offset metadata from JSON file."""
    try:
        with open('frame_offsets.json', 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        print("Error: frame_offsets.json not found")
        return None
    except json.JSONDecodeError:
        print("Error: Invalid JSON in frame_offsets.json")
        return None

def rearrange_spritesheet(input_path, output_path, frame_count, expected_frame_size=256):
    """
    Convert a 3-column spritesheet to single row format.
    
    Args:
        input_path: Path to input spritesheet
        output_path: Path to output spritesheet
        frame_count: Number of frames in the animation
        expected_frame_size: Expected size of each frame (default 256px)
    """
    try:
        # Open the source image
        img = Image.open(input_path)
        print(f"  Input image: {img.size[0]}x{img.size[1]} pixels")
        
        # Calculate grid dimensions for input (3 columns)
        cols = 3
        rows = (frame_count + cols - 1) // cols  # Ceiling division
        
        # Calculate actual frame size from image dimensions
        frame_width = img.size[0] // cols
        frame_height = img.size[1] // rows
        
        # Use the smaller dimension to ensure square frames
        frame_size = min(frame_width, frame_height)
        
        print(f"  Detected frame size: {frame_size}x{frame_size} pixels (from {cols}x{rows} grid)")
        
        if frame_size != expected_frame_size:
            print(f"  Note: Frame size {frame_size}px differs from expected {expected_frame_size}px")
        
        # Create output image (single row)
        output_width = frame_count * frame_size
        output_height = frame_size
        output_img = Image.new('RGBA', (output_width, output_height), (0, 0, 0, 0))
        
        # Extract and rearrange frames
        for i in range(frame_count):
            # Calculate source position (3-column grid)
            src_col = i % cols
            src_row = i // cols
            src_x = src_col * frame_size
            src_y = src_row * frame_size
            
            # Calculate destination position (single row)
            dst_x = i * frame_size
            dst_y = 0
            
            # Extract frame from source
            frame_box = (src_x, src_y, src_x + frame_size, src_y + frame_size)
            frame = img.crop(frame_box)
            
            # Paste frame to destination
            output_img.paste(frame, (dst_x, dst_y))
        
        # Save the rearranged spritesheet
        output_img.save(output_path, 'PNG', optimize=True)
        print(f"  Output image: {output_width}x{output_height} pixels -> {output_path}")
        
        return frame_size
        
    except Exception as e:
        print(f"  Error processing {input_path}: {e}")
        return False

def process_token(token_name, token_data, base_path="client/static/tokens"):
    """Process all spritesheets for a given token."""
    token_dir = Path(base_path) / token_name
    
    if not token_dir.exists():
        print(f"Token directory not found: {token_dir}")
        return False
    
    print(f"Processing token: {token_name}")
    
    success_count = 0
    total_count = 0
    
    # Process each building level
    for level, level_data in token_data.items():
        total_count += 1
        input_file = f"{level}-animated.png"
        output_file = f"{level}-animated-line.png"
        
        input_path = token_dir / input_file
        output_path = token_dir / output_file
        
        if not input_path.exists():
            print(f"  Warning: Input file not found: {input_path}")
            continue
        
        frame_count = level_data["frame_count"]
        print(f"  Converting {input_file} ({frame_count} frames)")
        
        detected_frame_size = rearrange_spritesheet(input_path, output_path, frame_count)
        if detected_frame_size:
            success_count += 1
            # Update frame offsets with detected frame size
            update_frame_offsets(token_name, level, detected_frame_size, frame_count)
    
    print(f"  Processed {success_count}/{total_count} spritesheets for {token_name}")
    return success_count > 0

def update_frame_offsets(token_name, level, frame_size, frame_count):
    """Update frame_offsets.json with corrected frame size."""
    try:
        with open('frame_offsets.json', 'r') as f:
            data = json.load(f)
        
        if token_name in data and level in data[token_name]:
            data[token_name][level]["individual_frame_width"] = frame_size
            data[token_name][level]["sprite_width"] = frame_count * frame_size
            data[token_name][level]["sprite_height"] = frame_size
            
            with open('frame_offsets.json', 'w') as f:
                json.dump(data, f, indent=2)
            
            print(f"  Updated frame_offsets.json for {token_name} level {level}")
            return True
    except Exception as e:
        print(f"  Warning: Could not update frame_offsets.json: {e}")
        return False

def combine_spritesheets(token_name, token_data, base_path="client/static/tokens"):
    """Combine all level spritesheets into a single combined spritesheet with consistent height."""
    token_dir = Path(base_path) / token_name
    
    print(f"Creating combined spritesheet for {token_name}")
    
    # Collect all line spritesheets
    line_images = []
    total_frames = 0
    max_height = 0
    
    for level in sorted(token_data.keys(), key=int):
        level_data = token_data[level]
        line_file = token_dir / f"{level}-animated-line.png"
        
        if line_file.exists():
            img = Image.open(line_file)
            line_images.append(img)
            total_frames += level_data["frame_count"]
            max_height = max(max_height, img.size[1])
            print(f"  Level {level}: {img.size[0]}x{img.size[1]} pixels ({level_data['frame_count']} frames)")
        else:
            print(f"  Warning: Line spritesheet not found: {line_file}")
    
    if not line_images:
        print("  No line spritesheets found to combine")
        return False
    
    # Calculate total width based on actual frame sizes
    total_width = 0
    for img in line_images:
        total_width += img.size[0]
    
    # Create combined image with consistent height (use max height)
    combined_img = Image.new('RGBA', (total_width, max_height), (0, 0, 0, 0))
    
    # Paste all line images, centering vertically if needed
    current_x = 0
    for img in line_images:
        # Center vertically if image is shorter than max height
        y_offset = (max_height - img.size[1]) // 2
        combined_img.paste(img, (current_x, y_offset))
        current_x += img.size[0]
    
    # Save combined spritesheet
    combined_path = token_dir / "animated-combined.png"
    combined_img.save(combined_path, 'PNG', optimize=True)
    print(f"  Combined spritesheet: {total_width}x{max_height} pixels -> {combined_path}")
    
    # Clean up
    for img in line_images:
        img.close()
    
    return True

def main():
    """Main function to process all tokens."""
    # Load frame offset data
    frame_data = load_frame_offsets()
    if not frame_data:
        return 1
    
    # Process specific token if provided as argument
    if len(sys.argv) > 1:
        token_name = sys.argv[1].upper()
        if token_name in frame_data:
            if process_token(token_name, frame_data[token_name]):
                combine_spritesheets(token_name, frame_data[token_name])
            else:
                print(f"Failed to process token: {token_name}")
                return 1
        else:
            print(f"Token not found in frame_offsets.json: {token_name}")
            return 1
    else:
        # Process all tokens
        total_tokens = len(frame_data)
        processed_tokens = 0
        
        for token_name, token_data in frame_data.items():
            if process_token(token_name, token_data):
                combine_spritesheets(token_name, token_data)
                processed_tokens += 1
        
        print(f"\nSummary: Processed {processed_tokens}/{total_tokens} tokens")
    
    return 0

if __name__ == "__main__":
    exit(main())
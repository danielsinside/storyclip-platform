#!/usr/bin/env python3
"""
Generate clip number overlay images for FFmpeg
Supports 3 styles: simple (text only), badge (rectangle), rounded (circle)
"""
import sys
from PIL import Image, ImageDraw, ImageFont

def generate_clip_number(number, output_path, size=75, bg_color='#000000', text_color='#ffffff', opacity=0.7, style='badge'):
    """Generate a PNG image with a clip number

    Args:
        number: The clip number to display
        output_path: Where to save the PNG
        size: Base size for the indicator
        bg_color: Background color in hex
        text_color: Text color in hex
        opacity: Background opacity (0.0-1.0)
        style: 'simple', 'badge', or 'rounded'
    """

    # Convert hex colors to RGB
    bg_rgb = tuple(int(bg_color.lstrip('#')[i:i+2], 16) for i in (0, 2, 4))
    text_rgb = tuple(int(text_color.lstrip('#')[i:i+2], 16) for i in (0, 2, 4))

    # Load font first to measure text
    font = None
    font_size = int(size * 0.6)
    font_paths = [
        '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
        '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
        None  # Default font
    ]

    for font_path in font_paths:
        try:
            if font_path:
                font = ImageFont.truetype(font_path, font_size)
            else:
                font = ImageFont.load_default()
            break
        except:
            continue

    # Get text dimensions
    text = str(number)
    temp_img = Image.new('RGBA', (1, 1), (0, 0, 0, 0))
    temp_draw = ImageDraw.Draw(temp_img)
    bbox = temp_draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]

    # Calculate image dimensions based on style
    if style == 'simple':
        # No background, just text with small padding
        width = text_width + 10
        height = text_height + 10
    elif style == 'badge':
        # Rectangle with padding (matching frontend: width+40, height+20)
        width = text_width + 40
        height = size + 20
    else:  # rounded
        # Circle with radius based on text size + padding
        radius = max(text_width, text_height) / 2 + 20
        width = height = int(radius * 2)

    # Create image with transparency
    img = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Draw background based on style
    bg_alpha = int(opacity * 255)
    bg_color_rgba = bg_rgb + (bg_alpha,)

    if style == 'badge':
        # Rectangle background
        draw.rectangle([0, 0, width, height], fill=bg_color_rgba)
    elif style == 'rounded':
        # Circle background
        draw.ellipse([0, 0, width, height], fill=bg_color_rgba)
    # simple style: no background

    # Draw text centered
    x = (width - text_width) / 2
    y = (height - text_height) / 2

    draw.text((x, y), text, font=font, fill=text_rgb + (255,))

    # Save image
    img.save(output_path, 'PNG')
    print(f"Generated: {output_path} (style={style})")

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print(f"Usage: {sys.argv[0]} <number> <output_path> [size] [bg_color] [text_color] [opacity] [style]")
        sys.exit(1)

    number = sys.argv[1]
    output_path = sys.argv[2]
    size = int(sys.argv[3]) if len(sys.argv) > 3 else 75
    bg_color = sys.argv[4] if len(sys.argv) > 4 else '#000000'
    text_color = sys.argv[5] if len(sys.argv) > 5 else '#ffffff'
    opacity = float(sys.argv[6]) if len(sys.argv) > 6 else 0.7
    style = sys.argv[7] if len(sys.argv) > 7 else 'badge'

    generate_clip_number(number, output_path, size, bg_color, text_color, opacity, style)

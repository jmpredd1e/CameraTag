"""
Download official April Tag images from GitHub
"""

import requests
import os
from PIL import Image, ImageDraw, ImageFont
import io

def download_apriltag(tag_id, family='tag36h11', output_dir='apriltags'):
    """
    Download official April Tag image from GitHub
    """
    # GitHub raw URL for April Tag images
    base_url = f"https://raw.githubusercontent.com/AprilRobotics/apriltag-imgs/master/{family}"
    
    # Format: tag36_11_00000.png
    filename = f"{family.replace('h', '_')}_{tag_id:05d}.png"
    url = f"{base_url}/{filename}"
    
    try:
        response = requests.get(url)
        response.raise_for_status()
        
        # Save original tag
        filepath = os.path.join(output_dir, filename)
        with open(filepath, 'wb') as f:
            f.write(response.content)
        
        return True
    except Exception as e:
        print(f"❌ Failed to download tag {tag_id}: {e}")
        return False

def create_printable_tag(tag_id, family='tag36h11', size_inches=3, output_dir='apriltags_printable'):
    """
    Create a printable version with ID label and border
    """
    input_file = f"apriltags/{family.replace('h', '_')}_{tag_id:05d}.png"
    
    if not os.path.exists(input_file):
        print(f"⚠️  Tag {tag_id} not found")
        return
    
    # Open original tag
    img = Image.open(input_file)
    
    # Calculate size at 300 DPI
    dpi = 300
    size_px = int(size_inches * dpi)
    
    # Resize tag to desired print size
    img_resized = img.resize((size_px, size_px), Image.Resampling.NEAREST)
    
    # Create larger canvas with space for label
    label_height = int(0.5 * dpi)  # 0.5 inch for label
    canvas = Image.new('RGB', (size_px, size_px + label_height), 'white')
    canvas.paste(img_resized, (0, 0))
    
    # Add text label
    draw = ImageDraw.Draw(canvas)
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 60)
    except:
        try:
            font = ImageFont.truetype("arial.ttf", 60)
        except:
            font = ImageFont.load_default()
    
    text = f"Player {tag_id + 1} • Tag ID: {tag_id}"
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_x = (size_px - text_width) // 2
    text_y = size_px + 20
    
    draw.text((text_x, text_y), text, fill='black', font=font)
    
    # Save printable version
    output_file = os.path.join(output_dir, f"player_{tag_id + 1}_tag_{tag_id}.png")
    canvas.save(output_file, dpi=(dpi, dpi))
    
    return output_file

def main():
    print("=" * 70)
    print("🏷️  April Tag Downloader for Laser Tag")
    print("=" * 70)
    
    # Create directories
    os.makedirs('apriltags', exist_ok=True)
    os.makedirs('apriltags_printable', exist_ok=True)
    
    num_tags = 51  # IDs 0-50 for 51 players
    
    print(f"\n📥 Downloading {num_tags} official April Tags from GitHub...")
    print("   This may take a minute...\n")
    
    successful = 0
    for tag_id in range(num_tags):
        if download_apriltag(tag_id):
            successful += 1
            if (tag_id + 1) % 10 == 0:
                print(f"   ✅ Downloaded {tag_id + 1}/{num_tags} tags")
    
    print(f"\n✅ Successfully downloaded {successful}/{num_tags} tags")
    
    # Create printable versions
    print("\n🖨️  Creating printable versions with labels...")
    for tag_id in range(num_tags):
        create_printable_tag(tag_id, size_inches=3)
        if (tag_id + 1) % 10 == 0:
            print(f"   ✅ Created {tag_id + 1}/{num_tags} printable tags")
    
    print("\n" + "=" * 70)
    print("✅ ALL DONE!")
    print("=" * 70)
    print("\n📁 Files created:")
    print(f"   - apriltags/ folder: {successful} original tag images")
    print(f"   - apriltags_printable/ folder: {successful} print-ready tags with labels")
    print("\n🖨️  PRINTING INSTRUCTIONS:")
    print("   1. Open files from 'apriltags_printable/' folder")
    print("   2. Print at 100% scale (NO SCALING!)")
    print("   3. Use high quality settings (300 DPI or higher)")
    print("   4. Print on white paper or cardstock")
    print("   5. Each tag will be 3 inches square")
    print("\n📏 MOUNTING RECOMMENDATIONS:")
    print("   - Mount on foam board or thick cardboard")
    print("   - Attach to player's chest or back")
    print("   - Use velcro straps or safety pins")
    print("   - Keep tags flat and uncrinkled")
    print("\n💡 TAG SIZE GUIDE:")
    print("   - 2 inches: Close range (3-6 feet)")
    print("   - 3 inches: Medium range (6-12 feet) ← RECOMMENDED")
    print("   - 4 inches: Long range (12-20 feet)")
    print("\n⚠️  IMPORTANT:")
    print("   - Avoid glossy paper (causes glare)")
    print("   - Ensure good lighting when playing")
    print("   - Tags work best at 45° or less angle")

if __name__ == '__main__':
    # Check if requests is installed
    try:
        import requests
    except ImportError:
        print("❌ Error: 'requests' library not found")
        print("📦 Install with: pip install requests pillow")
        exit(1)
    
    main()
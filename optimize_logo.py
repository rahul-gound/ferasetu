import os
import sys

try:
    from PIL import Image
except ImportError:
    import subprocess
    print("Installing Pillow...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "Pillow"])
    from PIL import Image

input_path = "frontend/public/logo.png"
output_path = "frontend/public/logo.webp"

if not os.path.exists(input_path):
    print(f"Error: {input_path} not found.")
    sys.exit(1)

with Image.open(input_path) as img:
    # Ensure it has an alpha channel for transparency
    img = img.convert("RGBA")
    
    # Target height is 128px for sharp display on retina displays (rendered at 32px or 48px)
    target_height = 128
    
    # Calculate aspect ratio
    aspect_ratio = img.width / img.height
    target_width = int(target_height * aspect_ratio)
    
    # Resize with high-quality resampling
    resized_img = img.resize((target_width, target_height), Image.Resampling.LANCZOS)
    
    # Save as WebP with good quality
    resized_img.save(output_path, "WEBP", quality=85, method=6)
    
    print(f"Original size: {os.path.getsize(input_path) / 1024:.2f} KB")
    print(f"Optimized size: {os.path.getsize(output_path) / 1024:.2f} KB")
    print(f"Saved optimized logo to {output_path}")

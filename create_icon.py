from PIL import Image, ImageDraw, ImageFont
import sys

def create_icon(size):
    # Create black background
    img = Image.new('RGB', (size, size), color='black')
    draw = ImageDraw.Draw(img)
    
    # Draw cyan square for player
    cyan = (0, 255, 204)
    player_size = size // 10
    player_x = (size - player_size) // 2
    player_y = size - size // 6
    draw.rectangle([player_x, player_y, player_x + player_size, player_y + player_size], fill=cyan)
    
    # Draw red enemy squares
    red = (255, 51, 102)
    enemy_size = size // 15
    draw.rectangle([size//3, size//2, size//3 + enemy_size, size//2 + enemy_size], fill=red)
    draw.rectangle([2*size//3, size//3, 2*size//3 + enemy_size, size//3 + enemy_size], fill=red)
    
    # Draw BR text
    try:
        font_size = size // 8
        # Try to use a monospace font, fall back to default if not available
        from PIL import ImageFont
        font = ImageFont.load_default()
    except:
        font = None
    
    text = "BR"
    draw.text((size//2, size - size//12), text, fill=cyan, anchor="mm", font=font)
    
    return img

# Create both sizes
icon_192 = create_icon(192)
icon_192.save('icon-192.png')

icon_512 = create_icon(512)
icon_512.save('icon-512.png')

print("Icons created successfully")

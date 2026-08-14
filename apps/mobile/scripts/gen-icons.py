"""Generate Kairos mobile app icons + splash from the shared dove logo.

Design system: Modern Sanctuary
  Primary purple: #5D3FD3 (BG for icon, adaptive-icon background is set in app.config.ts)
  Gold accent:    #f8b537 (unused here, reserved for in-app accents)
"""
from PIL import Image
from pathlib import Path

REPO = Path("/home/danielbolarinwa/kharis-github/kairos")
SRC = REPO / "apps/web/public/logo.png"
OUT = REPO / "apps/mobile/assets"
OUT.mkdir(parents=True, exist_ok=True)

PURPLE = (93, 63, 211, 255)     # #5D3FD3 — Modern Sanctuary primary
TRANSPARENT = (0, 0, 0, 0)

def load_dove():
    """Load the white dove logo — RGBA with transparent bg."""
    dove = Image.open(SRC).convert("RGBA")
    # The source is a white outline on transparent. Perfect for our use.
    return dove

def compose(canvas_size, bg_color, dove_scale=0.65):
    """Composite a scaled dove onto a colored canvas, centered."""
    canvas = Image.new("RGBA", (canvas_size, canvas_size), bg_color)
    dove = load_dove()

    target = int(canvas_size * dove_scale)
    ratio = target / max(dove.size)
    new_size = (int(dove.size[0] * ratio), int(dove.size[1] * ratio))
    dove_scaled = dove.resize(new_size, Image.Resampling.LANCZOS)

    x = (canvas_size - new_size[0]) // 2
    y = (canvas_size - new_size[1]) // 2
    canvas.paste(dove_scaled, (x, y), dove_scaled)
    return canvas

# 1. icon.png (1024x1024): full-bleed purple, dove takes ~65% of the canvas.
#    Used as the iOS App Store icon and the base Expo icon.
icon = compose(1024, PURPLE, dove_scale=0.65)
icon.save(OUT / "icon.png", "PNG")
print(f"wrote {OUT / 'icon.png'}  {icon.size}")

# 2. adaptive-icon.png (1024x1024): transparent bg, dove smaller (~50%) to fit
#    Android's adaptive-icon safe zone. Launcher composites the app.config.ts
#    backgroundColor (#5D3FD3) behind this.
adaptive = compose(1024, TRANSPARENT, dove_scale=0.50)
adaptive.save(OUT / "adaptive-icon.png", "PNG")
print(f"wrote {OUT / 'adaptive-icon.png'}  {adaptive.size}")

# 3. splash-icon.png (512x512): the mark that sits in the middle of the splash.
#    Expo splash sizes this into a ~200dp element by default. Transparent bg so
#    it composes over whatever backgroundColor the splash plugin uses.
splash = compose(512, TRANSPARENT, dove_scale=0.75)
splash.save(OUT / "splash-icon.png", "PNG")
print(f"wrote {OUT / 'splash-icon.png'}  {splash.size}")

# 4. favicon.png (48x48): tiny web favicon. Same layout as the icon.
favicon = compose(48, PURPLE, dove_scale=0.70)
favicon.save(OUT / "favicon.png", "PNG")
print(f"wrote {OUT / 'favicon.png'}  {favicon.size}")

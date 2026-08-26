from pathlib import Path
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parents[1]
size = 1024
image = Image.new("RGBA", (size, size), "#0b1020")
draw = ImageDraw.Draw(image)
scale = size / 256

def box(x1, y1, x2, y2):
    return tuple(round(value * scale) for value in (x1, y1, x2, y2))

draw.rounded_rectangle(box(0, 0, 256, 256), radius=round(36 * scale), fill="#0b1020")
draw.rounded_rectangle(box(26, 26, 230, 230), radius=round(24 * scale), fill="#e30613")
# Arabic-inspired H mark from the source SVG, rendered as a crisp white glyph.
draw.rectangle(box(72, 70, 106, 186), fill="#ffffff")
draw.rectangle(box(150, 70, 184, 186), fill="#ffffff")
draw.rectangle(box(106, 112, 150, 145), fill="#ffffff")
draw.ellipse(box(183, 49, 207, 73), fill="#f4c400")

png = root / "assets" / "hawr-icon.png"
image.save(png)
image.save(root / "assets" / "hawr-icon.ico", sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])

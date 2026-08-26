from pathlib import Path
import cairosvg
from PIL import Image

root = Path(__file__).resolve().parents[1]
svg = root / "assets" / "hawr-icon.svg"
png = root / "assets" / "hawr-icon.png"
cairosvg.svg2png(url=str(svg), write_to=str(png), output_width=1024, output_height=1024)
base = Image.open(png).convert("RGBA")
base.save(root / "assets" / "hawr-icon.ico", sizes=[(16,16),(24,24),(32,32),(48,48),(64,64),(128,128),(256,256)])

#!/usr/bin/env python3
"""Create product WebPs.

If a source PNG listed in data/sources.json is on disk, resize it to WebP and
clear the placeholder flag. Otherwise, draw a branded stand-in the first time
the destination is missing. Dropping a file at the destination path, or adding
the source PNG and re-running, is how a real photo takes over.
"""

import json
import os
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
PRODUCTS_PATH = ROOT / "data" / "products.json"
SOURCES_PATH = ROOT / "data" / "sources.json"
META_PATH = ROOT / "data" / "image-meta.json"
MAX_EDGE = 1600
QUALITY = 76

TONES = {
    "ink": {"bg": (14, 16, 15), "fg": (243, 238, 228), "muted": (176, 168, 152), "line": (166, 133, 88)},
    "cream": {"bg": (244, 239, 228), "fg": (18, 41, 28), "muted": (74, 86, 74), "line": (18, 41, 28)},
    "gray": {"bg": (92, 94, 92), "fg": (246, 243, 236), "muted": (214, 210, 200), "line": (232, 214, 176)},
}


def font(size, serif=False):
    candidates = [
        "/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf" if serif else "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf" if serif else "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf" if serif else "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    ]
    for path in candidates:
        if os.path.exists(path):
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def wrap(draw, text, face, width):
    words = text.split()
    lines, current = [], ""
    for word in words:
        trial = word if not current else current + " " + word
        if draw.textlength(trial, font=face) <= width:
            current = trial
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines or [text]


def draw_crown(draw, cx, cy, scale, fill):
    w, h = 78 * scale, 48 * scale
    left, top = cx - w / 2, cy - h / 2
    points = [
        (left, top + h),
        (left + w * 0.08, top + h * 0.42),
        (left + w * 0.28, top + h * 0.72),
        (left + w * 0.5, top),
        (left + w * 0.72, top + h * 0.72),
        (left + w * 0.92, top + h * 0.42),
        (left + w, top + h),
    ]
    draw.polygon(points, fill=fill)
    band = h * 0.16
    draw.rectangle([left, top + h - band, left + w, top + h], fill=fill)


def placeholder(path, product, image):
    tone = TONES.get(product.get("imageTone"), TONES["ink"])
    width, height = 1200, 1500
    img = Image.new("RGB", (width, height), tone["bg"])
    draw = ImageDraw.Draw(img)
    inset = 56
    draw.rectangle([inset, inset, width - inset, height - inset], outline=tone["line"], width=2)
    draw_crown(draw, width / 2, 280, 1.15, tone["line"])

    brand = font(28)
    label = "SEVENTH DAY GOLF"
    draw.text((width / 2, 390), label, font=brand, fill=tone["fg"], anchor="mm")
    tw = draw.textlength(label, font=brand)
    y = 418
    draw.line([(width / 2 - tw / 2, y), (width / 2 + tw / 2 - 28, y)], fill=tone["line"], width=3)
    draw.ellipse([width / 2 + tw / 2 - 26, y - 10, width / 2 + tw / 2 + 8, y + 10], fill=tone["line"])

    name_face = font(72, serif=True)
    lines = wrap(draw, product["name"], name_face, width - 220)
    block_h = len(lines) * 86
    start = 700 - block_h / 2
    for i, line in enumerate(lines):
        draw.text((width / 2, start + i * 86), line, font=name_face, fill=tone["fg"], anchor="mm")

    view = {
        "front": "FRONT",
        "back": "BACK",
        "front-angle": "FRONT",
        "back-angle": "BACK",
        "model": "ON MODEL",
    }.get(image.get("view"), "STUDIO")
    small = font(22)
    draw.text((width / 2, height - 210), view, font=small, fill=tone["muted"], anchor="mm")
    draw.text((width / 2, height - 160), "STUDIO PHOTO ON THE WAY", font=small, fill=tone["line"], anchor="mm")

    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, "WEBP", quality=80, method=6)


def from_source(src, dest):
    with Image.open(src) as raw:
        im = raw.convert("RGBA")
        bg = Image.new("RGB", im.size, (12, 12, 12))
        bg.paste(im, mask=im.getchannel("A"))
        bg.thumbnail((MAX_EDGE, MAX_EDGE), Image.Resampling.LANCZOS)
        dest.parent.mkdir(parents=True, exist_ok=True)
        bg.save(dest, "WEBP", quality=QUALITY, method=6)


def main():
    products = json.loads(PRODUCTS_PATH.read_text())
    sources = json.loads(SOURCES_PATH.read_text())
    meta = {}
    converted = []
    for product in products["products"]:
        for image in product["images"]:
            dest = ROOT / image["src"]
            source_rel = sources.get(image["src"])
            source = ROOT / source_rel if source_rel else None
            if source and source.exists():
                from_source(source, dest)
                image["placeholder"] = False
                converted.append(image["src"])
            elif not dest.exists():
                placeholder(dest, product, image)
                image["placeholder"] = True
            if dest.exists():
                with Image.open(dest) as saved:
                    meta[image["src"]] = {"width": saved.size[0], "height": saved.size[1]}
    PRODUCTS_PATH.write_text(json.dumps(products, indent=2) + "\n")
    META_PATH.write_text(json.dumps(meta, indent=2) + "\n")
    print(f"images: {len(meta)} webp, {len(converted)} from source png")
    if not converted:
        print("no source mockups found under sdg-mockups/; placeholders left in place")


if __name__ == "__main__":
    main()

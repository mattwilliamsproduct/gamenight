#!/usr/bin/env python3
"""Crop the 3x3 teal silhouette sheet into circular PNGs. No redraw."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

SRC = next(Path('/home/ubuntu/.cursor/projects/agent-repos-gamenight/uploads').glob('Player_Silhouettes_Teal_Cards*.jpg'))
OUT = Path('/agent/repos/gamenight/public/avatars')
ART = Path('/opt/cursor/artifacts/screenshots/rc4-usability')
LOCAL = Path('/agent/repos/gamenight/artifacts/screenshots/rc4-usability')
NAMES = [
    'silhouette-pirate',
    'silhouette-cowboy',
    'silhouette-wizard',
    'silhouette-fisherman',
    'silhouette-flamingo',
    'silhouette-dealer',
    'silhouette-surfer',
    'silhouette-grandma',
    'silhouette-pelican',
]


def crop_cell(im, col, row):
    w, h = im.size
    cw, ch = w / 3, h / 3
    pad = 8
    box = (
        int(col * cw + pad),
        int(row * ch + pad),
        int((col + 1) * cw - pad),
        int((row + 1) * ch - pad),
    )
    cell = im.crop(box).convert('RGBA')
    px = cell.load()
    cream = cell.getpixel((2, 2))
    # Non-cream mask, then take the largest circular island.
    ink = Image.new('L', cell.size, 0)
    ink_px = ink.load()
    for y in range(cell.height):
        for x in range(cell.width):
            r, g, b, a = px[x, y]
            if abs(r - cream[0]) > 22 or abs(g - cream[1]) > 22 or abs(b - cream[2]) > 22:
                ink_px[x, y] = 255
    bbox = ink.getbbox()
    if not bbox:
        return cell
    cx = (bbox[0] + bbox[2]) / 2
    cy = (bbox[1] + bbox[3]) / 2
    radius = max(bbox[2] - bbox[0], bbox[3] - bbox[1]) / 2
    # Keep a 2px ring of the teal stroke; drop cream outside.
    mask = Image.new('L', cell.size, 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((cx - radius, cy - radius, cx + radius, cy + radius), fill=255)
    out = Image.new('RGBA', cell.size, (0, 0, 0, 0))
    out.paste(cell, (0, 0), mask)
    trimmed = out.crop(out.getbbox())
    size = 256
    square = Image.new('RGBA', (trimmed.width, trimmed.width), (0, 0, 0, 0))
    oy = (square.height - trimmed.height) // 2
    square.paste(trimmed, (0, oy), trimmed)
    return square.resize((size, size), Image.Resampling.LANCZOS)


def contact(paths, dest):
    tile = 180
    sheet = Image.new('RGBA', (tile * 3 + 24, tile * 3 + 24), (246, 241, 231, 255))
    for i, path in enumerate(paths):
        im = Image.open(path).convert('RGBA')
        im.thumbnail((tile - 20, tile - 20), Image.Resampling.LANCZOS)
        r, c = divmod(i, 3)
        x = 12 + c * tile + (tile - 20 - im.width) // 2
        y = 12 + r * tile + (tile - 20 - im.height) // 2
        sheet.paste(im, (x, y), im)
    dest.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(dest, 'PNG')
    print('wrote', dest)


def main():
    sheet = Image.open(SRC)
    paths = []
    for i, name in enumerate(NAMES):
        im = crop_cell(sheet, i % 3, i // 3)
        dest = OUT / f'{name}.png'
        im.save(dest, 'PNG', optimize=True)
        paths.append(dest)
        print('wrote', dest, im.size)
    for root in (ART, LOCAL):
        root.mkdir(parents=True, exist_ok=True)
        contact(paths, root / 'after_silhouette_contact.png')


if __name__ == '__main__':
    main()

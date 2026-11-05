#!/usr/bin/env python3
"""Regen PWA / apple-touch from Icon v3. Never writes favicons or the wordmark."""
from pathlib import Path
from PIL import Image

UPLOADS = Path('/home/ubuntu/.cursor/projects/agent-repos-gamenight/uploads')
PUBLIC = Path('/agent/repos/gamenight/public')
ART = Path('/opt/cursor/artifacts/screenshots/rc4-usability')
LOCAL = Path('/agent/repos/gamenight/artifacts/screenshots/rc4-usability')

ICON_SRC = next(UPLOADS.glob('Back_Porch_Games_Icon_v3*.jpg'))

# Teal sampled from the rounded stroke. Used to fill iOS-mask corners
# and to pad the maskable safe zone. Never white.
TEAL = (78, 157, 151, 255)


def nearest(im, size):
    return im.resize((size, size), Image.Resampling.LANCZOS)


def write_png(im, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path, 'PNG', optimize=True)
    print(f'wrote {path} {im.size}')


def flood_white_corners(src):
    """Replace the white field outside the rounded art with the stroke teal."""
    rgba = src.convert('RGBA')
    pixels = rgba.load()
    w, h = rgba.size

    def is_white(x, y):
        r, g, b, a = pixels[x, y]
        return a > 0 and r >= 248 and g >= 248 and b >= 248

    seen = set()
    stack = [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]
    while stack:
        x, y = stack.pop()
        if (x, y) in seen or x < 0 or y < 0 or x >= w or y >= h:
            continue
        if not is_white(x, y):
            continue
        seen.add((x, y))
        pixels[x, y] = TEAL
        stack.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))
    return rgba


def maskable(icon, size):
    canvas = Image.new('RGBA', (size, size), TEAL)
    inner = int(size * 0.8)
    face = nearest(icon, inner)
    x = (size - inner) // 2
    canvas.paste(face, (x, x), face)
    return canvas


def contact_sheet(paths, dest, tile=160, cols=4, background=(18, 28, 30, 255)):
    images = [Image.open(p).convert('RGBA') for p in paths]
    rows = (len(images) + cols - 1) // cols
    sheet = Image.new('RGBA', (cols * tile + 24, rows * tile + 24), background)
    for i, im in enumerate(images):
        fitted = Image.new('RGBA', (tile - 16, tile - 16), (0, 0, 0, 0))
        copy = im.copy()
        copy.thumbnail((tile - 24, tile - 24), Image.Resampling.LANCZOS)
        ox = (fitted.width - copy.width) // 2
        oy = (fitted.height - copy.height) // 2
        fitted.paste(copy, (ox, oy), copy)
        r, c = divmod(i, cols)
        sheet.paste(fitted, (12 + c * tile, 12 + r * tile), fitted)
    write_png(sheet, dest)


def main():
    filled = flood_white_corners(Image.open(ICON_SRC))

    write_png(nearest(filled, 180), PUBLIC / 'apple-touch-icon.png')
    write_png(nearest(filled, 180), PUBLIC / 'bp-apple-touch-icon.png')
    write_png(nearest(filled, 192), PUBLIC / 'bp-icon-192.png')
    write_png(nearest(filled, 512), PUBLIC / 'bp-icon-512.png')
    write_png(maskable(filled, 192), PUBLIC / 'bp-icon-192-maskable.png')
    write_png(maskable(filled, 512), PUBLIC / 'bp-icon-512-maskable.png')

    icons = [
        PUBLIC / 'apple-touch-icon.png',
        PUBLIC / 'bp-icon-192.png',
        PUBLIC / 'bp-icon-512.png',
        PUBLIC / 'bp-icon-192-maskable.png',
        PUBLIC / 'bp-icon-512-maskable.png',
    ]
    for dest_root in (ART, LOCAL):
        dest_root.mkdir(parents=True, exist_ok=True)
        contact_sheet(icons, dest_root / 'after_pwa_icons_contact.png', tile=180, cols=5,
                      background=(246, 241, 231, 255))
        contact_sheet(icons, dest_root / 'after_pwa_icons_contact_dark.png', tile=180, cols=5,
                      background=(18, 28, 30, 255))


if __name__ == '__main__':
    main()

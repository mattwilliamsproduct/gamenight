#!/usr/bin/env python3
"""Generate Back Porch icon sizes and a trimmed wordmark from Matt's v3 / v1 art."""
from pathlib import Path
from PIL import Image

UPLOADS = Path('/home/ubuntu/.cursor/projects/agent-repos-gamenight/uploads')
PUBLIC = Path('/agent/repos/gamenight/public')
ART = Path('/opt/cursor/artifacts/screenshots/rc4-usability')
LOCAL = Path('/agent/repos/gamenight/artifacts/screenshots/rc4-usability')

ICON_SRC = next(UPLOADS.glob('Back_Porch_Games_Icon_v3*.jpg'))
WORD_SRC = next(UPLOADS.glob('Back_Porch_Games_Wordmark_v1*.jpg'))

# Teal from the icon frame, used for maskable padding.
TEAL = (58, 148, 148, 255)


def nearest(im, size):
    return im.resize((size, size), Image.Resampling.LANCZOS)


def write_png(im, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path, 'PNG', optimize=True)
    print(f'wrote {path} {im.size}')


def trim_wordmark(src):
    rgba = src.convert('RGBA')
    pixels = rgba.load()
    w, h = rgba.size
    cream = pixels[0, 0]
    out = Image.new('RGBA', rgba.size, (0, 0, 0, 0))
    dest = out.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            # Cream page around the sign, not the painted wood.
            if abs(r - cream[0]) < 18 and abs(g - cream[1]) < 18 and abs(b - cream[2]) < 18:
                dest[x, y] = (0, 0, 0, 0)
            else:
                dest[x, y] = (r, g, b, a)
    bbox = out.getbbox()
    if not bbox:
        return rgba
    trimmed = out.crop(bbox)
    # Keep a 2% pad so the sign does not kiss the header edge.
    pad_x = max(2, trimmed.width // 50)
    pad_y = max(2, trimmed.height // 50)
    padded = Image.new('RGBA', (trimmed.width + pad_x * 2, trimmed.height + pad_y * 2), (0, 0, 0, 0))
    padded.paste(trimmed, (pad_x, pad_y), trimmed)
    return padded


def maskable(icon, size):
    canvas = Image.new('RGBA', (size, size), TEAL)
    # Safe zone is the center 80%. Keep the whole icon inside that circle-ish box.
    inner = int(size * 0.8)
    face = nearest(icon, inner)
    x = (size - inner) // 2
    canvas.paste(face, (x, x), face)
    return canvas


def contact_sheet(paths, dest, tile=160, cols=4):
    images = [Image.open(p).convert('RGBA') for p in paths]
    rows = (len(images) + cols - 1) // cols
    sheet = Image.new('RGBA', (cols * tile + 24, rows * tile + 24), (246, 241, 231, 255))
    for i, im in enumerate(images):
        fitted = Image.new('RGBA', (tile - 16, tile - 16), (255, 255, 255, 255))
        copy = im.copy()
        copy.thumbnail((tile - 24, tile - 24), Image.Resampling.LANCZOS)
        ox = (fitted.width - copy.width) // 2
        oy = (fitted.height - copy.height) // 2
        fitted.paste(copy, (ox, oy), copy)
        r, c = divmod(i, cols)
        sheet.paste(fitted, (12 + c * tile, 12 + r * tile), fitted)
    write_png(sheet, dest)


def main():
    icon = Image.open(ICON_SRC).convert('RGBA')
    word = trim_wordmark(Image.open(WORD_SRC))

    write_png(nearest(icon, 16), PUBLIC / 'bp-favicon-16.png')
    write_png(nearest(icon, 32), PUBLIC / 'bp-favicon-32.png')
    write_png(nearest(icon, 32), PUBLIC / 'favicon-32.png')
    write_png(nearest(icon, 180), PUBLIC / 'apple-touch-icon.png')
    write_png(nearest(icon, 180), PUBLIC / 'bp-apple-touch-icon.png')
    write_png(nearest(icon, 192), PUBLIC / 'bp-icon-192.png')
    write_png(nearest(icon, 192), PUBLIC / 'icon-192.png')
    write_png(nearest(icon, 512), PUBLIC / 'bp-icon-512.png')
    write_png(nearest(icon, 512), PUBLIC / 'icon-512.png')
    write_png(maskable(icon, 192), PUBLIC / 'bp-icon-192-maskable.png')
    write_png(maskable(icon, 512), PUBLIC / 'bp-icon-512-maskable.png')
    write_png(icon, PUBLIC / 'assets/logo/back-porch-icon.png')
    write_png(word, PUBLIC / 'assets/logo/back-porch-wordmark.png')

    # Simple ICO with 16 and 32.
    nearest(icon, 32).save(
        PUBLIC / 'favicon.ico',
        format='ICO',
        sizes=[(16, 16), (32, 32)]
    )
    print('wrote', PUBLIC / 'favicon.ico')

    for dest_root in (ART, LOCAL):
        dest_root.mkdir(parents=True, exist_ok=True)
        contact_sheet(
            [
                PUBLIC / 'bp-favicon-16.png',
                PUBLIC / 'bp-favicon-32.png',
                PUBLIC / 'apple-touch-icon.png',
                PUBLIC / 'bp-icon-192.png',
                PUBLIC / 'bp-icon-512.png',
                PUBLIC / 'bp-icon-192-maskable.png',
                PUBLIC / 'bp-icon-512-maskable.png',
                PUBLIC / 'assets/logo/back-porch-icon.png',
                PUBLIC / 'assets/logo/back-porch-wordmark.png',
            ],
            dest_root / 'after_icon_contact.png',
            tile=180,
            cols=3
        )


if __name__ == '__main__':
    main()

#!/usr/bin/env python3
"""Trim each Home picker face to the real card edge and pad to exact 5:7."""

from pathlib import Path
from PIL import Image
import numpy as np

ROOT = Path(__file__).resolve().parents[1] / "public/assets/cards"
TARGET = (700, 980)
CREAM = (246, 241, 231, 255)

FACES = [
    "five-crowns.webp",
    "818.webp",
    "wizard.webp",
    "flip7.webp",
    "beat-the-heat.webp",
    "canasta.webp",
    "rook.webp",
]


def empty_mask(arr):
    rgb = arr[:, :, :3].astype(np.int16)
    alpha = arr[:, :, 3]
    near_white = (rgb.min(axis=2) >= 236) & ((rgb.max(axis=2) - rgb.min(axis=2)) <= 18)
    transparent = alpha < 24
    return near_white | transparent


def trim_card(im):
    arr = np.array(im.convert("RGBA"))
    empty = empty_mask(arr)
    content = ~empty
    if not content.any():
        return im.convert("RGBA")
    rows = np.where(content.any(axis=1))[0]
    cols = np.where(content.any(axis=0))[0]
    top, bot = int(rows[0]), int(rows[-1]) + 1
    left, right = int(cols[0]), int(cols[-1]) + 1
    # Drop a 1px anti-alias fringe when the crop is not already tight to the bitmap.
    if bot - top > 8 and right - left > 8:
        top = min(top + 1, bot - 4)
        left = min(left + 1, right - 4)
        bot = max(bot - 1, top + 4)
        right = max(right - 1, left + 4)
    return Image.fromarray(arr[top:bot, left:right], "RGBA")


def edge_fill(im):
    arr = np.array(im.convert("RGBA"))
    h, w = arr.shape[:2]
    band = []
    take = max(2, min(8, h // 40, w // 40))
    band.append(arr[:take, :, :])
    band.append(arr[-take:, :, :])
    band.append(arr[:, :take, :])
    band.append(arr[:, -take:, :])
    pixels = np.concatenate([block.reshape(-1, 4) for block in band], axis=0)
    usable = pixels[pixels[:, 3] >= 80]
    if usable.size == 0:
        return CREAM
    med = np.median(usable[:, :3], axis=0)
    return (int(med[0]), int(med[1]), int(med[2]), 255)


def pad_to_target(im, fill):
    im = im.convert("RGBA")
    scale = min(TARGET[0] / im.width, TARGET[1] / im.height)
    new_size = (max(1, round(im.width * scale)), max(1, round(im.height * scale)))
    resized = im.resize(new_size, Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", TARGET, fill)
    canvas.paste(resized, ((TARGET[0] - new_size[0]) // 2, (TARGET[1] - new_size[1]) // 2), resized)
    return canvas.convert("RGB")


def main():
    ROOT.mkdir(parents=True, exist_ok=True)
    for name in FACES:
        src = ROOT / name
        im = Image.open(src)
        print(f"{name:22} in {im.size[0]}x{im.size[1]} {im.mode}")
        trimmed = trim_card(im)
        fill = edge_fill(trimmed)
        if fill[3] < 80:
            fill = CREAM
        out = pad_to_target(trimmed, fill)
        out.save(src, "WEBP", quality=90, method=6)
        print(f"{name:22} out {out.size[0]}x{out.size[1]} fill {fill} trim {trimmed.size}")


if __name__ == "__main__":
    main()

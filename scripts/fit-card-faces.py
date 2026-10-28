#!/usr/bin/env python3
"""Trim each Home picker face to the real card edge and pad to exact 5:7."""

import sys
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


def empty_mask(arr, keep_white=False):
    rgb = arr[:, :, :3].astype(np.int16)
    alpha = arr[:, :, 3]
    transparent = alpha < 24
    if keep_white:
        return transparent
    near_white = (rgb.min(axis=2) >= 236) & ((rgb.max(axis=2) - rgb.min(axis=2)) <= 18)
    return near_white | transparent


def trim_card(im, keep_white=False, extra_inset=(0, 0, 0, 0), body=None):
    arr = np.array(im.convert("RGBA"))
    if body == "navy":
        rgb = arr[:, :, :3].astype(np.int16)
        content = (rgb[:, :, 2] > 70) & (rgb[:, :, 0] < 90) & (rgb[:, :, 1] < 90)
    else:
        content = ~empty_mask(arr, keep_white=keep_white)
    if not content.any():
        return im.convert("RGBA")
    rows = np.where(content.any(axis=1))[0]
    cols = np.where(content.any(axis=0))[0]
    top, bot = int(rows[0]), int(rows[-1]) + 1
    left, right = int(cols[0]), int(cols[-1]) + 1
    if body == "navy":
        pass
    elif bot - top > 8 and right - left > 8:
        top = min(top + 1, bot - 4)
        left = min(left + 1, right - 4)
        bot = max(bot - 1, top + 4)
        right = max(right - 1, left + 4)
    left += extra_inset[0]
    top += extra_inset[1]
    right -= extra_inset[2]
    bot -= extra_inset[3]
    if right - left < 8 or bot - top < 8:
        return im.convert("RGBA")
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


def pad_to_target(im, fill, cover=False):
    im = im.convert("RGBA")
    if cover:
        scale = max(TARGET[0] / im.width, TARGET[1] / im.height)
    else:
        scale = min(TARGET[0] / im.width, TARGET[1] / im.height)
    new_size = (max(1, round(im.width * scale)), max(1, round(im.height * scale)))
    resized = im.resize(new_size, Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", TARGET, fill)
    x = (TARGET[0] - new_size[0]) // 2
    y = (TARGET[1] - new_size[1]) // 2
    canvas.paste(resized, (x, y), resized)
    return canvas.convert("RGB")


FACE_OPTS = {
    "wizard.webp": {"body": "navy", "cover": True, "fill": (8, 18, 72, 255)},
    "five-crowns.webp": {"designed": True},
}


def main():
    ROOT.mkdir(parents=True, exist_ok=True)
    only = set(sys.argv[1:])
    for name in FACES:
        if only and name not in only and name.removesuffix(".webp") not in only:
            continue
        src = ROOT / name
        im = Image.open(src)
        print(f"{name:22} in {im.size[0]}x{im.size[1]} {im.mode}")
        opts = FACE_OPTS.get(name, {})
        if opts.get("designed"):
            if im.size != TARGET:
                raise SystemExit(f"{name} designed face is {im.size}, expected {TARGET}")
            print(f"{name:22} designed {im.size[0]}x{im.size[1]} (no trim)")
            continue
        trimmed = trim_card(
            im,
            keep_white=bool(opts.get("keep_white")),
            extra_inset=opts.get("extra_inset", (0, 0, 0, 0)),
            body=opts.get("body"),
        )
        fill = opts.get("fill") or edge_fill(trimmed)
        if fill[3] < 80:
            fill = CREAM
        out = pad_to_target(trimmed, fill, cover=bool(opts.get("cover")))
        out.save(src, "WEBP", quality=90, method=6)
        print(f"{name:22} out {out.size[0]}x{out.size[1]} fill {fill} trim {trimmed.size}")


if __name__ == "__main__":
    main()

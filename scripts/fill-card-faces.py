#!/usr/bin/env python3
"""Extend Rook / Beat the Heat to a full 5:7 face without stretching.

Writes cleaned 700x980 defaults. Uses only background pixels on the pads
so subject bits (crow tail, pepper flame) do not repeat at the edge.
"""

from pathlib import Path
from PIL import Image
import numpy as np

ROOT = Path(__file__).resolve().parents[1] / "public/assets/cards"
OUT = ROOT
TARGET = (700, 980)

SPECS = {
    "rook.webp": {
        "inset": 2,
        "radius": 36,
        "white_floor": 220,
        "kind": "rook",
        "period": 242,
    },
    "beat-the-heat.webp": {
        "inset": 4,
        "radius": 36,
        "white_floor": 220,
        "kind": "heat",
        "period": 24,
    },
}


def near_white(rgb, floor=220, spread=30):
    mn = rgb.min(axis=2)
    mx = rgb.max(axis=2)
    return (mn >= floor) & ((mx - mn) <= spread)


def col_std(arr):
    return arr.reshape(arr.shape[0], arr.shape[1], -1).std(axis=0).mean(axis=1)


def body_box(arr, std_cut=8.0):
    cols = np.where(col_std(arr) >= std_cut)[0]
    if cols.size == 0:
        return 0, 0, arr.shape[1], arr.shape[0]
    return int(cols[0]), 0, int(cols[-1]) + 1, arr.shape[0]


def corner_mask(h, w, radius):
    mask = np.zeros((h, w), dtype=bool)
    yy, xx = np.ogrid[:h, :w]
    r2 = radius * radius
    for dy, dx in (
        (yy, xx),
        (yy, w - 1 - xx),
        (h - 1 - yy, xx),
        (h - 1 - yy, w - 1 - xx),
    ):
        mask |= (dy < radius) & (dx < radius) & ((radius - dy) ** 2 + (radius - dx) ** 2 > r2)
    return mask


def inpaint(img, mask, radius=10, passes=3):
    out = img.copy()
    good = ~mask
    ys, xs = np.where(mask)
    if ys.size == 0:
        return out
    for _ in range(passes):
        for y, x in zip(ys, xs):
            y0, y1 = max(0, y - radius), min(out.shape[0], y + radius + 1)
            x0, x1 = max(0, x - radius), min(out.shape[1], x + radius + 1)
            patch = out[y0:y1, x0:x1]
            g = good[y0:y1, x0:x1]
            if g.any():
                out[y, x] = np.median(patch[g], axis=0)
                continue
            cy = 1 if y < out.shape[0] / 2 else -1
            cx = 1 if x < out.shape[1] / 2 else -1
            ty, tx = y, x
            for _step in range(radius * 4):
                ty += cy
                tx += cx
                if ty < 0 or tx < 0 or ty >= out.shape[0] or tx >= out.shape[1]:
                    break
                if good[ty, tx]:
                    out[y, x] = out[ty, tx]
                    break
        good = ~mask
        good[ys, xs] = True
    return out


def rook_bg(img):
    rgb = img.astype(np.int16)
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    teal = (g > r + 28) & (b > r + 36) & (g > 90) & (b > 120)
    return teal


def heat_bg(img):
    lum = img.mean(axis=2)
    subject = near_white(img, floor=188, spread=55) | (lum > 178)
    return ~subject


def fill_corners(content, radius, white_floor):
    h, w = content.shape[:2]
    white = near_white(content, floor=white_floor)
    outside = corner_mask(h, w, radius)
    return inpaint(content, outside | (white & corner_mask(h, w, radius + 8)))


def clean_strip(row, mask):
    """Replace illustration pixels with the nearest background pixel on this row."""
    strip = row.copy()
    missing = np.where(~mask)[0]
    good = np.where(mask)[0]
    if missing.size == 0 or good.size == 0:
        return strip
    for x in missing:
        idx = int(np.argmin(np.abs(good - x)))
        strip[x] = row[good[idx]]
    return strip


def extend_from_strip(canvas, y, strip, x0, x1, seam_on_right):
    """Mirror/wrap a cleaned edge strip into [x0, x1), starting at the body seam."""
    n = strip.shape[0]
    if n < 2:
        canvas[y, x0:x1] = strip[0]
        return
    span = n - 1
    width = x1 - x0
    for i in range(width):
        src = 1 + (i % span)
        if seam_on_right:
            canvas[y, x0 + i] = strip[n - 1 - src]
        else:
            canvas[y, x1 - 1 - i] = strip[src]


def extend_rook(content, src_l, src_r, period):
    h, w = content.shape[:2]
    canvas = np.zeros((h, TARGET[0], 3), dtype=np.uint8)
    canvas[:, src_l:src_r] = content
    bg = rook_bg(content)
    for y in range(h):
        left = clean_strip(content[y, :80], bg[y, :80])
        right = clean_strip(content[y, w - 36 :], bg[y, w - 36 :])
        extend_from_strip(canvas, y, left, 0, src_l, seam_on_right=False)
        extend_from_strip(canvas, y, right, src_r, TARGET[0], seam_on_right=True)
    return canvas


def extend_heat(content, src_l, src_r, band=20):
    h, w = content.shape[:2]
    canvas = np.zeros((h, TARGET[0], 3), dtype=np.uint8)
    canvas[:, src_l:src_r] = content
    bg = heat_bg(content)
    for y in range(h):
        left = clean_strip(content[y, :22], bg[y, :22])
        right = clean_strip(content[y, w - 22 :], bg[y, w - 22 :])
        extend_from_strip(canvas, y, left, 0, src_l, seam_on_right=False)
        extend_from_strip(canvas, y, right, src_r, TARGET[0], seam_on_right=True)
    return canvas


def extend(arr, spec):
    left, top, right, bot = body_box(arr)
    src_l = left + spec["inset"]
    src_r = right - spec["inset"]
    content = fill_corners(arr[top:bot, src_l:src_r].copy(), spec["radius"], spec["white_floor"])
    if spec["kind"] == "rook":
        canvas = extend_rook(content, src_l, src_r, spec["period"])
        canvas = scrub_pad(canvas, src_l, src_r, rook_bg)
    else:
        canvas = extend_heat(content, src_l, src_r, spec["period"])
        canvas = scrub_pad(canvas, src_l, src_r, heat_bg)
    return canvas, (src_l, src_r)


def scrub_pad(canvas, src_l, src_r, bg_fn):
    """Replace leftover subject pixels in the side pads with nearby background."""
    bg = bg_fn(canvas)
    pad = np.zeros(bg.shape, dtype=bool)
    pad[:, :src_l] = True
    pad[:, src_r:] = True
    return inpaint(canvas, pad & ~bg, radius=14, passes=4)


def save_debug(name, before, after, seams):
    dbg = Path("/tmp/cardfill-debug")
    dbg.mkdir(parents=True, exist_ok=True)
    Image.fromarray(after).save(dbg / f"{name}-fill.png")
    src_l, src_r = seams
    h = after.shape[0]
    crops = {
        "left-mid": (h // 2 - 40, h // 2 + 40, max(0, src_l - 24), src_l + 24),
        "right-mid": (h // 2 - 40, h // 2 + 40, src_r - 24, min(TARGET[0], src_r + 24)),
        "left-text": (520, 600, max(0, src_l - 24), src_l + 24),
        "right-text": (520, 600, src_r - 24, min(TARGET[0], src_r + 24)),
        "tl": (0, 48, 0, 48),
        "tr": (0, 48, TARGET[0] - 48, TARGET[0]),
        "bl": (h - 48, h, 0, 48),
        "br": (h - 48, h, TARGET[0] - 48, TARGET[0]),
    }
    for label, (y0, y1, x0, x1) in crops.items():
        crop = after[y0:y1, x0:x1]
        Image.fromarray(np.repeat(np.repeat(crop, 2, axis=0), 2, axis=1)).save(dbg / f"{name}-{label}-2x.png")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for name, spec in SPECS.items():
        arr = np.array(Image.open(ROOT / name).convert("RGB"))
        filled, seams = extend(arr, spec)
        if filled.shape[0] != TARGET[1] or filled.shape[1] != TARGET[0]:
            raise SystemExit(f"{name} fill is {filled.shape}, expected {TARGET[1]}x{TARGET[0]}")
        Image.fromarray(filled).save(OUT / name, "WEBP", quality=92, method=6)
        save_debug(name.removesuffix(".webp"), arr, filled, seams)
        print(f"{name:22} fill {filled.shape[1]}x{filled.shape[0]} seams {seams}")


if __name__ == "__main__":
    main()

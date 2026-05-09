#!/usr/bin/env python3
"""Extract base64 avatar images from index.html into public/avatars/."""
import base64
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
HTML = ROOT / "public" / "index.html"
OUT_DIR = ROOT / "public" / "avatars"
PREFIX = "  const embeddedAvatars = "


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    obj = None
    with HTML.open(encoding="utf-8") as f:
        for line in f:
            if line.startswith(PREFIX):
                json_part = line[len(PREFIX) :].strip().rstrip(";")
                obj = json.loads(json_part)
                break

    if obj is None:
        raise SystemExit(f"Could not find line starting with {PREFIX!r} in {HTML}")

    for filename, data_uri in obj.items():
        if not isinstance(data_uri, str) or "," not in data_uri:
            raise SystemExit(f"Bad data URI for {filename!r}")
        _meta, b64 = data_uri.split(",", 1)
        raw = base64.b64decode(b64, validate=True)
        dest = OUT_DIR / filename
        dest.write_bytes(raw)
        print(f"wrote {dest} ({len(raw)} bytes)")

    print(f"done: {len(obj)} avatars -> {OUT_DIR}")


if __name__ == "__main__":
    main()

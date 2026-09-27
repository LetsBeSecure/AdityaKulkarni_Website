"""
Shrink photos so the site loads fast on phones.

Usage (from the repository root):
    pip install pillow
    python tools/optimize_images.py            # optimise gallery/, recognitions/, photo/, sketches/
    python tools/optimize_images.py --dry-run  # only report what would change

- Resizes anything wider or taller than MAX_EDGE pixels, keeping its shape.
- Fixes phone-camera rotation (EXIF) and strips location metadata.
- Keeps the same file names, so index.html needs no changes.
- Copies every original into _originals/ first (that folder is git-ignored).
"""
import argparse
import shutil
from pathlib import Path

from PIL import Image, ImageOps

MAX_EDGE = 2000       # px; plenty for a full-screen lightbox
JPEG_QUALITY = 82
FOLDERS = ["gallery", "recognitions", "photo", "sketches"]
EXTS = {".jpg", ".jpeg", ".png", ".webp"}

root = Path(__file__).resolve().parent.parent


def main(dry_run: bool) -> None:
    saved_total = 0
    for folder in FOLDERS:
        for path in sorted((root / folder).glob("*")):
            if path.suffix.lower() not in EXTS:
                continue
            before = path.stat().st_size
            with Image.open(path) as im:
                im = ImageOps.exif_transpose(im)
                if max(im.size) <= MAX_EDGE and before < 600_000:
                    print(f"  ok     {path.relative_to(root)}  ({before // 1024} KB)")
                    continue
                if dry_run:
                    print(f"  would  {path.relative_to(root)}  {im.size[0]}x{im.size[1]}, {before // 1024} KB")
                    continue

                backup = root / "_originals" / path.relative_to(root)
                backup.parent.mkdir(parents=True, exist_ok=True)
                if not backup.exists():
                    shutil.copy2(path, backup)

                im.thumbnail((MAX_EDGE, MAX_EDGE), Image.LANCZOS)
                ext = path.suffix.lower()
                if ext in {".jpg", ".jpeg"}:
                    im.convert("RGB").save(path, "JPEG", quality=JPEG_QUALITY, optimize=True, progressive=True)
                elif ext == ".webp":
                    im.save(path, "WEBP", quality=JPEG_QUALITY)
                else:
                    im.save(path, "PNG", optimize=True)

            after = path.stat().st_size
            saved_total += before - after
            print(f"  shrunk {path.relative_to(root)}  {before // 1024} KB -> {after // 1024} KB")

    if not dry_run:
        print(f"\nSaved {saved_total / 1_048_576:.1f} MB in total.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    main(parser.parse_args().dry_run)

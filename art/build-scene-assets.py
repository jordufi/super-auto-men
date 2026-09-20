"""Turns the raw generator drops in art/ into the WebP files the app bundles.

Run from the repo root:  python art/build-scene-assets.py
Needs Pillow and numpy. Output goes to packages/app/src/assets/scene/.

A shop backdrop    D wood swatch        F foreground foliage (white -> alpha)
B battle backdrop  E parchment swatch   C title backdrop
"""

from pathlib import Path

import numpy as np
from PIL import Image

ART = Path(__file__).parent
OUT = ART.parent / "packages" / "app" / "src" / "assets" / "scene"
OUT.mkdir(parents=True, exist_ok=True)


def load(name: str) -> np.ndarray:
    return np.asarray(Image.open(ART / name).convert("RGB")).astype(float)


def save(name: str, pixels: np.ndarray, size: tuple[int, int] | None = None, **opts) -> None:
    img = Image.fromarray(pixels.round().astype("uint8"))
    if size:
        img = img.resize(size, Image.LANCZOS)
    path = OUT / name
    img.save(path, "WEBP", method=6, **opts)
    print(f"{name:18} {img.width}x{img.height}  {path.stat().st_size / 1024:6.1f} KB")


def battle_backdrop() -> np.ndarray:
    """B has a banner, a text card and a washed-out band baked into rows 172-327, against the brief.
    Below row 328 it is clean, and above it A is the same composition untouched, so take A above
    the seam and B's arena below it, feathered over 18px."""
    a, b = load("A.jpg"), load("B.jpg")
    y = np.arange(a.shape[0], dtype=float)
    w = np.clip((y - 328) / 18.0, 0, 1)
    w = (w * w * (3 - 2 * w))[:, None, None]
    return a * (1 - w) + b * w


def foreground() -> np.ndarray:
    """F came back as a JPG on solid white, which cannot carry alpha. Treat white as the backdrop
    and peel it off: coverage from luminance, then un-mix the white so edges keep the foliage's own
    dark colour instead of a pale halo."""
    rgb = load("F.jpg")
    lum = rgb @ np.array([0.299, 0.587, 0.114])
    # The painted mottling inside the leaves reaches ~90; treat anything at or below that as solid.
    solid = 90.0
    alpha = np.clip((255.0 - lum) / (255.0 - solid), 0, 1)
    safe = np.maximum(alpha, 1e-3)[..., None]
    fg = np.clip((rgb - 255.0 * (1 - safe)) / safe, 0, 255)
    return np.dstack([fg, alpha * 255.0])


if __name__ == "__main__":
    save("shop.webp", load("A.jpg"), quality=80)
    save("battle.webp", battle_backdrop(), quality=80)
    save("menu.webp", load("C.jpg"), quality=80)
    # A dark near-silhouette hides compression well, and the layer sits behind gameplay, so it can
    # be lossier and smaller than the scenes to stay inside the per-layer budget.
    save("foreground.webp", foreground(), size=(1224, 492), quality=60, alpha_quality=70)
    # Textures only ever fill small shapes, so half size is plenty.
    save("wood.webp", load("D.jpg"), size=(816, 328), quality=80)
    save("parchment.webp", load("E.jpg"), size=(816, 328), quality=80)

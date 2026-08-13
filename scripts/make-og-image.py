"""Compose a 1200x630 Open Graph image from the mascot PNG."""

from __future__ import annotations

import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
MASCOT = Path(r"c:\Users\dahye\Desktop\사주냥 최최종.png")
BG_CANDIDATES = [
    ROOT / "scripts" / "og-bg.png",
    Path(r"C:\Users\dahye\.cursor\projects\c-Users-dahye-Desktop\assets\og-bg.png"),
]
OUT = ROOT / "public" / "og-image.png"

W, H = 1200, 630
SERIF = r"C:\Windows\Fonts\NotoSerifKR-VF.ttf"
SANS = r"C:\Windows\Fonts\NotoSansKR-VF.ttf"

GOLD = (212, 176, 106, 255)
GOLD_SOFT = (212, 176, 106, 170)
CREAM = (246, 236, 214, 255)
MUTED = (214, 198, 176, 220)


def font(path: str, size: int, weight: int) -> ImageFont.FreeTypeFont:
    loaded = ImageFont.truetype(path, size)
    loaded.set_variation_by_axes([weight])
    return loaded


def find_background() -> Image.Image | None:
    for path in BG_CANDIDATES:
        if path.exists():
            return Image.open(path).convert("RGB")
    return None


def make_fallback_bg() -> Image.Image:
    img = Image.new("RGB", (W, H))
    px = img.load()
    for y in range(H):
        t = y / (H - 1)
        r = int(14 + (48 - 14) * t)
        g = int(8 + (22 - 8) * t)
        b = int(28 + (58 - 28) * t)
        for x in range(W):
            s = x / (W - 1)
            px[x, y] = (
                min(255, int(r + 18 * s)),
                min(255, int(g + 6 * s)),
                min(255, int(b + 10 * s)),
            )
    return img


def radial_glow(size: tuple[int, int], color: tuple[int, int, int], radius: float) -> Image.Image:
    layer = Image.new("RGBA", size, (0, 0, 0, 0))
    pixels = layer.load()
    cx, cy = size[0] / 2, size[1] / 2
    for y in range(size[1]):
        for x in range(size[0]):
            d = math.hypot(x - cx, y - cy) / radius
            if d >= 1:
                continue
            a = int(255 * ((1 - d) ** 2))
            pixels[x, y] = (*color, a)
    return layer


def draw_stars(base: Image.Image) -> None:
    rng = random.Random(42)
    overlay = Image.new("RGBA", base.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    for _ in range(90):
        x = rng.randint(20, W - 20)
        y = rng.randint(16, 260)
        r = rng.choice([1, 1, 1, 2, 2, 3])
        a = rng.randint(90, 210)
        draw.ellipse((x - r, y - r, x + r, y + r), fill=(236, 220, 176, a))
    base.alpha_composite(overlay)


def draw_moon(base: Image.Image) -> None:
    moon = Image.new("RGBA", base.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(moon)
    cx, cy, r = 168, 118, 34
    draw.ellipse((cx - r * 3, cy - r * 3, cx + r * 3, cy + r * 3), fill=(236, 210, 140, 18))
    draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(246, 236, 210, 230))
    draw.ellipse((cx - r + 10, cy - r - 2, cx + r + 10, cy + r - 2), fill=(18, 10, 32, 255))
    base.alpha_composite(moon.filter(ImageFilter.GaussianBlur(0.4)))


def draw_frame(base: Image.Image) -> None:
    draw = ImageDraw.Draw(base)
    m = 28
    color = GOLD_SOFT
    draw.rounded_rectangle((m, m, W - m, H - m), radius=18, outline=color, width=1)

    def corner(x: int, y: int, dx: int, dy: int) -> None:
        draw.line((x, y, x + 42 * dx, y), fill=GOLD, width=2)
        draw.line((x, y, x, y + 42 * dy), fill=GOLD, width=2)
        draw.ellipse((x - 3, y - 3, x + 3, y + 3), fill=GOLD)

    corner(m + 10, m + 10, 1, 1)
    corner(W - m - 10, m + 10, -1, 1)
    corner(m + 10, H - m - 10, 1, -1)
    corner(W - m - 10, H - m - 10, -1, -1)


def draw_text(base: Image.Image) -> None:
    draw = ImageDraw.Draw(base)
    kicker = font(SANS, 22, 500)
    title = font(SERIF, 108, 700)
    line = font(SERIF, 28, 500)
    sub = font(SANS, 20, 400)

    x = 78
    draw.text((x, 186), "AI 사주 해석", font=kicker, fill=GOLD)
    draw.text((x, 226), "사주미", font=title, fill=CREAM)

    title_box = draw.textbbox((x, 226), "사주미", font=title)
    y_line = title_box[3] + 16
    draw.line((x, y_line, x + 156, y_line), fill=GOLD, width=2)

    draw.text((x, y_line + 26), "돌려 말하지 않는다.", font=line, fill=CREAM)
    draw.text(
        (x, y_line + 78),
        "한줄 요약  ·  전체 해석  ·  오늘의 운세",
        font=sub,
        fill=MUTED,
    )


def prepare_mascot() -> Image.Image:
    cat = Image.open(MASCOT).convert("RGBA")
    alpha = cat.getchannel("A")
    bbox = alpha.getbbox()
    if bbox:
        cat = cat.crop(bbox)
    cat.thumbnail((620, 560), Image.Resampling.LANCZOS)
    return cat


def main() -> None:
    bg_src = find_background()
    canvas = (bg_src.resize((W, H), Image.Resampling.LANCZOS) if bg_src else make_fallback_bg())
    canvas = ImageEnhance.Color(canvas).enhance(0.92)
    canvas = ImageEnhance.Contrast(canvas).enhance(1.05)
    canvas = ImageEnhance.Brightness(canvas).enhance(0.72)
    canvas = canvas.filter(ImageFilter.GaussianBlur(1.4))
    base = canvas.convert("RGBA")

    night = Image.new("RGBA", (W, H), (10, 6, 22, 70))
    base.alpha_composite(night)

    glow_right = radial_glow((640, 640), (186, 132, 72), 260).filter(ImageFilter.GaussianBlur(48))
    glow_left = radial_glow((560, 560), (48, 24, 82), 250).filter(ImageFilter.GaussianBlur(40))
    base.alpha_composite(glow_left, (-80, 40))
    base.alpha_composite(glow_right, (680, 80))

    if bg_src is None:
        draw_moon(base)
        draw_stars(base)

    cat = prepare_mascot()
    shadow = Image.new("RGBA", (cat.width + 80, 90), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).ellipse((10, 10, shadow.width - 10, shadow.height - 8), fill=(0, 0, 0, 110))
    shadow = shadow.filter(ImageFilter.GaussianBlur(16))

    cat_x = W - cat.width - 52
    cat_y = H - cat.height - 36
    base.alpha_composite(shadow, (cat_x + 16, H - 118))
    base.alpha_composite(cat, (cat_x, cat_y))

    dim = Image.new("RGBA", (W, H), (8, 4, 18, 0))
    dim_px = dim.load()
    for y in range(H):
        for x in range(560):
            fade = int(118 * (1 - x / 560) ** 1.15)
            dim_px[x, y] = (8, 4, 18, fade)
    base.alpha_composite(dim)

    draw_frame(base)
    draw_text(base)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    base.convert("RGB").save(OUT, "PNG", optimize=True)
    print(f"wrote {OUT} {base.size}")


if __name__ == "__main__":
    main()

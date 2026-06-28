from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "images"
OUTPUT_DIR = SOURCE_DIR / "optimized"

IMAGE_TARGETS = {
    "profile.png": ("profile.webp", (360, 360), 82),
    "relic.png": ("relic.webp", (520, 520), 78),
    "project_001.png": ("project_001.webp", (1280, 720), 76),
    "project_002.png": ("project_002.webp", (1280, 720), 76),
    "project_003.png": ("project_003.webp", (1280, 720), 76),
    "project_004.png": ("project_004.webp", (1280, 720), 76),
    "project_005.png": ("project_005.webp", (1280, 720), 76),
    "project_006.png": ("project_006.webp", (1280, 720), 76),
    "project_007.png": ("project_007.webp", (1280, 720), 76),
}

PLACEHOLDERS = {
    "project_008.webp": ("PROJ_008", "GOSVEA AGENTIC RAG"),
    "project_009.webp": ("PROJ_009", "SCHEDULING PLATFORM"),
    "project_010.webp": ("PROJ_010", "SLIDE ARCHITECT"),
    "project_011.webp": ("PROJ_011", "CLAIM VERIFIER RAG"),
}


def load_font(size: int) -> ImageFont.ImageFont:
    candidates = [
        Path("C:/Windows/Fonts/consolab.ttf"),
        Path("C:/Windows/Fonts/consola.ttf"),
        Path("C:/Windows/Fonts/arial.ttf"),
    ]
    for path in candidates:
        if path.exists():
            return ImageFont.truetype(str(path), size=size)
    return ImageFont.load_default()


def fit_image(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    image = ImageOps.exif_transpose(image)
    image.thumbnail(size, Image.Resampling.LANCZOS)
    canvas = Image.new("RGB", size, (2, 2, 8))
    x = (size[0] - image.width) // 2
    y = (size[1] - image.height) // 2
    if image.mode in {"RGBA", "LA"}:
        canvas.paste(image, (x, y), image)
    else:
        canvas.paste(image.convert("RGB"), (x, y))
    return canvas


def save_webp(source_name: str, output_name: str, size: tuple[int, int], quality: int) -> None:
    source = SOURCE_DIR / source_name
    output = OUTPUT_DIR / output_name
    with Image.open(source) as image:
        optimized = fit_image(image, size)
        optimized.save(output, "WEBP", quality=quality, method=6)
    print(f"{source_name} -> {output.relative_to(ROOT)} ({output.stat().st_size} bytes)")


def draw_placeholder(output_name: str, project_id: str, title: str) -> None:
    size = (1280, 720)
    output = OUTPUT_DIR / output_name
    image = Image.new("RGB", size, (3, 4, 12))
    draw = ImageDraw.Draw(image)

    for y in range(size[1]):
        cyan = int(18 + 40 * y / size[1])
        magenta = int(26 + 28 * (1 - y / size[1]))
        draw.line([(0, y), (size[0], y)], fill=(4, cyan, magenta))

    for offset in range(0, size[0], 64):
        draw.line([(offset, 0), (offset - 360, size[1])], fill=(0, 98, 118), width=1)
    for y in range(80, size[1], 80):
        draw.line([(0, y), (size[0], y)], fill=(48, 0, 78), width=1)

    border = [(54, 54), (1226, 666)]
    draw.rectangle(border, outline=(0, 229, 255), width=3)
    draw.line([(54, 124), (1226, 124)], fill=(255, 0, 200), width=2)

    small = load_font(34)
    large = load_font(64)
    draw.text((92, 78), f"// {project_id}", fill=(0, 229, 255), font=small)
    draw.text((92, 300), title, fill=(236, 251, 255), font=large)
    draw.text((96, 386), "VISUAL TRANSMISSION PENDING", fill=(245, 230, 99), font=small)
    draw.text((96, 590), "HARRISOUS.GITHUB.IO", fill=(145, 255, 248), font=small)

    image.save(output, "WEBP", quality=76, method=6)
    print(f"placeholder -> {output.relative_to(ROOT)} ({output.stat().st_size} bytes)")


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    for source_name, (output_name, size, quality) in IMAGE_TARGETS.items():
        save_webp(source_name, output_name, size, quality)
    for output_name, (project_id, title) in PLACEHOLDERS.items():
        draw_placeholder(output_name, project_id, title)


if __name__ == "__main__":
    main()

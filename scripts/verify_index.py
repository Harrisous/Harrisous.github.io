from __future__ import annotations

import json
import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"
RINGS = ROOT / "data" / "rings.json"
SOURCE_FILES = [ROOT / "index.html", ROOT / "src" / "app.jsx", ROOT / "mascot" / "cyber-cat.js"]

MAX_HOME_IMAGE_BYTES = 450_000

UNSAFE_PATTERNS = {
    r"\beval\s*\(": "eval() allows arbitrary code execution.",
    r"\bnew\s+Function\s*\(": "new Function() allows arbitrary code execution.",
    r"\.innerHTML\b": "innerHTML can create XSS when fed untrusted content.",
    r"\.outerHTML\b": "outerHTML can create XSS when fed untrusted content.",
    r"\.insertAdjacentHTML\b": "insertAdjacentHTML can create XSS when fed untrusted content.",
    r"\bdocument\.write\b": "document.write can inject unsafe markup and blocks parsing.",
    r"javascript:": "javascript: URLs are unsafe in static content.",
}

BLOCKING_COMPILERS = {
    "https://cdn.tailwindcss.com": "Tailwind CDN compiles styles in the browser.",
    "@babel/standalone": "Babel standalone compiles JSX in the browser.",
}

THIRD_PARTY_RUNTIME_SCRIPTS = {
    "https://unpkg.com/": "Self-host runtime libraries to avoid CDN version drift and startup latency.",
}


def fail(message: str) -> None:
    print(f"FAIL: {message}")


def ok(message: str) -> None:
    print(f"OK: {message}")


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def referenced_images(data: dict) -> list[str]:
    refs: list[str] = []
    profile = data.get("profile", {})
    if profile.get("avatar"):
        refs.append(profile["avatar"])
    for section in ("projects", "blogs", "resources"):
        for item in data.get(section, []):
            image = item.get("image")
            if image:
                refs.append(image)
    return refs


def check_unsafe_patterns(source: str) -> list[str]:
    errors: list[str] = []
    for pattern, reason in UNSAFE_PATTERNS.items():
        if re.search(pattern, source, flags=re.IGNORECASE):
            errors.append(f"Unsafe pattern matched `{pattern}`: {reason}")
    return errors


def check_blocking_compilers(html: str) -> list[str]:
    errors: list[str] = []
    for needle, reason in BLOCKING_COMPILERS.items():
        if needle in html:
            errors.append(f"Remove production compiler `{needle}`. {reason}")
    for needle, reason in THIRD_PARTY_RUNTIME_SCRIPTS.items():
        if needle in html:
            errors.append(f"Remove third-party runtime script `{needle}`. {reason}")
    return errors


def check_blank_links(path: Path, source: str) -> list[str]:
    errors: list[str] = []
    tag_re = re.compile(r"<a\b[^>]*target=[\"']_blank[\"'][^>]*>", re.IGNORECASE)
    rel_re = re.compile(r"rel=[\"']([^\"']*)[\"']", re.IGNORECASE)
    for match in tag_re.finditer(source):
        tag = match.group(0)
        rel_match = rel_re.search(tag)
        rel_tokens = set(rel_match.group(1).lower().split()) if rel_match else set()
        if not {"noopener", "noreferrer"}.issubset(rel_tokens):
            line = source[: match.start()].count("\n") + 1
            rel_path = path.relative_to(ROOT)
            errors.append(f"External blank link in {rel_path}:{line} must include rel=\"noopener noreferrer\".")
    return errors


def check_images(data: dict) -> list[str]:
    errors: list[str] = []
    for ref in referenced_images(data):
        if ref.startswith(("http://", "https://", "data:")):
            errors.append(f"Homepage image must be local: {ref}")
            continue
        path = (ROOT / ref).resolve()
        try:
            path.relative_to(ROOT)
        except ValueError:
            errors.append(f"Image escapes project root: {ref}")
            continue
        if not path.exists():
            errors.append(f"Missing referenced image: {ref}")
            continue
        if "images" in path.parts and path.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp"}:
            size = path.stat().st_size
            if size > MAX_HOME_IMAGE_BYTES:
                errors.append(f"Homepage image too large ({size} bytes): {ref}")
    return errors


def main() -> int:
    html = read_text(INDEX)
    source = "\n".join(read_text(path) for path in SOURCE_FILES if path.exists())
    data = json.loads(read_text(RINGS))

    errors: list[str] = []
    errors.extend(check_unsafe_patterns(source))
    errors.extend(check_blocking_compilers(html))
    for path in SOURCE_FILES:
        if path.exists():
            errors.extend(check_blank_links(path, read_text(path)))
    errors.extend(check_images(data))

    if errors:
        for error in errors:
            fail(error)
        print(f"\n{len(errors)} verification issue(s) found.")
        return 1

    ok("index security and performance checks passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

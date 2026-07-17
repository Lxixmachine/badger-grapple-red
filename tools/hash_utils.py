"""Cross-platform hashing helpers for generated build records."""

from __future__ import annotations

import hashlib
from pathlib import Path


TEXT_EXTENSIONS = frozenset(
    {
        ".css",
        ".csv",
        ".html",
        ".js",
        ".json",
        ".md",
        ".mjs",
        ".py",
        ".tsv",
        ".txt",
        ".yaml",
        ".yml",
    }
)


def canonical_file_bytes(path: Path) -> bytes:
    """Normalize text newlines while preserving exact binary bytes."""

    if path.suffix.lower() in TEXT_EXTENSIONS:
        text = path.read_text(encoding="utf-8")
        return text.replace("\r\n", "\n").replace("\r", "\n").encode("utf-8")
    return path.read_bytes()


def sha256_file(path: Path) -> str:
    return hashlib.sha256(canonical_file_bytes(path)).hexdigest()

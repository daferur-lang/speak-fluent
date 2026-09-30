#!/usr/bin/env -S uv run --quiet --script
# /// script
# requires-python = ">=3.10"
# dependencies = ["edge-tts>=7"]
# ///
"""Genera los audios de referencia del shadowing (voces neuronales de edge-tts).

Uso: ./scripts/generate-audio.py [--force]
Lee src/data/shadowing.json y escribe public/audio/<id>-<us|gb>.mp3.
Solo genera los que faltan salvo --force. Requiere internet (solo al generar;
la app sirve los mp3 como estáticos y funcionan offline).
"""
import asyncio
import json
import sys
from pathlib import Path

import edge_tts

ROOT = Path(__file__).resolve().parent.parent
VOICES = {"us": "en-US-AriaNeural", "gb": "en-GB-SoniaNeural"}


async def main() -> None:
    force = "--force" in sys.argv
    phrases = json.loads((ROOT / "src/data/shadowing.json").read_text(encoding="utf-8"))
    out_dir = ROOT / "public/audio"
    out_dir.mkdir(parents=True, exist_ok=True)
    created = 0
    for phrase in phrases:
        for accent, voice in VOICES.items():
            target = out_dir / f"{phrase['id']}-{accent}.mp3"
            if target.exists() and not force:
                continue
            await edge_tts.Communicate(phrase["text"], voice).save(str(target))
            created += 1
            print(f"ok {target.name}")
    print(f"{created} audios generados, {len(phrases) * len(VOICES)} esperados en total")


asyncio.run(main())

import asyncio
import logging
import os
import tempfile

import edge_tts

logger = logging.getLogger(__name__)

VOICE_MAP = {
    "vi": "vi-VN-NamMinhNeural",
    "en": "en-US-BrianNeural",
    "fr": "fr-FR-HenriNeural",
    "de": "de-DE-KillianNeural",
    "es": "es-ES-AlvaroNeural",
    "it": "it-IT-DiegoNeural",
    "pt": "pt-BR-AntonioNeural",
    "ru": "ru-RU-DmitryNeural",
    "ja": "ja-JP-NanamiNeural",
    "ko": "ko-KR-HyunsuNeural",
    "zh": "zh-CN-XiaoxiaoNeural",
    "ar": "ar-SA-HamedNeural",
}


def voice_for(language: str | None) -> str | None:
    return VOICE_MAP.get(language or "")


async def _save_speech(text: str, voice: str, output_file: str) -> None:
    communicate = edge_tts.Communicate(text=text, voice=voice)
    await communicate.save(output_file)


def synthesize_mp3(text: str, voice: str, retries: int = 2) -> bytes:
    last_error: Exception | None = None

    for attempt in range(1, retries + 1):
        fd, path = tempfile.mkstemp(suffix=".mp3")
        os.close(fd)
        try:
            asyncio.run(_save_speech(text, voice, path))
            with open(path, "rb") as audio_file:
                return audio_file.read()
        except Exception as exc:
            last_error = exc
            logger.warning("[TTS] attempt %s failed: %s", attempt, exc)
        finally:
            if os.path.exists(path):
                os.unlink(path)

    raise last_error

import gc
import logging
import subprocess
import threading

import torch
import whisper

from .runtime import DEVICE, USE_FP16

logger = logging.getLogger(__name__)

WHISPER_NAMES = tuple(whisper.available_models())
DEFAULT_MODEL = "small"

_lock = threading.Lock()
_current: dict = {"name": None, "model": None}


class ModelOutOfMemoryError(RuntimeError):
    pass


def available_models() -> tuple[str, ...]:
    return WHISPER_NAMES


def current_model() -> str | None:
    return _current["name"]


def _get_model(name: str):
    if _current["name"] == name:
        return _current["model"]

    _current["model"] = None
    _current["name"] = None
    gc.collect()
    if DEVICE == "cuda":
        torch.cuda.empty_cache()

    logger.info("Loading Whisper model '%s' on %s", name, DEVICE)
    _current["model"] = whisper.load_model(name, device=DEVICE)
    _current["name"] = name
    logger.info("Whisper model '%s' ready", name)
    return _current["model"]


def unload() -> None:
    _current["model"] = None
    _current["name"] = None
    gc.collect()
    if DEVICE == "cuda":
        torch.cuda.empty_cache()


def warmup() -> None:
    with _lock:
        _get_model(DEFAULT_MODEL)


def convert_to_wav(input_path: str) -> str:
    wav_path = input_path + ".wav"
    subprocess.run(
        ["ffmpeg", "-y", "-i", input_path, "-ar", "16000", "-ac", "1", wav_path],
        check=True,
        capture_output=True,
    )
    return wav_path


def transcribe_file(
    path: str, model_name: str, language: str | None = None
) -> dict:
    with _lock:
        model = _get_model(model_name)
        try:
            result = model.transcribe(path, fp16=USE_FP16, language=language)
        except torch.cuda.OutOfMemoryError as exc:
            unload()
            raise ModelOutOfMemoryError(
                f"Not enough GPU memory for model '{model_name}'. "
                "Try a smaller model."
            ) from exc

    return {
        "model": model_name,
        "text": result.get("text", ""),
        "segments": [
            {
                "start": round(segment["start"], 2),
                "end": round(segment["end"], 2),
                "text": segment["text"].strip(),
            }
            for segment in result.get("segments", [])
        ],
        "language": result.get("language", "unknown"),
    }

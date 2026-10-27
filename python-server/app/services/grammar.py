import logging
import threading

import torch
from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

from .runtime import DEVICE

logger = logging.getLogger(__name__)

MODEL_NAME = "vennify/t5-base-grammar-correction"

_lock = threading.Lock()
_tokenizer = None
_model = None


def _load():
    global _tokenizer, _model
    if _model is not None:
        return _tokenizer, _model

    with _lock:
        if _model is None:
            logger.info("Loading grammar model %s", MODEL_NAME)
            tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
            model = (
                AutoModelForSeq2SeqLM.from_pretrained(MODEL_NAME)
                .to(DEVICE)
                .eval()
            )
            _tokenizer, _model = tokenizer, model

    return _tokenizer, _model


def warmup() -> None:
    _load()


def correct_text(text: str) -> str:
    tokenizer, model = _load()
    inputs = tokenizer(
        "grammar: " + text,
        return_tensors="pt",
        truncation=True,
        max_length=512,
    ).to(DEVICE)

    with _lock, torch.inference_mode():
        outputs = model.generate(**inputs, max_length=512, num_beams=4)

    return tokenizer.decode(outputs[0], skip_special_tokens=True)

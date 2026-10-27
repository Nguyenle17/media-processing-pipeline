import logging
import threading

import torch
from transformers import AutoTokenizer, M2M100ForConditionalGeneration

from .language import detect_language, normalize_lang
from .runtime import DEVICE, USE_FP16

logger = logging.getLogger(__name__)

MODEL_NAME = "facebook/m2m100_418M"

_lock = threading.Lock()
_tokenizer = None
_model = None


def _load():
    global _tokenizer, _model
    if _model is not None:
        return _tokenizer, _model

    with _lock:
        if _model is None:
            logger.info("Loading translation model %s", MODEL_NAME)
            tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
            model = (
                M2M100ForConditionalGeneration.from_pretrained(
                    MODEL_NAME,
                    torch_dtype=torch.float16 if USE_FP16 else torch.float32,
                )
                .to(DEVICE)
                .eval()
            )
            _tokenizer, _model = tokenizer, model

    return _tokenizer, _model


def warmup() -> None:
    _load()


def translate_text(
    text: str, target_lang: str, source_lang: str | None = None
) -> str:
    if not text or not text.strip():
        return text

    tokenizer, model = _load()
    src = normalize_lang(source_lang or detect_language(text))
    tgt = normalize_lang(target_lang)

    if src == tgt:
        return text

    # tokenizer.src_lang is shared mutable state; tokenize and generate together.
    with _lock:
        tokenizer.src_lang = src
        inputs = tokenizer(
            text, return_tensors="pt", truncation=True, max_length=512
        ).to(DEVICE)
        forced_bos_token_id = tokenizer.get_lang_id(tgt)

        with torch.inference_mode():
            generated = model.generate(
                **inputs,
                forced_bos_token_id=forced_bos_token_id,
                max_length=512,
            )

    result = tokenizer.batch_decode(generated, skip_special_tokens=True)[0]
    logger.info(
        "[translate] %s -> %s: '%s' -> '%s'", src, tgt, text[:50], result[:50]
    )
    return result

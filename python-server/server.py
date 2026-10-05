import io
import os
import tempfile
import subprocess
import threading
import asyncio
import re
import hmac
import logging

from dotenv import load_dotenv

import torch
import whisper
import fasttext
import edge_tts
from flask import Flask, request, jsonify, send_file
from transformers import (
    AutoTokenizer,
    AutoModelForSeq2SeqLM,
    M2M100ForConditionalGeneration,
)

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

# ============================================================
# CONFIG
# ============================================================
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
USE_FP16 = DEVICE == "cuda"
print(f"Using device: {DEVICE}")
if DEVICE == "cuda":
    print(f"GPU: {torch.cuda.get_device_name(0)}")
else:
    torch.set_num_threads(2)  # chỉ có ý nghĩa khi chạy CPU

app = Flask(__name__)

# The AI service is private by default. Set AI_BIND_HOST=0.0.0.0 only when
# NestJS runs in another container/host protected by a private network.
AI_BIND_HOST = os.environ.get("AI_BIND_HOST", "127.0.0.1")
AI_PORT = int(os.environ.get("AI_PORT", "5000"))
AI_SERVICE_TOKEN = os.environ.get("AI_SERVICE_TOKEN", "")
if len(AI_SERVICE_TOKEN) < 32:
    raise RuntimeError("AI_SERVICE_TOKEN must be at least 32 characters")

app.config["MAX_CONTENT_LENGTH"] = int(
    os.environ.get("AI_MAX_REQUEST_BYTES", str(512 * 1024 * 1024))
)

app.logger.setLevel(logging.INFO)

WHISPER_NAMES = ("tiny", "base", "small", "medium", "large")
WHISPER_DEFAULT = "small"
MAX_TTS_CHARS = 2000
SUPPORTED_TRANSLATION_LANGS = {
    "vi", "en", "zh", "ko", "ja", "fr", "de", "es",
}

whisper_lock = threading.Lock()
grammar_lock = threading.Lock()
translate_lock = threading.Lock()

# ============================================================
# MODELS
# ============================================================

# --- Whisper: lazy load, chỉ giữ model nào được dùng (tránh OOM VRAM) ---
_whisper_cache = {}
_whisper_cache_lock = threading.Lock()


def get_whisper(name: str):
    if name not in WHISPER_NAMES:
        name = WHISPER_DEFAULT
    with _whisper_cache_lock:
        if name not in _whisper_cache:
            print(f"Loading Whisper '{name}' on {DEVICE}...")
            _whisper_cache[name] = whisper.load_model(name, device=DEVICE)
        return _whisper_cache[name]


print("Loading default Whisper model...")
get_whisper(WHISPER_DEFAULT)

# --- Grammar (T5): giữ fp32 cho ổn định ---
print("Loading grammar model...")
GRAMMAR_REPO = "vennify/t5-base-grammar-correction"
tokenizer_grammar = AutoTokenizer.from_pretrained(GRAMMAR_REPO)
model_grammar = (
    AutoModelForSeq2SeqLM.from_pretrained(GRAMMAR_REPO).to(DEVICE).eval()
)

# --- Translation (M2M100): fp16 trên GPU ---
print("Loading translation model...")
TRANSLATE_REPO = "facebook/m2m100_418M"
tokenizer_M2M100 = AutoTokenizer.from_pretrained(TRANSLATE_REPO)
model_translate = (
    M2M100ForConditionalGeneration.from_pretrained(
        TRANSLATE_REPO,
        torch_dtype=torch.float16 if USE_FP16 else torch.float32,
    )
    .to(DEVICE)
    .eval()
)

# --- Language detection (fasttext, luôn chạy CPU) ---
print("Loading language detection model...")
model_lang = fasttext.load_model("lid.176.bin")

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


# ============================================================
# HELPERS
# ============================================================
def normalize_lang(code: str) -> str:
    """Chuẩn hoá mã ngôn ngữ: 'zh-CN' / 'zh_tw' -> 'zh', 'en-US' -> 'en'."""
    code = (code or "").strip().lower().replace("_", "-")
    return code.split("-")[0] if code else code


@app.before_request
def require_internal_token():
    supplied = request.headers.get("X-AI-Service-Token", "")
    if not hmac.compare_digest(supplied, AI_SERVICE_TOKEN):
        return jsonify({"error": "Unauthorized"}), 401
    return None


@app.errorhandler(413)
def request_too_large(_error):
    return jsonify({"error": "Request is too large"}), 413


@app.errorhandler(Exception)
def handle_unexpected_error(error):
    app.logger.error("Unhandled AI service error", exc_info=error)
    return jsonify({"error": "AI service failure"}), 500


def convert_to_wav(input_path: str) -> str:
    wav_path = input_path + ".wav"
    subprocess.run(
        ["ffmpeg", "-y", "-i", input_path, "-ar", "16000", "-ac", "1", wav_path],
        check=True,
        capture_output=True,
    )
    return wav_path


def detect_language(text: str) -> str:
    """Detect ngôn ngữ bằng fasttext."""
    try:
        clean = (text or "").replace("\n", " ").strip()
        if len(clean) < 5:
            return "en"
        # Dùng model.f.predict để tránh lỗi numpy 2.x của fasttext.predict()
        # kết quả dạng [(prob, "__label__vi")]
        label = model_lang.f.predict(clean, 1, 0.0, "strict")[0][1]
        return label.replace("__label__", "")
    except Exception as e:
        print(f"[detect_language] error: {e}")
        return "en"


def translate_text(text: str, target_lang: str, source_lang: str = None) -> str:
    """Dịch text sang target_lang. source_lang=None -> tự detect.
    Ném exception nếu lỗi (để route xử lý, không trả nhầm text gốc)."""
    if not text or not text.strip():
        return text

    src = normalize_lang(source_lang or detect_language(text))
    tgt = normalize_lang(target_lang)

    if src == tgt:
        return text

    # M2M100 chỉ nhận được khoảng 512 tokens mỗi lần. Chia theo câu để không
    # làm mất phần cuối của transcript dài.
    sentences = re.split(r"(?<=[.!?。！？])\s+", text.strip())
    parts = []
    current = ""
    for sentence in sentences:
        candidate = f"{current} {sentence}".strip()
        if current and len(tokenizer_M2M100(candidate, add_special_tokens=True)["input_ids"]) > 450:
            parts.append(current)
            current = sentence
        else:
            current = candidate
    if current:
        parts.append(current)

    # tokenizer.src_lang là state dùng chung -> tokenize + generate cùng trong lock
    with translate_lock:
        tokenizer_M2M100.src_lang = src
        forced_bos_token_id = tokenizer_M2M100.get_lang_id(tgt)
        translated_parts = []
        for part in parts:
            inputs = tokenizer_M2M100(
                part, return_tensors="pt", truncation=True, max_length=512
            ).to(DEVICE)
            with torch.inference_mode():
                generated = model_translate.generate(
                    **inputs,
                    forced_bos_token_id=forced_bos_token_id,
                    max_length=512,
                )
            translated_parts.append(
                tokenizer_M2M100.batch_decode(generated, skip_special_tokens=True)[0]
            )

    result = " ".join(translated_parts)
    print(f"[translate] {src} -> {tgt}: '{text[:50]}' -> '{result[:50]}'")
    return result


async def generate_speech(text: str, voice: str, output_file: str):
    communicate = edge_tts.Communicate(text=text, voice=voice)
    await communicate.save(output_file)


def synthesize_mp3(text: str, voice: str, retries: int = 2) -> bytes:
    """Tạo mp3 bằng edge-tts, retry nếu lỗi (vd NoAudioReceived). Trả về bytes."""
    last_err = None
    for attempt in range(1, retries + 1):
        fd, path = tempfile.mkstemp(suffix=".mp3")
        os.close(fd)
        try:
            asyncio.run(generate_speech(text, voice, path))
            with open(path, "rb") as f:
                return f.read()
        except Exception as e:
            last_err = e
            print(f"[TTS] attempt {attempt} failed: {e}")
        finally:
            if os.path.exists(path):
                os.unlink(path)
    raise last_err


# ============================================================
# ROUTES
# ============================================================
@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "device": DEVICE,
        "whisper_loaded": list(_whisper_cache.keys()),
    })


@app.route("/transcribe", methods=["POST"])
def transcribe():
    if "file" not in request.files:
        return jsonify({"error": "No file field in request"}), 400

    model_type = request.form.get("type", WHISPER_DEFAULT).lower()
    language = request.form.get("language") or None  # tuỳ chọn, None = auto

    upload = request.files["file"]
    suffix = os.path.splitext(upload.filename or "")[1] or ".bin"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        upload.save(tmp.name)
        raw_path = tmp.name

    wav_path = None
    try:
        wav_path = convert_to_wav(raw_path)
        model = get_whisper(model_type)
        with whisper_lock:
            result = model.transcribe(wav_path, fp16=USE_FP16, language=language)

        segments = [
            {
                "start": round(seg["start"], 2),
                "end": round(seg["end"], 2),
                "text": seg["text"].strip(),
            }
            for seg in result.get("segments", [])
        ]
        return jsonify({
            "text": result.get("text", ""),
            "segments": segments,
            "language": result.get("language", "unknown"),
        })
    except subprocess.CalledProcessError as e:
        app.logger.error(f"ffmpeg error: {e.stderr.decode(errors='ignore')}")
        return jsonify({"error": "Cannot decode audio file"}), 400
    except Exception as e:
        app.logger.error(f"Transcribe error: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500
    finally:
        if os.path.exists(raw_path):
            os.unlink(raw_path)
        if wav_path and os.path.exists(wav_path):
            os.unlink(wav_path)


@app.route("/grammar", methods=["POST"])
def grammar():
    text = ((request.get_json(silent=True) or {}).get("text") or "").strip()
    if not text:
        return jsonify({"error": "No text provided"}), 400
    try:
        # Model vennify yêu cầu prefix "grammar: "
        inputs = tokenizer_grammar(
            "grammar: " + text,
            return_tensors="pt",
            truncation=True,
            max_length=512,
        ).to(DEVICE)
        with grammar_lock, torch.inference_mode():
            outputs = model_grammar.generate(**inputs, max_length=512, num_beams=4)
        return jsonify({
            "corrected_text": tokenizer_grammar.decode(
                outputs[0], skip_special_tokens=True
            )
        })
    except Exception as e:
        app.logger.error(f"Grammar error: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500


@app.route("/translate", methods=["POST"])
def translate():
    data = request.get_json(silent=True) or {}
    text = (data.get("text") or "").strip()
    target_lang = normalize_lang(data.get("target_lang", "en"))

    if not text:
        return jsonify({"error": "No text provided"}), 400
    if target_lang not in SUPPORTED_TRANSLATION_LANGS:
        return jsonify({"error": "Unsupported target language"}), 400

    try:
        source_lang = detect_language(text)
        translated_text = translate_text(text, target_lang, source_lang)
        return jsonify({
            "source_lang": source_lang,
            "target_lang": target_lang,
            "translated_text": translated_text,
        })
    except Exception as e:
        app.logger.error("Translation failed", exc_info=True)
        return jsonify({"error": "Translation failed"}), 502


@app.route("/detect-language", methods=["POST"])
def detect_language_route():
    data = request.get_json(silent=True) or {}
    text = (data.get("text") or "").strip()
    if not text:
        return jsonify({"error": "No text provided"}), 400
    return jsonify({"language": detect_language(text)})


@app.route("/text-to-speech", methods=["POST"])
def text_speech():
    """
    Flow: detect language -> translate (nếu cần) -> TTS
    Body:
      - text: str (bắt buộc)
      - lang: str (target language, bắt buộc)
      - autoTranslate: bool (default true)
    """
    data = request.get_json(silent=True) or {}
    text = (data.get("text") or "").strip()
    target_lang = normalize_lang(data.get("lang", "en"))
    auto_translate = data.get("autoTranslate", True)

    if not text:
        return jsonify({"error": "No text provided"}), 400
    if len(text) > MAX_TTS_CHARS:
        return jsonify({"error": "Text is too long"}), 400
    if not target_lang:
        return jsonify({"error": "No language provided"}), 400

    # Kiểm tra voice TRƯỚC khi tốn công dịch
    voice = VOICE_MAP.get(target_lang)
    if not voice:
        return jsonify({"error": f"Unsupported language: {target_lang}"}), 400

    try:
        # 1. Detect ngôn ngữ gốc
        source_lang = detect_language(text)
        print(f"[TTS] source={source_lang} target={target_lang} "
              f"autoTranslate={auto_translate}")

        # 2. Translate nếu cần
        final_text = text
        if auto_translate and source_lang != target_lang:
            final_text = translate_text(text, target_lang, source_lang)
            print(f"[TTS] Translated: {final_text[:120]}")

        # 3. TTS
        audio = synthesize_mp3(final_text, voice)
        return send_file(io.BytesIO(audio), mimetype="audio/mpeg")

    except Exception as e:
        app.logger.error("TTS generation failed", exc_info=True)
        return jsonify({"error": "TTS generation failed"}), 502


if __name__ == "__main__":
    # Flask's built-in server is for local development only. Production should
    # run this WSGI app behind a production server and a private firewall.
    app.run(host=AI_BIND_HOST, port=AI_PORT, threaded=True, debug=False)

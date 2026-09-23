import os
import tempfile
import subprocess
import threading
import asyncio
import torch
import whisper
import fasttext
import edge_tts
from flask import Flask, request, jsonify, send_file, after_this_request
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM, M2M100ForConditionalGeneration

torch.set_num_threads(2)

DEVICE = "cpu"
app = Flask(__name__)

whisper_lock = threading.Lock()
grammar_lock = threading.Lock()
translate_lock = threading.Lock()

print("Loading Whisper models...")
MODELS_WHISPER = {
    "tiny": whisper.load_model("tiny", device=DEVICE),
    "base": whisper.load_model("base", device=DEVICE),
    "small": whisper.load_model("small", device=DEVICE),
    "medium": whisper.load_model("medium", device=DEVICE),
    "large": whisper.load_model("large", device=DEVICE),
}

print("Loading grammar model...")
GRAMMAR_REPO = "vennify/t5-base-grammar-correction"
tokenizer_grammar = AutoTokenizer.from_pretrained(GRAMMAR_REPO)
model_grammar = AutoModelForSeq2SeqLM.from_pretrained(GRAMMAR_REPO).to(DEVICE)

print("Loading translation model...")
TRANSLATE_REPO = "facebook/m2m100_418M"
tokenizer_M2M100 = AutoTokenizer.from_pretrained(TRANSLATE_REPO)
model_translate = M2M100ForConditionalGeneration.from_pretrained(TRANSLATE_REPO).to(DEVICE)

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


async def generate_speech(text: str, voice: str, output_file: str):
    communicate = edge_tts.Communicate(text=text, voice=voice)
    await communicate.save(output_file)


def convert_to_wav(input_path: str) -> str:
    wav_path = input_path + ".wav"
    subprocess.run(
        ["ffmpeg", "-y", "-i", input_path, "-ar", "16000", "-ac", "1", wav_path],
        check=True, capture_output=True
    )
    return wav_path


def detect_language(text: str) -> str:
    """Detect ngôn ngữ của text bằng fasttext"""
    try:
        if not text or len(text.strip()) < 5:
            return "en"
        clean = text.replace("\n", " ").strip()
        pred = model_lang.predict(clean)[0][0]
        return pred.replace("__label__", "")
    except Exception as e:
        print(f"[detect_language] error: {e}")
        return "en"


def translate_text(text: str, target_lang: str, source_lang: str = None) -> str:
    """Dịch text sang target_lang. Nếu source_lang=None → tự detect."""
    if not text or not text.strip():
        return text

    try:
        if not source_lang:
            source_lang = detect_language(text)

        # Chuẩn hoá mã ngôn ngữ cho M2M100
        src = source_lang
        tgt = target_lang
        if src in ("zh-cn", "zh-tw"):
            src = "zh"
        if tgt in ("zh-cn", "zh-tw"):
            tgt = "zh"

        if src == tgt:
            return text

        tokenizer_M2M100.src_lang = src
        inputs = tokenizer_M2M100(
            text, return_tensors="pt",
            truncation=True, max_length=512
        ).to(DEVICE)

        forced_bos_token_id = tokenizer_M2M100.get_lang_id(tgt)

        with translate_lock:
            generated = model_translate.generate(
                **inputs,
                forced_bos_token_id=forced_bos_token_id,
                max_length=512,
            )

        result = tokenizer_M2M100.batch_decode(
            generated, skip_special_tokens=True
        )[0]

        print(f"[translate] {source_lang} → {target_lang}: "
              f"'{text[:50]}' → '{result[:50]}'")
        return result
    except Exception as e:
        print(f"[translate_text] error: {e}")
        return text


# ============================================================
# ROUTES
# ============================================================

@app.route("/transcribe", methods=["POST"])
def transcribe():
    if "file" not in request.files:
        return jsonify({"error": "No file field in request"}), 400

    model_type = request.form.get("type", "small").lower()
    model = MODELS_WHISPER.get(model_type, MODELS_WHISPER["small"])

    with tempfile.NamedTemporaryFile(delete=False, suffix=".bin") as tmp:
        request.files["file"].save(tmp.name)
        raw_path = tmp.name

    wav_path = None
    try:
        wav_path = convert_to_wav(raw_path)
        with whisper_lock:
            result = model.transcribe(wav_path)

        segments = [
            {
                "start": round(seg["start"], 2),
                "end": round(seg["end"], 2),
                "text": seg["text"].strip()
            }
            for seg in result.get("segments", [])
        ]
        return jsonify({
            "text": result.get("text", ""),
            "segments": segments,
            "language": result.get("language", "unknown"),
        })
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
    text = (request.get_json() or {}).get("text", "").strip()
    if not text:
        return jsonify({"error": "No text provided"}), 400
    try:
        inputs = tokenizer_grammar(
            text, return_tensors="pt",
            truncation=True, max_length=512
        ).to(DEVICE)
        with grammar_lock:
            outputs = model_grammar.generate(**inputs, max_length=512)
        return jsonify({
            "corrected_text": tokenizer_grammar.decode(
                outputs[0], skip_special_tokens=True
            )
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/translate", methods=["POST"])
def translate():
    data = request.get_json(silent=True) or {}
    text = data.get("text", "").strip()
    target_lang = data.get("target_lang", "en")

    if not text:
        return jsonify({"error": "No text provided"}), 400

    try:
        source_lang = detect_language(text)
        translated_text = translate_text(text, target_lang, source_lang)
        return jsonify({
            "source_lang": source_lang,
            "target_lang": target_lang,
            "translated_text": translated_text,
        })
    except Exception as e:
        app.logger.error(f"Translate error: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500


@app.route("/detect-language", methods=["POST"])
def detect_language_route():
    """API riêng để FE có thể gọi detect trước nếu muốn"""
    data = request.get_json(silent=True) or {}
    text = data.get("text", "").strip()
    if not text:
        return jsonify({"error": "No text provided"}), 400
    return jsonify({"language": detect_language(text)})


@app.route("/text-to-speech", methods=["POST"])
def text_speech():
    """
    Flow: detect language → translate (nếu cần) → TTS
    Body:
      - text: str (bắt buộc)
      - lang: str (target language, bắt buộc)
      - autoTranslate: bool (default true)
    """
    data = request.get_json(silent=True) or {}
    text = data.get("text", "").strip()
    target_lang = data.get("lang", "en").strip()
    auto_translate = data.get("autoTranslate", True)

    if not text:
        return jsonify({"error": "No text provided"}), 400
    if not target_lang:
        return jsonify({"error": "No language provided"}), 400

    # ─── 1. Detect ngôn ngữ gốc của text ───
    source_lang = detect_language(text)
    print(f"[TTS] detect: source={source_lang} target={target_lang} "
          f"autoTranslate={auto_translate}")

    # ─── 2. Translate nếu cần ───
    final_text = text
    if auto_translate and source_lang != target_lang:
        print(f"[TTS] Translating {source_lang} → {target_lang}")
        final_text = translate_text(text, target_lang, source_lang)
        print(f"[TTS] Translated: {final_text[:120]}")
    else:
        print(f"[TTS] No translate needed")

    # ─── 3. TTS với voice của target_lang ───
    voice = VOICE_MAP.get(target_lang)
    if not voice:
        return jsonify({"error": f"Unsupported language: {target_lang}"}), 400

    output_file = None
    try:
        fd, output_file = tempfile.mkstemp(suffix=".mp3")
        os.close(fd)

        # Retry 1 lần nếu edge-tts lỗi NoAudioReceived
        try:
            asyncio.run(generate_speech(final_text, voice, output_file))
        except Exception as tts_err:
            print(f"[TTS] First attempt failed: {tts_err}. Retrying...")
            if os.path.exists(output_file):
                os.unlink(output_file)
            fd, output_file = tempfile.mkstemp(suffix=".mp3")
            os.close(fd)
            await_timeout = 60
            asyncio.run(generate_speech(final_text, voice, output_file))

        @after_this_request
        def cleanup(response):
            try:
                if output_file and os.path.exists(output_file):
                    os.unlink(output_file)
            except Exception as e:
                app.logger.error(f"Error cleaning up TTS file: {e}")
            return response

        return send_file(output_file, mimetype="audio/mpeg", as_attachment=False)

    except Exception as e:
        if output_file and os.path.exists(output_file):
            os.unlink(output_file)
        app.logger.error(f"TTS error: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, threaded=True)

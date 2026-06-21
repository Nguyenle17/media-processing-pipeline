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
    "small": whisper.load_model("small", device=DEVICE)
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
    try:
        if not text or len(text.strip()) < 5:
            return "en"
        pred = model_lang.predict(text.replace("\n", " "))[0][0]
        return pred.replace("__label__", "")
    except Exception:
        return "en"

@app.route("/transcribe", methods=["POST"])
def transcribe():
    if "file" not in request.files:
        return jsonify({"error": "No file field in request"}), 400
    
    model_type = request.form.get("type", "tiny").lower()
    model = MODELS_WHISPER.get(model_type, MODELS_WHISPER["tiny"])

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
                "end":   round(seg["end"], 2),
                "text":  seg["text"].strip()
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
        if os.path.exists(raw_path): os.unlink(raw_path)
        if wav_path and os.path.exists(wav_path): os.unlink(wav_path)

@app.route("/grammar", methods=["POST"])
def grammar():
    text = (request.get_json() or {}).get("text", "").strip()
    if not text:
        return jsonify({"error": "No text provided"}), 400
    try:
        inputs = tokenizer_grammar(text, return_tensors="pt", truncation=True, max_length=512).to(DEVICE)
        with grammar_lock:
            outputs = model_grammar.generate(**inputs, max_length=512)
        return jsonify({
            "corrected_text": tokenizer_grammar.decode(outputs[0], skip_special_tokens=True)
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
        tokenizer_M2M100.src_lang = source_lang

        inputs = tokenizer_M2M100(text, return_tensors="pt", truncation=True, max_length=512).to(DEVICE)
        forced_bos_token_id = tokenizer_M2M100.get_lang_id(target_lang)

        with translate_lock:
            generated_tokens = model_translate.generate(
                **inputs,
                forced_bos_token_id=forced_bos_token_id
            )

        translated_text = tokenizer_M2M100.batch_decode(generated_tokens, skip_special_tokens=True)[0]
        return jsonify({
            "source_lang": source_lang,
            "target_lang": target_lang,
            "translated_text": translated_text,
        })
    except Exception as e:
        app.logger.error(f"Translate error: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500

@app.route("/text-to-speech", methods=["POST"])
def text_speech():
    data = request.get_json(silent=True) or {}
    text = data.get("text", "").strip()
    lang = data.get("lang", "en").strip()
    if not text:
        return jsonify({"error": "No text provided"}), 400

    output_file = None
    try:
        voice = VOICE_MAP.get(lang, "en-US-JennyNeural")

        fd, output_file = tempfile.mkstemp(suffix=".mp3")
        os.close(fd) 

        asyncio.run(generate_speech(text, voice, output_file))

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
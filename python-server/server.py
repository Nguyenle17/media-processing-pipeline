from flask import Flask, request, jsonify
import tempfile, os, threading, subprocess
import whisper
import fasttext
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM, M2M100ForConditionalGeneration

DEVICE = "cpu"

app  = Flask(__name__)
lock = threading.Lock()

print("Loading Whisper model...")
model_whisper_tiny = whisper.load_model("tiny")
model_whisper_small = whisper.load_model("small")
model_whisper_base  = whisper.load_model("base")

print("Loading grammar model...")
tokenizer_grammar = AutoTokenizer.from_pretrained("vennify/t5-base-grammar-correction")
model_grammar     = AutoModelForSeq2SeqLM.from_pretrained("vennify/t5-base-grammar-correction")

print("Loading translation model...")
tokenizer_M2M100 = AutoTokenizer.from_pretrained("facebook/m2m100_418M")
model_translate  = M2M100ForConditionalGeneration.from_pretrained("facebook/m2m100_418M")

print("Loading language detection model...")
model_lang = fasttext.load_model("lid.176.bin")

print("Models ready.")

def convert_to_wav(input_path: str) -> str:
    wav_path = input_path + ".wav"
    subprocess.run(
        ["ffmpeg", "-y", "-i", input_path, "-ar", "16000", "-ac", "1", wav_path],
        check=True, capture_output=True
    )
    return wav_path

def detect_language(text: str) -> str:
    pred = model_lang.predict(text)[0][0]
    return pred.replace("__label__", "")

@app.route("/transcribe", methods=["POST"])
def transcribe():
    if "file" not in request.files:
        return jsonify({"error": "No file field in request"}), 400
    
    type = request.form.get("type", "tiny").lower()
    if type == "tiny":
        model = model_whisper_tiny
    elif type == "small":
        model = model_whisper_small
    elif type == "base":
        model = model_whisper_base

    with tempfile.NamedTemporaryFile(delete=False, suffix=".bin") as tmp:
        request.files["file"].save(tmp.name)
        raw_path = tmp.name

    wav_path = None
    try:
        wav_path = convert_to_wav(raw_path)
        with lock:
            result = model.transcribe(wav_path)
            segments = [
                {
                    "start": round(seg["start"], 2),
                    "end":   round(seg["end"], 2),
                    "text":  seg["text"].strip()
                }
                for seg in result["segments"]
            ]
        return jsonify({
            "text": result["text"],
            "segments": segments,
            "language": result.get("language", "unknown"),
        })
    except Exception as e:
        app.logger.error(f"Transcribe error: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500
    finally:
        os.unlink(raw_path)
        if wav_path and os.path.exists(wav_path):
            os.unlink(wav_path)

@app.route("/grammar", methods=["POST"])
def grammar():
    text = (request.get_json() or {}).get("text", "").strip()
    if not text:
        return jsonify({"error": "No text provided"}), 400
    try:
        inputs  = tokenizer_grammar(text, return_tensors="pt", truncation=True, max_length=512)
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
        encoded = tokenizer_M2M100(text, return_tensors="pt", truncation=True, max_length=512)
        generated_tokens = model_translate.generate(
            **encoded,
            forced_bos_token_id=tokenizer_M2M100.get_lang_id(target_lang)
        )
        translated_text = tokenizer_M2M100.batch_decode(
            generated_tokens, skip_special_tokens=True
        )[0]
        return jsonify({
            "source_lang": source_lang,
            "target_lang": target_lang,
            "translated_text": translated_text,
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    print("\nRunning on http://localhost:5000\n")
    app.run(host="0.0.0.0", port=5000, threaded=True)
# 🎬 Video Processing Service

Hệ thống xử lý video tích hợp AI, hỗ trợ phiên âm (transcription), dịch thuật, sửa ngữ pháp và chuyển văn bản thành giọng nói (TTS).

---

## 📐 Kiến trúc tổng quan

```
Client
  └── NestJS API (video.controller.ts)
        └── VideoService (video.service.ts)
              ├── BullMQ Queue ("video")
              │     └── VideoProcessor (video.processor.ts)
              │           ├── TranscriptVideo  ──► Python AI Server (/transcribe)
              │           └── TranslateVideo   ──► Python AI Server (/translate)
              ├── /grammar  ──► Python AI Server (/grammar)
              └── /tts      ──► Python AI Server (/text-to-speech)
```

### Các thành phần chính

| Thành phần | Mô tả |
|---|---|
| `video.controller.ts` | REST API endpoints, xác thực JWT |
| `video.service.ts` | Business logic, chia video thành chunks, đưa vào queue |
| `video.processor.ts` | Worker xử lý job từ BullMQ (transcript + translate) |
| `video.module.ts` | Module NestJS khai báo dependencies |
| `server.py` | Python Flask server chạy các mô hình AI |

---

## 🤖 Python AI Server (`server.py`)

Flask server chạy trên cổng **5000**, tích hợp các mô hình AI:

| Model | Thư viện | Chức năng |
|---|---|---|
| Whisper (tiny/base/small) | `openai-whisper` | Phiên âm giọng nói |
| T5 Grammar | `vennify/t5-base-grammar-correction` | Sửa lỗi ngữ pháp |
| M2M100 | `facebook/m2m100_418M` | Dịch thuật đa ngôn ngữ |
| FastText | `lid.176.bin` | Nhận diện ngôn ngữ |
| Edge TTS | `edge-tts` | Chuyển văn bản thành giọng nói |

### API Endpoints

#### `POST /transcribe`
Phiên âm file audio/video.

**Form-data:**
| Field | Type | Mô tả |
|---|---|---|
| `file` | File | File audio/video cần phiên âm |
| `type` | string | Model Whisper: `tiny` \| `base` \| `small` (mặc định: `tiny`) |

**Response:**
```json
{
  "text": "Nội dung phiên âm...",
  "segments": [
    { "start": 0.0, "end": 3.5, "text": "Đoạn văn bản..." }
  ],
  "language": "vi"
}
```

---

#### `POST /grammar`
Sửa lỗi ngữ pháp văn bản.

**Body (JSON):**
```json
{ "text": "This are a example sentence." }
```

**Response:**
```json
{ "corrected_text": "This is an example sentence." }
```

---

#### `POST /translate`
Dịch văn bản sang ngôn ngữ đích.

**Body (JSON):**
```json
{
  "text": "Xin chào thế giới",
  "target_lang": "en"
}
```

**Response:**
```json
{
  "source_lang": "vi",
  "target_lang": "en",
  "translated_text": "Hello world"
}
```

---

#### `POST /text-to-speech`
Chuyển văn bản thành file âm thanh MP3.

**Body (JSON):**
```json
{
  "text": "Xin chào",
  "lang": "vi"
}
```

**Response:** File MP3 (`audio/mpeg`)

**Ngôn ngữ hỗ trợ:**

| Mã | Ngôn ngữ | Giọng đọc |
|---|---|---|
| `vi` | Tiếng Việt | vi-VN-NamMinhNeural |
| `en` | Tiếng Anh | en-US-BrianNeural |
| `fr` | Tiếng Pháp | fr-FR-HenriNeural |
| `de` | Tiếng Đức | de-DE-KillianNeural |
| `es` | Tiếng Tây Ban Nha | es-ES-AlvaroNeural |
| `ja` | Tiếng Nhật | ja-JP-NanamiNeural |
| `ko` | Tiếng Hàn | ko-KR-HyunsuNeural |
| `zh` | Tiếng Trung | zh-CN-XiaoxiaoNeural |

---

## 🚀 NestJS API

### Endpoints

Tất cả routes yêu cầu **JWT Authentication**.

#### `POST /video/transcribe`
Phiên âm video, tự động chia thành chunks 5 phút và xử lý song song.

**Form-data:**
| Field | Type | Mô tả |
|---|---|---|
| `video` | File | File video cần phiên âm |
| `jobId` | string | ID của job |
| `mode` | string | `normal` \| `segments` (mặc định: `normal`) |
| `model` | string | `tiny` \| `base` \| `small` (mặc định: `tiny`) |
| `start` | number | Thời điểm bắt đầu (giây, mặc định: 0) |
| `end` | number | Thời điểm kết thúc (giây, mặc định: hết video) |

**Response:**
```json
{
  "message": "Video split and queued",
  "totalChunks": 3
}
```

---

#### `POST /video/translate`
Dịch transcript của một job đã phiên âm xong.

**Body (JSON):**
```json
{
  "jobId": "abc123",
  "target_lang": "en"
}
```

---

#### `POST /video/grammar`
Sửa ngữ pháp văn bản trực tiếp (đồng bộ).

**Body (JSON):**
```json
{ "text": "She go to school everyday." }
```

**Response:**
```json
{ "correctedText": "She goes to school every day." }
```

---

#### `POST /video/tts`
Chuyển văn bản thành file MP3 (đồng bộ).

**Body (JSON):**
```json
{
  "text": "Xin chào",
  "lang": "vi"
}
```

**Response:** File MP3 tải về trực tiếp.

---

## ⚙️ Luồng xử lý video

```
Upload video
    │
    ▼
Lấy thời lượng video (ffprobe)
    │
    ▼
Chia thành chunks 5 phút (ffmpeg)
    │
    ▼
Đưa từng chunk vào BullMQ queue
    │
    ▼
Worker xử lý từng chunk (concurrency: 1)
    │
    ├── Gọi Python /transcribe
    ├── Lưu kết quả chunk vào DB
    └── Khi tất cả chunks xong
          ├── Đánh dấu job hoàn thành
          └── (Nếu job type là "translate") → Tự động đưa vào queue dịch
```

---

## 🛠️ Cài đặt & Chạy

### Python AI Server

```bash
# Cài dependencies
pip install flask torch whisper transformers fasttext edge-tts

# Tải model FastText
wget https://dl.fbaipublicfiles.com/fasttext/supervised-models/lid.176.bin

# Chạy server
python server.py
```

### NestJS Service

```bash
# Cài dependencies
npm install

# Cấu hình biến môi trường
cp .env.example .env
# Chỉnh sửa AI_URI và các biến khác

# Chạy development
npm run start:dev
```

### Biến môi trường

| Biến | Mô tả | Ví dụ |
|---|---|---|
| `AI_URI` | URL của Python AI Server | `http://localhost:5000` |
| `JWT_SECRET` | Secret key cho JWT | `your-secret-key` |

---

## 📦 Công nghệ sử dụng

**Backend (NestJS):**
- `@nestjs/bullmq` — Job queue
- `fluent-ffmpeg` — Xử lý video
- `@nestjs/axios` — HTTP client
- `@nestjs/jwt` — Xác thực JWT

**AI Server (Python):**
- `openai-whisper` — Speech-to-text
- `transformers` — NLP models (T5, M2M100)
- `fasttext` — Language detection
- `edge-tts` — Text-to-speech
- `flask` — Web framework
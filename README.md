# Media Processing Pipeline

Nền tảng xử lý video/audio tích hợp AI: phiên âm, dịch thuật, sửa ngữ pháp, chuyển văn bản thành giọng nói (TTS) và quản lý lịch sử xử lý.

Repository gồm ba ứng dụng độc lập:

- **React client** — giao diện người dùng.
- **NestJS API** — xác thực, quản lý job, chia video thành chunks và điều phối queue.
- **Python AI service** — chạy các mô hình AI, chỉ truy cập nội bộ từ NestJS.

---

## Tính năng

- Tải video, chọn khoảng thời gian và chia thành các chunk 5 phút.
- Phiên âm audio/video bằng Whisper, hỗ trợ nhiều kích thước model.
- Dịch văn bản đa ngôn ngữ bằng M2M100.
- Nhận diện ngôn ngữ bằng FastText.
- Sửa lỗi ngữ pháp tiếng Anh bằng T5.
- Chuyển văn bản thành MP3 bằng Edge TTS, hỗ trợ 12 ngôn ngữ.
- Xác thực JWT, refresh token bằng cookie `httpOnly`.
- Quản lý job, lịch sử phiên âm/dịch và lịch sử TTS.
- Phân quyền admin: quản lý người dùng, khóa/mở khóa tài khoản.

---

## Kiến trúc

```text
┌────────────────────┐
│  React client      │
│  Vite :5173        │
└─────────┬──────────┘
          │ HTTPS/JSON, Bearer access token
          ▼
┌────────────────────┐
│  NestJS API        │
│  :3000             │
└─────────┬──────────┘
          ├── MongoDB              lưu user, job, video, lịch sử
          ├── Redis + BullMQ       queue xử lý video
          ├── Cloudinary           lưu file MP3 của TTS
          ├── SMTP                 email xác thực / reset mật khẩu
          │
          └── Python AI service :5000
                ├── Whisper        phiên âm
                ├── M2M100         dịch thuật
                ├── T5             sửa ngữ pháp
                ├── FastText       nhận diện ngôn ngữ
                └── Edge TTS       tạo giọng nói
```

Python AI service là **private service**. Mọi request từ NestJS phải gửi header `X-AI-Service-Token`.

### Thành phần chính

| Thành phần | Trách nhiệm |
|---|---|
| `client/react-client` | Giao diện, upload video, hiển thị tiến trình, lịch sử |
| `server/nest-server` | REST API, JWT, BullMQ worker, MongoDB, Cloudinary |
| `python-server` | Flask API bọc các model AI |
| MongoDB | Dữ liệu người dùng, job, video, lịch sử |
| Redis | Backend cho BullMQ queue |
| Cloudinary | Lưu file MP3 và lịch sử TTS |

---

## Cấu trúc repository

```text
media-processing-pipeline/
├── client/
│   └── react-client/          # React 19 + Vite + Tailwind CSS
├── server/
│   └── nest-server/           # NestJS API + BullMQ worker
├── python-server/             # Flask AI service
│   ├── app/
│   │   ├── __init__.py        # create_app()
│   │   ├── auth.py            # Kiểm tra X-AI-Service-Token
│   │   ├── config.py          # Đọc cấu hình từ .env
│   │   ├── routes/            # HTTP endpoints
│   │   └── services/          # Wrapper cho từng model AI
│   ├── tests/
│   ├── server.py              # Entrypoint
│   ├── requirements.txt
│   └── .env.example
└── README.md
```

---

## Công nghệ sử dụng

| Layer | Công nghệ |
|---|---|
| Frontend | React 19, Vite, React Router, Tailwind CSS |
| Backend | NestJS 11, TypeScript, Mongoose, BullMQ, JWT, Passport |
| AI service | Python 3.11, Flask, PyTorch, Whisper, Transformers, FastText, Edge TTS |
| Infrastructure | MongoDB, Redis, Cloudinary, SMTP |

---

## Yêu cầu hệ thống

- Node.js 20+ và npm.
- Python 3.11+.
- `ffmpeg` và `ffprobe` có trong `PATH`.
- MongoDB và Redis đang chạy.
- Tài khoản Cloudinary nếu dùng tính năng TTS.
- SMTP (Gmail App Password) nếu dùng xác thực email.
- GPU CUDA là tùy chọn. Service vẫn chạy được trên CPU, nhưng chậm hơn.

---

## Cài đặt

### 1. Chuẩn bị hạ tầng

Có thể chạy MongoDB và Redis bằng Docker:

```bash
docker run -d --name media-mongodb -p 27017:27017 mongo:7
docker run -d --name media-redis -p 6379:6379 redis:7
```

Hoặc cài đặt trực tiếp và đảm bảo chúng đang lắng nghe trên các cổng mặc định.

### 2. Python AI service

```bash
cd python-server

python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Linux/macOS

pip install -r requirements.txt

# Tải model FastText vào python-server/lid.176.bin
# https://dl.fbaipublicfiles.com/fasttext/supervised-models/lid.176.bin

copy .env.example .env         # Windows
# cp .env.example .env         # Linux/macOS

python server.py
```

Service chạy tại `http://127.0.0.1:5000`. Lần khởi động đầu tiên sẽ tải các model Whisper/T5/M2M100 từ Hugging Face và có thể mất vài phút.

Chạy test:

```bash
python -m unittest discover -s tests -v
```

### 3. NestJS API

```bash
cd server/nest-server

npm install

copy .env.example .env         # Windows
# cp .env.example .env         # Linux/macOS

npm run start:dev
```

API chạy tại `http://localhost:3000`. Cần cấu hình thêm Cloudinary, SMTP và thông tin Google OAuth nếu sử dụng các tính năng tương ứng.

### 4. React client

```bash
cd client/react-client

npm install

# Tạo file .env
VITE_API_URL=http://localhost:3000

npm run dev
```

Client chạy tại `http://localhost:5173`.

---

## Biến môi trường

### Python AI service (`python-server/.env`)

| Biến | Bắt buộc | Mặc định | Mô tả |
|---|---|---|---|
| `AI_SERVICE_TOKEN` | Có | — | Token dùng chung với NestJS |
| `AI_BIND_HOST` | Không | `127.0.0.1` | Địa chỉ bind; chỉ đổi thành `0.0.0.0` khi có private network/firewall |
| `AI_PORT` | Không | `5000` | Cổng service |
| `AI_MAX_REQUEST_BYTES` | Không | `536870912` | Giới hạn request body (512 MB) |

### NestJS (`server/nest-server/.env`)

| Biến | Bắt buộc | Mô tả |
|---|---|---|
| `NODE_ENV` | Không | `development` hoặc `production` |
| `MONGODB_URI` | Có | Chuỗi kết nối MongoDB |
| `REDIS_HOST` | Không | Mặc định `localhost` |
| `REDIS_PORT` | Không | Mặc định `6379` |
| `CORS_ORIGINS` | Không | Danh sách origin được phép, phân tách bằng dấu phẩy |
| `FRONTEND_URL` | Không | URL client dùng cho redirect OAuth |
| `JWT_SECRET` | Có | Secret cho access token |
| `JWT_REFRESH_SECRET` | Có | Secret riêng cho refresh token |
| `ACCESS_TOKEN_EXPIRATION_MINUTES` | Không | Mặc định `15` |
| `REFRESH_TOKEN_EXPIRATION_DAYS` | Không | Mặc định `7` |
| `AUTH_COOKIE_SAMESITE` | Không | Mặc định `lax` |
| `AUTH_COOKIE_SECURE` | Không | Đặt `true` khi chạy HTTPS |
| `AI_URI` | Có | URL Python AI service, ví dụ `http://127.0.0.1:5000` |
| `AI_SERVICE_TOKEN` | Có | Phải giống token của Python service |
| `AI_REQUEST_TIMEOUT_MS` | Không | Timeout cho job phiên âm; `0` là không giới hạn |
| `CLOUDINARY_CLOUD_NAME` | Có* | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Có* | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Có* | Cloudinary API secret |
| `SMTP_USER` | Có* | Tài khoản Gmail gửi email |
| `SMTP_PASS` | Có* | Gmail App Password |
| `GOOGLE_CLIENT_ID` | Có* | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Có* | Google OAuth client secret |
| `GOOGLE_REDIRECT_URI` | Không | Mặc định `http://localhost:3000/auth/google/callback` |

`*` Bắt buộc nếu sử dụng tính năng tương ứng (TTS, email, đăng nhập Google).

### React client (`client/react-client/.env`)

| Biến | Mặc định | Mô tả |
|---|---|---|
| `VITE_API_URL` | `http://localhost:3000` | URL NestJS API |

---

## API

### Quy ước xác thực

- NestJS API dùng access token trong header `Authorization: Bearer <token>`.
- Refresh token nằm trong cookie `httpOnly`, được gửi kèm với `credentials: include`.
- Các route `/video`, `/users`, `/admin` yêu cầu đăng nhập; `/admin` yêu cầu role `admin`.
- Python AI service yêu cầu header `X-AI-Service-Token` cho **tất cả** endpoint, kể cả `/health`.

### NestJS API

| Method | Endpoint | Mô tả |
|---|---|---|
| `POST` | `/auth/register` | Đăng ký tài khoản |
| `POST` | `/auth/login` | Đăng nhập, trả access token và set refresh cookie |
| `POST` | `/auth/verify-email` | Xác thực email |
| `POST` | `/auth/refresh` | Làm mới access token |
| `POST` | `/auth/logout` | Đăng xuất, xóa refresh cookie |
| `POST` | `/auth/forgot-password` | Gửi email đặt lại mật khẩu |
| `POST` | `/auth/reset-password` | Đặt lại mật khẩu |
| `GET` | `/auth/google` | Bắt đầu đăng nhập Google |
| `GET` | `/auth/google/callback` | Callback Google OAuth |
| `POST` | `/video/transcribe` | Upload video và đưa các chunk vào queue |
| `POST` | `/video/translate` | Dịch transcript của một job |
| `POST` | `/video/grammar` | Sửa ngữ pháp văn bản |
| `POST` | `/video/tts` | Tạo file MP3 và lưu lịch sử |
| `GET` | `/video/tts/history` | Lấy lịch sử TTS |
| `DELETE` | `/video/tts/history/:id` | Xóa một bản ghi lịch sử TTS |
| `GET` | `/users/settings` | Lấy cài đặt người dùng |
| `PUT` | `/users/settings` | Cập nhật model phiên âm mặc định |
| `GET` | `/admin/users` | Danh sách người dùng (admin) |
| `PATCH` | `/admin/user/:id/role` | Cập nhật role (admin) |
| `PATCH` | `/admin/user/:id/ban` | Khóa tài khoản (admin) |
| `PATCH` | `/admin/user/:id/unban` | Mở khóa tài khoản (admin) |

`POST /video/transcribe` nhận `multipart/form-data` với các field:

| Field | Kiểu | Mô tả |
|---|---|---|
| `video` | File | File video cần xử lý |
| `jobId` | string | ID job đã tạo |
| `mode` | string | `normal` hoặc `segments` |
| `start` | number | Thời điểm bắt đầu (giây), mặc định `0` |
| `end` | number | Thời điểm kết thúc (giây), mặc định hết video |

Model Whisper được lấy từ cài đặt người dùng (`/users/settings`), không truyền qua form.

### Python AI service

| Method | Endpoint | Mô tả |
|---|---|---|
| `GET` | `/health` | Trạng thái service và model Whisper đang load |
| `POST` | `/transcribe` | Phiên âm file audio/video |
| `POST` | `/grammar` | Sửa ngữ pháp văn bản |
| `POST` | `/translate` | Dịch văn bản |
| `POST` | `/detect-language` | Nhận diện ngôn ngữ |
| `POST` | `/text-to-speech` | Trả file MP3 |

#### `POST /transcribe`

`multipart/form-data`:

| Field | Kiểu | Mô tả |
|---|---|---|
| `file` | File | Audio hoặc video |
| `type` | string | Whisper model, mặc định `small` |
| `language` | string | Mã ngôn ngữ; bỏ trống để tự nhận diện |

Response:

```json
{
  "model": "small",
  "text": "Nội dung phiên âm...",
  "segments": [
    { "start": 0.0, "end": 3.5, "text": "Đoạn văn bản..." }
  ],
  "language": "vi"
}
```

#### `POST /grammar`

```json
{ "text": "This are a example sentence." }
```

```json
{ "corrected_text": "This is an example sentence." }
```

#### `POST /translate`

```json
{
  "text": "Xin chào thế giới",
  "target_lang": "en"
}
```

```json
{
  "source_lang": "vi",
  "target_lang": "en",
  "translated_text": "Hello world"
}
```

#### `POST /detect-language`

```json
{ "text": "Xin chào thế giới" }
```

```json
{ "language": "vi" }
```

#### `POST /text-to-speech`

```json
{
  "text": "Xin chào",
  "lang": "vi",
  "autoTranslate": true
}
```

Response: `audio/mpeg`.

Ngôn ngữ hỗ trợ:

| Mã | Ngôn ngữ | Giọng đọc |
|---|---|---|
| `vi` | Tiếng Việt | `vi-VN-NamMinhNeural` |
| `en` | Tiếng Anh | `en-US-BrianNeural` |
| `fr` | Tiếng Pháp | `fr-FR-HenriNeural` |
| `de` | Tiếng Đức | `de-DE-KillianNeural` |
| `es` | Tiếng Tây Ban Nha | `es-ES-AlvaroNeural` |
| `it` | Tiếng Ý | `it-IT-DiegoNeural` |
| `pt` | Tiếng Bồ Đào Nha | `pt-BR-AntonioNeural` |
| `ru` | Tiếng Nga | `ru-RU-DmitryNeural` |
| `ja` | Tiếng Nhật | `ja-JP-NanamiNeural` |
| `ko` | Tiếng Hàn | `ko-KR-HyunsuNeural` |
| `zh` | Tiếng Trung | `zh-CN-XiaoxiaoNeural` |
| `ar` | Tiếng Ả Rập | `ar-SA-HamedNeural` |

---

## Luồng xử lý video

```text
Upload video
    │
    ▼
Kiểm tra job và quyền sở hữu
    │
    ▼
Đọc thời lượng bằng ffprobe
    │
    ▼
Cắt video thành các chunk 5 phút bằng ffmpeg
    │
    ▼
Đưa từng chunk vào BullMQ queue "video"
    │
    ▼
Worker xử lý tuần tự (concurrency = 1)
    ├── Gọi Python /transcribe
    ├── Lưu transcript của chunk
    └── Khi tất cả chunk xong
          ├── Đánh dấu job hoàn thành
          └── Nếu job type là "translate"
                └── Đưa job dịch vào queue
```

---

## Kiểm thử và chất lượng mã

### Python

```bash
cd python-server
python -m unittest discover -s tests -v
```

### NestJS

```bash
cd server/nest-server
npm test
npm run test:e2e
npm run lint
```

### React

```bash
cd client/react-client
npm run lint
npm run build
```

---

## Bảo mật và vận hành

- Không commit file `.env` hoặc model `lid.176.bin` vào Git.
- `JWT_SECRET` và `JWT_REFRESH_SECRET` phải là hai chuỗi ngẫu nhiên khác nhau.
- `AI_SERVICE_TOKEN` phải giống nhau ở NestJS và Python service.
- Giữ `AI_BIND_HOST=127.0.0.1` khi chạy cùng máy. Nếu chạy khác host/container, dùng private network hoặc firewall; token không thay thế firewall.
- Trong production, đặt `AUTH_COOKIE_SECURE=true` và cấu hình HTTPS.
- Access token chỉ lưu trong bộ nhớ trình duyệt. Refresh token được lưu dưới dạng hash trong database và xoay vòng sau mỗi lần refresh.
- Nên tạo lại toàn bộ secret nếu chúng từng xuất hiện trong log, file `.env` hoặc lịch sử Git.
- TTS giới hạn 2.000 ký tự mỗi request.
- M2M100 xử lý tối đa 512 token mỗi lần; văn bản dài cần được chia nhỏ.

---

## Xử lý sự cố

| Lỗi | Nguyên nhân thường gặp | Cách xử lý |
|---|---|---|
| `401 Unauthorized` từ Python | Token không khớp | Đảm bảo `AI_SERVICE_TOKEN` giống nhau ở hai service |
| `AI_SERVICE_TOKEN is not configured` | Thiếu biến môi trường | Tạo `python-server/.env` từ `.env.example` |
| `lid.176.bin` không tìm thấy | Chưa tải model FastText | Tải file vào `python-server/lid.176.bin` |
| `Cannot decode audio file` | `ffmpeg` lỗi hoặc file không hợp lệ | Kiểm tra `ffmpeg`/`ffprobe` trong `PATH` và định dạng file |
| `507` khi phiên âm | Hết VRAM | Dùng Whisper model nhỏ hơn hoặc chạy CPU |
| Khởi động Python rất lâu | Đang tải model từ Hugging Face | Chờ lần đầu hoặc tải trước model vào cache |
| NestJS không kết nối Redis | Redis chưa chạy | Khởi động Redis và kiểm tra `REDIS_HOST`/`REDIS_PORT` |
| Không kết nối MongoDB | `MONGODB_URI` sai hoặc MongoDB chưa chạy | Kiểm tra chuỗi kết nối và trạng thái MongoDB |
| CORS hoặc cookie không hoạt động | Origin/credentials cấu hình sai | Kiểm tra `CORS_ORIGINS`, `FRONTEND_URL` và `AUTH_COOKIE_SECURE` |
| TTS lỗi Cloudinary | Thiếu key hoặc sai tài khoản | Kiểm tra `CLOUDINARY_*` trong `.env` |
| Không gửi được email | Thiếu SMTP hoặc dùng mật khẩu thường | Dùng Gmail App Password cho `SMTP_PASS` |

---

## Ghi chú

- `python-server/app` có thể import và test mà không cần load model AI.
- Các model AI được warmup khi chạy `server.py`, không load trong `create_app()`.
- Whisper model mặc định là `small`; có thể đổi trong `python-server/app/services/transcription.py`.

import { useState, useContext, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import Api from "../api/Api";
 import { 
  Volume2, 
  Trash2, 
  Download, 
  AlertTriangle, 
  PenTool, 
  Type, 
  FileAudio 
} from "lucide-react";

 const LANGUAGES = [
  { code: 'vi', label: 'Vietnamese', flag: '🇻🇳', voice: 'vi-VN' },
  { code: 'en', label: 'English',    flag: '🇺🇸', voice: 'en-US' },
  { code: 'zh', label: 'Chinese',    flag: '🇨🇳', voice: 'zh-CN' },
  { code: 'ko', label: 'Korean',     flag: '🇰🇷', voice: 'ko-KR' },
  { code: 'ja', label: 'Japanese',   flag: '🇯🇵', voice: 'ja-JP' },
  { code: 'fr', label: 'French',     flag: '🇫🇷', voice: 'fr-FR' },
  { code: 'de', label: 'German',     flag: '🇩🇪', voice: 'de-DE' },
  { code: 'es', label: 'Spanish',    flag: '🇪🇸', voice: 'es-ES' },
];

const MAX_CHARS = 2000;

export default function ExtractAudio() {
  const [text, setText]           = useState('');
  const [lang, setLang]           = useState('vi');
  const [loading, setLoading]     = useState(false);
  const [status, setStatus]       = useState('');
  const [audioURL, setAudioURL]   = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [error, setError]         = useState('');

  const audioRef = useRef(null);
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const selectedLang = LANGUAGES.find(l => l.code === lang);
  const charCount    = text.length;
  const isOverLimit  = charCount > MAX_CHARS;
  const canSubmit    = text.trim().length > 0 && !isOverLimit && !loading;

 
  const handleGenerate = async () => {
    if (!user) { alert("Please log in."); navigate('/login'); return; }
    if (!canSubmit) return;

    try {
      setLoading(true);
      setError('');
      setStatus('Generating audio...');
      setAudioURL(null);
      setAudioBlob(null);

      const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${BASE_URL}/video/tts`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${Api.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: text.trim(), lang }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || `Server error: ${response.status}`);
      }

      const blob = await response.blob();
      const url  = URL.createObjectURL(blob);
      setAudioBlob(blob);
      setAudioURL(url);
      setStatus('Done!');

      setTimeout(() => { if (audioRef.current) audioRef.current.play(); }, 100);

    } catch (err) {
      setError(err.message || 'Something went wrong.');
      setStatus('');
    } finally {
      setLoading(false);
    }
  };

 
  const handleDownload = () => {
    if (!audioBlob) return;
    const url = URL.createObjectURL(audioBlob);
    const a   = document.createElement('a');
    a.href     = url;
    a.download = `tts_${lang}_${Date.now()}.mp3`;
    a.click();
    URL.revokeObjectURL(url);
  };

 
  const handleClear = () => {
    setText('');
    setAudioURL(null);
    setAudioBlob(null);
    setStatus('');
    setError('');
  };

 
  return (
    <section style={{
      fontFamily: "'Inter', sans-serif",
      background: '#0a0a0f',
      minHeight: '100vh',
      color: '#fff',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');

        .tts-wrap {
          max-width: 860px;
          margin: 0 auto;
          padding: 60px 24px 80px;
        }

        /* ── Lang picker ── */
        .lang-grid {
          display: grid;
          grid-template-columns: repeat(8, 1fr);
          gap: 8px;
          margin-bottom: 28px;
        }
        @media (max-width: 640px) {
          .lang-grid { grid-template-columns: repeat(4, 1fr); }
        }
        .lang-btn {
          padding: 10px 6px;
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.02);
          cursor: pointer;
          transition: all 0.15s;
          text-align: center;
          outline: none;
        }
        .lang-btn:hover {
          border-color: rgba(99,102,241,0.4);
          background: rgba(99,102,241,0.08);
        }
        .lang-btn.active {
          border-color: rgba(99,102,241,0.7);
          background: rgba(99,102,241,0.18);
          box-shadow: 0 0 0 1px rgba(99,102,241,0.4);
        }
        .lang-flag  { font-size: 22px; display: block; margin-bottom: 4px; }
        .lang-label { font-size: 10px; color: #a5b4fc; font-family: 'JetBrains Mono', monospace; }

        /* ── Textarea panel ── */
        .text-panel {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px;
          overflow: hidden;
          transition: border-color 0.2s;
          margin-bottom: 16px;
        }
        .text-panel:focus-within {
          border-color: rgba(99,102,241,0.45);
        }
        .text-panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .text-panel-label {
          font-size: 11px;
          font-family: 'JetBrains Mono', monospace;
          color: #71717a;
          text-transform: uppercase;
          letter-spacing: 0.12em;
        }
        .char-counter {
          font-size: 11px;
          font-family: 'JetBrains Mono', monospace;
        }
        .text-area {
          width: 100%;
          min-height: 200px;
          background: transparent;
          border: none;
          outline: none;
          resize: vertical;
          color: #e4e4e7;
          font-size: 15px;
          line-height: 1.7;
          padding: 16px;
          font-family: 'Inter', sans-serif;
          box-sizing: border-box;
        }
        .text-area::placeholder { color: #3f3f46; }

        /* ── Action row ── */
        .action-row {
          display: flex;
          gap: 10px;
          align-items: center;
        }
        .btn-generate {
          flex: 1;
          padding: 14px 24px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          border: none;
          border-radius: 12px;
          color: #fff;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          font-family: 'Inter', sans-serif;
          transition: all 0.2s;
          box-shadow: 0 4px 20px rgba(99,102,241,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .btn-generate:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 28px rgba(99,102,241,0.45);
        }
        .btn-generate:disabled {
          opacity: 0.45;
          cursor: not-allowed;
          transform: none;
        }
        .btn-clear {
          padding: 14px 18px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          color: #71717a;
          font-size: 13px;
          font-family: 'JetBrains Mono', monospace;
          cursor: pointer;
          transition: all 0.15s;
          white-space: nowrap;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .btn-clear:hover { background: rgba(255,255,255,0.08); color: #fff; }

        /* ── Audio result ── */
        .audio-panel {
          margin-top: 24px;
          background: rgba(16,185,129,0.05);
          border: 1px solid rgba(16,185,129,0.2);
          border-radius: 16px;
          padding: 20px;
          animation: fadeIn 0.35s ease;
        }
        .audio-panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 14px;
        }
        .audio-label {
          font-size: 11px;
          font-family: 'JetBrains Mono', monospace;
          color: #6ee7b7;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .audio-dot {
          width: 7px; height: 7px; border-radius: 50%;
          background: #10b981;
          animation: pulse 2s infinite;
        }
        .btn-download {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          background: rgba(16,185,129,0.15);
          border: 1px solid rgba(16,185,129,0.35);
          border-radius: 8px;
          color: #6ee7b7;
          font-size: 12px;
          font-family: 'JetBrains Mono', monospace;
          cursor: pointer;
          transition: all 0.15s;
        }
        .btn-download:hover { background: rgba(16,185,129,0.28); }
        .audio-player {
          width: 100%;
          height: 44px;
          border-radius: 8px;
          accent-color: #10b981;
        }
        .audio-meta {
          margin-top: 10px;
          font-size: 12px;
          color: #52525b;
          font-family: 'JetBrains Mono', monospace;
        }

        /* ── Error ── */
        .error-box {
          margin-top: 16px;
          padding: 12px 16px;
          background: rgba(239,68,68,0.08);
          border: 1px solid rgba(239,68,68,0.25);
          border-radius: 10px;
          color: #fca5a5;
          font-size: 13px;
          font-family: 'JetBrains Mono', monospace;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        /* ── Loading spinner ── */
        .spinner {
          width: 16px; height: 16px;
          border: 2px solid rgba(255,255,255,0.2);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          flex-shrink: 0;
        }

        /* ── Tips ── */
        .tips {
          margin-top: 32px;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }
        @media (max-width: 640px) { .tips { grid-template-columns: 1fr; } }
        .tip {
          padding: 14px 16px;
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 12px;
        }
        .tip-icon-wrap { color: #6366f1; margin-bottom: 8px; display: flex; align-items: center; }
        .tip-title { font-size: 12px; font-weight: 600; color: #a1a1aa; margin-bottom: 4px; }
        .tip-desc  { font-size: 11px; color: #52525b; line-height: 1.5; font-family: 'JetBrains Mono', monospace; }

        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes spin  { to { transform: rotate(360deg); } }
      `}</style>

      <div className="tts-wrap">

        {/* Header */}
        <div style={{ marginBottom: 36 }}>
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#6366f1', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 10 }}>
            // text-to-speech
          </p>
          <h1 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, lineHeight: 1.1, marginBottom: 10 }}>
            Turn text into{' '}
            <span style={{ background: 'linear-gradient(135deg, #10b981, #6ee7b7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              speech.
            </span>
          </h1>
          <p style={{ color: '#52525b', fontSize: 14, fontFamily: "'JetBrains Mono', monospace" }}>
            Enter your text, select a language → download the MP3 audio file.
          </p>
        </div>

        {/* Language selector */}
        <div style={{ marginBottom: 8 }}>
          <p style={{ fontSize: 11, color: '#71717a', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
            Voice Language
          </p>
          <div className="lang-grid">
            {LANGUAGES.map(l => (
              <button
                key={l.code}
                className={`lang-btn ${lang === l.code ? 'active' : ''}`}
                onClick={() => setLang(l.code)}
              >
                <span className="lang-flag">{l.flag}</span>
                <span className="lang-label">{l.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Text input */}
        <div className="text-panel">
          <div className="text-panel-header">
            <span className="text-panel-label">
              {selectedLang?.flag} {selectedLang?.label} · {selectedLang?.voice}
            </span>
            <span
              className="char-counter"
              style={{ color: isOverLimit ? '#f87171' : charCount > MAX_CHARS * 0.8 ? '#fbbf24' : '#52525b' }}
            >
              {charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()}
            </span>
          </div>
          <textarea
            className="text-area"
            placeholder={`Enter ${selectedLang?.label} text to generate speech...`}
            value={text}
            onChange={e => setText(e.target.value)}
            maxLength={MAX_CHARS + 100}
          />
        </div>

        {/* Validation hint */}
        {isOverLimit && (
          <p style={{ fontSize: 12, color: '#f87171', fontFamily: "'JetBrains Mono', monospace", marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertTriangle size={14} /> Character limit exceeded ({MAX_CHARS}) — please shorten your text.
          </p>
        )}

        {/* Action buttons */}
        <div className="action-row">
          <button
            className="btn-generate"
            onClick={handleGenerate}
            disabled={!canSubmit}
          >
            {loading ? (
              <><span className="spinner" /> Generating audio...</>
            ) : (
              <><Volume2 size={18} /> Generate Speech</>
            )}
          </button>
          <button className="btn-clear" onClick={handleClear}>
            <Trash2 size={14} /> Clear
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="error-box">
            <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Audio result */}
        {audioURL && (
          <div className="audio-panel">
            <div className="audio-panel-header">
              <span className="audio-label">
                <span className="audio-dot" />
                Audio Ready · {selectedLang?.flag} {selectedLang?.label}
              </span>
              <button className="btn-download" onClick={handleDownload}>
                <Download size={14} /> Download MP3
              </button>
            </div>
            <audio
              ref={audioRef}
              className="audio-player"
              src={audioURL}
              controls
            />
            <p className="audio-meta">
              {charCount} characters → tts_{lang}_{new Date().toLocaleDateString('en-US')}.mp3
            </p>
          </div>
        )}

        {/* Tips */}
        <div className="tips">
          {[
            { icon: <PenTool size={18} />, title: 'Write Naturally', desc: 'Punctuation helps the AI pause properly. Avoid abbreviations.' },
            { icon: <Type size={18} />, title: '2,000 Character Limit', desc: 'For long text, please split it into smaller paragraphs.' },
            { icon: <FileAudio size={18} />, title: 'MP3 Format', desc: 'Downloaded audio files can be used immediately on any device.' },
          ].map((t, idx) => (
            <div className="tip" key={idx}>
              <div className="tip-icon-wrap">{t.icon}</div>
              <div className="tip-title">{t.title}</div>
              <div className="tip-desc">{t.desc}</div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
} 
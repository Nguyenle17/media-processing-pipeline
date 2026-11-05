import { useState } from 'react';
import LanguagePicker from '../components/common/LanguagePicker';
import { LANGUAGES } from '../constants/languages';
import Api from '../api/Api';
import {
  AlertTriangle,
  Download,
  FileAudio,
  PenTool,
  Trash2,
  Volume2,
  Wand2,
} from 'lucide-react';

export default function ExtractAudio() {
  const [text, setText] = useState<string>('');
  const [targetLang, setTargetLang] = useState<string>('en');
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const charCount = text.length;
  const maxChars = 2000;
  const isOverLimit = charCount > maxChars;

  const handleGenerate = async () => {
    if (!text.trim() || isOverLimit) return;
    setIsProcessing(true);
    setError(null);
    setAudioURL(null);

    try {
      const response = await Api.raw('/video/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: text.trim(), language: targetLang })
      });
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setAudioURL(url);
    } catch (err: any) {
      setError(err.message || 'Failed to generate audio');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClear = () => {
    setText('');
    setAudioURL(null);
    setError(null);
  };

  return (
    <div className="vs-page fade-in">
      <div className="vs-container">
        <div className="vs-page-head">
          <div className="vs-page-head__text">
            <span className="vs-page-kicker">Text to speech</span>
            <h1 className="vs-page-title"><Volume2 size={26} /> Generate a voiceover</h1>
            <p className="vs-page-desc">Convert up to 2,000 characters into natural-sounding speech in the language you choose.</p>
          </div>
        </div>

        <div className="vs-tts-grid">
          <div className="vs-stack">
            <div className="vs-panel">
              <div className="vs-panel-header">
                <div className="vs-panel-header__group">
                  <span className="vs-panel-dot" />
                  <h2 className="vs-panel-title">Script</h2>
                </div>
                <button className="vs-btn vs-btn--ghost vs-btn--sm" onClick={handleClear} disabled={!text && !audioURL}>
                  <Trash2 size={13} /> Clear
                </button>
              </div>
              <div className="vs-panel-body">
                <label className="vs-label" htmlFor="tts-script">Text to speak</label>
                <textarea
                  id="tts-script"
                  className="vs-textarea"
                  style={{ marginTop: 6 }}
                  placeholder="Paste or type the script you want to turn into audio…"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  aria-invalid={isOverLimit}
                  aria-describedby="tts-char-count"
                />
                <div id="tts-char-count" className={`vs-char-count ${isOverLimit ? 'is-over' : ''}`}>
                  {charCount.toLocaleString()} / {maxChars.toLocaleString()} characters
                </div>
              </div>
            </div>

            <div className="vs-panel">
              <div className="vs-panel-header">
                <div className="vs-panel-header__group">
                  <span className="vs-panel-dot" />
                  <h2 className="vs-panel-title">Voice language</h2>
                </div>
              </div>
              <div className="vs-panel-body">
                <LanguagePicker
                  languages={LANGUAGES}
                  selected={targetLang}
                  onSelect={setTargetLang}
                />
              </div>
            </div>

            {error && (
              <div className="vs-form-error" role="alert">
                <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>{error}</span>
              </div>
            )}

            <button
              className="vs-submit-btn"
              onClick={handleGenerate}
              disabled={isProcessing || !text.trim() || isOverLimit}
            >
              {isProcessing ? 'Generating audio…' : <><Wand2 size={17} /> Generate audio</>}
            </button>
          </div>

          <div className="vs-stack">
            <div className="vs-panel">
              <div className="vs-panel-header">
                <div className="vs-panel-header__group">
                  <span className={`vs-panel-dot ${audioURL ? 'vs-panel-dot--success' : 'vs-panel-dot--muted'}`} />
                  <h2 className="vs-panel-title">Result</h2>
                </div>
              </div>
              <div className="vs-panel-body" style={{ minHeight: 180 }} aria-live="polite">
                {audioURL ? (
                  <div className="vs-stack">
                    <audio controls src={audioURL} />
                    <a
                      href={audioURL}
                      download="generated-audio.mp3"
                      className="vs-btn vs-btn--success vs-btn--block"
                    >
                      <Download size={16} /> Download MP3
                    </a>
                  </div>
                ) : (
                  <div className="vs-empty" style={{ minHeight: 140 }}>
                    <FileAudio size={28} />
                    <p>Your audio will appear here.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="vs-panel">
              <div className="vs-panel-header">
                <div className="vs-panel-header__group">
                  <PenTool size={14} style={{ color: 'var(--vs-accent-light)' }} />
                  <h2 className="vs-panel-title">Writing tips</h2>
                </div>
              </div>
              <div className="vs-panel-body">
                <ul className="vs-tips">
                  <li>Use punctuation to create natural pauses.</li>
                  <li>Keep sentences short and direct.</li>
                  <li>Match the voice language to the script.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

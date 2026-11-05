import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useUploadWithProgress } from '../hooks/useUploadWithProgress';
import { useJobPolling } from '../hooks/useJobPolling';
import ProgressRing from '../components/common/ProgressRing';
import FileDropzone from '../components/common/FileDropzone';
import ExportPanel from '../components/common/ExportPanel';
import {
  ArrowRight,
  Download,
  FileText,
  Languages,
  RefreshCw,
  Sparkles,
  UploadCloud,
  Wand2,
} from 'lucide-react';
import { MODELS } from '../constants/models';
import { LANGUAGES } from '../constants/languages';
import RangeSlider from 'react-range-slider-input';
import 'react-range-slider-input/dist/style.css';
import Api from '../api/Api';

export default function Home() {
  const { user } = useAuth();
  const uploader = useUploadWithProgress();
  const poller = useJobPolling();

  const [videoURL, setVideoURL] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [duration, setDuration] = useState<number>(0);
  const [range, setRange] = useState<[number, number]>([0, 100]);
  const [text, setText] = useState<string>('');
  const [textOriginal, setTextOriginal] = useState<string>('');
  const [mode, setMode] = useState<string>('normal');
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);

  const isWorking = uploader.isUploading || poller.isPolling;

  // Merge upload (0-20%) and polling (20-100%) into one progress range
  const totalProgress = uploader.isUploading
    ? Math.round(uploader.progress * 0.2)
    : poller.isPolling
      ? Math.round(20 + poller.percentage * 0.8)
      : 0;

  const handleVideoLoaded = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      setRange([0, videoRef.current.duration]);
    }
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      setVideoURL(URL.createObjectURL(file));
      setText('');
      setTextOriginal('');
      setError(null);
      poller.reset();
      uploader.reset();
    }
  };

  const handleRangeChange = (value: [number, number]) => {
    setRange(value);
    if (videoRef.current) {
      videoRef.current.currentTime = value[0];
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleSubmitVideo = async () => {
    if (!videoFile || isWorking) return;

    setText('');
    setTextOriginal('');
    setError(null);
    poller.reset();
    uploader.reset();

    try {
      const formData = new FormData();
      formData.append('video', videoFile);
      formData.append('start', range[0].toString());
      formData.append('end', range[1].toString());
      formData.append('mode', mode === 'segments' ? 'segments' : 'normal');
      formData.append('model', localStorage.getItem('settings') || user?.settings || 'base');

      const res = await Api.post('/job/create', {
        type: 'transcribe',
        title: videoFile.name,
        duration,
      });
      const jobId = res.id || res._id || res.jobId;
      if (!jobId) throw new Error('Server did not return a job id');
      formData.append('jobId', jobId);

      await uploader.upload('/video/transcribe', formData);
      const resultText = await poller.poll(jobId);
      setText(resultText);
      setTextOriginal(resultText);
    } catch (error) {
      console.error(error);
      setError(error instanceof Error ? error.message : 'Transcription failed');
    }
  };

  const handleFixGrammar = async () => {
    if (!text || isWorking) return;
    try {
      setError(null);
      const result = await Api.post('/video/grammar', { text });
      setText(result.correctedText || text);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Grammar correction failed');
    }
  };

  const handleReset = () => {
    setText(textOriginal);
  };

  const activeModel = MODELS.find(
    (item) => item.id === (localStorage.getItem('settings') || user?.settings || 'base'),
  );

  return (
    <div className="fade-in">
      <section className="vs-hero">
        <div className="vs-container">
          <div className="vs-hero-grid">
            <div>
              <span className="vs-page-kicker"><Sparkles size={13} /> AI media workspace</span>
              <h1 className="vs-hero-title">
                Turn any video into <em>clean, editable text.</em>
              </h1>
              <p className="vs-hero-sub">
                Transcribe speech, translate it into another language, and export the result.
                One workspace for the whole workflow.
              </p>
              <div className="vs-hero-actions">
                <button
                  className="vs-btn vs-btn--primary vs-btn--lg"
                  onClick={() => document.getElementById('studio')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  Start transcribing <ArrowRight size={16} />
                </button>
                <Link to="/translate" className="vs-btn vs-btn--secondary vs-btn--lg">
                  <Languages size={16} /> Translate a video
                </Link>
              </div>
              <div className="vs-hero-meta">
                <div><strong>{LANGUAGES.length}</strong><span>Languages</span></div>
                <div><strong>{MODELS.length}</strong><span>Whisper models</span></div>
                <div><strong>3</strong><span>Export formats</span></div>
              </div>
            </div>

            <div className="vs-workflow" aria-hidden="true">
              <div className="vs-workflow-head">
                <span>Workflow</span>
                <span className="vs-chip">Ready</span>
              </div>
              <div className="vs-workflow-steps">
                <div className="vs-workflow-step">
                  <span className="vs-workflow-step-icon"><UploadCloud size={15} /></span>
                  <div>
                    <strong>Upload source media</strong>
                    <p>Video or audio, with an optional clip range.</p>
                  </div>
                </div>
                <div className="vs-workflow-step">
                  <span className="vs-workflow-step-icon"><Sparkles size={15} /></span>
                  <div>
                    <strong>Transcribe or translate</strong>
                    <p>Pick a Whisper model and target language.</p>
                  </div>
                </div>
                <div className="vs-workflow-step">
                  <span className="vs-workflow-step-icon"><Download size={15} /></span>
                  <div>
                    <strong>Review and export</strong>
                    <p>TXT, PDF, or DOCX — saved to your history.</p>
                  </div>
                </div>
              </div>
              <div className="vs-transcript">
                <div className="vs-transcript-row"><time>00:04</time><span>Welcome back to the product walkthrough.</span></div>
                <div className="vs-transcript-row"><time>00:09</time><span>Today we will cover the new editing workflow.</span></div>
                <div className="vs-transcript-row"><time>00:15</time><span>Everything starts from a single upload.</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="vs-feature-grid">
        <article className="vs-feature-card">
          <span className="vs-feature-index">01</span>
          <div>
            <h3 className="vs-feature-title">Speech to text</h3>
            <p className="vs-feature-copy">Turn spoken video into a structured transcript you can edit and reuse.</p>
          </div>
        </article>
        <article className="vs-feature-card">
          <span className="vs-feature-index">02</span>
          <div>
            <h3 className="vs-feature-title">Translation, kept separate</h3>
            <p className="vs-feature-copy">Compare the original text and the translated version side by side.</p>
          </div>
        </article>
        <article className="vs-feature-card">
          <span className="vs-feature-index">03</span>
          <div>
            <h3 className="vs-feature-title">A traceable workflow</h3>
            <p className="vs-feature-copy">Every job is saved, so you can revisit or export it later.</p>
          </div>
        </article>
      </div>

      <section id="studio" className="vs-container" style={{ paddingBlock: 'clamp(28px, 4vw, 44px)' }}>
        <div className="vs-page-head">
          <div className="vs-page-head__text">
            <h2 className="vs-section-title">Transcription studio</h2>
            <p className="vs-page-desc">Upload a video, choose a clip range, and run transcription.</p>
          </div>
          <span className="vs-chip"><FileText size={12} /> {activeModel?.label || 'Base'} model</span>
        </div>

        <div className="vs-studio-grid">
          <div className="vs-panel">
            <div className="vs-panel-header">
              <div className="vs-panel-header__group">
                <span className={`vs-panel-dot ${isWorking ? 'vs-panel-dot--warning' : ''}`} />
                <h2 className="vs-panel-title">Source media</h2>
              </div>
              {videoFile && <span className="vs-panel-kicker">Ready</span>}
            </div>
            <div className="vs-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {!videoURL ? (
                <FileDropzone
                  accept="video/*"
                  onChange={handleVideoChange}
                  file={videoFile}
                  label="Drop a video here, or"
                />
              ) : (
                <>
                  <video
                    ref={videoRef}
                    src={videoURL}
                    controls
                    onLoadedMetadata={handleVideoLoaded}
                  />

                  <div className="vs-field">
                    <div className="vs-label">
                      <span>Clip range</span>
                      <span style={{ fontFamily: 'var(--vs-font-mono)', fontWeight: 400 }}>
                        {formatTime(range[0])} – {formatTime(range[1])}
                      </span>
                    </div>
                    <RangeSlider
                      min={0}
                      max={duration || 100}
                      value={range}
                      onInput={handleRangeChange}
                    />
                  </div>

                  <div className="vs-field">
                    <label className="vs-label" htmlFor="transcribe-mode">Output mode</label>
                    <select
                      id="transcribe-mode"
                      className="vs-select"
                      value={mode}
                      onChange={(e) => setMode(e.target.value)}
                    >
                      <option value="normal">Speech to text</option>
                      <option value="segments">Timestamped segments</option>
                    </select>
                  </div>

                  <button
                    className="vs-submit-btn"
                    onClick={handleSubmitVideo}
                    disabled={isWorking}
                  >
                    {isWorking ? 'Processing…' : 'Start processing'}
                  </button>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <span className="vs-hint">Active AI model</span>
                    <span className="vs-model-chip">{activeModel?.label || 'Base'}</span>
                  </div>
                </>
              )}
              {error && (
                <div className="vs-form-error" role="alert">{error}</div>
              )}
            </div>
          </div>

          <div className="vs-panel">
            <div className="vs-panel-header">
              <div className="vs-panel-header__group">
                <span className={`vs-panel-dot ${isWorking ? 'vs-panel-dot--warning' : text ? 'vs-panel-dot--success' : 'vs-panel-dot--muted'}`} />
                <h2 className="vs-panel-title">{isWorking ? 'Processing' : 'Transcript'}</h2>
              </div>
              {text && !isWorking && (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="vs-btn vs-btn--ghost vs-btn--sm" onClick={handleReset}>
                    <RefreshCw size={13} /> Reset
                  </button>
                  <button className="vs-btn vs-btn--primary vs-btn--sm" onClick={handleFixGrammar}>
                    <Wand2 size={13} /> Fix grammar
                  </button>
                </div>
              )}
            </div>

            <div className="vs-panel-body" style={{ minHeight: 300 }} aria-live="polite">
              {isWorking ? (
                <div className="vs-progress">
                  <ProgressRing percentage={totalProgress} size={96} strokeWidth={6} />
                  <div className="vs-chip">
                    {uploader.isUploading
                      ? <><UploadCloud size={12} /> Uploading</>
                      : <><Sparkles size={12} /> {poller.status || 'Processing'}</>}
                  </div>
                  <div className="vs-progress-title">
                    {uploader.isUploading ? 'Uploading video…' : 'Processing with AI…'}
                  </div>
                  <div className="vs-progress-sub">
                    {uploader.isUploading
                      ? `Uploaded ${uploader.progress}%`
                      : poller.status || 'This usually takes a moment.'}
                  </div>
                  <div className="vs-progress-track">
                    <div className="vs-progress-fill" style={{ width: `${totalProgress}%` }} />
                  </div>
                </div>
              ) : text ? (
                <div className="vs-result-text">{text}</div>
              ) : (
                <div className="vs-empty">
                  <FileText size={28} />
                  <div>
                    <strong style={{ color: 'var(--vs-text-muted)', fontWeight: 600 }}>Nothing transcribed yet</strong>
                    <p style={{ marginTop: 4 }}>Your transcript will appear here when processing finishes.</p>
                  </div>
                </div>
              )}
            </div>

            {text && !isWorking && (
              <div style={{ padding: '14px 18px', borderTop: '1px solid var(--vs-border)' }}>
                <ExportPanel text={text} defaultFilename="transcription" />
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

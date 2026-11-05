import React, { useState, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useUploadWithProgress } from '../hooks/useUploadWithProgress';
import { useJobPolling } from '../hooks/useJobPolling';
import ProgressRing from '../components/common/ProgressRing';
import FileDropzone from '../components/common/FileDropzone';
import ExportPanel from '../components/common/ExportPanel';
import LanguagePicker from '../components/common/LanguagePicker';
import { LANGUAGES } from '../constants/languages';
import {
  AlertCircle,
  FileText,
  FileVideo,
  History,
  Languages,
  SlidersHorizontal,
  Sparkles,
  UploadCloud,
} from 'lucide-react';
import RangeSlider from 'react-range-slider-input';
import 'react-range-slider-input/dist/style.css';
import Api from '../api/Api';

export default function Translate() {
  const { user } = useAuth();
  const uploader = useUploadWithProgress();
  const poller = useJobPolling();

  const [videoURL, setVideoURL] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [duration, setDuration] = useState<number>(0);
  const [range, setRange] = useState<[number, number]>([0, 100]);
  const [text, setText] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [targetLang, setTargetLang] = useState<string>('en');

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
    setError(null);
    poller.reset();
    uploader.reset();

    try {
      const formData = new FormData();
      formData.append('video', videoFile);
      formData.append('start', range[0].toString());
      formData.append('end', range[1].toString());
      formData.append('mode', 'normal');
      formData.append(
        'model',
        localStorage.getItem('settings') || user?.settings || 'base',
      );
      const res = await Api.post('/job/create', {
        type: 'translate',
        title: videoFile.name,
        targetLang,
        duration,
      });
      const jobId = res.id || res._id || res.jobId;
      if (!jobId) throw new Error('Server did not return a job id');
      formData.append('jobId', jobId);

      // Translation jobs first go through the transcription pipeline. The
      // worker queues translation automatically after all chunks complete.
      await uploader.upload('/video/transcribe', formData);
      const resultText = await poller.poll(jobId, {
        onProgress: (pct) => pct,
        resultField: 'translatedText',
      });
      setText(resultText);
    } catch (error) {
      console.error(error);
      setError(error instanceof Error ? error.message : 'Translation failed');
    }
  };

  const targetLanguage = LANGUAGES.find((language) => language.code === targetLang);

  return (
    <div className="vs-page fade-in">
      <div className="vs-container">
        <div className="vs-page-head">
          <div className="vs-page-head__text">
            <span className="vs-page-kicker"><Sparkles size={13} /> Assisted workflow</span>
            <h1 className="vs-page-title"><Languages size={26} /> Video translation</h1>
            <p className="vs-page-desc">Translate spoken audio into one of the supported languages, then review and export the result.</p>
          </div>
        </div>

        <div className="vs-info-strip">
          <div className="vs-info-item">
            <div className="vs-info-icon"><FileVideo size={14} /></div>
            <div><strong>Upload video</strong><span>MP4, MOV, WEBM, and more</span></div>
          </div>
          <div className="vs-info-item">
            <div className="vs-info-icon"><SlidersHorizontal size={14} /></div>
            <div><strong>Select a clip range</strong><span>Only process the section you need</span></div>
          </div>
          <div className="vs-info-item">
            <div className="vs-info-icon"><History size={14} /></div>
            <div><strong>Saved automatically</strong><span>Revisit original and translated text</span></div>
          </div>
        </div>

        <div className="vs-studio-grid">
          <div className="vs-panel">
            <div className="vs-panel-header">
              <div className="vs-panel-header__group">
                <span className="vs-panel-dot" />
                <h2 className="vs-panel-title">Source media & language</h2>
              </div>
              <span className="vs-panel-kicker">Step 1</span>
            </div>
            <div className="vs-panel-body vs-stack">
              {!videoURL ? (
                <FileDropzone
                  accept="video/*"
                  onChange={handleVideoChange}
                  label="Drop a video here to translate, or"
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
                    <span className="vs-label">
                      <span>Target language</span>
                      {targetLanguage && <span className="vs-model-chip">{targetLanguage.code.toUpperCase()}</span>}
                    </span>
                    <LanguagePicker
                      languages={LANGUAGES}
                      selected={targetLang}
                      onSelect={setTargetLang}
                    />
                  </div>

                  <button
                    className="vs-submit-btn"
                    onClick={handleSubmitVideo}
                    disabled={isWorking}
                  >
                    {isWorking ? 'Processing…' : 'Start translation'}
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="vs-panel">
            <div className="vs-panel-header">
              <div className="vs-panel-header__group">
                <span className={`vs-panel-dot ${isWorking ? 'vs-panel-dot--warning' : text ? 'vs-panel-dot--success' : 'vs-panel-dot--muted'}`} />
                <h2 className="vs-panel-title">{isWorking ? 'Processing' : 'Translation result'}</h2>
              </div>
              <span className="vs-panel-kicker">Step 2</span>
            </div>

            <div className="vs-panel-body" style={{ minHeight: 300 }} aria-live="polite">
              {isWorking ? (
                <div className="vs-progress">
                  <ProgressRing percentage={totalProgress} size={96} strokeWidth={6} />
                  <div className="vs-chip">
                    {uploader.isUploading
                      ? <><UploadCloud size={12} /> Uploading</>
                      : <><Sparkles size={12} /> {poller.status || 'Translating'}</>}
                  </div>
                  <div className="vs-progress-title">
                    {uploader.isUploading ? 'Uploading video…' : 'Translating…'}
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
              ) : error ? (
                <div className="vs-empty" role="alert">
                  <AlertCircle size={28} />
                  <p style={{ color: 'var(--vs-danger-light)' }}>{error}</p>
                </div>
              ) : text ? (
                <div className="vs-result-text">{text}</div>
              ) : (
                <div className="vs-empty">
                  <FileText size={28} />
                  <div>
                    <strong style={{ color: 'var(--vs-text-muted)', fontWeight: 600 }}>No translation yet</strong>
                    <p style={{ marginTop: 4 }}>The translated text will appear here.</p>
                  </div>
                </div>
              )}
            </div>

            {text && !isWorking && (
              <div style={{ padding: '14px 18px', borderTop: '1px solid var(--vs-border)' }}>
                <ExportPanel text={text} defaultFilename="translation" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

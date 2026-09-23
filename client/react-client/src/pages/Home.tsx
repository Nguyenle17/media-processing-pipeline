import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useUploadWithProgress } from '../hooks/useUploadWithProgress';
import { useJobPolling } from '../hooks/useJobPolling';
import ProgressRing from '../components/common/ProgressRing';
import FileDropzone from '../components/common/FileDropzone';
import ExportPanel from '../components/common/ExportPanel';
import { RefreshCw, Wand2, ArrowRight, UploadCloud, Sparkles } from 'lucide-react';
import { MODELS } from '../constants/models';
import RangeSlider from 'react-range-slider-input';
import 'react-range-slider-input/dist/style.css';
import Api from '../api/Api';

export default function Home() {
  const { token, user } = useAuth();
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

  // Gộp % upload (0-20%) và polling (20-100%) thành 1 dải liền mạch
  const totalProgress = uploader.isUploading
    ? Math.round(uploader.progress * 0.2)
    : poller.isPolling
      ? Math.round(20 + poller.percentage * 0.8)
      : 0;

  useEffect(() => {
    // Initialization logic if any
  }, []);

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

  return (
    <div className="home-container fade-in">
      <style>{`
        .hero-section { text-align: center; padding: 4rem 2rem; background: linear-gradient(to bottom, #0a0a0f, #13131f); position: relative; overflow: hidden; }
        .hero-title { font-size: 3.5rem; font-family: 'Syne', sans-serif; font-weight: 700; margin-bottom: 1rem; color: #fff; letter-spacing: -0.02em; }
        .accent { background: linear-gradient(135deg, #6366f1, #a855f7); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .hero-sub { font-size: 1.125rem; color: #9ca3af; margin-bottom: 2rem; max-width: 600px; margin-inline: auto; line-height: 1.6; }
        .cta-btn { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.85rem 1.75rem; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; border-radius: 0.75rem; font-weight: 600; text-decoration: none; transition: all 0.25s; box-shadow: 0 8px 24px rgba(99,102,241,0.3); border: none; cursor: pointer; }
        .cta-btn:hover { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(99,102,241,0.45); }
        .badge { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.35rem 0.85rem; background: rgba(99, 102, 241, 0.1); color: #a5b4fc; border: 1px solid rgba(99,102,241,0.25); border-radius: 9999px; font-size: 0.8rem; font-weight: 500; margin-bottom: 1.5rem; font-family: 'JetBrains Mono', monospace; }
        .badge-dot { width: 0.5rem; height: 0.5rem; background: #6366f1; border-radius: 50%; box-shadow: 0 0 8px #6366f1; animation: pulse 2s infinite; }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
        .grid-bg { background-image: radial-gradient(#374151 1px, transparent 1px); background-size: 24px 24px; opacity: 0.2; }
        .stats-row { display: flex; justify-content: center; gap: 4rem; margin-top: 3.5rem; }
        .stat-num { font-size: 2rem; font-weight: 700; color: #fff; font-family: 'Syne', sans-serif; }
        .stat-lbl { color: #9ca3af; font-size: 0.85rem; margin-top: 0.25rem; letter-spacing: 0.05em; text-transform: uppercase; }

        /* Progress panel trong Result */
        .progress-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem 2rem;
          gap: 1.25rem;
          min-height: 320px;
        }
        .progress-title {
          font-size: 1rem;
          font-weight: 600;
          color: #e5e7eb;
        }
        .progress-sub {
          font-size: 0.85rem;
          color: #9ca3af;
          font-family: 'JetBrains Mono', monospace;
          text-align: center;
          max-width: 300px;
          line-height: 1.5;
        }
        .progress-bar-track {
          width: 100%;
          max-width: 320px;
          height: 6px;
          background: rgba(99,102,241,0.15);
          border-radius: 999px;
          overflow: hidden;
          margin-top: 0.25rem;
        }
        .progress-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #6366f1, #a855f7);
          border-radius: 999px;
          transition: width 0.4s ease;
          box-shadow: 0 0 12px rgba(99,102,241,0.6);
        }
        .phase-chip {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.3rem 0.75rem;
          background: rgba(99,102,241,0.1);
          border: 1px solid rgba(99,102,241,0.3);
          border-radius: 999px;
          font-size: 0.75rem;
          color: #a5b4fc;
          font-family: 'JetBrains Mono', monospace;
        }
      `}</style>

      <div className="hero-section">
        <div className="absolute inset-0 grid-bg -z-10"></div>
        <div className="badge">
          <span className="badge-dot"></span> Next-gen processing
        </div>
        <h1 className="hero-title">Media AI <span className="accent">Studio</span></h1>
        <p className="hero-sub">Transcribe, translate, and synthesize media with high accuracy using state-of-the-art AI models.</p>
        <button className="cta-btn" onClick={() => document.getElementById('studio')?.scrollIntoView({ behavior: 'smooth' })}>
          Get Started <ArrowRight size={18} />
        </button>
        <div className="stats-row">
          <div><div className="stat-num">99%</div><div className="stat-lbl">Accuracy</div></div>
          <div><div className="stat-num">50+</div><div className="stat-lbl">Languages</div></div>
          <div><div className="stat-num">2x</div><div className="stat-lbl">Faster</div></div>
        </div>
      </div>

      <div id="studio" className="vs-studio-grid p-6 max-w-7xl mx-auto">
        {/* LEFT: Upload */}
        <div className="vs-panel">
          <div className="vs-panel-header">
            <div className="flex items-center gap-2">
              <span className="vs-panel-dot bg-indigo-500"></span>
              <h2 className="vs-panel-title">Upload Video</h2>
            </div>
          </div>
          <div className="vs-panel-body">
            {!videoURL ? (
              <FileDropzone
                accept="video/*"
                onChange={handleVideoChange}
                file={videoFile}
                label="Drop a video here, or click to browse"
              />
            ) : (
              <div className="flex flex-col gap-4">
                <video
                  ref={videoRef}
                  src={videoURL}
                  controls
                  className="w-full rounded-md border border-gray-800"
                  onLoadedMetadata={handleVideoLoaded}
                />

                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-gray-400">
                    <span>{formatTime(range[0])}</span>
                    <span>{formatTime(range[1])}</span>
                  </div>
                  <RangeSlider
                    min={0}
                    max={duration}
                    value={range}
                    onInput={handleRangeChange}
                  />
                </div>

                <div className="flex gap-2">
                  <select
                    className="vs-search-input flex-1"
                    value={mode}
                    onChange={(e) => setMode(e.target.value)}
                  >
                    <option value="normal">Speech to Text</option>
                    <option value="segments">Segments</option>
                  </select>
                  <button
                    className="vs-submit-btn flex-1"
                    onClick={handleSubmitVideo}
                    disabled={isWorking}
                  >
                    {isWorking ? 'Processing...' : 'Start Processing'}
                  </button>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                  <span>AI model</span>
                  <span className="vs-model-chip">
                    {MODELS.find((item) => item.id === (localStorage.getItem('settings') || user?.settings || 'base'))?.label || 'Base'}
                  </span>
                </div>
              </div>
            )}
            {error && <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}
          </div>
        </div>

        {/* RIGHT: Result / Progress */}
        <div className="vs-panel flex flex-col">
          <div className="vs-panel-header flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className={`vs-panel-dot ${isWorking ? 'bg-yellow-500' : 'bg-green-500'}`}></span>
              <h2 className="vs-panel-title">
                {isWorking ? 'Processing' : 'Result'}
              </h2>
            </div>
            {text && !isWorking && (
              <div className="flex gap-2">
                <button className="vs-btn vs-btn--ghost text-xs" onClick={handleReset}>
                  <RefreshCw size={14} className="mr-1" /> Reset
                </button>
                <button className="vs-btn vs-btn--primary text-xs" onClick={handleFixGrammar}>
                  <Wand2 size={14} className="mr-1" /> Fix Grammar
                </button>
              </div>
            )}
          </div>

          <div className="vs-panel-body flex-1 overflow-y-auto vs-scroll min-h-[300px]">
            {isWorking ? (
              <div className="progress-state">
                <ProgressRing
                  percentage={totalProgress}
                  size={96}
                  strokeWidth={6}
                  color="#6366f1"
                />
                <div className="phase-chip">
                  {uploader.isUploading ? (
                    <>
                      <UploadCloud size={12} /> Uploading
                    </>
                  ) : (
                    <>
                      <Sparkles size={12} /> {poller.status || 'Processing'}
                    </>
                  )}
                </div>
                <div className="progress-title">
                  {uploader.isUploading ? 'Uploading video...' : 'Processing with AI...'}
                </div>
                <div className="progress-sub">
                  {uploader.isUploading
                    ? `Uploaded ${uploader.progress}%`
                    : poller.status || 'Please wait a moment'}
                </div>
                <div className="progress-bar-track">
                  <div
                    className="progress-bar-fill"
                    style={{ width: `${totalProgress}%` }}
                  />
                </div>
              </div>
            ) : text ? (
              <div className="vs-result-text p-4 whitespace-pre-wrap">{text}</div>
            ) : (
              <div className="vs-result-empty flex flex-col items-center justify-center h-full text-gray-500">
                <p>Output will appear here</p>
              </div>
            )}
          </div>

          {text && !isWorking && (
            <div className="p-4 border-t border-gray-800">
              <ExportPanel text={text} defaultFilename="transcription" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

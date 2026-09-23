import React, { useState, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useUploadWithProgress } from '../hooks/useUploadWithProgress';
import { useJobPolling } from '../hooks/useJobPolling';
import ProgressRing from '../components/common/ProgressRing';
import FileDropzone from '../components/common/FileDropzone';
import ExportPanel from '../components/common/ExportPanel';
import LanguagePicker from '../components/common/LanguagePicker';
import { LANGUAGES } from '../constants/languages';
import { UploadCloud, Sparkles, Languages } from 'lucide-react';
import RangeSlider from 'react-range-slider-input';
import 'react-range-slider-input/dist/style.css';
import Api from '../api/Api';

export default function Translate() {
  const { token } = useAuth();
  const uploader = useUploadWithProgress();
  const poller = useJobPolling();

  const [videoURL, setVideoURL] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [duration, setDuration] = useState<number>(0);
  const [range, setRange] = useState<[number, number]>([0, 100]);
  const [text, setText] = useState<string>('');
  const [targetLang, setTargetLang] = useState<string>('en');

  const videoRef = useRef<HTMLVideoElement>(null);

  const isWorking = uploader.isUploading || poller.isPolling;

  // Gộp % upload (0-20%) và polling (20-100%) thành 1 dải liền mạch
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
    poller.reset();
    uploader.reset();

    try {
      const formData = new FormData();
      formData.append('video', videoFile);
      formData.append('start', range[0].toString());
      formData.append('end', range[1].toString());
      const res = await Api.post('/job/create', {
        type: 'translate',
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
      setText(error instanceof Error ? `Error: ${error.message}` : 'Translation failed');
    }
  };

  return (
    <div className="translate-container fade-in p-6 max-w-7xl mx-auto">
      <style>{`
        .translate-hero { margin-bottom: 2rem; }

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

      <div className="translate-hero">
        <h1 className="vs-section-title text-3xl font-bold mb-2 flex items-center gap-3">
          <Languages className="text-indigo-500" size={28} />
          Video Translation
        </h1>
        <p className="text-gray-400">Translate spoken audio in videos to multiple languages.</p>
      </div>

      <div className="vs-studio-grid">
        {/* LEFT: Source media */}
        <div className="vs-panel">
          <div className="vs-panel-header">
            <div className="flex items-center gap-2">
              <span className="vs-panel-dot bg-indigo-500"></span>
              <h2 className="vs-panel-title">Source Media & Language</h2>
            </div>
          </div>
          <div className="vs-panel-body space-y-6">
            {!videoURL ? (
              <FileDropzone
                accept="video/*"
                onChange={handleVideoChange}
                label="Drop a video here to translate"
              />
            ) : (
              <div className="space-y-4">
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

                <div>
                  <label className="vs-section-label block mb-2">Target Language</label>
                  <LanguagePicker
                    languages={LANGUAGES}
                    selected={targetLang}
                    onSelect={setTargetLang}
                  />
                </div>

                <button
                  className="vs-submit-btn w-full"
                  onClick={handleSubmitVideo}
                  disabled={isWorking}
                >
                  {isWorking ? 'Processing...' : 'Start Translation'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Result / Progress */}
        <div className="vs-panel flex flex-col">
          <div className="vs-panel-header">
            <div className="flex items-center gap-2">
              <span className={`vs-panel-dot ${isWorking ? 'bg-yellow-500' : 'bg-green-500'}`}></span>
              <h2 className="vs-panel-title">
                {isWorking ? 'Processing' : 'Translation Result'}
              </h2>
            </div>
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
                      <Sparkles size={12} /> {poller.status || 'Translating'}
                    </>
                  )}
                </div>
                <div className="progress-title">
                  {uploader.isUploading ? 'Uploading video...' : 'Translating...'}
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
                <p>Translated output will appear here</p>
              </div>
            )}
          </div>

          {text && !isWorking && (
            <div className="p-4 border-t border-gray-800">
              <ExportPanel text={text} defaultFilename="translation" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

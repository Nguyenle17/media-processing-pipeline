import { useState, useContext, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { jsPDF } from 'jspdf';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { saveAs } from 'file-saver';
import RangeSlider from 'react-range-slider-input';
import 'react-range-slider-input/dist/style.css';
import Api from "../api/Api";
import { AuthContext } from "../context/AuthContext";

const LANGUAGES = [
    { code: 'vi', label: 'Vietnamese', flag: '🇻🇳' },
    { code: 'en', label: 'English', flag: '🇺🇸' },
    { code: 'zh', label: 'Chinese', flag: '🇨🇳' },
    { code: 'ko', label: 'Korean', flag: '🇰🇷' },
    { code: 'ja', label: 'Japanese', flag: '🇯🇵' },
    { code: 'fr', label: 'French', flag: '🇫🇷' },
    { code: 'de', label: 'German', flag: '🇩🇪' },
    { code: 'es', label: 'Spanish', flag: '🇪🇸' },
];

export default function Translate() {
    const [status, setStatus] = useState('');
    const [percentage, setPercentage] = useState(0);
    const [videoURL, setVideoURL] = useState(null);
    const [videoFile, setVideoFile] = useState(null);
    const [duration, setDuration] = useState(0);
    const [range, setRange] = useState([0, 0]);
    const [text, setText] = useState('');
    const [format, setFormat] = useState('txt');
    const [filename, setFilename] = useState(`translate_${Date.now()}`);
    const [targetLang, setTargetLang] = useState('vi');
    const [loading, setLoading] = useState(false);
    const [phase, setPhase] = useState('idle');
    const videoRef = useRef(null);
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleVideoChange = (e) => {
        const file = e.target.files[0];
        if (!user) { alert("Please log in."); navigate('/login'); return; }
        if (file) { setVideoURL(URL.createObjectURL(file)); setVideoFile(file); setPhase('idle'); setText(''); }
        else { setVideoURL(null); setVideoFile(null); }
    };

    const handleVideoLoaded = (e) => {
        const d = Math.floor(e.target.duration);
        setDuration(d);
        setRange([0, d]);
    };

    const handleRangeChange = (values) => {
        setRange(values);
        if (videoRef.current) videoRef.current.currentTime = values[0];
    };

    const formatTime = (s) => {
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    };

    const handleSubmit = async () => {
        try {
            setLoading(true); setPhase('uploading'); setStatus(''); setPercentage(0);
            if (!user) { alert("Please log in."); navigate('/login'); return; }
            if (!videoFile) { alert("No video selected."); return; }

            const jobResponse = await Api.post('/job/create', {
                title: videoFile.name,
                totalChunks: 1,
                type: 'translate',
            });
            const jobId = jobResponse._id;
            if (!jobId) throw new Error('No jobId returned from server');

            const formData = new FormData();
            formData.append('start', range[0]);
            formData.append('end', range[1]);
            formData.append('target_lang', targetLang);
            formData.append('video', videoFile, videoFile.name);
            formData.append('jobId', jobId);
            formData.append('type', 'translate');

            await uploadWithProgress(formData, (pct) => {
                setPercentage(pct);
                setStatus(`Uploading... ${pct}%`);
            });

            setPhase('transcribing'); setPercentage(0); setStatus('Translating...');
            const resultText = await pollJobResult(jobId);
            setText(resultText); setStatus('Completed!'); setPhase('done'); setPercentage(100);
        } catch (error) {
            setStatus('Error: ' + error.message); setPhase('idle');
        } finally {
            setLoading(false);
        }
    };

    const uploadWithProgress = (formData, onProgress) => new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/video/translate`);
        xhr.setRequestHeader('Authorization', `Bearer ${Api.token}`);
        xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100)); };
        xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve(JSON.parse(xhr.responseText)) : reject(new Error(`Upload failed: ${xhr.status}`));
        xhr.onerror = () => reject(new Error('Network error'));
        xhr.send(formData);
    });

    const pollJobResult = async (jobId) => {
        const interval = 5000;
        let lastActivity = Date.now();
        const idleTimeout = 10 * 60 * 1000;

        for (;;) {
            await new Promise(r => setTimeout(r, interval));
            const job = await Api.get(`/job/process/${jobId}`);

            if (job.status === 'processing') {
                lastActivity = new Date(job.updatedAt).getTime();
                if (job.countChunks && job.totalChunks) {
                    setPercentage(Math.round((job.countChunks / job.totalChunks) * 100));
                    setStatus(`Translating... ${job.countChunks}/${job.totalChunks} chunks`);
                }
            }

            if (job.status === 'waiting') {
                setStatus(`Waiting in queue... (position: ${job.queuePosition || '?'})`);
                setPercentage(0);
                lastActivity = Date.now();
            }

            if (job.status === 'completed') {
                const r = await Api.get(`/job/${jobId}`);
                return r.resultText;
            }

            if (job.status === 'failed') throw new Error('Translation failed');
            if (Date.now() - lastActivity > idleTimeout) throw new Error('Job timed out');
        }
    };

    const handleCopy = () => navigator.clipboard.writeText(text);

    const downloadTxt = () => {
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `${filename}.txt`; a.click();
        URL.revokeObjectURL(url);
    };

    const downloadPdf = () => {
        const doc = new jsPDF();
        const lines = doc.splitTextToSize(text, 180);
        doc.setFontSize(12);
        doc.text(lines, 15, 15);
        doc.save(`${filename}.pdf`);
    };

    const downloadDocx = async () => {
        const doc = new Document({
            sections: [{ children: text.split('\n').map(line => new Paragraph({ children: [new TextRun(line)] })) }],
        });
        saveAs(await Packer.toBlob(doc), `${filename}.docx`);
    };

    const handleDownload = async () => {
        if (format === 'txt') downloadTxt();
        if (format === 'pdf') downloadPdf();
        if (format === 'docx') await downloadDocx();
    };

    const phaseLabel = { idle: '', uploading: 'Uploading', transcribing: 'Translating', done: 'Done' }[phase];
    const phaseColor = { idle: '#6366f1', uploading: '#f59e0b', transcribing: '#8b5cf6', done: '#10b981' }[phase];
    const selectedLang = LANGUAGES.find(l => l.code === targetLang);

    return (
        <section style={{ fontFamily: "'Syne', sans-serif", background: '#0a0a0f', minHeight: '100vh', color: '#fff' }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
                #range-slider { height: 40px; background: #333; overflow: hidden; margin-top: 12px; }
                #range-slider .range-slider__thumb { width: 18px; height: 38px; border-radius: 4px; background: #fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18' fill='%23333' viewBox='0 0 24 24'%3E%3Cpath d='M12,16A2,2 0 0,1 14,18A2,2 0 0,1 12,20A2,2 0 0,1 10,18A2,2 0 0,1 12,16M12,10A2,2 0 0,1 14,12A2,2 0 0,1 12,14A2,2 0 0,1 10,12A2,2 0 0,1 12,10M12,4A2,2 0 0,1 14,6A2,2 0 0,1 12,8A2,2 0 0,1 10,6A2,2 0 0,1 12,4Z' /%3E%3C/svg%3E") no-repeat center; }
                #range-slider .range-slider__range { border-radius: 6px; background: transparent; border: 4px solid #fff; box-sizing: border-box; box-shadow: 0 0 0 9999px rgba(0,0,0,.75); }
                .studio-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
                .panel { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 20px; overflow: hidden; transition: border-color 0.2s; }
                .panel:hover { border-color: rgba(99,102,241,0.3); }
                .panel-header { padding: 16px 20px; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; align-items: center; gap: 8px; }
                .panel-dot { width: 8px; height: 8px; border-radius: 50%; }
                .panel-title { font-size: 13px; color: #71717a; font-family: 'JetBrains Mono', monospace; }
                .panel-body { padding: 20px; }
                video { width: 100%; border-radius: 12px; background: #111; aspect-ratio: 16/9; object-fit: cover; }
                .file-drop { border: 2px dashed rgba(99,102,241,0.3); border-radius: 12px; padding: 20px; text-align: center; cursor: pointer; transition: all 0.2s; margin-top: 16px; position: relative; overflow: hidden; }
                .file-drop:hover { border-color: #6366f1; background: rgba(99,102,241,0.05); }
                .file-drop input { position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; }
                .file-drop-label { font-size: 13px; color: #71717a; }
                .file-drop-label span { color: #6366f1; font-weight: 600; }
                .lang-grid { display: grid; grid-template-columns: repeat(8, 1fr); gap: 8px; margin-bottom: 32px; }
                .lang-btn { padding: 10px 6px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.02); cursor: pointer; transition: all 0.15s; text-align: center; }
                .lang-btn:hover { border-color: rgba(99,102,241,0.4); background: rgba(99,102,241,0.08); }
                .lang-btn.active { border-color: rgba(99,102,241,0.6); background: rgba(99,102,241,0.15); }
                .lang-flag { font-size: 20px; display: block; margin-bottom: 4px; }
                .lang-label { font-size: 10px; color: #a5b4fc; font-family: 'JetBrains Mono', monospace; }
                .result-text { font-size: 14px; line-height: 1.8; color: #d4d4d8; font-family: 'JetBrains Mono', monospace; max-height: 320px; overflow-y: auto; word-break: break-word; white-space: pre-wrap; }
                .result-text::-webkit-scrollbar { width: 4px; }
                .result-text::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 2px; }
                .result-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 200px; gap: 12px; }
                .loading-panel { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 200px; gap: 20px; }
                .progress-ring-wrap { position: relative; width: 80px; height: 80px; }
                .progress-ring { transform: rotate(-90deg); }
                .progress-ring-bg { fill: none; stroke: rgba(99,102,241,0.15); stroke-width: 4; }
                .progress-ring-fill { fill: none; stroke: #6366f1; stroke-width: 4; stroke-linecap: round; transition: stroke-dashoffset 0.5s ease; }
                .progress-num { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 700; font-family: 'JetBrains Mono', monospace; color: #fff; }
                .loading-status { font-size: 13px; color: #71717a; font-family: 'JetBrains Mono', monospace; }
                .phase-badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-family: 'JetBrains Mono', monospace; font-weight: 500; }
                .submit-btn { width: 100%; padding: 16px; background: linear-gradient(135deg, #6366f1, #8b5cf6); border: none; border-radius: 12px; color: #fff; font-size: 15px; font-weight: 700; cursor: pointer; font-family: 'Syne', sans-serif; transition: all 0.2s; margin-top: 20px; box-shadow: 0 4px 24px rgba(99,102,241,0.25); }
                .submit-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 32px rgba(99,102,241,0.4); }
                .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
                .icon-btn { padding: 7px 16px; border-radius: 8px; font-size: 12px; font-family: 'JetBrains Mono', monospace; cursor: pointer; transition: all 0.15s; border: none; display: flex; align-items: center; gap: 6px; white-space: nowrap; }
            `}</style>

            <div style={{ maxWidth: 1200, margin: '0 auto', padding: '60px 32px' }}>
                {/* Header */}
                <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#6366f1', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>
                    // translation studio
                </p>
                <h1 style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 800, marginBottom: 8 }}>
                    Translate video into{' '}
                    <span style={{ background: 'linear-gradient(135deg, #6366f1, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        any language.
                    </span>
                </h1>
                <p style={{ color: '#52525b', fontSize: 14, marginBottom: 32, fontFamily: "'JetBrains Mono', monospace" }}>
                    Upload video → select target language → get translated transcript.
                </p>

                {/* Language selector */}
                <p style={{ fontSize: 11, color: '#71717a', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
                    Target language
                </p>
                <div className="lang-grid">
                    {LANGUAGES.map(lang => (
                        <button key={lang.code}
                            className={`lang-btn ${targetLang === lang.code ? 'active' : ''}`}
                            onClick={() => setTargetLang(lang.code)}
                        >
                            <span className="lang-flag">{lang.flag}</span>
                            <span className="lang-label">{lang.label}</span>
                        </button>
                    ))}
                </div>

                <div className="studio-grid">
                    {/* Left */}
                    <div className="panel">
                        <div className="panel-header">
                            <div className="panel-dot" style={{ background: '#f59e0b' }} />
                            <span className="panel-title">input.mp4/.mp3/.wav/.m4a</span>
                        </div>
                        <div className="panel-body">
                            <video ref={videoRef} controls src={videoURL || ''} onLoadedMetadata={handleVideoLoaded} style={{ background: '#0d0d12' }} />

                            {videoURL && (
                                <>
                                    <RangeSlider id="range-slider" min={0} max={duration} step={1} value={range} onInput={handleRangeChange} />
                                    <div style={{ display: 'flex', justifyContent: 'space-between', margin: '12px 4px 0' }}>
                                        <span style={{ fontSize: 12, color: '#8284f9', fontFamily: "'JetBrains Mono', monospace" }}>{formatTime(range[0])}</span>
                                        <span style={{ fontSize: 12, color: '#fff', fontFamily: "'JetBrains Mono', monospace" }}>✂ {formatTime(range[1] - range[0])}</span>
                                        <span style={{ fontSize: 12, color: '#8284f9', fontFamily: "'JetBrains Mono', monospace" }}>{formatTime(range[1])}</span>
                                    </div>
                                </>
                            )}

                            <div className="file-drop">
                                <input type="file" accept="video/*,audio/*,.mp3,.mp4,.wav,.m4a" onChange={handleVideoChange} />
                                <div className="file-drop-label">Drop file or <span>browse</span></div>
                                {videoFile && <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#a5b4fc', marginTop: 8 }}>📎 {videoFile.name} ({(videoFile.size / 1024 / 1024).toFixed(1)} MB)</div>}
                            </div>

                            <button className="submit-btn" onClick={handleSubmit} disabled={loading || !videoFile}>
                                {loading ? `${phaseLabel}...` : `🌐 Translate to ${selectedLang?.flag} ${selectedLang?.label}`}
                            </button>
                        </div>
                    </div>

                    {/* Right */}
                    <div className="panel" style={{ position: 'relative' }}>
                        <div className="panel-header" style={{ justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div className="panel-dot" style={{ background: phase === 'done' ? '#10b981' : '#6366f1' }} />
                                <span className="panel-title">
                                    translated.txt {selectedLang && `· ${selectedLang.flag} ${selectedLang.label}`}
                                </span>
                            </div>
                            {phase !== 'idle' && (
                                <span className="phase-badge" style={{ background: `${phaseColor}20`, color: phaseColor, border: `1px solid ${phaseColor}40` }}>
                                    {phaseLabel}
                                </span>
                            )}
                        </div>

                        <div className="panel-body" style={{ position: 'relative', minHeight: 420 }}>
                            {loading ? (
                                <div className="loading-panel">
                                    <div className="progress-ring-wrap">
                                        <svg className="progress-ring" width="80" height="80" viewBox="0 0 80 80">
                                            <circle className="progress-ring-bg" cx="40" cy="40" r="34" />
                                            <circle className="progress-ring-fill" cx="40" cy="40" r="34"
                                                strokeDasharray={`${2 * Math.PI * 34}`}
                                                strokeDashoffset={`${2 * Math.PI * 34 * (1 - percentage / 100)}`}
                                            />
                                        </svg>
                                        <div className="progress-num">{percentage}%</div>
                                    </div>
                                    <div className="loading-status">{status || 'Processing...'}</div>
                                </div>
                            ) : text ? (
                                <>
                                    <div className="result-text">{text}</div>

                                    {/* Actions */}
                                    <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
                                        <button className="icon-btn"
                                            onClick={handleCopy}
                                            style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc' }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.25)'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(99,102,241,0.1)'}
                                        >📋 Copy</button>
                                    </div>

                                    {/* Export */}
                                    <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                            <label style={{ fontSize: 11, color: '#71717a', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.1em' }}>File name</label>
                                            <input type="text" defaultValue={filename}
                                                onChange={e => setFilename(e.target.value)}
                                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 13, fontFamily: "'JetBrains Mono', monospace", outline: 'none', width: '100%' }}
                                                onFocus={e => e.target.style.borderColor = 'rgba(99,102,241,0.5)'}
                                                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                                            />
                                        </div>
                                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                            <label style={{ fontSize: 11, color: '#71717a', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>Export as</label>
                                            <select onChange={e => setFormat(e.target.value)}
                                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '6px 10px', color: '#fff', fontSize: 12, fontFamily: "'JetBrains Mono', monospace", cursor: 'pointer', outline: 'none' }}
                                                onFocus={e => e.target.style.borderColor = 'rgba(99,102,241,0.5)'}
                                                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                                            >
                                                <option value="txt" style={{ background: '#1a1a2e' }}>.txt</option>
                                                <option value="pdf" style={{ background: '#1a1a2e' }}>.pdf</option>
                                                <option value="docx" style={{ background: '#1a1a2e' }}>.docx</option>
                                            </select>
                                            <button className="icon-btn" onClick={handleDownload}
                                                style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', color: '#6ee7b7' }}
                                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(16,185,129,0.25)'}
                                                onMouseLeave={e => e.currentTarget.style.background = 'rgba(16,185,129,0.12)'}
                                            >↓ Download</button>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="result-empty">
                                    <div style={{ fontSize: 32, opacity: 0.15 }}>🌐</div>
                                    <div style={{ fontSize: 13, color: '#3f3f46', fontFamily: "'JetBrains Mono', monospace" }}>translation will appear here...</div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
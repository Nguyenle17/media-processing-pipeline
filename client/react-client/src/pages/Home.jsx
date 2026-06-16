import { useState, useContext, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { jsPDF } from 'jspdf';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { saveAs } from 'file-saver';
import RangeSlider from 'react-range-slider-input';
import 'react-range-slider-input/dist/style.css';
import Api from "../api/Api";
import { AuthContext } from "../context/AuthContext";

const POLL_INTERVAL = 5000;      
const IDLE_TIMEOUT  = 10 * 60 * 1000;  

export default function Home() {
    const [status, setStatus]       = useState('');
    const [percentage, setPercentage] = useState(0);
    const [videoURL, setVideoURL]   = useState(null);
    const [videoFile, setVideoFile] = useState(null);
    const [duration, setDuration]   = useState(0);
    const [range, setRange]         = useState([0, 0]);
    const [text, setText]           = useState('');
    const [textOriginal, setTextOriginal] = useState('');
    const [format, setFormat]       = useState('txt');
    const [filename, setFilename]   = useState(`transcript_${Date.now()}`);
    const [mode, setMode]           = useState(0);    
    const [loading, setLoading]     = useState(false);
    const [model, setModel]         = useState('tiny');
    const [phase, setPhase]         = useState('idle');

    const videoRef = useRef(null);
    const { user }  = useContext(AuthContext);
    const navigate  = useNavigate();

    useState(() => {
        const saved = localStorage.getItem('settings');
        if (saved) setModel(saved);
    }, []);


    const handleVideoChange = (e) => {
        const file = e.target.files[0];
        if (!user) { alert("Please log in to upload a video."); navigate('/login'); return; }
        if (file) {
            setVideoURL(URL.createObjectURL(file));
            setVideoFile(file);
            setPhase('idle');
            setText('');
        } else {
            setVideoURL(null);
            setVideoFile(null);
        }
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


    const handleSubmitVideo = async () => {
        if (!user)      { alert("Please log in."); navigate('/login'); return; }
        if (!videoFile) { alert("No video selected."); return; }

        try {
            setLoading(true);
            setPhase('uploading');
            setStatus('');
            setPercentage(0);

            const jobResponse = await Api.post('/job/create', {
                title:    videoFile.name,
                type:     'transcript',
                duration: range[1] - range[0],  
            });
            const jobId = jobResponse._id;
            if (!jobId) throw new Error('No jobId returned from server');

            const formData = new FormData();
            formData.append('mode',  mode === 0 ? 'normal' : 'segments');
            formData.append('model', model || 'tiny');
            formData.append('start', range[0]);
            formData.append('end',   range[1]);
            formData.append('video', videoFile, videoFile.name);
            formData.append('jobId', jobId);

            await uploadWithProgress(formData, (pct) => {
                setPercentage(pct);
                setStatus(`Uploading... ${pct}%`);
            });

            setPhase('transcribing');
            setPercentage(0);
            setStatus('Transcribing...');

            const resultText = await pollJobResult(jobId);
            setText(resultText);
            setStatus('Completed!');
            setPhase('done');
            setPercentage(100);

        } catch (error) {
            setStatus('Error: ' + error.message);
            setPhase('idle');
        } finally {
            setLoading(false);
        }
    };


    const uploadWithProgress = (formData, onProgress) =>
        new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/video/transcribe`);
            xhr.setRequestHeader('Authorization', `Bearer ${Api.token}`);
            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
            };
            xhr.onload = () =>
                xhr.status >= 200 && xhr.status < 300
                    ? resolve(JSON.parse(xhr.responseText))
                    : reject(new Error(`Upload failed: ${xhr.status}`));
            xhr.onerror = () => reject(new Error('Network error'));
            xhr.send(formData);
        });


    const pollJobResult = async (jobId) => {
        let lastActivity = Date.now();

        for (;;) {
            await new Promise((r) => setTimeout(r, POLL_INTERVAL));

            const job = await Api.get(`/job/process/${jobId}`);

            if (job.status === 'processing') {
                lastActivity = new Date(job.updatedAt).getTime();
                if (job.processedChunks && job.totalChunks) {
                    const pct = Math.round((job.processedChunks / job.totalChunks) * 100);
                    setPercentage(pct);
                    setStatus(`Transcribing... ${job.processedChunks}/${job.totalChunks} chunks`);
                }
            }

            if (job.status === 'waiting') { 
                setStatus('Waiting in queue...');
                setPercentage(0);
                lastActivity = Date.now();
            }

            if (job.status === 'completed') {
                const result = await Api.get(`/job/result/${jobId}`);   
                return result.transcriptText;
            }

            if (job.status === 'failed') throw new Error('Transcription failed');

            if (Date.now() - lastActivity > IDLE_TIMEOUT) {
                throw new Error('Job timed out — no activity for 10 minutes');
            }
        }
    };


    const handleFixGrammar = async () => {
        try {
            setTextOriginal(text);
            setLoading(true);
            setStatus('Fixing grammar...');
            setPhase('transcribing');

            const response = await Api.post('/video/grammar', { text });
            setText(response.correctedText);   
            setStatus('Grammar fixed!');
            setPhase('done');
        } catch (error) {
            setStatus('Error: ' + error.message);
            setPhase('done');
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => setText(textOriginal);

    const downloadTxt = () => {
        const blob = new Blob([text], { type: 'text/plain' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = `${filename}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const downloadPdf = () => {
        const doc   = new jsPDF();
        const lines = doc.splitTextToSize(text, 180);
        doc.setFontSize(12);
        doc.text(lines, 15, 15);
        doc.save(`${filename}.pdf`);
    };

    const downloadDocx = async () => {
        const doc = new Document({
            sections: [{
                children: text.split('\n').map(
                    (line) => new Paragraph({ children: [new TextRun(line)] })
                ),
            }],
        });
        saveAs(await Packer.toBlob(doc), `${filename}.docx`);
    };

    const handleDownload = async () => {
        if (format === 'txt')  downloadTxt();
        if (format === 'pdf')  downloadPdf();
        if (format === 'docx') await downloadDocx();
    };

    const handleCopyText = () => navigator.clipboard.writeText(text);

    const formatTime = (s) => {
        const m   = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    };

    const phaseLabel = { idle: '', uploading: 'Uploading', transcribing: 'Transcribing', done: 'Done' }[phase];
    const phaseColor = { idle: '#6366f1', uploading: '#f59e0b', transcribing: '#8b5cf6', done: '#10b981' }[phase];

    return (
        <section style={{ fontFamily: "'Inter', sans-serif", background: '#0a0a0f', minHeight: '100vh', color: '#fff', margin: 0, padding: 0 }}>
            <style>{`
                .hero-section {
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    position: relative;
                    overflow: hidden;
                    background: radial-gradient(ellipse 80% 60% at 50% 0%, #1a0533 0%, #0a0a0f 70%);
                }
                .hero-section::before {
                    content: '';
                    position: absolute;
                    width: 600px; height: 600px;
                    background: radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%);
                    top: -100px; left: 50%; transform: translateX(-50%);
                    pointer-events: none;
                }
                .grid-bg {
                    position: absolute; inset: 0;
                    background-image: linear-gradient(rgba(99,102,241,0.04) 1px, transparent 1px),
                                      linear-gradient(90deg, rgba(99,102,241,0.04) 1px, transparent 1px);
                    background-size: 60px 60px;
                    pointer-events: none;
                }
                .badge {
                    display: inline-flex; align-items: center; gap: 6px;
                    background: rgba(99,102,241,0.12); border: 1px solid rgba(99,102,241,0.3);
                    padding: 6px 14px; border-radius: 100px; font-size: 12px;
                    color: #a5b4fc; letter-spacing: 0.08em; text-transform: uppercase;
                    font-family: 'JetBrains Mono', monospace; margin-bottom: 24px;
                }
                .badge-dot { width: 6px; height: 6px; border-radius: 50%; background: #6366f1; animation: pulse 2s infinite; }
                #range-slider { height: 40px; background: #333; overflow: hidden; margin-top: 12px; }
                #range-slider .range-slider__thumb {
                    width: 18px; height: 38px; border-radius: 4px;
                    background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18' fill='%23333' viewBox='0 0 24 24'%3E%3Cpath d='M12,16A2,2 0 0,1 14,18A2,2 0 0,1 12,20A2,2 0 0,1 10,18A2,2 0 0,1 12,16M12,10A2,2 0 0,1 14,12A2,2 0 0,1 12,14A2,2 0 0,1 10,12A2,2 0 0,1 12,10M12,4A2,2 0 0,1 14,6A2,2 0 0,1 12,8A2,2 0 0,1 10,6A2,2 0 0,1 12,4Z' /%3E%3C/svg%3E") #fff;
                    background-repeat: no-repeat; background-position: center;
                }
                #range-slider .range-slider__range {
                    border-radius: 6px; background: transparent;
                    border: 4px solid #fff; box-sizing: border-box;
                    box-shadow: 0 0 0 9999px rgba(0,0,0,.75);
                }
                @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(1.3)} }
                .hero-title {
                    font-size: clamp(48px, 7vw, 88px); font-weight: 800;
                    line-height: 1.0; letter-spacing: -0.03em; margin-bottom: 20px;
                }
                .hero-title .accent {
                    color: transparent;
                    background: linear-gradient(135deg, #6366f1, #a78bfa, #ec4899);
                    -webkit-background-clip: text; background-clip: text;
                }
                .hero-sub { font-size: 18px; color: #71717a; line-height: 1.6; max-width: 480px; margin: 0 auto 40px; }
                .cta-btn {
                    display: inline-flex; align-items: center; gap: 10px;
                    background: linear-gradient(135deg, #6366f1, #8b5cf6);
                    color: #fff; border: none; padding: 16px 32px;
                    border-radius: 12px; font-size: 16px; font-weight: 600;
                    cursor: pointer; transition: all 0.2s; font-family: 'Syne', sans-serif;
                    box-shadow: 0 0 40px rgba(99,102,241,0.3); text-decoration: none;
                }
                .cta-btn:hover { transform: translateY(-2px); box-shadow: 0 0 60px rgba(99,102,241,0.5); }
                .stats-row { display: flex; gap: 40px; justify-content: center; margin-bottom: 48px; }
                .stat-num { font-size: 32px; font-weight: 800; color: #fff; }
                .stat-lbl { font-size: 13px; color: #52525b; margin-top: 4px; }
                .studio-section { max-width: 1200px; margin: 0 auto; padding: 80px 32px; }
                .section-label { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #6366f1; letter-spacing: 0.15em; text-transform: uppercase; margin-bottom: 8px; }
                .section-title { font-size: clamp(28px, 4vw, 44px); font-weight: 800; margin-bottom: 40px; }
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
                .file-name { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #a5b4fc; margin-top: 8px; }
                .result-text { font-size: 14px; line-height: 1.8; color: #d4d4d8; font-family: 'JetBrains Mono', monospace; max-height: 320px; overflow-y: auto; word-break: break-word; white-space: pre-wrap; }
                .result-text::-webkit-scrollbar { width: 4px; }
                .result-text::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 2px; }
                .result-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 200px; gap: 12px; }
                .result-empty-icon { font-size: 32px; opacity: 0.15; }
                .result-empty-text { font-size: 13px; color: #3f3f46; font-family: 'JetBrains Mono', monospace; }
                .copy-btn { position: absolute; top: 16px; right: 16px; padding: 5px 12px; border-radius: 6px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); color: #71717a; font-size: 11px; font-family: 'JetBrains Mono', monospace; cursor: pointer; transition: all 0.15s; }
                .copy-btn:hover { background: rgba(255,255,255,0.1); color: #fff; }
                .loading-panel { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 200px; gap: 20px; }
                .progress-ring-wrap { position: relative; width: 80px; height: 80px; }
                .progress-ring { transform: rotate(-90deg); }
                .progress-ring-bg   { fill: none; stroke: rgba(99,102,241,0.15); stroke-width: 4; }
                .progress-ring-fill { fill: none; stroke: #6366f1; stroke-width: 4; stroke-linecap: round; transition: stroke-dashoffset 0.5s ease; }
                .progress-num { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 700; font-family: 'JetBrains Mono', monospace; color: #fff; }
                .loading-status { font-size: 13px; color: #71717a; font-family: 'JetBrains Mono', monospace; }
                .phase-badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-family: 'JetBrains Mono', monospace; font-weight: 500; }
                .btn { padding: 8px 16px; border-radius: 8px; border: none; font-size: 13px; cursor: pointer; font-family: 'JetBrains Mono', monospace; transition: all 0.15s; }
                .submit-btn { width: 100%; padding: 16px; background: linear-gradient(135deg, #6366f1, #8b5cf6); border: none; border-radius: 12px; color: #fff; font-size: 15px; font-weight: 700; cursor: pointer; font-family: 'Syne', sans-serif; transition: all 0.2s; margin-top: 20px; letter-spacing: 0.02em; box-shadow: 0 4px 24px rgba(99,102,241,0.25); }
                .submit-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 32px rgba(99,102,241,0.4); }
                .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .fade-in { animation: fadeIn 0.4s ease forwards; }
            `}</style>

            {/* Hero */}
            <div className="hero-section">
                <div className="grid-bg" />
                <div style={{ position: 'relative', textAlign: 'center', padding: '0 24px' }}>
                    <div className="badge"><span className="badge-dot" /> AI-Powered Transcription</div>
                    <h1 className="hero-title">
                        Turn video into<br /><span className="accent">text instantly.</span>
                    </h1>
                    <p className="hero-sub">Upload any video or audio file. Our AI transcribes it accurately in minutes — no editing needed.</p>
                    <div className="stats-row">
                        {[['99%', 'Accuracy'], ['2M+', 'Minutes processed'], ['50+', 'Languages']].map(([n, l]) => (
                            <div key={l}>
                                <div className="stat-num">{n}</div>
                                <div className="stat-lbl">{l}</div>
                            </div>
                        ))}
                    </div>
                    <a href="#studio" className="cta-btn">Start Transcribing ↓</a>
                </div>
            </div>

            {/* Studio */}
            <div id="studio" className="studio-section">
                <p className="section-label">// transcription studio</p>
                <h2 className="section-title">Drop your video. Get text.</h2>

                {/* Mode selector */}
                <div className="flex gap-4 mb-6">
                    {[['Speech to Text', 0, '#6366f1'], ['Segments', 1, '#10b981']].map(([label, idx, color]) => (
                        <button key={idx} className="btn"
                            style={mode === idx ? {
                                background: `${color}4D`, border: `1px solid ${color}99`, color: '#fff'
                            } : {
                                background: `${color}1A`, border: `1px solid ${color}4D`, color: '#a5b4fc'
                            }}
                            onClick={() => setMode(idx)}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                <div className="studio-grid">
                    {/* Left: Video + Upload */}
                    <div className="panel fade-in">
                        <div className="panel-header">
                            <div className="panel-dot" style={{ background: mode === 0 ? '#f59e0b' : '#26f50b' }} />
                            <span className="panel-title">input.mp4/.mp3/.wav/.m4a</span>
                        </div>
                        <div className="panel-body">
                            {/* FIX: thêm ref={videoRef} */}
                            <video ref={videoRef} controls src={videoURL || ''} onLoadedMetadata={handleVideoLoaded} style={{ background: '#0d0d12' }} />

                            {videoURL && (
                                <>
                                    <RangeSlider
                                        id="range-slider"
                                        min={0} max={duration} step={1}
                                        value={range}
                                        onInput={handleRangeChange}
                                    />
                                    <div style={{ display: 'flex', justifyContent: 'space-between', margin: 16 }}>
                                        <span style={{ fontSize: 13, color: '#8284f9', fontFamily: "'JetBrains Mono', monospace" }}>{formatTime(range[0])}</span>
                                        <span style={{ fontSize: 13, color: '#fff', fontFamily: "'JetBrains Mono', monospace" }}>✂ {formatTime(range[1] - range[0])}</span>
                                        <span style={{ fontSize: 13, color: '#8284f9', fontFamily: "'JetBrains Mono', monospace" }}>{formatTime(range[1])}</span>
                                    </div>
                                </>
                            )}

                            <div className="file-drop">
                                <input type="file" accept="video/*,audio/*,.mp3,.mp4,.wav,.m4a" onChange={handleVideoChange} />
                                <div className="file-drop-label">Drop file or <span>browse</span></div>
                                {videoFile && <div className="file-name">📎 {videoFile.name} ({(videoFile.size / 1024 / 1024).toFixed(1)} MB)</div>}
                            </div>

                            <button className="submit-btn" onClick={handleSubmitVideo} disabled={loading || !videoFile}>
                                {loading ? `${phaseLabel}...` : '⚡ Transcribe Now'}
                            </button>
                        </div>
                    </div>

                    {/* Right: Result */}
                    <div className="panel fade-in" style={{ position: 'relative' }}>
                        <div className="panel-header" style={{ justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div className="panel-dot" style={{ background: phase === 'done' ? '#10b981' : '#6366f1' }} />
                                <span className="panel-title">output.txt</span>
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
                                    <button className="copy-btn" onClick={handleCopyText}>copy</button>
                                    <div className="result-text mt-5">{text}</div>
                                    <div className="flex gap-4 mt-6">
                                        <button onClick={handleReset} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 8, background: 'rgba(89,16,185,0.12)', border: '1px solid rgba(117,16,185,0.3)', color: '#a86ee7', fontSize: 12, cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace", transition: 'all 0.15s' }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(89,16,185,0.25)'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(89,16,185,0.12)'}
                                        >⟳ Reset</button>

                                        <button className="btn" onClick={handleFixGrammar} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 8, background: 'rgba(185,61,16,0.12)', border: '1px solid rgba(185,16,16,0.3)', color: '#e76e6e', fontSize: 12, cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace", transition: 'all 0.15s' }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(185,41,16,0.25)'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(185,41,16,0.12)'}
                                        >🔧 Grammar</button>
                                    </div>

                                    <div className="mt-5" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                            <label style={{ fontSize: 11, color: '#71717a', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.1em' }}>File name</label>
                                            <input type="text" defaultValue={filename}
                                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 13, fontFamily: "'JetBrains Mono', monospace", outline: 'none', width: '100%' }}
                                                onFocus={e => e.target.style.borderColor = 'rgba(99,102,241,0.5)'}
                                                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                                                onChange={e => setFilename(e.target.value)}
                                            />
                                        </div>
                                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                            <label style={{ fontSize: 11, color: '#71717a', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>Export as</label>
                                            <select style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '6px 10px', color: '#fff', fontSize: 12, fontFamily: "'JetBrains Mono', monospace", cursor: 'pointer', outline: 'none' }}
                                                onFocus={e => e.target.style.borderColor = 'rgba(99,102,241,0.5)'}
                                                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                                                onChange={e => setFormat(e.target.value)}
                                            >
                                                <option value="txt" style={{ background: '#1a1a2e' }}>.txt</option>
                                                <option value="pdf" style={{ background: '#1a1a2e' }}>.pdf</option>
                                                <option value="docx" style={{ background: '#1a1a2e' }}>.docx</option>
                                            </select>
                                            <button onClick={handleDownload} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 8, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', color: '#6ee7b7', fontSize: 12, cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace", transition: 'all 0.15s' }}
                                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(16,185,129,0.25)'}
                                                onMouseLeave={e => e.currentTarget.style.background = 'rgba(16,185,129,0.12)'}
                                            >↓ Download</button>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="result-empty">
                                    <div className="result-empty-icon">◌</div>
                                    <div className="result-empty-text">awaiting transcription...</div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
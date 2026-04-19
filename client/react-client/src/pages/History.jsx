import { useState, useEffect, useContext, useMemo } from "react";
import Api from "../api/Api";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { jsPDF } from 'jspdf';
import { Document, Packer, Paragraph, TextRun } from 'docx';

export default function History() {
    const { user } = useContext(AuthContext);
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(null);
    const [viewMode, setViewMode] = useState('text');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [limit, setLimit] = useState(8);
    const [checkDelete, setCheckDelete] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        if (!user) { navigate('/login'); return; }
        fetchHistory(page, limit);
    }, [page]);

    const pageRange = useMemo(() => {
        const delta = 3;
        const start = Math.max(1, page - delta);
        const end = Math.min(totalPages, page + 2);
        return Array.from({ length: end - start + 1 }, (_, i) => start + i)
    }, [page, totalPages])

    const fetchHistory = async (currentPage, limit) => {
        try {
            const data = await Api.get(`/job/user?page=${currentPage}&limit=${limit}`);
            console.log(data.jobs)
            setJobs(data.jobs);
            setTotalPages(data.totalPages)
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (iso) => {
        const d = new Date(iso);
        return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    const formatDuration = (s) => {
        if (!s) return '--';
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${m}m ${sec}s`;
    };

    const statusColor = { completed: '#10b981', processing: '#f59e0b', failed: '#ef4444', waiting: '#6366f1' };
    const statusLabel = { completed: 'Done', processing: 'Processing', failed: 'Failed', waiting: 'Waiting' };

    const speakerColors = ['#6366f1', '#f59e0b', '#10b981', '#ec4899', '#3b82f6'];
    const getSpeakerColor = (speaker) => {
        if (!speaker) return '#71717a';
        const idx = parseInt(speaker.replace(/\D/g, '')) % speakerColors.length;
        return speakerColors[idx];
    };

    const parseSpeakers = (segments) => {
        if (!segments?.length) return [];
        const grouped = [];
        let current = null;
        for (const seg of segments) {
            if (current && current.speaker === seg.speaker) {
                current.text += ' ' + seg.text;
            } else {
                current = { speaker: seg.speaker || 'Unknown', text: seg.text, start: seg.start, end: seg.end };
                grouped.push(current);
            }
        }
        return grouped;
    };

    const downloadTxt = (text, filename) => {
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const downloadPdf = (text, filename) => {
        const doc = new jsPDF();
        const lines = doc.splitTextToSize(text, 180);
        doc.setFontSize(12);
        doc.text(lines, 15, 15);
        doc.save(`${filename}.pdf`);
    }

    const downloadDocx = async (text, filename) => {
        const doc = new Document({
            sections: [{
                children: text.split('\n').map(line =>
                    new Paragraph({
                        children: [new TextRun(line)],
                    })
                ),
            }],
        });

        const blob = await Packer.toBlob(doc);
        saveAs(blob, `${filename}.docx`);
    };

    const handleDownload = async (filename, text, format) => {
        if (format === 'txt') downloadTxt(text, filename);
        if (format === 'pdf') downloadPdf(text, filename);
        if (format === 'docx') await downloadDocx(text, filename);
    }

    const handleDelete = async (jobId) => {
        const prevJobs = [...jobs];

        setJobs(jobs.filter(job => job._id !== jobId));

        try {
            const response = await Api.delete(`/job/delete?jobId=${jobId}`);

            if (response) {
                setCheckDelete(false);
                if (selected?._id === jobId) {
                    setSelected(null);
                }
            }
        } catch (err) {
            setJobs(prevJobs);
        }
    };

    return (
        <div style={{ background: '#0a0a0f', minHeight: '100vh', fontFamily: "'Syne', sans-serif", color: '#fff' }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
                .history-grid { display: grid; grid-template-columns: 340px 1fr; gap: 20px; }
                .job-card {
                    padding: 14px 16px; border-radius: 12px;
                    border: 1px solid rgba(255,255,255,0.06);
                    background: rgba(255,255,255,0.02);
                    cursor: pointer; transition: all 0.15s;
                    margin-bottom: 8px;
                }
                .job-card:hover { border-color: rgba(99,102,241,0.3); background: rgba(99,102,241,0.05); }
                .job-card.active { border-color: rgba(99,102,241,0.5); background: rgba(99,102,241,0.08); }
                .job-title { font-size: 13px; font-weight: 600; color: #fff; margin-bottom: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .job-meta { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
                .status-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
                .meta-text { font-size: 11px; color: #52525b; font-family: 'JetBrains Mono', monospace; }
                .panel { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.07); border-radius: 16px; overflow: hidden; }
                .panel-header { padding: 20px; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: space-between; gap: 8px; }
                .result-scroll { max-height: 600px;  padding:30px 20px; overflow-y: auto; }
                .result-scroll::-webkit-scrollbar { width: 4px; }
                .result-scroll::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 2px; }
                .speaker-bubble { display: flex; gap: 10px; margin-bottom: 14px; }
                .speaker-avatar { width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; font-family: 'JetBrains Mono', monospace; }
                .toggle-btn { padding: '4px 10px'; border-radius: 6px; border: none; font-size: 11px; font-family: 'JetBrains Mono', monospace; cursor: pointer; transition: all 0.15s; padding: 4px 10px; }
                .icon-btn { padding: 5px 12px; border-radius: 7px; font-size: 11px; font-family: 'JetBrains Mono', monospace; cursor: pointer; transition: all 0.15s; border: none; }
                .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 300px; gap: 12px; }
                @keyframes spin { to { transform: rotate(360deg); } }
                .spinner { width: 32px; height: 32px; border: 3px solid rgba(99,102,241,0.2); border-top-color: #6366f1; border-radius: 50%; animation: spin 0.8s linear infinite; }
            `}</style>

            <div style={{ maxWidth: 1200, margin: '0 auto', padding: '48px 32px' }}>
                {/* Header */}
                <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#6366f1', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>
                    // transcription history
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32 }}>
                    <h1 style={{ fontSize: 36, fontWeight: 800, margin: 0 }}>Your Videos</h1>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#52525b' }}>
                        {jobs.length} job{jobs.length !== 1 ? 's' : ''}
                    </span>
                </div>

                {loading ? (
                    <div className="empty-state"><div className="spinner" /></div>
                ) : jobs.length === 0 ? (
                    <div className="empty-state">
                        <div style={{ fontSize: 40, opacity: 0.15 }}>📭</div>
                        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: '#3f3f46' }}>no transcriptions yet</div>
                    </div>
                ) : (
                    <>
                        <div className="history-grid">
                            {/* Left: Job list */}
                            <div>
                                {jobs.map((job) => (
                                    <div key={job._id}
                                        className={`job-card ${selected?._id === job._id ? 'active' : ''}`}
                                        onClick={() => { setSelected(job); setViewMode('text'); }}
                                    >
                                        <div className="job-title" title={job.title}>{job.title || 'Untitled'}</div>
                                        <div className="job-meta">
                                            <div className="status-dot" style={{ background: statusColor[job.status] || '#52525b' }} />
                                            <span className="meta-text" style={{ color: statusColor[job.status] }}>{statusLabel[job.status] || job.status}</span>
                                            <span className="meta-text">·</span>
                                            <span className="meta-text">{formatDate(job.createdAt)}</span>
                                        </div>
                                        {job.status === 'completed' && (
                                            <div style={{ marginTop: 6, fontSize: 11, color: '#3f3f46', fontFamily: "'JetBrains Mono', monospace" }}>
                                                {job.transcriptText?.slice(0, 60)}...
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Right: Detail */}
                            <div>
                                {selected ? (
                                    <div className="panel" style={{ maxWidth: '100%', overflow: 'hidden', whiteSpace: 'pre-wrap', position: 'relative' }}>
                                        {/* Panel header */}
                                        <div className="panel-header">
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', whiteSpace: 'pre-wrap', textOverflow: 'ellipsis' }}>
                                                    {selected.title}
                                                </div>
                                                <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                                                    {[
                                                        ['📅', formatDate(selected.createdAt)],
                                                        ['🌐', selected.language || '--'],
                                                        ['⏱', formatDuration(selected.duration)],
                                                    ].map(([icon, val]) => (
                                                        <span key={icon} style={{ fontSize: 11, color: '#52525b', fontFamily: "'JetBrains Mono', monospace" }}>
                                                            {icon} {val}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            {selected.status === 'completed' && (
                                                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                                                    {/* Toggle text/speaker */}
                                                    {selected.segments?.some(s => s.speaker) && (
                                                        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: 3, gap: 2 }}>
                                                            {[['text', '≡'], ['speaker', '◉']].map(([mode, icon]) => (
                                                                <button key={mode} className="toggle-btn"
                                                                    onClick={() => setViewMode(mode)}
                                                                    style={{
                                                                        background: viewMode === mode ? 'rgba(99,102,241,0.4)' : 'transparent',
                                                                        color: viewMode === mode ? '#fff' : '#71717a',
                                                                    }}>
                                                                    {icon}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {/* Download */}
                                                    {['txt', 'pdf', 'docx'].map(fmt => (
                                                        <button key={fmt} className="icon-btn"
                                                            onClick={() => handleDownload(selected.title, selected.resultText, fmt)}
                                                            style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: '#6ee7b7' }}
                                                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(16,185,129,0.25)'}
                                                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(16,185,129,0.1)'}
                                                        >↓ .{fmt}</button>
                                                    ))}
                                                    {/* Copy */}
                                                    <button className="icon-btn"
                                                        onClick={() => navigator.clipboard.writeText(selected.resultText)}
                                                        style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', color: '#a5b4fc' }}
                                                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.25)'}
                                                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(99,102,241,0.1)'}
                                                    >copy</button>
                                                </div>
                                            )}
                                        </div>

                                        {/* Content */}
                                        <div className="result-scroll">
                                            {selected.status !== 'completed' ? (
                                                <div className="empty-state" style={{ minHeight: 200 }}>
                                                    <div style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: statusColor[selected.status] }}>
                                                        {statusLabel[selected.status]}
                                                        <span>
                                                            {selected.status === 'processing'
                                                                ? ` ${selected.countChunks}/${selected.totalChunks}`
                                                                : ''
                                                            }
                                                        </span>... {'\n'}
                                                    </div>
                                                </div>
                                            ) : viewMode === 'speaker' && selected.segments?.some(s => s.speaker) ? (
                                                parseSpeakers(selected.segments).map((seg, i) => {
                                                    const color = getSpeakerColor(seg.speaker);
                                                    return (
                                                        <div key={i} className="speaker-bubble">
                                                            <div className="speaker-avatar" style={{ background: `${color}20`, border: `1px solid ${color}40`, color }}>
                                                                {seg.speaker?.slice(-2) || '?'}
                                                            </div>
                                                            <div style={{ flex: 1 }}>
                                                                <div style={{ fontSize: 10, color, fontFamily: "'JetBrains Mono', monospace", marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                                                    {seg.speaker} · {Math.floor(seg.start / 60)}:{String(Math.floor(seg.start % 60)).padStart(2, '0')}
                                                                </div>
                                                                <div style={{ background: `${color}0d`, border: `1px solid ${color}20`, borderRadius: '4px 12px 12px 12px', padding: '8px 12px', fontSize: 13, color: '#d4d4d8', lineHeight: 1.6 }}>
                                                                    {seg.text}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <p style={{ fontSize: 14, lineHeight: 1.8, color: '#d4d4d8', fontFamily: "'JetBrains Mono', monospace", margin: 0, overflow: 'hidden', whiteSpace: 'pre-wrap', maxWidth: '100%' }}>
                                                    {selected.transcriptText}
                                                </p>
                                            )}
                                        </div>

                                        <button
                                            style={{
                                                fontSize: 14,
                                                padding: '8px 16px',
                                                borderRadius: 10,
                                                border: '1px solid rgba(241, 57, 57, 0.3)',
                                                background: 'linear-gradient(135deg, rgba(241,57,57,0.15), rgba(255,0,0,0.05))',
                                                color: '#ff4d4f',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                transition: 'all 0.25s ease',
                                                boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                                                margin: '15px'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.background = 'linear-gradient(135deg, #ff4d4f, #ff7875)';
                                                e.currentTarget.style.color = '#fff';
                                                e.currentTarget.style.transform = 'translateY(-2px)';
                                                e.currentTarget.style.boxShadow = '0 6px 14px rgba(241,57,57,0.3)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(241,57,57,0.15), rgba(255,0,0,0.05))';
                                                e.currentTarget.style.color = '#ff4d4f';
                                                e.currentTarget.style.transform = 'translateY(0)';
                                                e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.1)';
                                            }}

                                            onClick={() => { setCheckDelete(true) }}
                                        >
                                            🗑 Delete
                                        </button>

                                        {checkDelete ? (
                                            <div
                                                style={{
                                                    position: 'fixed',
                                                    inset: 0,
                                                    background: 'rgba(0,0,0,0.4)',
                                                    backdropFilter: 'blur(4px)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    zIndex: 999,
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        width: '320px',
                                                        padding: '20px 24px',
                                                        borderRadius: 16,
                                                        background: '#fff',
                                                        boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
                                                        fontFamily: "'JetBrains Mono', monospace",
                                                        textAlign: 'center',
                                                        animation: 'fadeIn 0.2s ease',
                                                    }}
                                                >
                                                    <div style={{ fontSize: 28, marginBottom: 10 }}>⚠️</div>

                                                    <p style={{ fontSize: 16, fontWeight: 500, color: '#333' }}>
                                                        Delete this job?
                                                    </p>

                                                    <p style={{ fontSize: 13, color: '#888', marginTop: 6 }}>
                                                        This action cannot be undone.
                                                    </p>

                                                    <div
                                                        style={{
                                                            display: 'flex',
                                                            gap: 10,
                                                            marginTop: 20,
                                                        }}
                                                    >
                                                        {/* Cancel */}
                                                        <button
                                                            style={{
                                                                flex: 1,
                                                                padding: '8px',
                                                                borderRadius: 10,
                                                                border: '1px solid #ddd',
                                                                background: '#f5f5f5',
                                                                cursor: 'pointer',
                                                                transition: 'all 0.2s',
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                e.currentTarget.style.transform = 'translateY(-2px)';
                                                                e.currentTarget.style.boxShadow = '#eaeaea';
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                e.currentTarget.style.transform = 'translateY(0)';
                                                                e.currentTarget.style.boxShadow = '#f5f5f5';
                                                            }}
                                                            onClick={() => { setCheckDelete(false) }}
                                                        >
                                                            Cancel
                                                        </button>

                                                        {/* Delete */}
                                                        <button
                                                            style={{
                                                                flex: 1,
                                                                padding: '8px',
                                                                borderRadius: 10,
                                                                border: 'none',
                                                                background: 'linear-gradient(135deg, #ff4d4f, #ff7875)',
                                                                color: '#fff',
                                                                fontWeight: 500,
                                                                cursor: 'pointer',
                                                                transition: 'all 0.2s',
                                                                boxShadow: '0 4px 12px rgba(255,77,79,0.3)',
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                e.currentTarget.style.transform = 'translateY(-2px)';
                                                                e.currentTarget.style.boxShadow = '0 6px 16px rgba(255,77,79,0.4)';
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                e.currentTarget.style.transform = 'translateY(0)';
                                                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(255,77,79,0.3)';
                                                            }}

                                                            onClick={() => { handleDelete(selected._id) }}
                                                        >
                                                            Delete

                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <></>
                                        )}
                                    </div>
                                ) : (
                                    <div className="panel empty-state" style={{ minHeight: 400 }}>
                                        <div style={{ fontSize: 32, opacity: 0.1 }}>◌</div>
                                        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#3f3f46' }}>select a job to view</div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {totalPages > 1 && (
                            <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 20, alignItems: 'center' }}>
                                <button
                                    onClick={() => setPage(1)}
                                    disabled={page === 1}
                                    style={{
                                        padding: '6px 12px', borderRadius: 8,
                                        border: '1px splid rgba(255,255,255,0.1)',
                                        background: 'transparent',
                                        color: page === 1 ? '#3f3f46' : '#a5b4fc',
                                        cursor: page === 1 ? 'not-allowed' : 'pointer',
                                        fontFamily: "'JetBrains Mono', monospace", fontSize: 12,
                                    }}
                                >
                                    ≪
                                </button>

                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    style={{
                                        padding: '6px 12px', borderRadius: 8,
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        background: 'transparent',
                                        color: page === 1 ? '#3f3f46' : '#a5b4fc',
                                        cursor: page === 1 ? 'not-allowed' : 'pointer',
                                        fontFamily: "'JetBrains Mono', monospace", fontSize: 12,
                                    }}
                                >←</button>

                                {pageRange.map((p) => (
                                    <button key={p} onClick={() => setPage(p)}
                                        style={{
                                            padding: '6px 12px', borderRadius: 8,
                                            border: '1px solid',
                                            borderColor: p === page ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.1)',
                                            background: p === page ? 'rgba(99,102,241,0.2)' : 'transparent',
                                            color: p === page ? '#a5b4fc' : '#71717a',
                                            fontFamily: "'JetBrains Mono', monospace",
                                            fontSize: 12, cursor: 'pointer',
                                        }}
                                    >{p}</button>
                                ))}

                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    style={{
                                        padding: '6px 12px', borderRadius: 8,
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        background: 'transparent',
                                        color: page === totalPages ? '#3f3f46' : '#a5b4fc',
                                        cursor: page === totalPages ? 'not-allowed' : 'pointer',
                                        fontFamily: "'JetBrains Mono', monospace", fontSize: 12,
                                    }}
                                >→</button>

                                <button
                                    onClick={() => setPage(totalPages)}
                                    disabled={page === totalPages}
                                    style={{
                                        padding: '6px 12px', borderRadius: 8,
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        color: page === totalPages ? '#3f3f46' : '#a5b4fc',
                                        cursor: page === totalPages ? 'not-allowed' : 'pointer',
                                        fontFamily: "'JetBrains Mono', monospace", fontSize: 12,
                                    }}
                                >
                                    ≫
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
import { useState, useEffect } from "react";
import Api from "../api/Api";

const MODELS = [
    {
        id: 'tiny',
        label: 'Tiny',
        desc: 'Fastest model, suitable for quick transcriptions of clear audio. May struggle with noisy or complex content.',
        speed: 5,
        accuracy: 2,
        size: '75 MB',
        badge: 'Fastest',
        badgeColor: '#f59e0b',
    },
    {
        id: 'base',
        label: 'Base',
        desc: 'Good balance between speed and accuracy. Suitable for most use cases.',
        speed: 3,
        accuracy: 3,
        size: '145 MB',
        badge: 'Recommended',
        badgeColor: '#6366f1',
    },
    {
        id: 'small',
        label: 'Small',
        desc: 'Higher accuracy, slightly slower processing. Good for complex content.',
        speed: 2,
        accuracy: 5,
        size: '466 MB',
        badge: 'Most Accurate',
        badgeColor: '#10b981',
    },
];

const Dot = ({ filled, color }) => (
    <span style={{
        display: 'inline-block', width: 10, height: 10, borderRadius: 3,
        background: filled ? color : 'rgba(255,255,255,0.08)',
        border: `1px solid ${filled ? color : 'rgba(255,255,255,0.12)'}`,
        marginRight: 4,
    }} />
);

const Bar = ({ value, max = 5, color }) => (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        {Array.from({ length: max }).map((_, i) => (
            <Dot key={i} filled={i < value} color={color} />
        ))}
    </div>
);

export default function Settings() {
    const [selectedModel, setSelectedModel] = useState('base');
    const [saved, setSaved] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem('settings');
        if (stored) setSelectedModel(stored);
    }, []);

    const handleSave = async () => {
        setLoading(true);
        try {
            await Api.post('/users/settings', { model: selectedModel });
            localStorage.setItem('settings', selectedModel);
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <section style={{ fontFamily: "'Syne', sans-serif", background: '#0a0a0f', minHeight: '100vh', color: '#fff', padding: 0 }}>
            <style>{`
                .settings-wrap {
                    max-width: 760px;
                    margin: 0 auto;
                    padding: 64px 24px 120px;
                }
                .settings-label {
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 11px; letter-spacing: 0.15em;
                    text-transform: uppercase; color: #6366f1;
                    margin-bottom: 10px;
                }
                .settings-title {
                    font-size: 32px; font-weight: 800;
                    margin-bottom: 6px; letter-spacing: -0.02em;
                }
                .settings-sub {
                    font-size: 14px; color: #52525b;
                    margin-bottom: 48px; font-weight: 400;
                }
                .section-sep {
                    border: none;
                    border-top: 1px solid rgba(255,255,255,0.06);
                    margin: 40px 0;
                }
                .group-title {
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 11px; letter-spacing: 0.12em;
                    text-transform: uppercase; color: #3f3f46;
                    margin-bottom: 16px;
                }
                .model-card {
                    border: 1px solid rgba(255,255,255,0.07);
                    border-radius: 16px;
                    padding: 20px;
                    cursor: pointer;
                    transition: border-color 0.18s, background 0.18s;
                    background: rgba(255,255,255,0.02);
                    margin-bottom: 12px;
                    position: relative;
                    display: flex;
                    gap: 16px;
                    align-items: flex-start;
                }
                .model-card:hover {
                    background: rgba(255,255,255,0.04);
                    border-color: rgba(255,255,255,0.15);
                }
                .model-card.selected {
                    background: rgba(99,102,241,0.07);
                }
                .model-badge {
                    display: inline-flex;
                    padding: 3px 10px;
                    border-radius: 100px;
                    font-size: 10px;
                    font-family: 'JetBrains Mono', monospace;
                    font-weight: 600;
                    letter-spacing: 0.05em;
                    text-transform: uppercase;
                    margin-left: 8px;
                }
                .model-name {
                    font-size: 17px; font-weight: 700;
                    display: flex; align-items: center;
                    margin-bottom: 6px;
                }
                .model-desc {
                    font-size: 13px; color: #71717a;
                    line-height: 1.6; margin-bottom: 14px;
                    font-weight: 400;
                }
                .model-meta {
                    display: flex; gap: 20px; align-items: center;
                    flex-wrap: wrap;
                }
                .meta-row {
                    display: flex; align-items: center; gap: 8px;
                }
                .meta-lbl {
                    font-size: 11px; color: #3f3f46;
                    font-family: 'JetBrains Mono', monospace;
                    text-transform: uppercase; letter-spacing: 0.08em;
                    min-width: 60px;
                }
                .radio-circle {
                    width: 18px; height: 18px;
                    border-radius: 50%;
                    border: 1.5px solid rgba(255,255,255,0.15);
                    display: flex; align-items: center; justify-content: center;
                    flex-shrink: 0; margin-top: 2px;
                    transition: border-color 0.15s;
                }
                .radio-dot {
                    width: 8px; height: 8px;
                    border-radius: 50%;
                    transition: transform 0.15s, opacity 0.15s;
                }
                .size-pill {
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 11px; color: #52525b;
                    background: rgba(255,255,255,0.04);
                    border: 1px solid rgba(255,255,255,0.07);
                    padding: 3px 10px; border-radius: 6px;
                }
                .save-btn {
                    padding: 14px 40px;
                    background: linear-gradient(135deg, #6366f1, #8b5cf6);
                    border: none; border-radius: 12px;
                    color: #fff; font-size: 14px; font-weight: 700;
                    cursor: pointer; font-family: 'Syne', sans-serif;
                    transition: all 0.2s;
                    box-shadow: 0 4px 24px rgba(99,102,241,0.25);
                    letter-spacing: 0.02em;
                }
                .save-btn:hover:not(:disabled) {
                    transform: translateY(-1px);
                    box-shadow: 0 8px 32px rgba(99,102,241,0.4);
                }
                .save-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
                .toast {
                    display: inline-flex; align-items: center; gap: 8px;
                    background: rgba(16,185,129,0.12);
                    border: 1px solid rgba(16,185,129,0.3);
                    color: #6ee7b7; padding: 10px 18px;
                    border-radius: 10px; font-size: 13px;
                    font-family: 'JetBrains Mono', monospace;
                    margin-left: 16px;
                    animation: fadeSlide 0.3s ease;
                }
                @keyframes fadeSlide {
                    from { opacity: 0; transform: translateY(4px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>

            <div className="settings-wrap">
                <p className="settings-label">// preferences</p>
                <h1 className="settings-title">Settings</h1>
                <p className="settings-sub">Adjust your transcription preferences</p>

                <p className="group-title">Transcription Model</p>

                {MODELS.map((m) => {
                    const isSelected = selectedModel === m.id;
                    return (
                        <div
                            key={m.id}
                            className={`model-card${isSelected ? ' selected' : ''}`}
                            style={isSelected ? { borderColor: m.badgeColor + '55' } : {}}
                            onClick={() => setSelectedModel(m.id)}
                        >
                            {/* Radio */}
                            <div className="radio-circle" style={isSelected ? { borderColor: m.badgeColor } : {}}>
                                <div className="radio-dot" style={{
                                    background: m.badgeColor,
                                    opacity: isSelected ? 1 : 0,
                                    transform: isSelected ? 'scale(1)' : 'scale(0)',
                                }} />
                            </div>

                            {/* Content */}
                            <div style={{ flex: 1 }}>
                                <div className="model-name">
                                    {m.label}
                                    <span className="model-badge" style={{
                                        background: m.badgeColor + '20',
                                        color: m.badgeColor,
                                        border: `1px solid ${m.badgeColor}40`,
                                    }}>
                                        {m.badge}
                                    </span>
                                    <span className="size-pill" style={{ marginLeft: 'auto' }}>{m.size}</span>
                                </div>
                                <p className="model-desc">{m.desc}</p>
                                <div className="model-meta">
                                    <div className="meta-row">
                                        <span className="meta-lbl">Speed</span>
                                        <Bar value={m.speed} color={m.badgeColor} />
                                    </div>
                                    <div className="meta-row">
                                        <span className="meta-lbl">Accuracy</span>
                                        <Bar value={m.accuracy} color={m.badgeColor} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}

                <hr className="section-sep" />

                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <button className="save-btn" onClick={handleSave} disabled={loading}>
                        {loading ? 'Saving...' : 'Save Settings'}
                    </button>
                    {saved && (
                        <span className="toast">✓ Saved</span>
                    )}
                </div>
            </div>
        </section>
    );
}
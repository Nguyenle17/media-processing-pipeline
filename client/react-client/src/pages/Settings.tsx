import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { MODELS } from '../constants/models';
import {
  AlertCircle,
  CheckCircle2,
  CircleHelp,
  Gauge,
  Save,
  Server,
  Target,
  UserRound,
  Zap,
} from 'lucide-react';
import Api from '../api/Api';

interface BarProps {
  value: number; // 1 to 5
}

const Bar: React.FC<BarProps> = ({ value }) => (
  <span className="vs-bars" aria-hidden="true">
    {[1, 2, 3, 4, 5].map((level) => (
      <i key={level} className={level <= value ? 'on' : ''} />
    ))}
  </span>
);

export default function Settings() {
  const { token, user } = useAuth();
  const [selectedModel, setSelectedModel] = useState<string>('base');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await Api.get('/users/settings');
        const model = res?.selectedModel || res?.model;
        if (MODELS.some((item) => item.id === model)) {
          setSelectedModel(model);
          localStorage.setItem('settings', model);
        }
      } catch (err) {
        console.error("Failed to load settings", err);
        setError('Unable to load your settings. Please try again.');
      }
    };
    if (token) fetchSettings();
  }, [token]);

  const handleSave = async () => {
    setLoading(true);
    setSuccess(false);
    setError(null);
    try {
      const saved = await Api.put('/users/settings', { model: selectedModel });
      const persistedModel = saved?.selectedModel || selectedModel;
      setSelectedModel(persistedModel);
      localStorage.setItem('settings', persistedModel);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to save settings", err);
      setError(err instanceof Error ? err.message : 'Unable to save settings.');
    } finally {
      setLoading(false);
    }
  };

  const activeModel = MODELS.find((model) => model.id === selectedModel);

  return (
    <div className="vs-page fade-in">
      <div className="vs-container" style={{ maxWidth: 960 }}>
        <div className="vs-page-head">
          <div className="vs-page-head__text">
            <span className="vs-page-kicker">Workspace</span>
            <h1 className="vs-page-title"><Server size={26} /> AI settings</h1>
            <p className="vs-page-desc">Choose the default Whisper model used for new transcription jobs.</p>
          </div>
        </div>

        <div className="vs-info-strip">
          <div className="vs-info-item">
            <div className="vs-info-icon"><UserRound size={14} /></div>
            <div><strong>{user?.name || 'Your workspace'}</strong><span>{user?.email || 'Personal media workspace'}</span></div>
          </div>
          <div className="vs-info-item">
            <div className="vs-info-icon"><Gauge size={14} /></div>
            <div><strong>Current model</strong><span>{activeModel?.label || 'Base'}</span></div>
          </div>
          <div className="vs-info-item">
            <div className="vs-info-icon"><CircleHelp size={14} /></div>
            <div><strong>Which model?</strong><span>Larger models are more accurate but slower</span></div>
          </div>
        </div>

        <div className="vs-panel">
          <div className="vs-panel-header">
            <div className="vs-panel-header__group">
              <span className="vs-panel-dot" />
              <h2 className="vs-panel-title">Whisper model</h2>
            </div>
            <span className="vs-panel-kicker">{MODELS.length} options</span>
          </div>
          <div className="vs-panel-body">
            <p className="vs-hint" style={{ marginBottom: 14 }}>
              This becomes the default for transcription and translation. You can still change it per job.
            </p>

            <div className="vs-model-grid" role="radiogroup" aria-label="Default Whisper model">
              {MODELS.map((model) => {
                const selected = selectedModel === model.id;
                return (
                  <button
                    key={model.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    className={`vs-model-card ${selected ? 'is-selected' : ''}`}
                    onClick={() => setSelectedModel(model.id)}
                  >
                    <span className="vs-model-card__head">
                      <span className="vs-model-card__name">
                        <span className="vs-radio" aria-hidden="true" />
                        {model.label}
                      </span>
                      <span className="vs-badge">{model.size}</span>
                    </span>
                    <span className="vs-model-card__desc" style={{ display: 'block' }}>{model.desc}</span>
                    <span className="vs-model-card__meter">
                      <span><Zap size={12} /> Speed</span>
                      <Bar value={model.speed} />
                    </span>
                    <span className="vs-model-card__meter">
                      <span><Target size={12} /> Accuracy</span>
                      <Bar value={model.accuracy} />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="vs-panel-footer">
            {success && (
              <span className="vs-text-success" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }} role="status">
                <CheckCircle2 size={16} /> Settings saved
              </span>
            )}
            {error && (
              <span className="vs-text-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }} role="alert">
                <AlertCircle size={16} /> {error}
              </span>
            )}
            <button
              className="vs-btn vs-btn--primary vs-btn--lg"
              onClick={handleSave}
              disabled={loading}
            >
              {loading ? 'Saving…' : <><Save size={16} /> Save settings</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { MODELS } from '../constants/models';
import { Save, Server, Zap, Target, CheckCircle2, AlertCircle } from 'lucide-react';
import Api from '../api/Api';

interface DotProps {
  active: boolean;
}

const Dot: React.FC<DotProps> = ({ active }) => (
  <div className={`w-2 h-2 rounded-full ${active ? 'bg-indigo-500' : 'bg-gray-700'}`} />
);

interface BarProps {
  value: number; // 1 to 5
}

const Bar: React.FC<BarProps> = ({ value }) => {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((level) => (
        <div 
          key={level} 
          className={`h-1.5 w-6 rounded-sm ${level <= value ? 'bg-indigo-500' : 'bg-gray-700'}`} 
        />
      ))}
    </div>
  );
};

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
        if (res?.selectedModel || res?.model) {
          setSelectedModel(res.selectedModel || res.model);
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
      await Api.put('/users/settings', { model: selectedModel });
      localStorage.setItem('settings', selectedModel);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to save settings", err);
      setError(err instanceof Error ? err.message : 'Unable to save settings.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="settings-container fade-in p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="vs-section-title text-3xl font-bold mb-2 flex items-center gap-2">
          <Server className="text-indigo-500" /> AI Settings
        </h1>
        <p className="text-gray-400">Configure your default AI models and processing preferences.</p>
      </div>

      <div className="vs-panel">
        <div className="vs-panel-header">
          <div className="flex items-center gap-2">
            <span className="vs-panel-dot bg-indigo-500"></span>
            <h2 className="vs-panel-title">Whisper Model Selection</h2>
          </div>
        </div>
        <div className="vs-panel-body space-y-4 bg-[#0a0a0f]">
          <p className="text-sm text-gray-400 mb-4">
            Select the default transcription model. Larger models are more accurate but take longer to process.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {MODELS.map(model => (
              <div 
                key={model.id}
                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  selectedModel === model.id 
                    ? 'border-indigo-500 bg-indigo-500/10' 
                    : 'border-gray-800 bg-[#13131f] hover:border-gray-600'
                }`}
                onClick={() => setSelectedModel(model.id)}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      selectedModel === model.id ? 'border-indigo-500' : 'border-gray-500'
                    }`}>
                      {selectedModel === model.id && <div className="w-2 h-2 rounded-full bg-indigo-500" />}
                    </div>
                <span className="font-medium text-gray-200">{model.label}</span>
                  </div>
                  <span className="vs-badge bg-gray-800 text-xs text-gray-400 px-2 py-1 rounded">
                    {model.size}
                  </span>
                </div>
                
                <p className="text-xs text-gray-500 mb-4 ml-6">{model.desc}</p>
                
                <div className="ml-6 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400 flex items-center gap-1"><Zap size={12}/> Speed</span>
                    <Bar value={model.speed} />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400 flex items-center gap-1"><Target size={12}/> Accuracy</span>
                    <Bar value={model.accuracy} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="p-4 border-t border-gray-800 bg-[#13131f] flex justify-end items-center gap-4">
          {success && <span className="text-green-400 text-sm flex items-center gap-2"><CheckCircle2 size={16} /> Settings saved</span>}
          {error && <span className="text-red-400 text-sm flex items-center gap-2"><AlertCircle size={16} /> {error}</span>}
          <button 
            className="vs-submit-btn flex items-center gap-2"
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? 'Saving...' : <><Save size={18} /> Save Settings</>}
          </button>
        </div>
      </div>
    </div>
  );
}

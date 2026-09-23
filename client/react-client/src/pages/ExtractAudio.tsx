import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import LanguagePicker from '../components/common/LanguagePicker';
import { LANGUAGES, getLanguageByCode } from '../constants/languages';
import { Volume2, Trash2, Download, AlertTriangle, PenTool, Type, FileAudio } from 'lucide-react';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function ExtractAudio() {
  const { token } = useAuth();
  const [text, setText] = useState<string>('');
  const [targetLang, setTargetLang] = useState<string>('en');
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const charCount = text.length;
  const maxChars = 2000;

  const handleGenerate = async () => {
    if (!text.trim() || charCount > maxChars) return;
    setIsProcessing(true);
    setError(null);
    setAudioURL(null);

    try {
      const response = await fetch(`${BASE_URL}/video/tts`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ text, language: targetLang })
      });
      if (!response.ok) {
        throw new Error(`TTS failed with status ${response.status}`);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setAudioURL(url);
    } catch (err: any) {
      setError(err.message || 'Failed to generate audio');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClear = () => {
    setText('');
    setAudioURL(null);
    setError(null);
  };

  return (
    <div className="tts-container fade-in p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="vs-section-title text-3xl font-bold mb-2 flex items-center gap-2">
          <Volume2 className="text-indigo-500" /> Text to Speech
        </h1>
        <p className="text-gray-400">Convert your text to natural sounding speech.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="vs-panel">
            <div className="vs-panel-header flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="vs-panel-dot bg-indigo-500"></span>
                <h2 className="vs-panel-title">Input Text</h2>
              </div>
              <button className="vs-btn vs-btn--ghost text-xs" onClick={handleClear}>
                <Trash2 size={14} className="mr-1" /> Clear
              </button>
            </div>
            <div className="vs-panel-body">
              <textarea
                className="w-full h-48 bg-[#13131f] border border-gray-800 rounded-md p-4 text-white focus:outline-none focus:border-indigo-500 resize-none vs-scroll"
                placeholder="Enter text here..."
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              <div className={`text-right text-sm mt-2 ${charCount > maxChars ? 'text-red-500' : 'text-gray-500'}`}>
                {charCount} / {maxChars} characters
              </div>
            </div>
          </div>

          <div className="vs-panel">
            <div className="vs-panel-header">
              <div className="flex items-center gap-2">
                <span className="vs-panel-dot bg-purple-500"></span>
                <h2 className="vs-panel-title">Language Voice</h2>
              </div>
            </div>
            <div className="vs-panel-body">
              <LanguagePicker 
                languages={LANGUAGES} 
                selected={targetLang} 
                onSelect={setTargetLang} 
              />
            </div>
          </div>
          
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-md p-4 text-red-500 flex items-start gap-3">
              <AlertTriangle size={20} className="shrink-0 mt-0.5" />
              <div>{error}</div>
            </div>
          )}

          <button 
            className="vs-submit-btn w-full flex justify-center items-center gap-2"
            onClick={handleGenerate}
            disabled={isProcessing || !text.trim() || charCount > maxChars}
          >
            {isProcessing ? 'Generating...' : <><Wand2 size={18} /> Generate Audio</>}
          </button>
        </div>

        <div className="space-y-6">
          <div className="vs-panel">
            <div className="vs-panel-header">
              <div className="flex items-center gap-2">
                <span className="vs-panel-dot bg-green-500"></span>
                <h2 className="vs-panel-title">Result</h2>
              </div>
            </div>
            <div className="vs-panel-body flex flex-col items-center justify-center min-h-[200px]">
              {audioURL ? (
                <div className="w-full space-y-4">
                  <audio controls src={audioURL} className="w-full" />
                  <a 
                    href={audioURL} 
                    download="generated-audio.mp3"
                    className="vs-btn vs-btn--success w-full flex justify-center items-center gap-2 py-3"
                  >
                    <Download size={18} /> Download MP3
                  </a>
                </div>
              ) : (
                <div className="text-gray-500 flex flex-col items-center">
                  <FileAudio size={32} className="mb-2 opacity-50" />
                  <p>Audio will appear here</p>
                </div>
              )}
            </div>
          </div>

          <div className="vs-panel bg-indigo-900/10 border-indigo-500/20">
            <div className="vs-panel-body">
              <h3 className="font-semibold text-indigo-400 mb-3 flex items-center gap-2">
                <PenTool size={16} /> Tips for best results
              </h3>
              <ul className="text-sm text-gray-400 space-y-2 list-disc pl-4">
                <li>Use proper punctuation for natural pauses.</li>
                <li>Avoid very long sentences.</li>
                <li>Ensure the selected language matches the text.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Ensure Wand2 is imported
import { Wand2 } from 'lucide-react';

import { Link } from 'react-router-dom';
import { AudioLines } from 'lucide-react';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="vs-footer">
      <div className="vs-container">
        <div className="vs-footer-main">
          <div className="vs-footer-brand">
            <Link to="/" className="vs-brand" aria-label="VideoSub home">
              <span className="vs-brand-mark"><AudioLines size={18} /></span>
              <span className="vs-brand-name">VideoSub</span>
            </Link>
            <p className="vs-footer-desc">
              AI-powered transcription, translation, and text-to-speech for video teams.
            </p>
          </div>

          {[
            {
              title: 'Product',
              links: [
                { label: 'Transcribe', to: '/' },
                { label: 'Translate', to: '/translate' },
                { label: 'Text to speech', to: '/extract-audio' },
              ],
            },
            {
              title: 'Account',
              links: [
                { label: 'Translation history', to: '/history' },
                { label: 'Voice history', to: '/tts-history' },
                { label: 'Settings', to: '/settings' },
              ],
            },
          ].map((col) => (
            <div key={col.title}>
              <div className="vs-footer-title">{col.title}</div>
              <div className="vs-footer-links">
                {col.links.map((link) => (
                  <Link key={link.to} to={link.to}>{link.label}</Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="vs-footer-bottom">
          <span>© {year} VideoSub</span>
        </div>
      </div>
    </footer>
  );
}

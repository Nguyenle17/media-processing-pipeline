import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer style={{
      background: 'rgba(255,255,255,0.02)',
      borderTop: '1px solid rgba(255,255,255,0.06)',
      padding: '40px 32px',
      fontFamily: "'Inter', sans-serif",
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 32 }}>
        {/* Brand */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 7,
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12,
            }}>▶</div>
            <span style={{ fontSize: 16, fontWeight: 800, background: 'linear-gradient(135deg, #a5b4fc, #e879f9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>VideoSub</span>
          </div>
          <p style={{ fontSize: 12, color: '#3f3f46', maxWidth: 240, lineHeight: 1.6, fontFamily: "'JetBrains Mono', monospace" }}>
            AI-powered video transcription and translation platform.
          </p>
        </div>
        {/* Links columns */}
        {[
          { title: 'Product', links: [{ label: 'Transcribe', to: '/' }, { label: 'Translate', to: '/translate' }, { label: 'Text to Speech', to: '/extract-audio' }] },
          { title: 'Account', links: [{ label: 'History', to: '/history' }, { label: 'Settings', to: '/settings' }] },
        ].map((col) => (
          <div key={col.title}>
            <div style={{ fontSize: 11, color: '#52525b', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase' as const, letterSpacing: '0.12em', marginBottom: 14 }}>{col.title}</div>
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
              {col.links.map((link) => (
                <Link key={link.to} to={link.to} style={{ fontSize: 13, color: '#52525b', textDecoration: 'none', transition: 'color 0.15s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#a5b4fc')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#52525b')}>
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div style={{ maxWidth: 1200, margin: '24px auto 0', paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: '#27272a', fontFamily: "'JetBrains Mono', monospace" }}>© 2024 VideoSub. All rights reserved.</span>
      </div>
    </footer>
  );
}

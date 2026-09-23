import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useEffect } from 'react';
import Api from '../api/Api';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function OAuthSuccess() {
  const navigate = useNavigate();
  const { login } = useAuth();
  useEffect(() => {
    let mounted = true;
    const fetchToken = async () => {
      try {
        const accessToken = await Api.refreshToken();
        if (!accessToken) throw new Error('No access token');
        if (!mounted) return;
        login(accessToken);
        navigate('/', { replace: true });
      } catch {
        if (!mounted) return;
        navigate('/login?error=google_auth_failed', { replace: true });
      }
    };
    fetchToken();
    return () => { mounted = false; };
  }, [login, navigate]);
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', gap: 12, color: '#71717a', fontFamily: "'JetBrains Mono', monospace" }}>
      <LoadingSpinner size={24} />
      <span>Logging in...</span>
    </div>
  );
}

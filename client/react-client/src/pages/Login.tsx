import React, { useState } from 'react';
import Api from "../api/Api";
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const GoogleIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
);

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await Api.post('/auth/login', {
                email,
                password,
            });

            if (!response?.accessToken) {
                throw new Error('No access token returned');
            }

            login(response.accessToken);
            navigate('/');
        } catch (err) {
            setError(
                'Login failed. Please check your credentials and try again.'
            );
            console.error('Login error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setError('');
        setGoogleLoading(true);
        try {
            window.location.href = `${import.meta.env.VITE_API_URL}/auth/google`;
        } catch (err) {
            setError('Login with Google failed. Please try again.');
            console.error('Google login error:', err);
        } finally {
            setGoogleLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0a0a0f', padding: '0 16px' }}>
            <div style={{ width: '100%', maxWidth: '400px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '20px', padding: '32px' }}>

                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#fff', marginBottom: '8px' }}>Welcome back</h2>
                    <p style={{ fontSize: '14px', color: '#a1a1aa' }}>Log in to your account</p>
                </div>

                <button
                    onClick={handleGoogleLogin}
                    disabled={googleLoading || loading}
                    style={{
                        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                        padding: '12px 16px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '14px', fontWeight: 500,
                        cursor: (googleLoading || loading) ? 'not-allowed' : 'pointer', marginBottom: '20px',
                        transition: 'background 0.2s'
                    }}
                >
                    {googleLoading ? (
                        <div style={{ width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                    ) : (
                        <GoogleIcon />
                    )}
                    Continue with Google
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                    <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
                    <span style={{ fontSize: '12px', color: '#71717a', fontFamily: "'JetBrains Mono', monospace" }}>or login with email</span>
                    <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#71717a', fontFamily: "'JetBrains Mono', monospace", marginBottom: '6px' }}>Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            style={{
                                width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '12px', padding: '10px 14px', fontSize: '14px', color: '#fff', outline: 'none'
                            }}
                            placeholder="you@example.com"
                            required
                        />
                    </div>

                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <label style={{ fontSize: '12px', fontWeight: 500, color: '#71717a', fontFamily: "'JetBrains Mono', monospace" }}>Password</label>
                            <Link to="/forgot-password" style={{ fontSize: '12px', color: '#a5b4fc', textDecoration: 'none' }}>
                                Forgot password?
                            </Link>
                        </div>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            style={{
                                width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '12px', padding: '10px 14px', fontSize: '14px', color: '#fff', outline: 'none'
                            }}
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    {error && (
                        <div style={{ color: '#ef4444', fontSize: '12px', textAlign: 'center', background: 'rgba(239,68,68,0.1)', padding: '8px', borderRadius: '8px' }}>
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading || googleLoading}
                        style={{
                            width: '100%', background: '#6366f1', color: '#fff',
                            border: 'none', borderRadius: '6px', padding: '12px', fontSize: '14px', fontWeight: 500,
                            cursor: (loading || googleLoading) ? 'not-allowed' : 'pointer', marginTop: '8px',
                            opacity: (loading || googleLoading) ? 0.7 : 1
                        }}
                    >
                        {loading ? 'Logging in...' : 'Log in'}
                    </button>
                </form>

                <p style={{ marginTop: '24px', textAlign: 'center', fontSize: '14px', color: '#a1a1aa' }}>
                    Don't have an account?{" "}
                    <Link to="/register" style={{ color: '#a5b4fc', textDecoration: 'none', fontWeight: 500 }}>
                        Sign up
                    </Link>
                </p>
            </div>
            <style>{`
                @keyframes spin { 100% { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}

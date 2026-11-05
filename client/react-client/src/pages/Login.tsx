import React, { useState } from 'react';
import Api from "../api/Api";
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import GoogleIcon from '../components/auth/GoogleIcon';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [error, setError] = useState('');
    const [needsVerification, setNeedsVerification] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setNeedsVerification(false);
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
            const message = err instanceof Error ? err.message : '';
            const unverified = message.toLowerCase().includes('not verified');
            setNeedsVerification(unverified);
            setError(unverified ? 'Your email is not verified. We sent you a new verification link.' : message || 'Login failed. Please check your credentials and try again.');
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
        <div className="vs-auth-page">
            <div className="vs-auth-card">
                <div className="vs-auth-head">
                    <h1 className="vs-auth-title">Welcome back</h1>
                    <p className="vs-auth-desc">Log in to your VideoSub account.</p>
                </div>

                <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={googleLoading || loading}
                    className="vs-btn vs-btn--secondary vs-btn--block vs-btn--lg"
                >
                    {googleLoading
                        ? <span className="vs-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                        : <GoogleIcon />}
                    Continue with Google
                </button>

                <div className="vs-auth-divider">or log in with email</div>

                <form onSubmit={handleSubmit} className="vs-stack" style={{ gap: 14 }}>
                    <div className="vs-field">
                        <label className="vs-label" htmlFor="login-email">Email</label>
                        <input
                            id="login-email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="vs-input"
                            placeholder="you@example.com"
                            autoComplete="email"
                            required
                        />
                    </div>

                    <div className="vs-field">
                        <div className="vs-label">
                            <label htmlFor="login-password">Password</label>
                            <Link to="/forgot-password" style={{ fontWeight: 500, color: 'var(--vs-accent-light)' }}>
                                Forgot password?
                            </Link>
                        </div>
                        <input
                            id="login-password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="vs-input"
                            placeholder="••••••••"
                            autoComplete="current-password"
                            required
                        />
                    </div>

                    {error && (
                        <div className="vs-form-error" role="alert">
                            <div>
                                {error}
                                {needsVerification && (
                                    <div style={{ marginTop: 6 }}>
                                        <Link to="/verify-email" state={{ email }}>
                                            Need a verification link?
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <button type="submit" className="vs-submit-btn" disabled={loading || googleLoading}>
                        {loading ? 'Logging in…' : 'Log in'}
                    </button>
                </form>

                <p className="vs-auth-footer">
                    Don't have an account? <Link to="/register">Create one</Link>
                </p>
            </div>
        </div>
    );
}

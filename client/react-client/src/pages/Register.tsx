import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import Api from "../api/Api";

export default function Register() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const passwordsDiffer = Boolean(confirmPassword) && password !== confirmPassword;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);
        try {
            await Api.post('/auth/register', { name, email, password });
            navigate('/verify-email', { state: { email } });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
            console.error('Registration error:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="vs-auth-page">
            <div className="vs-auth-card">
                <div className="vs-auth-head">
                    <h1 className="vs-auth-title">Create account</h1>
                    <p className="vs-auth-desc">Start transcribing and translating your media.</p>
                </div>

                <form onSubmit={handleSubmit} className="vs-stack" style={{ gap: 14 }}>
                    <div className="vs-field">
                        <label className="vs-label" htmlFor="register-name">Full name</label>
                        <input
                            id="register-name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="vs-input"
                            placeholder="Your full name"
                            autoComplete="name"
                            required
                        />
                    </div>

                    <div className="vs-field">
                        <label className="vs-label" htmlFor="register-email">Email</label>
                        <input
                            id="register-email"
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
                        <label className="vs-label" htmlFor="register-password">Password</label>
                        <input
                            id="register-password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="vs-input"
                            placeholder="••••••••"
                            autoComplete="new-password"
                            minLength={8}
                            required
                        />
                    </div>

                    <div className="vs-field">
                        <label className="vs-label" htmlFor="register-confirm">Confirm password</label>
                        <input
                            id="register-confirm"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="vs-input"
                            style={passwordsDiffer ? { borderColor: 'var(--vs-danger)' } : undefined}
                            placeholder="••••••••"
                            autoComplete="new-password"
                            aria-invalid={passwordsDiffer}
                            aria-describedby={passwordsDiffer ? 'register-confirm-error' : undefined}
                            required
                        />
                        {passwordsDiffer && (
                            <p id="register-confirm-error" className="vs-text-danger" style={{ fontSize: 12 }}>
                                Passwords do not match
                            </p>
                        )}
                    </div>

                    {error && (
                        <div className="vs-form-error" role="alert">
                            <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                            <span>{error}</span>
                        </div>
                    )}

                    <button type="submit" className="vs-submit-btn" disabled={loading}>
                        {loading ? 'Creating account…' : 'Create account'}
                    </button>
                </form>

                <p className="vs-auth-footer">
                    Already have an account? <Link to="/login">Sign in</Link>
                </p>
            </div>
        </div>
    );
}

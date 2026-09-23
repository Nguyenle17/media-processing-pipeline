import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Api from "../api/Api";

export default function Register() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

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
            navigate('/login', { state: { registered: true } });
        } catch (err) {
            setError('Registration failed. Please try again.');
            console.error('Registration error:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0a0a0f', padding: '0 16px' }}>
            <div style={{ width: '100%', maxWidth: '400px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '20px', padding: '32px' }}>

                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#fff', marginBottom: '8px' }}>Create Account</h2>
                    <p style={{ fontSize: '14px', color: '#a1a1aa' }}>Sign up to get started</p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#71717a', fontFamily: "'JetBrains Mono', monospace", marginBottom: '6px' }}>Full Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            style={{
                                width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '12px', padding: '10px 14px', fontSize: '14px', color: '#fff', outline: 'none'
                            }}
                            placeholder="Your full name"
                            required
                        />
                    </div>

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
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#71717a', fontFamily: "'JetBrains Mono', monospace", marginBottom: '6px' }}>Password</label>
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

                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#71717a', fontFamily: "'JetBrains Mono', monospace", marginBottom: '6px' }}>Confirm Password</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            style={{
                                width: '100%', background: 'rgba(255,255,255,0.05)', 
                                border: (confirmPassword && password !== confirmPassword) ? '1px solid rgba(239,68,68,0.5)' : '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '12px', padding: '10px 14px', fontSize: '14px', color: '#fff', outline: 'none'
                            }}
                            placeholder="••••••••"
                            required
                        />
                        {confirmPassword && password !== confirmPassword && (
                            <p style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px' }}>Passwords do not match</p>
                        )}
                    </div>

                    {error && (
                        <div style={{ color: '#ef4444', fontSize: '12px', textAlign: 'center', background: 'rgba(239,68,68,0.1)', padding: '8px', borderRadius: '8px' }}>
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            width: '100%', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff',
                            border: 'none', borderRadius: '12px', padding: '12px', fontSize: '14px', fontWeight: 500,
                            cursor: loading ? 'not-allowed' : 'pointer', marginTop: '8px',
                            opacity: loading ? 0.7 : 1
                        }}
                    >
                        {loading ? 'Signing up...' : 'Sign up'}
                    </button>
                </form>

                <p style={{ marginTop: '24px', textAlign: 'center', fontSize: '14px', color: '#a1a1aa' }}>
                    Already have an account?{" "}
                    <Link to="/login" style={{ color: '#a5b4fc', textDecoration: 'none', fontWeight: 500 }}>
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    );
}

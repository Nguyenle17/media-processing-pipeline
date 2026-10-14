import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import Api from '../api/Api';

type VerificationState = 'pending' | 'verifying' | 'success' | 'error';

export default function VerifyEmail() {
    const [searchParams] = useSearchParams();
    const location = useLocation();
    const navigate = useNavigate();
    const token = searchParams.get('token');
    const email = (location.state as { email?: string } | null)?.email;
    const [status, setStatus] = useState<VerificationState>(token ? 'verifying' : 'pending');
    const [error, setError] = useState('');
    const verifiedRef = useRef(false);

    useEffect(() => {
        if (!token || verifiedRef.current) return;

        verifiedRef.current = true;
        Api.post('/auth/verify-email', { token })
            .then(() => setStatus('success'))
            .catch((requestError: unknown) => {
                setError(requestError instanceof Error ? requestError.message : 'This verification link is invalid or has expired.');
                setStatus('error');
            });
    }, [token]);

    const title = {
        pending: 'Check your inbox',
        verifying: 'Verifying your email...',
        success: 'Email verified',
        error: 'Verification failed',
    }[status];

    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 140px)', background: '#0a0a0f', padding: '32px 16px' }}>
            <div style={{ width: '100%', maxWidth: '460px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '20px', padding: '36px 32px', textAlign: 'center' }}>
                <div style={{ width: '56px', height: '56px', margin: '0 auto 20px', borderRadius: '50%', display: 'grid', placeItems: 'center', background: status === 'success' ? 'rgba(34,197,94,0.14)' : status === 'error' ? 'rgba(239,68,68,0.14)' : 'rgba(99,102,241,0.14)', color: status === 'success' ? '#4ade80' : status === 'error' ? '#f87171' : '#a5b4fc', fontSize: '26px' }}>
                    {status === 'verifying' ? '…' : status === 'success' ? '✓' : status === 'error' ? '!' : '✉'}
                </div>

                <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#fff', marginBottom: '10px' }}>{title}</h2>

                {status === 'pending' && (
                    <>
                        <p style={{ fontSize: '14px', lineHeight: 1.6, color: '#a1a1aa', margin: 0 }}>
                            We sent a verification link to {email ? <strong style={{ color: '#e4e4e7' }}>{email}</strong> : 'your email address'}.
                            Open the link to activate your account.
                        </p>
                        <p style={{ fontSize: '12px', lineHeight: 1.5, color: '#71717a', marginTop: '16px' }}>
                            Didn’t receive it? Check your spam folder. The link is valid for 15 minutes.
                        </p>
                    </>
                )}

                {status === 'verifying' && <p style={{ fontSize: '14px', color: '#a1a1aa' }}>Please wait while we confirm your email address.</p>}

                {status === 'success' && (
                    <>
                        <p style={{ fontSize: '14px', lineHeight: 1.6, color: '#a1a1aa' }}>Your account is ready. You can now sign in.</p>
                        <button onClick={() => navigate('/login')} style={{ width: '100%', marginTop: '20px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: '8px', padding: '12px', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}>
                            Continue to login
                        </button>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <p style={{ fontSize: '14px', lineHeight: 1.6, color: '#fca5a5' }}>{error}</p>
                        <p style={{ fontSize: '12px', color: '#71717a', marginTop: '16px' }}>Please register again to receive a new verification link.</p>
                    </>
                )}

                {status !== 'success' && (
                    <p style={{ marginTop: '24px', fontSize: '14px', color: '#a1a1aa' }}>
                        <Link to="/login" style={{ color: '#a5b4fc', textDecoration: 'none', fontWeight: 500 }}>Back to sign in</Link>
                    </p>
                )}
            </div>
        </div>
    );
}

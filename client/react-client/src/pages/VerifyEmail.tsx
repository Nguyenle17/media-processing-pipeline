import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Loader2, MailCheck } from 'lucide-react';
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
        verifying: 'Verifying your email…',
        success: 'Email verified',
        error: 'Verification failed',
    }[status];

    return (
        <div className="vs-auth-page">
            <div className="vs-auth-card vs-auth-card--wide">
                <div className={`vs-icon-badge ${status === 'success' ? 'vs-icon-badge--success' : status === 'error' ? 'vs-icon-badge--danger' : ''}`}>
                    {status === 'verifying' ? <Loader2 size={26} className="spin" /> : status === 'success' ? <CheckCircle2 size={26} /> : status === 'error' ? <AlertCircle size={26} /> : <MailCheck size={26} />}
                </div>

                <h1 className="vs-auth-title">{title}</h1>

                {status === 'pending' && (
                    <>
                        <p className="vs-auth-desc">
                            We sent a verification link to {email ? <strong style={{ color: 'var(--vs-text)' }}>{email}</strong> : 'your email address'}.
                            Open the link to activate your account.
                        </p>
                        <p className="vs-hint" style={{ marginTop: 16 }}>
                            Didn't receive it? Check your spam folder. The link is valid for 15 minutes.
                        </p>
                    </>
                )}

                {status === 'verifying' && <p className="vs-auth-desc">Please wait while we confirm your email address.</p>}

                {status === 'success' && (
                    <>
                        <p className="vs-auth-desc" style={{ marginBottom: 20 }}>Your account is ready. You can now sign in.</p>
                        <button onClick={() => navigate('/login')} className="vs-btn vs-btn--primary vs-btn--lg vs-btn--block">
                            Continue to sign in
                        </button>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <p className="vs-text-danger" style={{ fontSize: 14, lineHeight: 1.6 }} role="alert">{error}</p>
                        <p className="vs-hint" style={{ marginTop: 16 }}>Please register again to receive a new verification link.</p>
                    </>
                )}

                {status !== 'success' && (
                    <p className="vs-auth-footer">
                        <Link to="/login">Back to sign in</Link>
                    </p>
                )}
            </div>
        </div>
    );
}

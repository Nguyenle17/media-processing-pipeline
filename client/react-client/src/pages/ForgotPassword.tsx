import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import Api from '../api/Api';

// Update these two paths if the backend uses different endpoint names.
const REQUEST_RESET_ENDPOINT = '/auth/forgot-password';
const RESET_PASSWORD_ENDPOINT = '/auth/reset-password';

type Step = 'request' | 'reset' | 'success';

const cardStyle = {
    width: '100%',
    maxWidth: '420px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: '20px',
    padding: '32px',
};

const inputStyle = {
    width: '100%',
    boxSizing: 'border-box' as const,
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '12px',
    padding: '10px 14px',
    fontSize: '14px',
    color: '#fff',
    outline: 'none',
};

export default function ForgotPassword() {
    const [step, setStep] = useState<Step>('request');
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');

    const getErrorMessage = (requestError: unknown, fallback: string) =>
        requestError instanceof Error ? requestError.message : fallback;

    const requestCode = async (event: FormEvent) => {
        event.preventDefault();
        setError('');
        setNotice('');
        setLoading(true);

        try {
            await Api.post(REQUEST_RESET_ENDPOINT, { email });
            setStep('reset');
            setNotice('We sent a password reset code to your email.');
        } catch (requestError) {
            setError(getErrorMessage(requestError, 'Unable to send the reset code. Please try again.'));
        } finally {
            setLoading(false);
        }
    };

    const resetPassword = async (event: FormEvent) => {
        event.preventDefault();
        setError('');
        setNotice('');

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setLoading(true);
        try {
            await Api.post(RESET_PASSWORD_ENDPOINT, {
                email,
                code,
                newPassword: password,
            });
            setStep('success');
        } catch (requestError) {
            setError(getErrorMessage(requestError, 'Unable to reset your password. Please check the code and try again.'));
        } finally {
            setLoading(false);
        }
    };

    const resendCode = async () => {
        setError('');
        setNotice('');
        setLoading(true);
        try {
            await Api.post(REQUEST_RESET_ENDPOINT, { email });
            setNotice('A new reset code has been sent to your email.');
        } catch (requestError) {
            setError(getErrorMessage(requestError, 'Unable to resend the reset code. Please try again.'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 140px)', background: '#0a0a0f', padding: '32px 16px' }}>
            <div style={cardStyle}>
                {step === 'request' && (
                    <>
                        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                            <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#fff', marginBottom: '8px' }}>Forgot password?</h2>
                            <p style={{ fontSize: '14px', lineHeight: 1.5, color: '#a1a1aa', margin: 0 }}>Enter your email and we’ll send you a reset code.</p>
                        </div>
                        <form onSubmit={requestCode} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <label style={{ fontSize: '12px', fontWeight: 500, color: '#71717a', fontFamily: "'JetBrains Mono', monospace" }}>
                                Email
                                <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required style={{ ...inputStyle, marginTop: '6px' }} />
                            </label>
                            {error && <ErrorMessage>{error}</ErrorMessage>}
                            <SubmitButton loading={loading}>{loading ? 'Sending...' : 'Send reset code'}</SubmitButton>
                        </form>
                    </>
                )}

                {step === 'reset' && (
                    <>
                        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                            <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#fff', marginBottom: '8px' }}>Reset your password</h2>
                            <p style={{ fontSize: '14px', lineHeight: 1.5, color: '#a1a1aa', margin: 0 }}>Enter the code sent to <strong style={{ color: '#e4e4e7' }}>{email}</strong>, then choose a new password.</p>
                        </div>
                        <form onSubmit={resetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <label style={{ fontSize: '12px', fontWeight: 500, color: '#71717a', fontFamily: "'JetBrains Mono', monospace" }}>
                                Reset code
                                <input type="text" value={code} onChange={(event) => setCode(event.target.value)} placeholder="Enter your code" autoComplete="one-time-code" required style={{ ...inputStyle, marginTop: '6px', letterSpacing: '2px' }} />
                            </label>
                            <label style={{ fontSize: '12px', fontWeight: 500, color: '#71717a', fontFamily: "'JetBrains Mono', monospace" }}>
                                New password
                                <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required style={{ ...inputStyle, marginTop: '6px' }} />
                            </label>
                            <label style={{ fontSize: '12px', fontWeight: 500, color: '#71717a', fontFamily: "'JetBrains Mono', monospace" }}>
                                Confirm password
                                <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required style={{ ...inputStyle, marginTop: '6px' }} />
                            </label>
                            {notice && <NoticeMessage>{notice}</NoticeMessage>}
                            {error && <ErrorMessage>{error}</ErrorMessage>}
                            <SubmitButton loading={loading}>{loading ? 'Updating...' : 'Update password'}</SubmitButton>
                        </form>
                        <button type="button" onClick={resendCode} disabled={loading} style={{ display: 'block', margin: '18px auto 0', background: 'none', border: 'none', color: '#a5b4fc', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '13px' }}>
                            Resend code
                        </button>
                    </>
                )}

                {step === 'success' && (
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ width: '56px', height: '56px', margin: '0 auto 20px', borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'rgba(34,197,94,0.14)', color: '#4ade80', fontSize: '26px' }}>✓</div>
                        <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#fff', marginBottom: '10px' }}>Password updated</h2>
                        <p style={{ fontSize: '14px', lineHeight: 1.5, color: '#a1a1aa' }}>Your password has been changed successfully.</p>
                    </div>
                )}

                <p style={{ marginTop: '24px', textAlign: 'center', fontSize: '14px', color: '#a1a1aa' }}>
                    <Link to="/login" style={{ color: '#a5b4fc', textDecoration: 'none', fontWeight: 500 }}>Back to sign in</Link>
                </p>
            </div>
        </div>
    );
}

function ErrorMessage({ children }: { children: string }) {
    return <div style={{ color: '#ef4444', fontSize: '12px', textAlign: 'center', background: 'rgba(239,68,68,0.1)', padding: '8px', borderRadius: '8px' }}>{children}</div>;
}

function NoticeMessage({ children }: { children: string }) {
    return <div style={{ color: '#86efac', fontSize: '12px', textAlign: 'center', background: 'rgba(34,197,94,0.1)', padding: '8px', borderRadius: '8px' }}>{children}</div>;
}

function SubmitButton({ children, loading }: { children: string; loading: boolean }) {
    return <button type="submit" disabled={loading} style={{ width: '100%', background: '#6366f1', color: '#fff', border: 'none', borderRadius: '6px', padding: '12px', fontSize: '14px', fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>{children}</button>;
}

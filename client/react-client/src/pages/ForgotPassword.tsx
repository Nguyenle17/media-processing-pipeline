import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import Api from '../api/Api';

// Update these two paths if the backend uses different endpoint names.
const REQUEST_RESET_ENDPOINT = '/auth/forgot-password';
const RESET_PASSWORD_ENDPOINT = '/auth/reset-password';

type Step = 'request' | 'reset' | 'success';

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
        <div className="vs-auth-page">
            <div className="vs-auth-card">
                {step === 'request' && (
                    <>
                        <div className="vs-auth-head">
                            <h1 className="vs-auth-title">Forgot password?</h1>
                            <p className="vs-auth-desc">Enter your email and we'll send you a reset code.</p>
                        </div>
                        <form onSubmit={requestCode} className="vs-stack" style={{ gap: 14 }}>
                            <div className="vs-field">
                                <label className="vs-label" htmlFor="reset-email">Email</label>
                                <input
                                    id="reset-email"
                                    type="email"
                                    value={email}
                                    onChange={(event) => setEmail(event.target.value)}
                                    placeholder="you@example.com"
                                    autoComplete="email"
                                    className="vs-input"
                                    required
                                />
                            </div>
                            {error && <ErrorMessage>{error}</ErrorMessage>}
                            <SubmitButton loading={loading}>{loading ? 'Sending…' : 'Send reset code'}</SubmitButton>
                        </form>
                    </>
                )}

                {step === 'reset' && (
                    <>
                        <div className="vs-auth-head">
                            <h1 className="vs-auth-title">Reset your password</h1>
                            <p className="vs-auth-desc">
                                Enter the code sent to <strong style={{ color: 'var(--vs-text)' }}>{email}</strong>, then choose a new password.
                            </p>
                        </div>
                        <form onSubmit={resetPassword} className="vs-stack" style={{ gap: 14 }}>
                            <div className="vs-field">
                                <label className="vs-label" htmlFor="reset-code">Reset code</label>
                                <input
                                    id="reset-code"
                                    type="text"
                                    value={code}
                                    onChange={(event) => setCode(event.target.value)}
                                    placeholder="Enter your code"
                                    autoComplete="one-time-code"
                                    className="vs-input"
                                    style={{ letterSpacing: '2px' }}
                                    required
                                />
                            </div>
                            <div className="vs-field">
                                <label className="vs-label" htmlFor="new-password">New password</label>
                                <input
                                    id="new-password"
                                    type="password"
                                    value={password}
                                    onChange={(event) => setPassword(event.target.value)}
                                    autoComplete="new-password"
                                    className="vs-input"
                                    required
                                />
                            </div>
                            <div className="vs-field">
                                <label className="vs-label" htmlFor="confirm-new-password">Confirm password</label>
                                <input
                                    id="confirm-new-password"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(event) => setConfirmPassword(event.target.value)}
                                    autoComplete="new-password"
                                    className="vs-input"
                                    required
                                />
                            </div>
                            {notice && <NoticeMessage>{notice}</NoticeMessage>}
                            {error && <ErrorMessage>{error}</ErrorMessage>}
                            <SubmitButton loading={loading}>{loading ? 'Updating…' : 'Update password'}</SubmitButton>
                        </form>
                        <div style={{ marginTop: 14, textAlign: 'center' }}>
                            <button type="button" onClick={resendCode} disabled={loading} className="vs-btn vs-btn--ghost vs-btn--sm">
                                Resend code
                            </button>
                        </div>
                    </>
                )}

                {step === 'success' && (
                    <div style={{ textAlign: 'center' }}>
                        <div className="vs-icon-badge vs-icon-badge--success"><CheckCircle2 size={26} /></div>
                        <h1 className="vs-auth-title">Password updated</h1>
                        <p className="vs-auth-desc" style={{ marginBottom: 20 }}>Your password has been changed successfully.</p>
                        <Link to="/login" className="vs-btn vs-btn--primary vs-btn--lg vs-btn--block">Continue to sign in</Link>
                    </div>
                )}

                <p className="vs-auth-footer">
                    <Link to="/login">Back to sign in</Link>
                </p>
            </div>
        </div>
    );
}

function ErrorMessage({ children }: { children: string }) {
    return (
        <div className="vs-form-error" role="alert">
            <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{children}</span>
        </div>
    );
}

function NoticeMessage({ children }: { children: string }) {
    return <div className="vs-form-notice" role="status">{children}</div>;
}

function SubmitButton({ children, loading }: { children: string; loading: boolean }) {
    return <button type="submit" disabled={loading} className="vs-submit-btn">{children}</button>;
}

import React, { useState } from 'react';
import { BookOpen, Sparkles, LogIn, Lock, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';

interface AuthViewProps {
  onLogin: (email: string, password?: string) => Promise<void>;
}

export const AuthView: React.FC<AuthViewProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Forgot Password State
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [forgotError, setForgotError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      await onLogin(email, password);
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (demoEmail: string) => {
    setErrorMsg('');
    setLoading(true);
    try {
      await onLogin(demoEmail, 'password123');
    } catch (err: any) {
      setErrorMsg(err.message || 'Quick login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess('');
    setForgotLoading(true);

    try {
      const res = await api.auth.forgotPassword(forgotEmail.trim());
      setForgotSuccess(
        res.message ||
          'If an account exists with this email address, a password reset link has been dispatched.'
      );
    } catch (err: any) {
      setForgotError(err.message || 'Failed to request password reset.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="auth-page-container">
      <div className="auth-card">
        {/* Brand Header */}
        <div className="auth-brand">
          <div className="auth-logo-badge">
            <BookOpen size={28} color="#ffffff" />
          </div>
          <h1 className="auth-brand-title">Knowvia</h1>
          <p className="auth-brand-subtitle">
            Progressive Knowledge Repository & Learning Management Platform
          </p>
        </div>

        {isForgotPassword ? (
          /* ─── FORGOT PASSWORD VIEW ───────────────────────── */
          <div>
            <div style={{ marginBottom: '18px' }}>
              <button
                type="button"
                className="btn-secondary"
                style={{ padding: '6px 12px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                onClick={() => {
                  setIsForgotPassword(false);
                  setForgotError('');
                  setForgotSuccess('');
                }}
              >
                <ArrowLeft size={14} />
                <span>Back to Sign In</span>
              </button>
            </div>

            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
              Reset Your Password
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '18px' }}>
              Enter your registered email address and we will send you a secure link to reset your password.
            </p>

            {forgotError && <div className="auth-error-banner">{forgotError}</div>}
            {forgotSuccess && (
              <div
                style={{
                  background: 'var(--success-light)',
                  border: '1px solid var(--success-border)',
                  color: '#15803d',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '13px',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                }}
              >
                <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{forgotSuccess}</span>
              </div>
            )}

            {!forgotSuccess ? (
              <form onSubmit={handleForgotPasswordSubmit} className="auth-form">
                <div className="form-field">
                  <label className="field-label">Email Address *</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="email"
                      required
                      placeholder="name@organization.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="input-clean"
                      style={{ paddingLeft: '36px' }}
                    />
                    <Mail
                      size={16}
                      style={{
                        position: 'absolute',
                        left: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--text-faint)',
                      }}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn-primary btn-full mt-3"
                  disabled={forgotLoading || !forgotEmail.trim()}
                >
                  {forgotLoading ? 'Sending Reset Instructions...' : 'Send Password Reset Link'}
                </button>
              </form>
            ) : (
              <button
                type="button"
                className="btn-primary btn-full mt-3"
                onClick={() => {
                  setIsForgotPassword(false);
                  setForgotSuccess('');
                }}
              >
                Return to Sign In
              </button>
            )}
          </div>
        ) : (
          /* ─── NORMAL SIGN IN VIEW ────────────────────────── */
          <>
            {/* Quick Demo Personas Box */}
            <div className="quick-demo-section">
              <div className="quick-demo-header">
                <Sparkles size={14} color="#4f46e5" />
                <span>Quick-Login Demo Accounts:</span>
              </div>
              <div className="demo-pills-container">
                <button
                  type="button"
                  className="demo-pill-btn"
                  onClick={() => handleQuickLogin('david.cyber@knowvia.internal')}
                >
                  <span className="demo-pill-dot intern-dot"></span>
                  <span>David (Student)</span>
                </button>

                <button
                  type="button"
                  className="demo-pill-btn"
                  onClick={() => handleQuickLogin('cyber.tutor@knowvia.internal')}
                >
                  <span className="demo-pill-dot tutor-dot"></span>
                  <span>Alex (Tutor)</span>
                </button>

                <button
                  type="button"
                  className="demo-pill-btn"
                  onClick={() => handleQuickLogin('admin@knowvia.internal')}
                >
                  <span className="demo-pill-dot admin-dot"></span>
                  <span>Sarah (Admin)</span>
                </button>
              </div>
            </div>

            <div style={{ marginBottom: '16px', textAlign: 'center' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: 'var(--text-secondary)',
                  fontWeight: 600,
                  fontSize: '14px',
                }}
              >
                <LogIn size={16} color="var(--primary)" />
                <span>Sign In with Your Credentials</span>
              </div>
            </div>

            {errorMsg && <div className="auth-error-banner">{errorMsg}</div>}

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-field">
                <label className="field-label">Email Address *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="email"
                    required
                    placeholder="name@knowvia.internal"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-clean"
                    style={{ paddingLeft: '36px' }}
                  />
                  <Mail
                    size={16}
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--text-faint)',
                    }}
                  />
                </div>
              </div>

              <div className="form-field">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="field-label">Password *</label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(true);
                      setForgotEmail(email);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--primary)',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    Forgot Password?
                  </button>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-clean"
                    style={{ paddingLeft: '36px' }}
                  />
                  <Lock
                    size={16}
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--text-faint)',
                    }}
                  />
                </div>
              </div>

              <button type="submit" className="btn-primary btn-full mt-3" disabled={loading}>
                {loading ? 'Authenticating...' : 'Sign In to Knowvia'}
              </button>
            </form>

            <div
              style={{
                marginTop: '20px',
                padding: '12px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border-subtle)',
                fontSize: '11px',
                color: 'var(--text-muted)',
                lineHeight: 1.5,
                textAlign: 'center',
              }}
            >
              <strong>Notice:</strong> Account creation is controlled by Knowvia Administrators. If you are a new tutor or intern, an invitation link will be sent to your email to set up your password.
            </div>
          </>
        )}
      </div>
    </div>
  );
};

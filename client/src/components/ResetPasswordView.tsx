import React, { useState } from 'react';
import { BookOpen, Lock, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { api } from '../services/api';

interface ResetPasswordViewProps {
  onNavigateToLogin: () => void;
}

export const ResetPasswordView: React.FC<ResetPasswordViewProps> = ({ onNavigateToLogin }) => {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  if (!token) {
    return (
      <div className="auth-page-container">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <div style={{ color: 'var(--danger)', marginBottom: '16px' }}>
            <AlertCircle size={40} style={{ margin: '0 auto' }} />
          </div>
          <h2>Invalid Password Reset Request</h2>
          <p style={{ color: 'var(--text-secondary)', margin: '12px 0 24px' }}>
            No password reset token was found in the URL. Please use the reset link from your email.
          </p>
          <button type="button" className="btn-primary btn-full" onClick={onNavigateToLogin}>
            Go to Sign In
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await api.auth.resetPassword(token, password);
      setIsSuccess(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to reset password. The link may have expired or already been used.');
    } finally {
      setLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="auth-page-container">
        <div className="auth-card" style={{ textAlign: 'center', padding: '40px 32px' }}>
          <div style={{ color: 'var(--success)', marginBottom: '16px' }}>
            <CheckCircle2 size={48} style={{ margin: '0 auto' }} />
          </div>
          <h2>Password Reset Complete</h2>
          <p style={{ color: 'var(--text-secondary)', margin: '12px 0 24px' }}>
            Your account password has been updated. You can now log in using your email and new password.
          </p>
          <button type="button" className="btn-primary btn-full" onClick={onNavigateToLogin}>
            <span>Sign In to Knowvia</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page-container">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="auth-logo-badge">
            <BookOpen size={28} color="#ffffff" />
          </div>
          <h1 className="auth-brand-title">Reset Password</h1>
          <p className="auth-brand-subtitle">Enter and confirm your new Knowvia password</p>
        </div>

        {errorMsg && <div className="auth-error-banner">{errorMsg}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-field">
            <label className="field-label">New Password *</label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                required
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-clean"
                style={{ paddingLeft: '36px' }}
                autoComplete="new-password"
              />
              <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }} />
            </div>
          </div>

          <div className="form-field">
            <label className="field-label">Confirm New Password *</label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                required
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-clean"
                style={{ paddingLeft: '36px' }}
                autoComplete="new-password"
              />
              <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }} />
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary btn-full mt-3"
            disabled={loading || password.length < 8 || password !== confirmPassword}
          >
            {loading ? 'Updating Password...' : 'Save New Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

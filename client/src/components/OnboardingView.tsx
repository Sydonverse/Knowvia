import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  ShieldCheck,
  GraduationCap,
  CheckCircle2,
  AlertCircle,
  Lock,
  ArrowRight,
  Sparkles,
  Building,
  Mail,
  UserCheck,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../services/api';

interface OnboardingUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'ADMIN' | 'TUTOR' | 'INTERN';
  department?: {
    id: string;
    name: string;
    slug: string;
    colorHex: string;
    icon: string;
  } | null;
}

interface OnboardingViewProps {
  onNavigateToLogin: () => void;
}

export const OnboardingView: React.FC<OnboardingViewProps> = ({ onNavigateToLogin }) => {
  const [token, setToken] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(true);
  const [errorStatus, setErrorStatus] = useState<{
    type: 'invalid' | 'expired' | 'used' | 'general';
    message: string;
  } | null>(null);
  const [onboardingUser, setOnboardingUser] = useState<OnboardingUser | null>(null);

  // Form State
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  // 1. Extract and verify token on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const queryToken = params.get('token');

    if (!queryToken || queryToken.trim().length === 0) {
      setErrorStatus({
        type: 'invalid',
        message: 'No onboarding token provided in the URL. Please use the link sent to your email.',
      });
      setVerifying(false);
      return;
    }

    setToken(queryToken);

    api.auth
      .verifyOnboarding(queryToken)
      .then((res) => {
        if (res.valid && res.user) {
          setOnboardingUser(res.user);
        } else {
          setErrorStatus({
            type: 'invalid',
            message: 'Unable to verify this onboarding invitation.',
          });
        }
      })
      .catch((err: any) => {
        const msg = err.message || '';
        if (msg.includes('expired')) {
          setErrorStatus({
            type: 'expired',
            message: 'This onboarding invitation link has expired (valid for 24 hours). Please request a new invitation from your administrator.',
          });
        } else if (msg.includes('already been used') || msg.includes('alreadyUsed')) {
          setErrorStatus({
            type: 'used',
            message: 'This invitation has already been used to activate an account. Please sign in with your email and password.',
          });
        } else {
          setErrorStatus({
            type: 'invalid',
            message: msg || 'Invalid or unrecognized onboarding token.',
          });
        }
      })
      .finally(() => {
        setVerifying(false);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!token) return;

    if (password.length < 8) {
      setFormError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Passwords do not match. Please re-enter carefully.');
      return;
    }

    setSubmitting(true);
    try {
      await api.auth.completeOnboarding(token, password);
      setIsSuccess(true);
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch (err: any) {
      setFormError(err.message || 'Failed to complete onboarding. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Loading State
  if (verifying) {
    return (
      <div className="auth-page-container">
        <div className="auth-card" style={{ textAlign: 'center', padding: '48px 32px' }}>
          <div className="spinner-clean" style={{ margin: '0 auto 20px' }}></div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Verifying Your Invitation...
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Connecting to Knowvia secure authentication service
          </p>
        </div>
      </div>
    );
  }

  // Error State (Invalid, Expired, Already Used)
  if (errorStatus) {
    return (
      <div className="auth-page-container">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: 'var(--radius-full)',
              background: errorStatus.type === 'used' ? 'var(--primary-light)' : 'var(--danger-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              color: errorStatus.type === 'used' ? 'var(--primary)' : 'var(--danger)',
            }}
          >
            {errorStatus.type === 'used' ? <UserCheck size={28} /> : <AlertCircle size={28} />}
          </div>

          <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
            {errorStatus.type === 'used'
              ? 'Account Already Activated'
              : errorStatus.type === 'expired'
              ? 'Invitation Link Expired'
              : 'Invalid Invitation Link'}
          </h2>

          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '24px' }}>
            {errorStatus.message}
          </p>

          <button
            type="button"
            className="btn-primary btn-full"
            onClick={onNavigateToLogin}
          >
            Go to Knowvia Sign In
          </button>
        </div>
      </div>
    );
  }

  // Success State
  if (isSuccess) {
    return (
      <div className="auth-page-container">
        <div className="auth-card" style={{ textAlign: 'center', padding: '40px 32px' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--success-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              color: 'var(--success)',
            }}
          >
            <CheckCircle2 size={36} />
          </div>

          <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
            Account Activated!
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '28px' }}>
            Your password has been securely established. You can now log into Knowvia anytime using your email address and new password.
          </p>

          <button
            type="button"
            className="btn-primary btn-full"
            onClick={onNavigateToLogin}
          >
            <span>Proceed to Sign In</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  const roleLabel =
    onboardingUser?.role === 'ADMIN'
      ? 'Administrator'
      : onboardingUser?.role === 'TUTOR'
      ? 'Department Tutor'
      : 'Intern / Student';

  return (
    <div className="auth-page-container">
      <div className="auth-card">
        {/* Brand Header */}
        <div className="auth-brand">
          <div className="auth-logo-badge">
            <BookOpen size={28} color="#ffffff" />
          </div>
          <h1 className="auth-brand-title">Knowvia Onboarding</h1>
          <p className="auth-brand-subtitle">
            Complete your account setup and create your secure password
          </p>
        </div>

        {/* Assigned Profile Overview Card (Read-Only) */}
        <div
          style={{
            background: 'var(--bg-subtle)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '16px',
            marginBottom: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
            <Sparkles size={14} color="var(--primary)" />
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase' }}>
              Administrator-Assigned Workspace Profile
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div style={{ background: '#ffffff', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>NAME</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {onboardingUser?.firstName} {onboardingUser?.lastName}
              </div>
            </div>

            <div style={{ background: '#ffffff', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>ASSIGNED ROLE</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                {onboardingUser?.role === 'TUTOR' ? <ShieldCheck size={14} /> : <GraduationCap size={14} />}
                <span>{roleLabel}</span>
              </div>
            </div>
          </div>

          <div style={{ background: '#ffffff', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', marginTop: '8px' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>DEPARTMENT WORKSPACE</div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
              <Building size={14} color={onboardingUser?.department?.colorHex || '#4f46e5'} />
              <span>{onboardingUser?.department?.name || 'General'}</span>
            </div>
          </div>

          <div style={{ background: '#ffffff', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', marginTop: '8px' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>REGISTERED EMAIL</div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
              <Mail size={14} />
              <span>{onboardingUser?.email}</span>
            </div>
          </div>
        </div>

        {formError && <div className="auth-error-banner">{formError}</div>}

        {/* Password Creation Form */}
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-field">
            <label className="field-label">Create Password *</label>
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
            <label className="field-label">Confirm Password *</label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                required
                placeholder="Re-enter your chosen password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-clean"
                style={{ paddingLeft: '36px' }}
                autoComplete="new-password"
              />
              <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }} />
            </div>
            {password && confirmPassword && password !== confirmPassword && (
              <span style={{ fontSize: '11px', color: 'var(--danger)', marginTop: '4px' }}>
                Passwords do not match
              </span>
            )}
          </div>

          <button
            type="submit"
            className="btn-primary btn-full mt-3"
            disabled={submitting || password.length < 8 || password !== confirmPassword}
          >
            {submitting ? 'Activating Account...' : 'Set Password & Activate Account'}
          </button>
        </form>

        <div className="auth-footer-note">
          <span>
            This invitation link is valid for one-time activation. Role and department are pre-assigned by your administrator and protected against modification.
          </span>
        </div>
      </div>
    </div>
  );
};

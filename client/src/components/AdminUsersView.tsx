import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  ShieldCheck,
  GraduationCap,
  Mail,
  Building,
  CheckCircle2,
  Clock,
  RotateCw,
  X,
  AlertCircle,
  Sparkles,
  Search,
} from 'lucide-react';
import { api } from '../services/api';
import { Department } from '../types';

interface AdminUserItem {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'TUTOR' | 'INTERN';
  isActive: boolean;
  createdAt: string;
  avatarUrl?: string | null;
  departments: { id: string; name: string; slug: string; colorHex: string }[];
  onboardingStatus: 'ACTIVE' | 'PENDING' | 'EXPIRED' | 'INACTIVE';
  latestInvitation?: {
    id: string;
    expiresAt: string;
    usedAt: string | null;
    createdAt: string;
  } | null;
}

interface AdminUsersViewProps {
  availableDepartments: Department[];
}

export const AdminUsersView: React.FC<AdminUsersViewProps> = ({ availableDepartments }) => {
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<'ALL' | 'TUTOR' | 'INTERN'>('ALL');

  // Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'TUTOR' | 'INTERN'>('INTERN');
  const [departmentSlug, setDepartmentSlug] = useState(
    availableDepartments[0]?.slug || 'cybersecurity'
  );
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');
  const [modalSuccess, setModalSuccess] = useState('');

  // Resend State
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [resendNotice, setResendNotice] = useState<{ id: string; msg: string; isError?: boolean } | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.admin.listUsers();
      if (res.users) {
        setUsers(res.users);
      }
    } catch (err: any) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');
    setModalSuccess('');
    setModalSubmitting(true);

    try {
      await api.admin.createUser({
        email: email.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        role,
        departmentSlug,
      });

      setModalSuccess(`Invitation successfully sent to ${email.trim()}!`);
      // Reset form
      setFirstName('');
      setLastName('');
      setEmail('');
      fetchUsers();

      setTimeout(() => {
        setShowCreateModal(false);
        setModalSuccess('');
      }, 1500);
    } catch (err: any) {
      setModalError(err.message || 'Failed to create user account and send invitation.');
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleResendInvitation = async (userId: string) => {
    setResendingId(userId);
    setResendNotice(null);

    try {
      await api.admin.resendInvitation(userId);
      setResendNotice({ id: userId, msg: 'New invitation link sent!' });
      fetchUsers();
    } catch (err: any) {
      setResendNotice({ id: userId, msg: err.message || 'Resend failed', isError: true });
    } finally {
      setResendingId(null);
    }
  };

  // Filter users
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'ALL' || u.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const activeCount = users.filter((u) => u.isActive).length;
  const pendingCount = users.filter((u) => u.onboardingStatus === 'PENDING').length;

  return (
    <div className="admin-users-view" style={{ padding: '4px 0' }}>
      {/* Header Banner */}
      <div
        className="hero-banner"
        style={{
          borderLeft: '4px solid var(--primary)',
          marginBottom: '24px',
        }}
      >
        <div className="hero-content">
          <div className="hero-badge" style={{ color: 'var(--primary)' }}>
            <ShieldCheck size={14} />
            <span>Administrator Security Portal</span>
          </div>
          <h1 className="hero-title">User Account & Onboarding Directory</h1>
          <p className="hero-subtitle">
            Manage provisioned accounts across all departments. All new tutor and intern accounts are admin-created and onboarded via secure, cryptographically signed email invitations.
          </p>

          <div className="hero-actions">
            <button
              className="btn-primary"
              onClick={() => {
                setShowCreateModal(true);
                setModalError('');
                setModalSuccess('');
              }}
            >
              <UserPlus size={16} />
              <span>Create & Invite User</span>
            </button>
            <button className="btn-secondary" onClick={fetchUsers} disabled={loading}>
              <RotateCw size={15} className={loading ? 'spin' : ''} />
              <span>Refresh Directory</span>
            </button>
          </div>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="progress-metrics-row" style={{ marginBottom: '24px' }}>
        <div className="metric-card">
          <div className="metric-num" style={{ color: 'var(--text-primary)' }}>
            {users.length}
          </div>
          <div className="metric-label">Total Provisioned Users</div>
        </div>
        <div className="metric-card">
          <div className="metric-num" style={{ color: 'var(--success)' }}>
            {activeCount}
          </div>
          <div className="metric-label">Active & Onboarded</div>
        </div>
        <div className="metric-card">
          <div className="metric-num" style={{ color: 'var(--warning)' }}>
            {pendingCount}
          </div>
          <div className="metric-label">Awaiting Onboarding</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '18px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ position: 'relative', flex: '1', minWidth: '240px', maxWidth: '400px' }}>
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-clean"
            style={{ paddingLeft: '36px' }}
          />
          <Search
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

        <div style={{ display: 'flex', gap: '8px' }}>
          {(['ALL', 'TUTOR', 'INTERN'] as const).map((r) => (
            <button
              key={r}
              type="button"
              className={`demo-pill-btn ${filterRole === r ? 'active' : ''}`}
              style={
                filterRole === r
                  ? { background: 'var(--primary)', color: '#ffffff', borderColor: 'var(--primary)' }
                  : {}
              }
              onClick={() => setFilterRole(r)}
            >
              {r === 'ALL' ? 'All Roles' : r === 'TUTOR' ? 'Tutors' : 'Interns'}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-xs)',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr
                style={{
                  background: 'var(--bg-subtle)',
                  borderBottom: '1px solid var(--border-subtle)',
                  color: 'var(--text-muted)',
                  fontWeight: 600,
                }}
              >
                <th style={{ padding: '12px 16px' }}>User</th>
                <th style={{ padding: '12px 16px' }}>Role</th>
                <th style={{ padding: '12px 16px' }}>Department</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No users matching the filter criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const dept = u.departments[0];
                  return (
                    <tr
                      key={u.id}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        transition: 'background 150ms',
                      }}
                    >
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {u.firstName} {u.lastName}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{u.email}</div>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 8px',
                            borderRadius: 'var(--radius-full)',
                            fontSize: '11px',
                            fontWeight: 600,
                            background:
                              u.role === 'ADMIN'
                                ? 'var(--primary-light)'
                                : u.role === 'TUTOR'
                                ? '#f0fdf4'
                                : 'var(--bg-subtle)',
                            color:
                              u.role === 'ADMIN'
                                ? 'var(--primary)'
                                : u.role === 'TUTOR'
                                ? '#166534'
                                : 'var(--text-secondary)',
                          }}
                        >
                          {u.role === 'ADMIN' ? (
                            <ShieldCheck size={12} />
                          ) : u.role === 'TUTOR' ? (
                            <ShieldCheck size={12} color="#166534" />
                          ) : (
                            <GraduationCap size={12} />
                          )}
                          <span>{u.role}</span>
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        {u.role === 'ADMIN' ? (
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>All Departments</span>
                        ) : dept ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 500 }}>
                            <span
                              style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                background: dept.colorHex || 'var(--primary)',
                              }}
                            />
                            <span>{dept.name}</span>
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-faint)' }}>None</span>
                        )}
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        {u.isActive ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '3px 8px',
                              borderRadius: 'var(--radius-full)',
                              fontSize: '11px',
                              fontWeight: 600,
                              background: 'var(--success-light)',
                              color: 'var(--success)',
                            }}
                          >
                            <CheckCircle2 size={12} />
                            <span>Active</span>
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '3px 8px',
                              borderRadius: 'var(--radius-full)',
                              fontSize: '11px',
                              fontWeight: 600,
                              background: u.onboardingStatus === 'EXPIRED' ? 'var(--danger-light)' : 'var(--warning-light)',
                              color: u.onboardingStatus === 'EXPIRED' ? 'var(--danger)' : '#b45309',
                            }}
                          >
                            <Clock size={12} />
                            <span>{u.onboardingStatus === 'EXPIRED' ? 'Invite Expired' : 'Pending Onboarding'}</span>
                          </span>
                        )}
                      </td>

                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        {!u.isActive && u.role !== 'ADMIN' && (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                            {resendNotice && resendNotice.id === u.id && (
                              <span
                                style={{
                                  fontSize: '11px',
                                  color: resendNotice.isError ? 'var(--danger)' : 'var(--success)',
                                  fontWeight: 600,
                                }}
                              >
                                {resendNotice.msg}
                              </span>
                            )}
                            <button
                              type="button"
                              className="btn-secondary"
                              style={{ padding: '5px 10px', fontSize: '12px' }}
                              disabled={resendingId === u.id}
                              onClick={() => handleResendInvitation(u.id)}
                            >
                              <Mail size={13} />
                              <span>{resendingId === u.id ? 'Sending...' : 'Resend Invite'}</span>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Admin User Creation Modal */}
      {showCreateModal && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserPlus size={18} color="var(--primary)" />
                <h3 className="modal-title">Create New User Account</h3>
              </div>
              <button
                className="modal-close-btn"
                onClick={() => setShowCreateModal(false)}
                type="button"
              >
                <X size={18} />
              </button>
            </div>

            <div
              style={{
                background: 'var(--primary-light)',
                border: '1px solid var(--primary-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 14px',
                marginBottom: '16px',
                fontSize: '12px',
                color: 'var(--primary)',
                lineHeight: 1.5,
              }}
            >
              <strong>Security Protocol:</strong> You do not need to assign a password. The user will receive an invitation email containing a secure 24-hour one-time onboarding link to set their own password.
            </div>

            {modalError && <div className="form-error-banner">{modalError}</div>}
            {modalSuccess && (
              <div
                style={{
                  background: 'var(--success-light)',
                  border: '1px solid var(--success-border)',
                  color: '#15803d',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '13px',
                  marginBottom: '14px',
                }}
              >
                {modalSuccess}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="modal-form">
              <div className="form-grid-2">
                <div className="form-field">
                  <label className="field-label">First Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Jane"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="input-clean"
                  />
                </div>
                <div className="form-field">
                  <label className="field-label">Last Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Doe"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="input-clean"
                  />
                </div>
              </div>

              <div className="form-field">
                <label className="field-label">User Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="name@organization.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-clean"
                />
                <span className="field-help-text">
                  The onboarding invitation link will be sent to this email address.
                </span>
              </div>

              <div className="form-field">
                <label className="field-label">Assigned Role *</label>
                <div className="role-selector-cards">
                  <label
                    className={`role-select-card ${role === 'INTERN' ? 'selected' : ''}`}
                    onClick={() => setRole('INTERN')}
                  >
                    <input
                      type="radio"
                      name="modal-role"
                      value="INTERN"
                      checked={role === 'INTERN'}
                      onChange={() => setRole('INTERN')}
                    />
                    <GraduationCap size={18} color="#10b981" />
                    <div>
                      <strong>Intern / Student</strong>
                      <div className="role-card-desc">Class timetable, materials & assignment submissions</div>
                    </div>
                  </label>

                  <label
                    className={`role-select-card ${role === 'TUTOR' ? 'selected' : ''}`}
                    onClick={() => setRole('TUTOR')}
                  >
                    <input
                      type="radio"
                      name="modal-role"
                      value="TUTOR"
                      checked={role === 'TUTOR'}
                      onChange={() => setRole('TUTOR')}
                    />
                    <ShieldCheck size={18} color="#4f46e5" />
                    <div>
                      <strong>Department Tutor</strong>
                      <div className="role-card-desc">Class scheduler, file uploads & reviews</div>
                    </div>
                  </label>
                </div>
              </div>

              <div className="form-field">
                <label className="field-label">Department Enrollment *</label>
                <select
                  value={departmentSlug}
                  onChange={(e) => setDepartmentSlug(e.target.value)}
                  className="input-clean"
                  required
                >
                  {availableDepartments.map((dept) => (
                    <option key={dept.slug} value={dept.slug}>
                      {dept.name}
                    </option>
                  ))}
                </select>
                <span className="field-help-text">
                  Enforces single-department membership isolation.
                </span>
              </div>

              <div className="modal-actions mt-4">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={modalSubmitting || !firstName.trim() || !lastName.trim() || !email.trim()}
                >
                  {modalSubmitting ? 'Creating & Sending...' : 'Create Account & Send Invite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

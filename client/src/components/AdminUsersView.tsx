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
  Trash2,
} from 'lucide-react';
import { api } from '../services/api';
import { Department } from '../types';
import { UserAvatar } from './UserAvatar';
import { formatDisplayName } from '../utils/avatar';

interface AdminUserItem {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'TUTOR' | 'INTERN';
  isActive: boolean;
  createdAt: string;
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
  currentUserId?: string;
}

export const AdminUsersView: React.FC<AdminUsersViewProps> = ({ availableDepartments, currentUserId }) => {
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

  // Delete / Removal State
  const [targetDeleteUser, setTargetDeleteUser] = useState<AdminUserItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [deleteSuccess, setDeleteSuccess] = useState('');

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

  const handleConfirmDelete = async () => {
    if (!targetDeleteUser) return;
    setIsDeleting(true);
    setDeleteError('');
    setDeleteSuccess('');

    try {
      const res = await api.admin.deleteUser(targetDeleteUser.id);
      setDeleteSuccess(res.message || 'User successfully removed.');
      fetchUsers();
      setTimeout(() => {
        setTargetDeleteUser(null);
        setDeleteSuccess('');
      }, 1200);
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to remove user account.');
    } finally {
      setIsDeleting(false);
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <UserAvatar firstName={u.firstName} lastName={u.lastName} role={u.role} size="sm" />
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                              {formatDisplayName(u.firstName, u.lastName)}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{u.email}</div>
                          </div>
                        </div>
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
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
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
                          {!u.isActive && u.role !== 'ADMIN' && (
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
                          )}
                          {u.id !== currentUserId ? (
                            <button
                              type="button"
                              className="btn-secondary"
                              style={{
                                padding: '5px 10px',
                                fontSize: '12px',
                                color: '#b91c1c',
                                borderColor: '#fecaca',
                                background: '#fef2f2',
                              }}
                              onClick={() => {
                                setTargetDeleteUser(u);
                                setDeleteError('');
                                setDeleteSuccess('');
                              }}
                              title="Remove user from platform"
                            >
                              <Trash2 size={13} />
                              <span>Remove</span>
                            </button>
                          ) : (
                            <span style={{ fontSize: '11px', color: 'var(--text-faint)', fontStyle: 'italic' }}>
                              Current Session
                            </span>
                          )}
                        </div>
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
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget && !modalSubmitting) setShowCreateModal(false);
          }}
        >
          <div className="modal-dialog" style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <div className="modal-title-group">
                <UserPlus size={18} color="var(--primary)" />
                <h3 className="modal-title">Create New User Account</h3>
              </div>
              <button
                className="btn-close-modal"
                onClick={() => setShowCreateModal(false)}
                type="button"
                disabled={modalSubmitting}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateUser}>
              <div className="modal-body">
                <div
                  style={{
                    background: 'var(--primary-light)',
                    border: '1px solid var(--primary-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px 14px',
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
                    }}
                  >
                    {modalSuccess}
                  </div>
                )}

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
              </div>

              <div className="modal-footer">
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
      {/* Delete / Removal Confirmation Modal */}
      {targetDeleteUser && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isDeleting) setTargetDeleteUser(null);
          }}
        >
          <div className="modal-dialog" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <div className="modal-title-group" style={{ color: '#b91c1c' }}>
                <AlertCircle size={20} />
                <h3 className="modal-title" style={{ color: '#b91c1c' }}>
                  Confirm User Removal
                </h3>
              </div>
              <button
                className="btn-close-modal"
                onClick={() => setTargetDeleteUser(null)}
                type="button"
                disabled={isDeleting}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Are you sure you want to remove <strong>{formatDisplayName(targetDeleteUser.firstName, targetDeleteUser.lastName)}</strong>?
              </div>

              <div
                style={{
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 14px',
                  fontSize: '12px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Email:</span>
                  <span style={{ fontWeight: 600 }}>{targetDeleteUser.email}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Role:</span>
                  <span style={{ fontWeight: 600 }}>{targetDeleteUser.role}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Department:</span>
                  <span style={{ fontWeight: 600 }}>{targetDeleteUser.departments[0]?.name || 'General'}</span>
                </div>
              </div>

              <div
                style={{
                  background: '#fffbeb',
                  border: '1px solid #fde68a',
                  color: '#92400e',
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 12px',
                  fontSize: '11px',
                  lineHeight: 1.5,
                }}
              >
                <strong>Security Action:</strong> This user will be immediately deactivated and their sessions revoked. Any pending onboarding links or password reset requests will be canceled. Historical materials and assignments created by this user are preserved for the department.
              </div>

              {deleteError && <div className="form-error-banner">{deleteError}</div>}
              {deleteSuccess && (
                <div
                  style={{
                    background: 'var(--success-light)',
                    border: '1px solid var(--success-border)',
                    color: '#15803d',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '13px',
                  }}
                >
                  {deleteSuccess}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setTargetDeleteUser(null)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                style={{ background: '#dc2626', borderColor: '#dc2626' }}
                disabled={isDeleting}
                onClick={handleConfirmDelete}
              >
                {isDeleting ? 'Removing User...' : 'Yes, Remove User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

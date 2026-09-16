import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  UserPlus,
  GraduationCap,
  ShieldCheck,
  Building,
  Calendar,
  ClipboardCheck,
  BookOpen,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Plus,
  Megaphone,
  ChevronRight,
  Video,
  MapPin,
  FileText,
  Inbox,
  Shield,
  BarChart2,
  Globe,
  Box,
  Palette,
} from 'lucide-react';
import {
  User,
  DepartmentMemberContext,
  AdminOverviewData,
  AdminDepartmentStat,
} from '../types';
import { api } from '../services/api';
import { ActiveTab } from './Sidebar';

interface AdminOverviewViewProps {
  user: User;
  departments: DepartmentMemberContext[];
  onSelectDept: (dept: DepartmentMemberContext) => void;
  onNavigate: (tab: ActiveTab) => void;
  onOpenCreateUser: () => void;
  onOpenCreateAnnouncement?: () => void;
}

// Module-level in-memory cache for instant SWR renders
let cachedOverviewData: AdminOverviewData | null = null;

export const AdminOverviewView: React.FC<AdminOverviewViewProps> = ({
  user,
  departments,
  onSelectDept,
  onNavigate,
  onOpenCreateUser,
  onOpenCreateAnnouncement,
}) => {
  const [data, setData] = useState<AdminOverviewData | null>(cachedOverviewData);
  const [loading, setLoading] = useState<boolean>(!cachedOverviewData);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOverview = useCallback(async (isFresh = false, retryCount = 0) => {
    try {
      if (isFresh) {
        setRefreshing(true);
      } else if (!cachedOverviewData) {
        setLoading(true);
      }
      setError(null);

      const res = await api.admin.getOverview(isFresh);
      cachedOverviewData = res;
      setData(res);
      setError(null);
    } catch (err: any) {
      console.warn('Failed to load admin overview:', err);
      // Auto-retry once after 800ms if initial cold load failed
      if (retryCount < 1 && !cachedOverviewData) {
        setTimeout(() => {
          fetchOverview(isFresh, retryCount + 1);
        }, 800);
        return;
      }
      // Only set blocking error if we have no cached data to display
      if (!cachedOverviewData) {
        setError(err.message || 'Unable to connect to the organization overview service.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview(false);
  }, [fetchOverview]);

  const handleRefresh = () => {
    fetchOverview(true);
  };

  // Time-of-day greeting
  const getGreeting = (name: string) => {
    const hour = new Date().getHours();
    let timeGreeting = 'Good morning';
    if (hour >= 12 && hour < 17) timeGreeting = 'Good afternoon';
    else if (hour >= 17) timeGreeting = 'Good evening';
    return name ? `${timeGreeting}, ${name}` : timeGreeting;
  };

  const formatSessionTime = (startTimeStr: string, endTimeStr: string) => {
    const start = new Date(startTimeStr);
    const end = new Date(endTimeStr);
    const date = start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const time = `${start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} – ${end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    return { date, time };
  };

  const formatTimeAgo = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getDeptIcon = (iconName: string) => {
    switch (iconName) {
      case 'shield':
        return <Shield size={16} />;
      case 'bar-chart-2':
        return <BarChart2 size={16} />;
      case 'globe':
        return <Globe size={16} />;
      case 'box':
        return <Box size={16} />;
      case 'palette':
        return <Palette size={16} />;
      default:
        return <BookOpen size={16} />;
    }
  };

  const handleEnterDepartment = (deptSlug: string) => {
    const targetDept = departments.find((d) => d.slug === deptSlug);
    if (targetDept) {
      onSelectDept(targetDept);
      onNavigate('dashboard');
    }
  };

  if (loading) {
    return (
      <div className="dashboard-content">
        <div className="loading-screen" style={{ minHeight: '400px' }}>
          <div className="spinner-clean"></div>
          <p className="loading-text">Loading Organization Overview...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="dashboard-content">
        <div className="empty-state-box" style={{ padding: '3rem', textAlign: 'center' }}>
          <AlertCircle size={40} color="var(--accent-danger)" />
          <h3 style={{ marginTop: '1rem', color: 'var(--text-primary)' }}>Failed to Load Dashboard</h3>
          <p className="text-muted" style={{ maxWidth: '480px', margin: '0.5rem auto 1.5rem' }}>
            {error || 'Unable to connect to the organization overview service.'}
          </p>
          <button className="btn-primary" onClick={handleRefresh}>
            <RefreshCw size={16} className={refreshing ? 'spin' : ''} />
            <span>Retry Loading</span>
          </button>
        </div>
      </div>
    );
  }

  const { metrics, departments: deptStats, upcomingSessions, attentionItems, recentActivity } = data;

  return (
    <div className="dashboard-content admin-overview-content">
      {/* Compact Organization Hero Greeting */}
      <div className="hero-banner admin-org-hero">
        <div className="hero-content">
          <h1 className="hero-title">{getGreeting(user.firstName || 'Administrator')}</h1>
          <p className="hero-subtitle">
            Here's what's happening across Knowvia today.
          </p>

          <div className="hero-actions admin-quick-actions-row">
            <button className="btn-primary" onClick={onOpenCreateUser}>
              <UserPlus size={16} />
              <span>+ Create User</span>
            </button>
            <button className="btn-secondary" onClick={() => onNavigate('users')}>
              <Users size={16} />
              <span>Manage Users</span>
            </button>
            {onOpenCreateAnnouncement && (
              <button className="btn-secondary" onClick={onOpenCreateAnnouncement}>
                <Megaphone size={16} />
                <span>Broadcast Announcement</span>
              </button>
            )}
            <button
              className="btn-secondary btn-icon-only"
              onClick={handleRefresh}
              title="Refresh Organization Data"
              aria-label="Refresh Data"
            >
              <RefreshCw size={16} className={refreshing ? 'spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* 4 Primary Summary Metric Cards */}
      <div className="stats-grid admin-stats-grid">
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-label">Total Active Users</span>
            <div className="stat-icon-wrapper" style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' }}>
              <Users size={20} />
            </div>
          </div>
          <div className="stat-value">{metrics.totalUsers}</div>
          <div className="stat-footer text-muted">
            {metrics.activeInterns} interns • {metrics.activeTutors} tutors
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-label">Active Interns</span>
            <div className="stat-icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
              <GraduationCap size={20} />
            </div>
          </div>
          <div className="stat-value">{metrics.activeInterns}</div>
          <div className="stat-footer text-muted">
            Enrolled across {metrics.activeDepartments} departments
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-label">Active Tutors</span>
            <div className="stat-icon-wrapper" style={{ background: 'rgba(14, 165, 233, 0.1)', color: '#0ea5e9' }}>
              <ShieldCheck size={20} />
            </div>
          </div>
          <div className="stat-value">{metrics.activeTutors}</div>
          <div className="stat-footer text-muted">
            Managing curriculum & classes
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-label">Active Departments</span>
            <div className="stat-icon-wrapper" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
              <Building size={20} />
            </div>
          </div>
          <div className="stat-value">{metrics.activeDepartments}</div>
          <div className="stat-footer text-muted">
            {metrics.upcomingSessionsCount} sessions • {metrics.activeAssignmentsCount} assignments
          </div>
        </div>
      </div>

      {/* Requires Attention Section */}
      <div className="content-card mb-6">
        <div className="card-header-flex">
          <div>
            <div className="card-pretitle">ADMINISTRATIVE ACTION ITEMS</div>
            <h2 className="card-title">
              <AlertCircle size={19} color="#f59e0b" />
              <span>Requires Attention</span>
            </h2>
          </div>
        </div>

        {attentionItems.length > 0 ? (
          <div className="attention-items-grid">
            {attentionItems.map((item) => (
              <div key={item.id} className="attention-item-card">
                <div className="attention-badge-count">{item.count}</div>
                <div className="attention-content-col">
                  <h4 className="attention-item-title">{item.title}</h4>
                  <p className="attention-item-desc">{item.description}</p>
                </div>
                <button
                  className="btn-secondary btn-sm attention-action-btn"
                  onClick={() => onNavigate(item.actionTab as ActiveTab)}
                >
                  <span>{item.actionText}</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state-box" style={{ padding: '1.5rem', textAlign: 'center' }}>
            <CheckCircle2 size={28} color="#10b981" />
            <h4 style={{ margin: '0.5rem 0 0.25rem', color: 'var(--text-primary)' }}>
              Everything is up to date
            </h4>
            <p className="text-muted" style={{ margin: 0, fontSize: '0.875rem' }}>
              No pending onboarding invitations or unreviewed submissions requiring immediate action right now.
            </p>
          </div>
        )}
      </div>

      {/* Department Overview Section */}
      <div className="content-card mb-6">
        <div className="card-header-flex">
          <div>
            <div className="card-pretitle">ORGANIZATION WORKSPACES</div>
            <h2 className="card-title">
              <Building size={19} color="#6366f1" />
              <span>Department Overview</span>
            </h2>
          </div>
          <span className="text-muted" style={{ fontSize: '0.85rem' }}>
            {deptStats.length} active departments
          </span>
        </div>

        {deptStats.length > 0 ? (
          <div className="table-container dept-overview-table-wrap">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Department</th>
                  <th style={{ textAlign: 'center' }}>Active Interns</th>
                  <th style={{ textAlign: 'center' }}>Tutors</th>
                  <th style={{ textAlign: 'center' }}>Upcoming Sessions</th>
                  <th style={{ textAlign: 'center' }}>Active Assignments</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                  <th style={{ textAlign: 'right' }}>Workspace</th>
                </tr>
              </thead>
              <tbody>
                {deptStats.map((dept: AdminDepartmentStat) => (
                  <tr key={dept.id} className="dept-table-row">
                    <td>
                      <div className="dept-cell-identity">
                        <div
                          className="dept-cell-icon"
                          style={{
                            background: `${dept.colorHex}15`,
                            color: dept.colorHex,
                            borderColor: `${dept.colorHex}30`,
                          }}
                        >
                          {getDeptIcon(dept.icon)}
                        </div>
                        <div>
                          <div className="dept-cell-name">{dept.name}</div>
                          <div className="dept-cell-desc text-muted">{dept.description?.slice(0, 45)}...</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="count-pill intern-pill">{dept.internCount}</span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="count-pill tutor-pill">{dept.tutorCount}</span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="count-pill session-pill">{dept.upcomingSessionsCount}</span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="count-pill assignment-pill">{dept.activeAssignmentsCount}</span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="status-badge-active">
                        <span className="status-online-dot"></span>
                        <span>{dept.status}</span>
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn-secondary btn-sm enter-dept-btn"
                        onClick={() => handleEnterDepartment(dept.slug)}
                        title={`Open ${dept.name} Workspace`}
                      >
                        <span>View Department</span>
                        <ChevronRight size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state-box">
            <Building size={32} className="text-muted" />
            <h4 style={{ marginTop: '0.75rem' }}>No Departments Available</h4>
            <p className="text-muted">No active departments were found in the database.</p>
          </div>
        )}
      </div>

      {/* Two Column Layout: Upcoming Sessions (Cross-Dept) & Recent Activity */}
      <div className="dashboard-main-grid">
        {/* Left Column: Upcoming Sessions */}
        <div className="dashboard-col-left">
          <div className="content-card">
            <div className="card-header-flex">
              <div>
                <div className="card-pretitle">CROSS-ORGANIZATION TIMETABLE</div>
                <h2 className="card-title">
                  <Calendar size={19} color="#6366f1" />
                  <span>Upcoming Sessions</span>
                </h2>
              </div>
              <span className="text-muted" style={{ fontSize: '0.85rem' }}>
                {upcomingSessions.length} scheduled
              </span>
            </div>

            {upcomingSessions.length > 0 ? (
              <div className="upcoming-sessions-list">
                {upcomingSessions.map((session) => {
                  const { date, time } = formatSessionTime(session.startTime, session.endTime);
                  return (
                    <div key={session.id} className="admin-session-card">
                      <div className="admin-session-header">
                        <span
                          className="dept-pill-badge"
                          style={{
                            background: `${session.department.colorHex}15`,
                            color: session.department.colorHex,
                            borderColor: `${session.department.colorHex}30`,
                          }}
                        >
                          {session.department.name}
                        </span>
                        <div className="admin-session-time">
                          <Clock size={13} />
                          <span>{date} • {time}</span>
                        </div>
                      </div>

                      <h4 className="admin-session-title">{session.title}</h4>
                      {session.description && (
                        <p className="admin-session-desc text-muted">{session.description}</p>
                      )}

                      <div className="admin-session-footer">
                        <div className="admin-session-location">
                          <MapPin size={13} />
                          <span>{session.location}</span>
                        </div>

                        {session.meetingLink && (
                          <a
                            href={session.meetingLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="meta-pill meeting-link"
                          >
                            <Video size={13} />
                            <span>Meeting Link</span>
                          </a>
                        )}

                        <button
                          className="btn-text-action"
                          onClick={() => handleEnterDepartment(session.department.slug)}
                        >
                          <span>Workspace</span>
                          <ArrowRight size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state-box">
                <Calendar size={32} className="text-muted" />
                <h4 style={{ marginTop: '0.75rem' }}>No Upcoming Sessions</h4>
                <p className="text-muted">There are no classes scheduled across departments right now.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Recent Activity & Onboarding Status */}
        <div className="dashboard-col-right">
          {/* User Onboarding Quick Card */}
          <div className="content-card mb-6">
            <div className="card-header-flex">
              <div>
                <div className="card-pretitle">ONBOARDING OVERVIEW</div>
                <h3 className="card-title">
                  <UserPlus size={18} color="#10b981" />
                  <span>User Provisioning</span>
                </h3>
              </div>
              <button
                className="btn-secondary btn-sm"
                onClick={() => onNavigate('users')}
              >
                <span>Manage Users</span>
                <ArrowRight size={13} />
              </button>
            </div>

            <div className="onboarding-summary-row">
              <div className="onboarding-stat-box">
                <span className="onboarding-stat-num">{metrics.totalUsers}</span>
                <span className="onboarding-stat-lbl">Active Users</span>
              </div>
              <div className="onboarding-stat-box" style={{ borderColor: metrics.pendingOnboardingCount > 0 ? '#f59e0b50' : 'var(--border-subtle)' }}>
                <span className="onboarding-stat-num" style={{ color: metrics.pendingOnboardingCount > 0 ? '#f59e0b' : 'var(--text-primary)' }}>
                  {metrics.pendingOnboardingCount}
                </span>
                <span className="onboarding-stat-lbl">Pending Onboarding</span>
              </div>
            </div>
          </div>

          {/* Recent Real Activity Feed */}
          <div className="content-card">
            <div className="card-header-flex">
              <div>
                <div className="card-pretitle">AUDIT LOG</div>
                <h3 className="card-title">
                  <Clock size={18} color="#6366f1" />
                  <span>Recent Activity</span>
                </h3>
              </div>
            </div>

            {recentActivity.length > 0 ? (
              <div className="activity-feed-list">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="activity-item">
                    <div className="activity-icon-col">
                      <div className="activity-dot"></div>
                    </div>
                    <div className="activity-details-col">
                      <div className="activity-title-row">
                        <span className="activity-actor-name">{activity.title}</span>
                        <span className="activity-time-ago text-muted">
                          {formatTimeAgo(activity.timestamp)}
                        </span>
                      </div>
                      <div className="activity-action-desc text-muted">{activity.detail}</div>
                      {activity.departmentName && (
                        <span
                          className="activity-dept-tag"
                          style={{
                            color: activity.departmentColor,
                            borderColor: `${activity.departmentColor}30`,
                            background: `${activity.departmentColor}10`,
                          }}
                        >
                          {activity.departmentName}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state-box">
                <Inbox size={28} className="text-muted" />
                <h4 style={{ marginTop: '0.5rem' }}>No Recent Activity</h4>
                <p className="text-muted">Activity events will appear here as users interact with the platform.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

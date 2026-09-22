import React, { useState, useRef, useEffect } from 'react';
import {
  Bell,
  Download,
  LogOut,
  Shield,
  BarChart2,
  Globe,
  Box,
  Palette,
  ChevronDown,
  User as _UserIcon,
  BookOpen,
  Building,
  Sun,
  Moon,
} from 'lucide-react';
import { User, DepartmentMemberContext, AppNotification } from '../types';
import { UserAvatar } from './UserAvatar';
import { formatDisplayName } from '../utils/avatar';

interface NavbarProps {
  user: User | null;
  activeDept: DepartmentMemberContext | null;
  departments: DepartmentMemberContext[];
  onSelectDept: (dept: DepartmentMemberContext | null) => void;
  notifications: AppNotification[];
  unreadCount: number;
  onOpenNotifications: () => void;
  onLogout: () => void;
  canInstallPwa: boolean;
  onInstallPwa: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  activeDept,
  departments,
  onSelectDept,
  unreadCount,
  onOpenNotifications,
  onLogout,
  canInstallPwa,
  onInstallPwa,
  theme,
  onToggleTheme,
}) => {
  const [showDeptMenu, setShowDeptMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const deptMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (deptMenuRef.current && !deptMenuRef.current.contains(event.target as Node)) {
        setShowDeptMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

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

  const roleBadgeClass =
    user?.role === 'ADMIN'
      ? 'badge-role-admin'
      : user?.role === 'TUTOR'
      ? 'badge-role-tutor'
      : 'badge-role-intern';

  return (
    <header className="navbar-container">
      <div className="navbar-left">
        {/* Knowvia Brand Logo */}
        <div className="brand-logo-group">
          <div className="logo-badge" style={{ background: activeDept?.colorHex || '#4f46e5' }}>
            <BookOpen size={20} color="#ffffff" />
          </div>
          <div>
            <div className="brand-title">Knowvia</div>
            <div className="brand-subtitle">Knowledge Repository & Learning Hub</div>
          </div>
        </div>

        {/* Organization Overview / Department Switcher */}
        {user?.role === 'ADMIN' ? (
          <div className="dept-switcher-dropdown admin-dept-switcher" ref={deptMenuRef}>
            <button
              className="dept-pill-btn"
              onClick={() => setShowDeptMenu(!showDeptMenu)}
              style={{
                borderColor: activeDept ? `${activeDept.colorHex}40` : '#6366f140',
                background: activeDept ? `${activeDept.colorHex}10` : '#6366f110',
                cursor: 'pointer',
              }}
              title={
                activeDept
                  ? `Department: ${activeDept.name} – Click to switch or return to Organization Overview`
                  : 'Organization Overview – Click to select a department workspace'
              }
              aria-label="Switch department workspace"
            >
              {activeDept ? (
                <span style={{ color: activeDept.colorHex }}>{getDeptIcon(activeDept.icon)}</span>
              ) : (
                <Building size={16} color="#6366f1" />
              )}
              <span className="dept-name-text">
                {activeDept ? activeDept.name : 'Organization Overview'}
              </span>
              <ChevronDown size={14} className="text-muted" />
            </button>

            {showDeptMenu && (
              <div className="dropdown-menu">
                <div className="dropdown-header">ADMINISTRATION SCOPE</div>
                <button
                  className={`dropdown-item ${!activeDept ? 'active' : ''}`}
                  onClick={() => {
                    onSelectDept(null);
                    setShowDeptMenu(false);
                  }}
                >
                  <Building size={16} color="#6366f1" />
                  <div style={{ textAlign: 'left' }}>
                    <div className="dropdown-item-title">Organization Overview</div>
                    <div className="dropdown-item-desc">Platform-wide statistics & command center</div>
                  </div>
                </button>

                <div className="dropdown-divider"></div>
                <div className="dropdown-header">DEPARTMENT WORKSPACES</div>
                {departments.map((dept) => (
                  <button
                    key={dept.id}
                    className={`dropdown-item ${activeDept && dept.id === activeDept.id ? 'active' : ''}`}
                    onClick={() => {
                      onSelectDept(dept);
                      setShowDeptMenu(false);
                    }}
                  >
                    <span style={{ color: dept.colorHex }}>{getDeptIcon(dept.icon)}</span>
                    <div style={{ textAlign: 'left' }}>
                      <div className="dropdown-item-title">{dept.name}</div>
                      <div className="dropdown-item-desc">{dept.description?.slice(0, 45)}...</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          activeDept && (
            <div className="dept-switcher-dropdown non-admin-dept-pill">
              <button
                className="dept-pill-btn"
                style={{
                  borderColor: `${activeDept.colorHex}40`,
                  background: `${activeDept.colorHex}10`,
                  cursor: 'default',
                }}
                title={`Enrolled Department: ${activeDept.name}`}
              >
                <span style={{ color: activeDept.colorHex }}>{getDeptIcon(activeDept.icon)}</span>
                <span className="dept-name-text">{activeDept.name}</span>
              </button>
            </div>
          )
        )}
      </div>

      <div className="navbar-right">
        {/* PWA Install Button */}
        {canInstallPwa && (
          <button className="btn-secondary btn-sm pwa-install-btn" onClick={onInstallPwa} title="Install App">
            <Download size={15} />
            <span>Install App</span>
          </button>
        )}



        {/* Bell Icon Notification Button */}
        <button
          className="icon-btn-pill notif-bell-btn"
          onClick={onOpenNotifications}
          aria-label="Announcements and Notifications"
          title="Announcements & Notifications"
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="notification-badge-count">{unreadCount > 9 ? '9+' : unreadCount}</span>
          )}
        </button>

        {/* User Profile Card & Sign Out */}
        <div className="relative-container" ref={userMenuRef}>
          <button
            className="user-profile-pill"
            onClick={() => setShowUserMenu(!showUserMenu)}
            aria-label="User profile and account settings"
            title={user ? `${formatDisplayName(user.firstName, user.lastName)} (${user.role})` : 'User profile'}
          >
            <UserAvatar firstName={user?.firstName} lastName={user?.lastName} role={user?.role} size="sm" />
            <div className="user-profile-meta">
              <span className="user-profile-name">
                {formatDisplayName(user?.firstName, user?.lastName)}
              </span>
              <span className={`user-role-chip ${roleBadgeClass}`}>
                {user?.role}
              </span>
            </div>
            <ChevronDown size={14} className="text-muted user-profile-chevron" />
          </button>

          {showUserMenu && (
            <div className="dropdown-menu user-dropdown">
              <div className="dropdown-user-header">
                <div className="dropdown-user-name">
                  {formatDisplayName(user?.firstName, user?.lastName)}
                </div>
                <div className="dropdown-user-email">{user?.email}</div>
                <div className="dropdown-user-role">Role: {user?.role}</div>
              </div>
              <div className="dropdown-divider"></div>

              {/* Theme / Appearance Toggle */}
              <div className="theme-toggle-row">
                <div className="theme-toggle-label">
                  {theme === 'dark' ? <Moon size={14} /> : <Sun size={14} />}
                  <span>Appearance</span>
                </div>
                <button
                  type="button"
                  className="theme-switch-btn"
                  onClick={onToggleTheme}
                  title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
                  aria-label={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
                >
                  <span className={`theme-pill-option ${theme === 'light' ? 'active' : ''}`}>
                    <Sun size={12} />
                    <span>Light</span>
                  </span>
                  <span className={`theme-pill-option ${theme === 'dark' ? 'active' : ''}`}>
                    <Moon size={12} />
                    <span>Dark</span>
                  </span>
                </button>
              </div>

              <div className="dropdown-divider"></div>
              <button
                className="dropdown-item text-danger"
                onClick={() => {
                  setShowUserMenu(false);
                  onLogout();
                }}
              >
                <LogOut size={16} />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

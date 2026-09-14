import React, { useState } from 'react';
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
  User as UserIcon,
  BookOpen,
} from 'lucide-react';
import { User, DepartmentMemberContext, AppNotification } from '../types';
import { UserAvatar } from './UserAvatar';
import { formatDisplayName } from '../utils/avatar';

interface NavbarProps {
  user: User | null;
  activeDept: DepartmentMemberContext | null;
  departments: DepartmentMemberContext[];
  onSelectDept: (dept: DepartmentMemberContext) => void;
  notifications: AppNotification[];
  unreadCount: number;
  onOpenNotifications: () => void;
  onLogout: () => void;
  canInstallPwa: boolean;
  onInstallPwa: () => void;
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
}) => {
  const [showDeptMenu, setShowDeptMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

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

        {/* Department Badge / Switcher */}
        {activeDept && (
          <div className="dept-switcher-dropdown">
            <button
              className="dept-pill-btn"
              onClick={() => {
                if (user?.role === 'ADMIN' && departments.length > 1) {
                  setShowDeptMenu(!showDeptMenu);
                }
              }}
              style={{
                borderColor: `${activeDept.colorHex}40`,
                background: `${activeDept.colorHex}10`,
                cursor: user?.role === 'ADMIN' && departments.length > 1 ? 'pointer' : 'default',
              }}
              title={
                user?.role === 'ADMIN'
                  ? 'Click to switch department workspace'
                  : `Enrolled Department: ${activeDept.name}`
              }
            >
              <span style={{ color: activeDept.colorHex }}>{getDeptIcon(activeDept.icon)}</span>
              <span className="dept-name-text">{activeDept.name}</span>
              {user?.role === 'ADMIN' && departments.length > 1 && (
                <ChevronDown size={14} className="text-muted" />
              )}
            </button>

            {showDeptMenu && user?.role === 'ADMIN' && departments.length > 1 && (
              <div className="dropdown-menu">
                <div className="dropdown-header">Administrator: Switch Department</div>
                {departments.map((dept) => (
                  <button
                    key={dept.id}
                    className={`dropdown-item ${dept.id === activeDept.id ? 'active' : ''}`}
                    onClick={() => {
                      onSelectDept(dept);
                      setShowDeptMenu(false);
                    }}
                  >
                    <span style={{ color: dept.colorHex }}>{getDeptIcon(dept.icon)}</span>
                    <div style={{ textAlign: 'left' }}>
                      <div className="dropdown-item-title">{dept.name}</div>
                      <div className="dropdown-item-desc">{dept.description?.slice(0, 50)}...</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="navbar-right">
        {/* PWA Install Button */}
        {canInstallPwa && (
          <button className="btn-secondary btn-sm pwa-install-btn" onClick={onInstallPwa}>
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
        <div className="relative-container">
          <button
            className="user-profile-pill"
            onClick={() => setShowUserMenu(!showUserMenu)}
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
            <ChevronDown size={14} className="text-muted" />
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

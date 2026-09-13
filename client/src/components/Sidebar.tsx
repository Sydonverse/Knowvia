import React from 'react';
import {
  LayoutDashboard,
  Calendar,
  BookOpen,
  ClipboardCheck,
  Megaphone,
  MessageSquare,
  ShieldCheck,
  GraduationCap,
  Users,
} from 'lucide-react';
import { DepartmentMemberContext, User } from '../types';

export type ActiveTab =
  | 'dashboard'
  | 'schedule'
  | 'materials'
  | 'assignments'
  | 'announcements'
  | 'chat'
  | 'users';

interface SidebarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  activeDept: DepartmentMemberContext | null;
  currentUser?: User | null;
  unreadCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  activeDept,
  currentUser,
}) => {
  const isTutorOrAdmin = currentUser?.role === 'TUTOR' || currentUser?.role === 'ADMIN';

  // Base navigation items
  const navItems = [
    {
      id: 'dashboard' as ActiveTab,
      label: 'Dashboard',
      icon: LayoutDashboard,
      description: 'Overview & schedules',
    },
    {
      id: 'schedule' as ActiveTab,
      label: 'Class Scheduler',
      icon: Calendar,
      description: isTutorOrAdmin ? 'Flexible class timetable' : 'Class timetable',
    },
    {
      id: 'materials' as ActiveTab,
      label: isTutorOrAdmin ? 'Learning Materials & Files' : 'Learning Materials',
      icon: BookOpen,
      description: isTutorOrAdmin ? 'Share educational files' : 'Curated study materials',
    },
    {
      id: 'assignments' as ActiveTab,
      label: 'Assignment Management',
      icon: ClipboardCheck,
      description: isTutorOrAdmin ? 'Create & review work' : 'Submit & track progress',
    },
  ];

  // Announcements tab is available for everyone
  navItems.push({
    id: 'announcements' as ActiveTab,
    label: 'Announcements',
    icon: Megaphone,
    description: isTutorOrAdmin ? 'Broadcast updates' : 'Department updates',
  });

  // Chat is available for all
  navItems.push({
    id: 'chat' as ActiveTab,
    label: 'Department Chat',
    icon: MessageSquare,
    description: 'Real-time discussion',
  });

  // Admin User & Onboarding Management tab
  if (currentUser?.role === 'ADMIN') {
    navItems.push({
      id: 'users' as ActiveTab,
      label: 'User Management',
      icon: Users,
      description: 'Onboard & manage users',
    });
  }

  const roleLabel =
    currentUser?.role === 'ADMIN'
      ? 'Administrator'
      : currentUser?.role === 'TUTOR'
      ? 'Department Tutor'
      : 'Intern / Student';

  return (
    <aside className="sidebar-container">
      {/* Active Department Workspace Banner */}
      <div
        className="sidebar-dept-card"
        style={{
          borderColor: `${activeDept?.colorHex || '#4f46e5'}30`,
          background: `${activeDept?.colorHex || '#4f46e5'}08`,
        }}
      >
        <div className="dept-card-top">
          <div className="status-online-dot"></div>
          <span className="dept-space-label">DEPARTMENT WORKSPACE</span>
        </div>
        <div className="dept-card-title">{activeDept?.name || 'Department'}</div>
        <div className="dept-badge-role">
          {currentUser?.role === 'ADMIN' ? (
            <ShieldCheck size={13} color="#4f46e5" />
          ) : (
            <GraduationCap size={13} color="#10b981" />
          )}
          <span>{roleLabel}</span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              className={`nav-link ${isActive ? 'active' : ''}`}
              onClick={() => onSelectTab(item.id)}
              style={
                isActive
                  ? {
                      borderColor: activeDept?.colorHex || '#4f46e5',
                      background: `${activeDept?.colorHex || '#4f46e5'}10`,
                      color: 'var(--text-primary)',
                    }
                  : {}
              }
            >
              <div
                className="nav-icon-box"
                style={
                  isActive
                    ? {
                        background: `${activeDept?.colorHex || '#4f46e5'}20`,
                        color: activeDept?.colorHex || '#4f46e5',
                      }
                    : {}
                }
              >
                <Icon size={18} />
              </div>
              <div className="nav-text-col">
                <span className="nav-text">{item.label}</span>
                <span className="nav-subtext">{item.description}</span>
              </div>
              {isActive && (
                <div
                  className="active-indicator-bar"
                  style={{ background: activeDept?.colorHex || '#4f46e5' }}
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* PWA Footer Badge */}
      <div className="sidebar-footer">
        <div className="pwa-badge">
          <div className="pwa-dot"></div>
          <div>
            <div className="pwa-title">Knowvia PWA</div>
            <div className="pwa-sub">Knowledge Repository</div>
          </div>
        </div>
      </div>
    </aside>
  );
};

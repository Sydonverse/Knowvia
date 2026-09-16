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
  ArrowLeft,
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
  onSelectDept?: (dept: DepartmentMemberContext | null) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  activeDept,
  currentUser,
  onSelectDept,
}) => {
  const isAdmin = currentUser?.role === 'ADMIN';
  const isTutorOrAdmin = currentUser?.role === 'TUTOR' || isAdmin;

  // Generate role and context-aware navigation items
  let navItems: Array<{
    id: ActiveTab;
    label: string;
    icon: any;
    description: string;
  }> = [];

  if (isAdmin && !activeDept) {
    // Admin in Organization Overview mode
    navItems = [
      {
        id: 'dashboard',
        label: 'Overview',
        icon: LayoutDashboard,
        description: 'Command center & stats',
      },
      {
        id: 'users',
        label: 'User Management',
        icon: Users,
        description: 'Onboard & manage users',
      },
      {
        id: 'announcements',
        label: 'Announcements',
        icon: Megaphone,
        description: 'Broadcast updates',
      },
    ];
  } else {
    // Department workspace mode (or Tutor/Intern mode)
    navItems = [
      {
        id: 'dashboard',
        label: isAdmin ? 'Department Dashboard' : 'Dashboard',
        icon: LayoutDashboard,
        description: 'Overview & schedules',
      },
      {
        id: 'schedule',
        label: isTutorOrAdmin ? 'Class Scheduler' : 'Class Schedule',
        icon: Calendar,
        description: isTutorOrAdmin ? 'Flexible class timetable' : 'Class timetable',
      },
      {
        id: 'materials',
        label: isTutorOrAdmin ? 'Learning Materials & Files' : 'Learning Materials',
        icon: BookOpen,
        description: isTutorOrAdmin ? 'Share educational files' : 'Curated study materials',
      },
      {
        id: 'assignments',
        label: isTutorOrAdmin ? 'Assignment Management' : 'Assignments',
        icon: ClipboardCheck,
        description: isTutorOrAdmin ? 'Create & review work' : 'Submit & track progress',
      },
      {
        id: 'announcements',
        label: 'Announcements',
        icon: Megaphone,
        description: isTutorOrAdmin ? 'Broadcast updates' : 'Department updates',
      },
      {
        id: 'chat',
        label: 'Department Chat',
        icon: MessageSquare,
        description: 'Real-time discussion',
      },
    ];

    if (isAdmin) {
      navItems.push({
        id: 'users',
        label: 'User Management',
        icon: Users,
        description: 'Onboard & manage users',
      });
    }
  }

  const roleLabel =
    currentUser?.role === 'ADMIN'
      ? 'Administrator'
      : currentUser?.role === 'TUTOR'
      ? 'Department Tutor'
      : 'Intern / Student';

  const deptColor = activeDept?.colorHex || '#6366f1';

  return (
    <aside className="sidebar-container">
      {/* Workspace Banner */}
      <div
        className="sidebar-dept-card"
        style={{
          borderColor: `${deptColor}30`,
          background: `${deptColor}08`,
        }}
      >
        <div className="dept-card-top">
          <div className="status-online-dot"></div>
          <span className="dept-space-label">
            {isAdmin && !activeDept ? 'ORGANIZATION SCOPE' : 'DEPARTMENT WORKSPACE'}
          </span>
        </div>
        <div className="dept-card-title">
          {isAdmin && !activeDept ? 'Knowvia Platform' : activeDept?.name || 'Department'}
        </div>
        <div className="dept-badge-role">
          {currentUser?.role === 'ADMIN' ? (
            <ShieldCheck size={13} color="#4f46e5" />
          ) : (
            <GraduationCap size={13} color="#10b981" />
          )}
          <span>{roleLabel}</span>
        </div>

        {/* Quick return button for Admin inside a department */}
        {isAdmin && activeDept && onSelectDept && (
          <button
            className="sidebar-return-org-btn"
            onClick={() => onSelectDept(null)}
            title="Return to Organization Overview"
          >
            <ArrowLeft size={13} />
            <span>Organization Overview</span>
          </button>
        )}
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
                      borderColor: deptColor,
                      background: `${deptColor}10`,
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
                        background: `${deptColor}20`,
                        color: deptColor,
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
                  style={{ background: deptColor }}
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


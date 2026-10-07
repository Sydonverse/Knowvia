import React from 'react';
import {
  LayoutDashboard,
  Calendar,
  BookOpen,
  ClipboardCheck,
  Megaphone,
  MessageSquare,
  Users,
} from 'lucide-react';
import { DepartmentMemberContext, User } from '../types';
import { ActiveTab } from './Sidebar';

interface MobileBottomNavProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  activeDept: DepartmentMemberContext | null;
  currentUser?: User | null;
  unreadCount?: number;
}

interface NavTabItem {
  id: ActiveTab;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  showBadge?: boolean;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onSelectTab,
  activeDept,
  currentUser,
  unreadCount = 0,
}) => {
  const isAdmin = currentUser?.role === 'ADMIN';

  // Role and scope-aware tab definitions
  let tabs: NavTabItem[] = [];

  if (isAdmin && !activeDept) {
    tabs = [
      { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
      { id: 'users', label: 'Users', icon: Users },
      { id: 'announcements', label: 'Announcements', icon: Megaphone },
    ];
  } else {
    tabs = [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'schedule', label: 'Schedule', icon: Calendar },
      { id: 'materials', label: 'Materials', icon: BookOpen },
      { id: 'assignments', label: 'Assignments', icon: ClipboardCheck },
      { id: 'announcements', label: 'Announcements', icon: Megaphone },
      { id: 'chat', label: 'Chat', icon: MessageSquare, showBadge: unreadCount > 0 },
    ];

    if (isAdmin) {
      tabs.push({ id: 'users', label: 'Users', icon: Users });
    }
  }

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile Navigation">
      <div className="mobile-bottom-nav-inner">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              className={`mobile-nav-btn ${isActive ? 'active' : ''}`}
              onClick={() => onSelectTab(tab.id)}
              aria-label={tab.label}
              title={tab.label}
              type="button"
            >
              <div className="mobile-nav-icon-wrap">
                <Icon size={20} />
                {tab.showBadge && <span className="mobile-nav-badge-dot" />}
              </div>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

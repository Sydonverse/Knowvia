import React from 'react';
import {
  X,
  CheckCheck,
  Bell,
  BellRing,
  ExternalLink,
  ArrowRight,
  ClipboardCheck,
  Calendar,
  BookOpen,
  Megaphone,
  CheckCircle2,
} from 'lucide-react';
import { AppNotification } from '../types';
import { ActiveTab } from './Sidebar';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  unreadCount: number;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onEnablePush: () => void;
  onDisablePush?: () => void;
  onSendTestPush?: () => void;
  pushEnabled: boolean;
  onNavigate: (tab: ActiveTab, targetId?: string) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  unreadCount,
  onMarkRead,
  onMarkAllRead,
  onEnablePush,
  onDisablePush,
  onSendTestPush,
  pushEnabled,
  onNavigate,
}) => {
  if (!isOpen) return null;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'ANNOUNCEMENT':
        return <Megaphone size={16} color="#f59e0b" />;
      case 'CLASS_SCHEDULE':
      case 'CLASS_REMINDER':
        return <Calendar size={16} color="#10b981" />;
      case 'ASSIGNMENT':
      case 'ASSIGNMENT_CREATED':
      case 'SUBMISSION_REVIEWED':
        return <ClipboardCheck size={16} color="#4f46e5" />;
      case 'MATERIAL':
      case 'MATERIAL_UPLOADED':
        return <BookOpen size={16} color="#0ea5e9" />;
      default:
        return <Bell size={16} color="#6366f1" />;
    }
  };

  const handleNotificationClick = (notif: AppNotification) => {
    if (!notif.isRead) {
      onMarkRead(notif.id);
    }

    if (notif.actionUrl) {
      const url = notif.actionUrl.toLowerCase();
      if (url.includes('assignment')) {
        onNavigate('assignments');
      } else if (url.includes('schedule')) {
        onNavigate('schedule');
      } else if (url.includes('material')) {
        onNavigate('materials');
      } else if (url.includes('announcement')) {
        onNavigate('announcements');
      }
      onClose();
    }
  };

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
        {/* Drawer Header */}
        <div className="drawer-header">
          <div className="drawer-title-group">
            <Bell size={20} color="#4f46e5" />
            <span className="drawer-title">Announcements & Alerts</span>
            {unreadCount > 0 && <span className="notif-count-pill">{unreadCount} new</span>}
          </div>
          <div className="drawer-actions">
            {unreadCount > 0 && (
              <button className="btn-icon" onClick={onMarkAllRead} title="Mark all as read">
                <CheckCheck size={18} />
              </button>
            )}
            <button className="btn-icon" onClick={onClose} title="Close">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Web Push Banner */}
        <div className="push-permission-card">
          <div className="push-icon-box">
            <BellRing size={20} color="#4f46e5" />
          </div>
          <div className="push-content">
            <div className="push-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Mobile Push Notifications</span>
              {pushEnabled && (
                <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }}></span>
                  Active
                </span>
              )}
            </div>
            <div className="push-desc">
              {pushEnabled
                ? 'Push alerts are active on this device. You will receive instant class reminders and announcements.'
                : 'Enable browser & mobile push alerts for announcements, new assignments, and upcoming class reminders.'}
            </div>
            {pushEnabled ? (
              <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                {onSendTestPush && (
                  <button className="btn-secondary btn-sm" onClick={onSendTestPush} title="Send a test notification to verify device alerts">
                    🔔 Send Test Push
                  </button>
                )}
                {onDisablePush && (
                  <button className="btn-outline btn-sm" style={{ color: '#ef4444', borderColor: '#fca5a5' }} onClick={onDisablePush} title="Disable push alerts on this device">
                    Disable Alerts
                  </button>
                )}
              </div>
            ) : (
              <button className="btn-primary btn-sm mt-2" onClick={onEnablePush}>
                Enable Push Alerts
              </button>
            )}
          </div>
        </div>

        {/* Notifications Stream */}
        <div className="drawer-body">
          {notifications.length === 0 ? (
            <div className="empty-state-drawer">
              <Bell size={36} className="text-muted" />
              <p>No notifications yet</p>
              <span className="text-muted text-xs">
                Announcements, class reminders, and assignment notices will appear here.
              </span>
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                className={`notif-item ${!notif.isRead ? 'unread' : ''}`}
                onClick={() => handleNotificationClick(notif)}
              >
                <div className="notif-icon-col">{getTypeIcon(notif.type)}</div>
                <div className="notif-content-col">
                  <div className="notif-title-row">
                    <span className="notif-title">{notif.title}</span>
                    <span className="notif-time">
                      {new Date(notif.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="notif-body-text">{notif.body}</p>
                  {notif.actionUrl && (
                    <div className="notif-click-hint">
                      <span>Click to view details</span>
                      <ArrowRight size={12} />
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

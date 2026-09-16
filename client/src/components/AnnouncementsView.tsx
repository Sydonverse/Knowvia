import React from 'react';
import {
  Megaphone,
  Pin,
  Plus,
  Trash2,
  AlertTriangle,
  Clock,
  ArrowRight,
  ClipboardCheck,
  Calendar,
  BookOpen,
} from 'lucide-react';
import { Announcement, DepartmentMemberContext } from '../types';
import { ActiveTab } from './Sidebar';
import { UserAvatar } from './UserAvatar';
import { formatDisplayName } from '../utils/avatar';

interface AnnouncementsViewProps {
  announcements: Announcement[];
  activeDept: DepartmentMemberContext;
  isTutorOrAdmin: boolean;
  onOpenCreateModal: () => void;
  onDeleteAnnouncement: (id: string) => void;
  onClearAnnouncements: () => void;
  onNavigate: (tab: ActiveTab, targetId?: string) => void;
}

export const AnnouncementsView: React.FC<AnnouncementsViewProps> = ({
  announcements,
  activeDept,
  isTutorOrAdmin,
  onOpenCreateModal,
  onDeleteAnnouncement,
  onClearAnnouncements,
  onNavigate,
}) => {
  const getSourceIcon = (sourceType?: string | null) => {
    switch (sourceType) {
      case 'ASSIGNMENT':
        return <ClipboardCheck size={14} color="#4f46e5" />;
      case 'CLASS_SCHEDULE':
        return <Calendar size={14} color="#10b981" />;
      case 'MATERIAL':
        return <BookOpen size={14} color="#0ea5e9" />;
      default:
        return <Megaphone size={14} color="#f59e0b" />;
    }
  };

  const handleDeepLinkClick = (ann: Announcement) => {
    if (ann.sourceType === 'ASSIGNMENT') {
      onNavigate('assignments', ann.sourceId || undefined);
    } else if (ann.sourceType === 'CLASS_SCHEDULE') {
      onNavigate('schedule');
    } else if (ann.sourceType === 'MATERIAL') {
      onNavigate('materials');
    }
  };

  return (
    <div className="view-container">
      {/* Header */}
      <div className="view-header">
        <div>
          <div className="view-pretitle">OFFICIAL BROADCASTS</div>
          <h1 className="view-title">Announcements & Updates</h1>
          <p className="view-subtitle">
            {isTutorOrAdmin
              ? `Broadcast announcements to ${activeDept.name}. Admin announcements reflect across all departments; tutor announcements reflect in ${activeDept.name}.`
              : `Major announcements, automated assignment notices, and timetable reminders for ${activeDept.name}.`}
          </p>
        </div>

        <div className="view-header-actions">
          {announcements.length > 0 && (
            <button
              className="btn-secondary btn-sm"
              onClick={onClearAnnouncements}
              title="Clear all announcements in this tab"
            >
              <Trash2 size={14} />
              <span>Clear Tab</span>
            </button>
          )}

          {isTutorOrAdmin && (
            <button className="btn-primary" onClick={onOpenCreateModal}>
              <Plus size={16} />
              <span>Post Announcement</span>
            </button>
          )}
        </div>
      </div>

      {announcements.length === 0 ? (
        <div className="empty-state-card">
          <Megaphone size={48} className="text-muted" />
          <h3>No announcements yet</h3>
          <p className="text-muted">
            Important announcements, class schedules, and new assignments will be broadcast here.
          </p>
          {isTutorOrAdmin && (
            <button className="btn-primary mt-4" onClick={onOpenCreateModal}>
              <Plus size={16} />
              <span>Post First Announcement</span>
            </button>
          )}
        </div>
      ) : (
        <div className="announcements-feed">
          {announcements.map((ann) => {
            const isGlobal = !ann.departmentId;

            return (
              <div
                key={ann.id}
                className={`announcement-feed-card ${ann.isPinned ? 'pinned-card' : ''} ${
                  isGlobal ? 'global-ann-card' : ''
                }`}
              >
                {ann.isPinned && (
                  <div className="pinned-badge-strip">
                    <Pin size={13} />
                    <span>PINNED ANNOUNCEMENT</span>
                  </div>
                )}

                {isGlobal && !ann.isPinned && (
                  <div className="global-badge-strip">
                    <span>🌐 GLOBAL HUB ANNOUNCEMENT</span>
                  </div>
                )}

                <div className="announcement-header-row">
                  <div className="ann-author-box">
                    <UserAvatar
                      firstName={ann.author?.firstName}
                      lastName={ann.author?.lastName}
                      role={ann.author?.role}
                      size="md"
                    />
                    <div>
                      <div className="ann-author-name">
                        {formatDisplayName(ann.author?.firstName, ann.author?.lastName)}
                      </div>
                      <div className="ann-author-role">
                        {ann.author?.role === 'ADMIN'
                          ? 'Administrator (All Departments)'
                          : `Tutor (${activeDept.name})`}
                      </div>
                    </div>
                  </div>

                  <div className="ann-meta-actions">
                    <span className={`badge-priority badge-${ann.priority.toLowerCase()}`}>
                      {ann.priority === 'URGENT' && <AlertTriangle size={12} />}
                      <span>{ann.priority}</span>
                    </span>

                    <span className="ann-time-stamp">
                      <Clock size={12} />
                      <span>{new Date(ann.createdAt).toLocaleDateString()}</span>
                    </span>

                    <button
                      className="btn-icon-danger-sm"
                      onClick={() => onDeleteAnnouncement(ann.id)}
                      title="Delete Announcement"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="announcement-body-content">
                  <h3 className="announcement-title">{ann.title}</h3>
                  <p className="announcement-text">{ann.content}</p>

                  {/* Clickable Deep Link to Assignment / Schedule / Material */}
                  {ann.sourceType && (
                    <button
                      className="announcement-deep-link-btn"
                      onClick={() => handleDeepLinkClick(ann)}
                    >
                      {getSourceIcon(ann.sourceType)}
                      <span>
                        View full details in{' '}
                        <strong>
                          {ann.sourceType === 'ASSIGNMENT'
                            ? isTutorOrAdmin
                              ? 'Assignment Management'
                              : 'Assignments'
                            : ann.sourceType === 'CLASS_SCHEDULE'
                            ? isTutorOrAdmin
                              ? 'Class Scheduler'
                              : 'Class Schedule'
                            : 'Learning Materials'}
                        </strong>
                      </span>
                      <ArrowRight size={13} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

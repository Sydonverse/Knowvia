import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Video,
  Plus,
  Trash2,
  CalendarCheck,
  Bell,
  Sparkles,
  Edit3,
} from 'lucide-react';
import { ClassSchedule, DepartmentMemberContext, User } from '../types';
import { EditScheduleModal } from './Modals';

interface ScheduleViewProps {
  schedules: ClassSchedule[];
  activeDept: DepartmentMemberContext;
  isTutorOrAdmin: boolean;
  currentUser?: User | null;
  onOpenScheduleModal: () => void;
  onUpdateSchedule?: (id: string, data: any) => Promise<void>;
  onDeleteSchedule: (id: string) => void;
}

export const ScheduleView: React.FC<ScheduleViewProps> = ({
  schedules,
  activeDept,
  isTutorOrAdmin,
  currentUser,
  onOpenScheduleModal,
  onUpdateSchedule,
  onDeleteSchedule,
}) => {
  const [editingSchedule, setEditingSchedule] = useState<ClassSchedule | null>(null);
  const now = Date.now();
  const upcoming = schedules.filter((s) => new Date(s.endTime).getTime() >= now);
  const past = schedules.filter((s) => new Date(s.endTime).getTime() < now);

  return (
    <div className="view-container">
      {/* Header */}
      <div className="view-header">
        <div>
          <div className="view-pretitle">FLEXIBLE TIMETABLE</div>
          <h1 className="view-title">
            {isTutorOrAdmin ? 'Class Scheduler & Sessions' : 'Class Schedule & Sessions'}
          </h1>
          <p className="view-subtitle">
            {isTutorOrAdmin
              ? `Dynamic scheduling for ${activeDept.name}. Schedule extra workshops, labs, or lectures beyond the static timetable.`
              : `Upcoming training sessions, lectures, and hands-on labs for ${activeDept.name}.`}
          </p>
        </div>
        {isTutorOrAdmin && (
          <button className="btn-primary" onClick={onOpenScheduleModal}>
            <Plus size={16} />
            <span>Schedule Extra Class</span>
          </button>
        )}
      </div>

      {schedules.length === 0 ? (
        <div className="empty-state-card">
          <Calendar size={48} className="text-muted" />
          <h3>No classes scheduled yet</h3>
          <p className="text-muted">
            {isTutorOrAdmin
              ? 'Click below to schedule an extra class or lecture session for your interns.'
              : 'Your tutors will schedule upcoming class sessions and labs here.'}
          </p>
          {isTutorOrAdmin && (
            <button className="btn-primary mt-4" onClick={onOpenScheduleModal}>
              <Plus size={16} />
              <span>Schedule First Session</span>
            </button>
          )}
        </div>
      ) : (
        <div className="schedule-layout">
          {/* Upcoming Classes */}
          <div className="schedule-section">
            <h2 className="section-subtitle">
              <CalendarCheck size={18} color="#4f46e5" />
              <span>Upcoming Class Sessions ({upcoming.length})</span>
            </h2>

            {upcoming.length === 0 ? (
              <div className="empty-card">
                <p className="text-muted">No upcoming sessions. Check back soon.</p>
              </div>
            ) : (
              <div className="schedule-cards-list">
                {upcoming.map((item) => {
                  const start = new Date(item.startTime);
                  const end = new Date(item.endTime);
                  return (
                    <div key={item.id} id={`schedule-${item.id}`} className="schedule-card">
                      <div
                        className="schedule-card-date-box"
                        style={{ borderColor: activeDept.colorHex || '#4f46e5' }}
                      >
                        <span className="sched-month">
                          {start.toLocaleString('default', { month: 'short' }).toUpperCase()}
                        </span>
                        <span className="sched-day">{start.getDate()}</span>
                        <span className="sched-weekday">
                          {start.toLocaleString('default', { weekday: 'short' })}
                        </span>
                      </div>

                      <div className="schedule-card-body">
                        <div className="schedule-meta-row">
                          <span className="schedule-time-badge">
                            <Clock size={13} />
                            <span>
                              {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                              {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </span>

                          <span className="schedule-location-badge">
                            <MapPin size={13} />
                            <span>{item.location}</span>
                          </span>

                          {start.getTime() <= now && end.getTime() >= now ? (
                            <span className="live-now-badge" title="This class session is currently in progress">
                              <span className="live-dot" />
                              <span>Live Now</span>
                            </span>
                          ) : (
                            <span className="reminder-active-badge" title="Automated reminders dispatched 1 day before class and at start time">
                              <Bell size={12} />
                              <span>Live & 1-Day Alerts</span>
                            </span>
                          )}
                        </div>

                        <h3 className="schedule-item-title">{item.title}</h3>
                        {item.description && (
                          <p className="schedule-item-desc">{item.description}</p>
                        )}

                        <div className="schedule-footer-row">
                          <div className="schedule-scheduler-info">
                            <span>Scheduled by: </span>
                            <strong>
                              {item.scheduler?.firstName} {item.scheduler?.lastName}
                            </strong>
                            <span className="scheduler-role-tag">TUTOR</span>
                          </div>

                          <div className="schedule-action-btns">
                            {item.meetingLink && (
                              <a
                                href={item.meetingLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-join-meeting"
                              >
                                <Video size={14} />
                                <span>Join Virtual Meeting</span>
                              </a>
                            )}

                            {isTutorOrAdmin && (
                              <>
                                {(currentUser?.role === 'ADMIN' || !currentUser || item.scheduledById === currentUser.id) && onUpdateSchedule && (
                                  <button
                                    className="btn-icon-edit"
                                    onClick={() => setEditingSchedule(item)}
                                    title="Edit Class Schedule"
                                  >
                                    <Edit3 size={14} />
                                    <span>Edit</span>
                                  </button>
                                )}
                                <button
                                  className="btn-icon-danger"
                                  onClick={() => onDeleteSchedule(item.id)}
                                  title="Delete Class"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Past Sessions */}
          {past.length > 0 && (
            <div className="schedule-section past-section">
              <h2 className="section-subtitle text-muted">
                <span>Completed Sessions ({past.length})</span>
              </h2>
              <div className="schedule-cards-list">
                {past.map((item) => {
                  const start = new Date(item.startTime);
                  return (
                    <div key={item.id} id={`schedule-${item.id}`} className="schedule-card past-card">
                      <div className="schedule-card-date-box past-date-box">
                        <span className="sched-month">{start.toLocaleString('default', { month: 'short' })}</span>
                        <span className="sched-day">{start.getDate()}</span>
                      </div>
                      <div className="schedule-card-body">
                        <h4 className="schedule-past-title">{item.title}</h4>
                        <div className="schedule-past-meta">
                          <span>{item.location}</span>
                          <span>•</span>
                          <span>{start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {editingSchedule && onUpdateSchedule && (
        <EditScheduleModal
          isOpen={!!editingSchedule}
          onClose={() => setEditingSchedule(null)}
          onSubmit={onUpdateSchedule}
          schedule={editingSchedule}
          activeDept={activeDept}
        />
      )}
    </div>
  );
};

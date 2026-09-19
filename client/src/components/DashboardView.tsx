import React from 'react';
import {
  Calendar,
  BookOpen,
  ClipboardCheck,
  Megaphone,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Upload,
  Download,
  Video,
  MapPin,
  Sparkles,
  RefreshCw,
  FileText,
} from 'lucide-react';
import {
  DepartmentMemberContext,
  Material,
  Announcement,
  ClassSchedule,
  Assignment,
  AssignmentProgressStats,
  User,
} from '../types';
import { getFileUrl } from '../utils/file';
import { ActiveTab } from './Sidebar';

interface DashboardViewProps {
  user: User | null;
  activeDept: DepartmentMemberContext;
  materials: Material[];
  announcements: Announcement[];
  schedules: ClassSchedule[];
  assignments: Assignment[];
  progressStats?: AssignmentProgressStats | null;
  onNavigate: (tab: ActiveTab) => void;
  onOpenUpload: () => void;
  onOpenSchedule: () => void;
  onOpenAssignmentModal: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  user,
  activeDept,
  materials,
  announcements,
  schedules,
  assignments,
  progressStats,
  onNavigate,
  onOpenUpload,
  onOpenSchedule,
  onOpenAssignmentModal,
}) => {
  const isTutorOrAdmin = user?.role === 'TUTOR' || user?.role === 'ADMIN';

  // Format date helper
  const formatDateTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return {
      date: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      time: d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    };
  };

  // Find next upcoming class
  const upcomingClasses = schedules
    .filter((s) => new Date(s.endTime).getTime() >= Date.now() - 3600000)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  const nextClass = upcomingClasses[0] || schedules[0];

  return (
    <div className="dashboard-content">
      {/* Department Hero Banner */}
      <div
        className="hero-banner"
        style={{
          borderLeft: `4px solid ${activeDept.colorHex || '#4f46e5'}`,
        }}
      >
        <div className="hero-content">
          <div className="hero-badge" style={{ color: activeDept.colorHex || '#4f46e5' }}>
            <Sparkles size={14} />
            <span>{isTutorOrAdmin ? 'Tutor Hub Workspace' : 'Student Knowledge Space'}</span>
          </div>
          <h1 className="hero-title">{activeDept.name}</h1>
          <p className="hero-subtitle">
            {isTutorOrAdmin
              ? `Manage flexible class schedules, upload curriculum learning materials, and review intern assignment deliverables for ${activeDept.name}.`
              : `Your centralized knowledge repository for ${activeDept.name}. Check your class timetable, download materials, and submit assignments.`}
          </p>

          <div className="hero-actions">
            {isTutorOrAdmin ? (
              <>
                <button className="btn-primary" onClick={onOpenSchedule}>
                  <Plus size={16} />
                  <span>Schedule Extra Class</span>
                </button>
                <button className="btn-secondary" onClick={onOpenUpload}>
                  <Upload size={16} />
                  <span>Share Learning Material</span>
                </button>
                <button className="btn-secondary" onClick={onOpenAssignmentModal}>
                  <ClipboardCheck size={16} />
                  <span>New Assignment</span>
                </button>
              </>
            ) : (
              <>
                <button className="btn-primary" onClick={() => onNavigate('schedule')}>
                  <Calendar size={16} />
                  <span>View Class Schedule</span>
                </button>
                <button className="btn-secondary" onClick={() => onNavigate('materials')}>
                  <BookOpen size={16} />
                  <span>Learning Materials ({materials.length})</span>
                </button>
                <button className="btn-secondary" onClick={() => onNavigate('assignments')}>
                  <ClipboardCheck size={16} />
                  <span>My Assignments</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Feature Layout */}
      <div className="dashboard-main-grid">
        {/* Left Column: CLASS SCHEDULER AS MAIN COMPONENT */}
        <div className="dashboard-col-left">
          <div className="content-card">
            <div className="card-header-flex">
              <div>
                <div className="card-pretitle">PRIMARY FEATURE</div>
                <h2 className="card-title">
                  <Calendar size={19} color={activeDept.colorHex || '#4f46e5'} />
                  <span>{isTutorOrAdmin ? 'Flexible Class Scheduler' : 'Upcoming Class Timetable'}</span>
                </h2>
              </div>
              <div className="card-header-actions">
                {isTutorOrAdmin ? (
                  <button className="btn-primary btn-sm" onClick={onOpenSchedule}>
                    <Plus size={14} />
                    <span>Add Extra Class</span>
                  </button>
                ) : (
                  <button className="btn-secondary btn-sm" onClick={() => onNavigate('schedule')}>
                    <span>Full Schedule</span>
                    <ArrowRight size={14} />
                  </button>
                )}
              </div>
            </div>

            {nextClass ? (
              <div className="next-class-featured-card">
                <div className="next-class-pill">Next Session</div>
                <h3 className="next-class-title">{nextClass.title}</h3>
                {nextClass.description && (
                  <p className="next-class-desc">{nextClass.description}</p>
                )}

                <div className="next-class-meta-row">
                  <div className="meta-pill">
                    <Clock size={14} />
                    <span>
                      {formatDateTime(nextClass.startTime).date} • {formatDateTime(nextClass.startTime).time} -{' '}
                      {formatDateTime(nextClass.endTime).time}
                    </span>
                  </div>
                  <div className="meta-pill">
                    <MapPin size={14} />
                    <span>{nextClass.location}</span>
                  </div>
                  {nextClass.meetingLink && (
                    <a
                      href={nextClass.meetingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="meta-pill meeting-link"
                    >
                      <Video size={14} />
                      <span>Join Meeting</span>
                    </a>
                  )}
                </div>

                <div className="next-class-footer-note">
                  <Clock size={13} />
                  <span>Automated 1-day reminder notification is active for all students</span>
                </div>
              </div>
            ) : (
              <div className="empty-state-box">
                <Calendar size={32} className="text-muted" />
                <p>No upcoming classes scheduled yet.</p>
                {isTutorOrAdmin && (
                  <button className="btn-secondary btn-sm" onClick={onOpenSchedule}>
                    Schedule a session now
                  </button>
                )}
              </div>
            )}

            {/* Upcoming Agenda Mini-List */}
            {upcomingClasses.length > 1 && (
              <div className="upcoming-classes-sublist">
                <div className="sublist-title">Other Upcoming Classes</div>
                {upcomingClasses.slice(1, 3).map((cls) => (
                  <div key={cls.id} className="agenda-mini-item">
                    <div className="agenda-time-col">
                      <span className="agenda-date-bold">{formatDateTime(cls.startTime).date}</span>
                      <span className="agenda-hour">{formatDateTime(cls.startTime).time}</span>
                    </div>
                    <div className="agenda-info-col">
                      <div className="agenda-item-title">{cls.title}</div>
                      <div className="agenda-item-sub">{cls.location}</div>
                    </div>
                    {cls.meetingLink && (
                      <a
                        href={cls.meetingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-icon-link"
                        title="Join Link"
                      >
                        <Video size={15} />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* FOR INTERNS: ASSIGNMENT PROGRESS TRACKER & MILESTONE METER */}
          {!isTutorOrAdmin && (
            <div className="content-card progress-tracker-card">
              <div className="card-header-flex">
                <div>
                  <div className="card-pretitle">MILESTONE TRACKER</div>
                  <h2 className="card-title">
                    <ClipboardCheck size={19} color="#10b981" />
                    <span>Assignment Progress & Milestones</span>
                  </h2>
                </div>
                <button className="btn-secondary btn-sm" onClick={() => onNavigate('assignments')}>
                  <span>View All</span>
                  <ArrowRight size={14} />
                </button>
              </div>

              {progressStats ? (
                <div>
                  {/* Progress Meter Bar */}
                  <div className="progress-meter-container">
                    <div className="progress-meter-header">
                      <span className="progress-meter-label">Overall Completion</span>
                      <span className="progress-meter-pct">{progressStats.completionPercentage}%</span>
                    </div>
                    <div className="progress-bar-track">
                      <div
                        className="progress-bar-fill"
                        style={{ width: `${progressStats.completionPercentage}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Summary Metric Counters */}
                  <div className="progress-metrics-row">
                    <div className="metric-pill metric-approved">
                      <CheckCircle2 size={16} />
                      <div>
                        <div className="metric-val">{progressStats.approvedCount}</div>
                        <div className="metric-lbl">Approved</div>
                      </div>
                    </div>

                    <div className="metric-pill metric-revision">
                      <RefreshCw size={16} />
                      <div>
                        <div className="metric-val">{progressStats.needsRevisionCount}</div>
                        <div className="metric-lbl">Needs Revision</div>
                      </div>
                    </div>

                    <div className="metric-pill metric-pending">
                      <Clock size={16} />
                      <div>
                        <div className="metric-val">{progressStats.pendingReviewCount}</div>
                        <div className="metric-lbl">Under Review</div>
                      </div>
                    </div>

                    <div className="metric-pill metric-total">
                      <FileText size={16} />
                      <div>
                        <div className="metric-val">{progressStats.totalAssignments}</div>
                        <div className="metric-lbl">Total Given</div>
                      </div>
                    </div>
                  </div>

                  {/* Primary Assignment Being Worked On */}
                  {progressStats.primaryAssignment && (
                    <div className="primary-assignment-box">
                      <div className="primary-assignment-badge">Current Focus Assignment</div>
                      <div className="primary-assignment-title">
                        {progressStats.primaryAssignment.title}
                      </div>
                      <div className="primary-assignment-meta">
                        <span>
                          Status: <strong>{progressStats.primaryAssignment.status}</strong>
                        </span>
                        {progressStats.primaryAssignment.dueDate && (
                          <span>
                            Due:{' '}
                            {new Date(progressStats.primaryAssignment.dueDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Recent Status Updates from Tutors */}
                  {progressStats.recentReviews.length > 0 && (
                    <div className="recent-reviews-section">
                      <div className="sublist-title">Recent Feedback from Tutors</div>
                      <div className="reviews-mini-list">
                        {progressStats.recentReviews.map((rev, idx) => (
                          <div key={idx} className="review-mini-item">
                            <div className="review-mini-header">
                              <span className="review-mini-title">{rev.assignmentTitle}</span>
                              <span
                                className={`status-tag ${
                                  rev.verdict === 'APPROVED' ? 'status-approved' : 'status-revision'
                                }`}
                              >
                                {rev.verdict === 'APPROVED' ? 'Approved' : 'Needs Revision'}
                              </span>
                            </div>
                            <p className="review-mini-comment">"{rev.comment}"</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="empty-state-box">
                  <ClipboardCheck size={28} className="text-muted" />
                  <p>Assignments will appear here once assigned by your tutor.</p>
                </div>
              )}
            </div>
          )}

          {/* FOR TUTORS: FILE SHARING HIGHLIGHT & RECENT MATERIALS */}
          {isTutorOrAdmin && (
            <div className="content-card">
              <div className="card-header-flex">
                <div>
                  <div className="card-pretitle">FILE SHARING</div>
                  <h2 className="card-title">
                    <BookOpen size={19} color="#0ea5e9" />
                    <span>Learning Materials & File Sharing</span>
                  </h2>
                </div>
                <button className="btn-secondary btn-sm" onClick={onOpenUpload}>
                  <Upload size={14} />
                  <span>Upload Material</span>
                </button>
              </div>
              <p className="section-description">
                Upload lecture notes, practice labs, guides, or resources for interns. Any file type
                is accepted with a 25MB storage efficiency limit and automated security checks.
              </p>

              {materials.length > 0 ? (
                <div className="materials-mini-list">
                  {materials.slice(0, 3).map((mat) => (
                    <div key={mat.id} className="material-mini-item">
                      <div className="material-icon-col">
                        <FileText size={18} color="#0ea5e9" />
                      </div>
                      <div className="material-details-col">
                        <div className="material-item-title">{mat.title}</div>
                        <div className="material-item-sub">
                          {mat.fileName} • {(mat.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB
                        </div>
                      </div>
                      <a
                        href={getFileUrl(mat.fileUrl)}
                        download={mat.fileName}
                        className="btn-download-pill"
                        title="Download Material"
                      >
                        <Download size={14} />
                        <span>Download</span>
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state-box">
                  <BookOpen size={28} className="text-muted" />
                  <p>No learning materials uploaded yet.</p>
                  <button className="btn-primary btn-sm" onClick={onOpenUpload}>
                    Upload First Material
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Quick Stats & Learning Materials / Announcements */}
        <div className="dashboard-col-right">
          {/* Quick Stats Grid */}
          <div className="stat-cards-vertical">
            <div className="stat-card" onClick={() => onNavigate('materials')}>
              <div className="stat-icon-wrapper stat-icon-sky">
                <BookOpen size={20} />
              </div>
              <div className="stat-card-text">
                <div className="stat-card-val">{materials.length}</div>
                <div className="stat-card-lbl">Learning Materials</div>
              </div>
            </div>

            <div className="stat-card" onClick={() => onNavigate('assignments')}>
              <div className="stat-icon-wrapper stat-icon-emerald">
                <ClipboardCheck size={20} />
              </div>
              <div className="stat-card-text">
                <div className="stat-card-val">{assignments.length}</div>
                <div className="stat-card-lbl">
                  {isTutorOrAdmin ? 'Active Assignments' : 'Total Assignments'}
                </div>
              </div>
            </div>

            <div className="stat-card" onClick={() => onNavigate('schedule')}>
              <div className="stat-icon-wrapper stat-icon-indigo">
                <Calendar size={20} />
              </div>
              <div className="stat-card-text">
                <div className="stat-card-val">{schedules.length}</div>
                <div className="stat-card-lbl">Scheduled Sessions</div>
              </div>
            </div>
          </div>

          {/* Learning Materials for Students (Downloadable) */}
          {!isTutorOrAdmin && (
            <div className="content-card">
              <div className="card-header-flex">
                <h3 className="card-title-sm">
                  <BookOpen size={16} color="#0ea5e9" />
                  <span>Learning Materials</span>
                </h3>
                <button className="btn-link-sm" onClick={() => onNavigate('materials')}>
                  View All
                </button>
              </div>

              {materials.length > 0 ? (
                <div className="materials-mini-list">
                  {materials.slice(0, 4).map((mat) => (
                    <div key={mat.id} className="material-mini-item">
                      <div className="material-icon-col">
                        <FileText size={16} color="#0ea5e9" />
                      </div>
                      <div className="material-details-col">
                        <div className="material-item-title">{mat.title}</div>
                        <div className="material-item-sub">
                          {(mat.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB
                        </div>
                      </div>
                      <a
                        href={getFileUrl(mat.fileUrl)}
                        download={mat.fileName}
                        className="btn-download-icon"
                        title="Download"
                      >
                        <Download size={14} />
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty-subtext">No materials uploaded yet.</p>
              )}
            </div>
          )}

          {/* Recent Major Announcements */}
          <div className="content-card">
            <div className="card-header-flex">
              <h3 className="card-title-sm">
                <Megaphone size={16} color="#f59e0b" />
                <span>Recent Announcements</span>
              </h3>
              {isTutorOrAdmin && (
                <button className="btn-link-sm" onClick={() => onNavigate('announcements')}>
                  Manage
                </button>
              )}
            </div>

            {announcements.length > 0 ? (
              <div className="announcements-mini-list">
                {announcements.slice(0, 3).map((ann) => (
                  <div
                    key={ann.id}
                    className="announcement-mini-item"
                    onClick={() => {
                      if (ann.sourceType === 'ASSIGNMENT') onNavigate('assignments');
                      else if (ann.sourceType === 'CLASS_SCHEDULE') onNavigate('schedule');
                      else if (ann.sourceType === 'MATERIAL') onNavigate('materials');
                      else if (isTutorOrAdmin) onNavigate('announcements');
                    }}
                    style={{ cursor: ann.sourceType ? 'pointer' : 'default' }}
                  >
                    <div className="announcement-mini-header">
                      <span className="announcement-mini-title">{ann.title}</span>
                      {ann.priority === 'URGENT' && (
                        <span className="badge-urgent">Urgent</span>
                      )}
                    </div>
                    <p className="announcement-mini-desc">{ann.content.slice(0, 100)}...</p>
                    {ann.sourceType && (
                      <div className="deep-link-hint">
                        <span>Click to view in {ann.sourceType.replace('_', ' ').toLowerCase()}</span>
                        <ArrowRight size={12} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty-subtext">No announcements posted yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

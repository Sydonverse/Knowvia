import React, { useState, useEffect } from 'react';
import {
  Upload,
  Calendar,
  ClipboardCheck,
  Megaphone,
  X,
  Clock,
  ShieldCheck,
  Video,
  MapPin,
  Sparkles,
} from 'lucide-react';
import { DepartmentMemberContext, Assignment } from '../types';

// ─── 1. UPLOAD LEARNING MATERIAL MODAL ─────────────────────────
interface UploadMaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: FormData) => Promise<void>;
  activeDept: DepartmentMemberContext;
}

export const UploadMaterialModal: React.FC<UploadMaterialModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  activeDept,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !file) {
      setError('Title and a valid file are required.');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setError('File exceeds the 25MB storage efficiency limit.');
      return;
    }

    setIsUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      formData.append('file', file);

      await onSubmit(formData);
      onClose();
      setTitle('');
      setDescription('');
      setFile(null);
    } catch (err: any) {
      setError(err.message || 'Failed to upload material');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-dialog">
        <div className="modal-header">
          <div className="modal-title-group">
            <Upload size={18} color="#0ea5e9" />
            <h3 className="modal-title">Upload Learning Material</h3>
          </div>
          <button className="btn-close-modal" onClick={onClose} disabled={isUploading}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="form-error-banner">{error}</div>}

            <div className="security-notice-box">
              <ShieldCheck size={16} color="#10b981" />
              <span>
                Any file type accepted. 25MB max size. Automated magic-byte security inspection is
                enforced.
              </span>
            </div>

            <div className="form-field">
              <label className="field-label">Material Title *</label>
              <input
                type="text"
                placeholder="e.g., OWASP Vulnerability Mitigation Guide"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="input-clean"
              />
            </div>

            <div className="form-field">
              <label className="field-label">Description & Usage Notes</label>
              <textarea
                rows={3}
                placeholder="Summary of what this document covers and how students should use it..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="textarea-clean"
              />
            </div>

            <div className="form-field">
              <label className="field-label">Select File (Max 25MB) *</label>
              <input
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                required
                className="file-input-clean"
              />
            </div>

            <div className="auto-announcement-hint">
              <Sparkles size={13} color="#f59e0b" />
              <span>An announcement and notification will be auto-generated for students.</span>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={isUploading}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={isUploading}>
              {isUploading ? 'Validating & Uploading...' : 'Upload & Share Material'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── 2. SCHEDULE CLASS MODAL ──────────────────────────────────
interface ScheduleClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  activeDept: DepartmentMemberContext;
}

export const ScheduleClassModal: React.FC<ScheduleClassModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  activeDept,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('Tech Hub Room 2B / Virtual');
  const [meetingLink, setMeetingLink] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !startTime || !endTime) {
      setError('Title, start time, and end time are required.');
      return;
    }

    if (new Date(startTime) >= new Date(endTime)) {
      setError('End time must be after start time.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        location: location.trim(),
        meetingLink: meetingLink.trim() || null,
      });
      onClose();
      setTitle('');
      setDescription('');
      setStartTime('');
      setEndTime('');
      setMeetingLink('');
    } catch (err: any) {
      setError(err.message || 'Failed to schedule class');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-dialog">
        <div className="modal-header">
          <div className="modal-title-group">
            <Calendar size={18} color="#4f46e5" />
            <h3 className="modal-title">Schedule Class / Session</h3>
          </div>
          <button className="btn-close-modal" onClick={onClose} disabled={isSubmitting}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="form-error-banner">{error}</div>}

            <div className="form-field">
              <label className="field-label">Class Session Title *</label>
              <input
                type="text"
                placeholder="e.g., Live Hands-on Pen-Testing Lab"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="input-clean"
              />
            </div>

            <div className="form-field">
              <label className="field-label">Session Description</label>
              <textarea
                rows={2}
                placeholder="What topics, exercises, or tools will be covered in this class?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="textarea-clean"
              />
            </div>

            <div className="form-grid-2">
              <div className="form-field">
                <label className="field-label">Start Date & Time *</label>
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                  className="input-clean"
                />
              </div>

              <div className="form-field">
                <label className="field-label">End Date & Time *</label>
                <input
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                  className="input-clean"
                />
              </div>
            </div>

            <div className="form-grid-2">
              <div className="form-field">
                <label className="field-label">Location / Room</label>
                <input
                  type="text"
                  placeholder="e.g., Cyber Lab 2B / Virtual"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="input-clean"
                />
              </div>

              <div className="form-field">
                <label className="field-label">Virtual Meeting Link (Zoom/Google Meet)</label>
                <input
                  type="url"
                  placeholder="https://meet.google.com/xyz-knowvia"
                  value={meetingLink}
                  onChange={(e) => setMeetingLink(e.target.value)}
                  className="input-clean"
                />
              </div>
            </div>

            <div className="auto-announcement-hint">
              <Clock size={13} color="#10b981" />
              <span>
                Students will receive an announcement now and an automated push reminder 1 day before
                the session.
              </span>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Scheduling...' : 'Schedule Class Session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── 3. CREATE ASSIGNMENT MODAL ───────────────────────────────
interface CreateAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  activeDept: DepartmentMemberContext;
}

export const CreateAssignmentModal: React.FC<CreateAssignmentModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  activeDept,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setError('Title and description are required.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      });
      onClose();
      setTitle('');
      setDescription('');
      setDueDate('');
    } catch (err: any) {
      setError(err.message || 'Failed to create assignment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-dialog">
        <div className="modal-header">
          <div className="modal-title-group">
            <ClipboardCheck size={18} color="#4f46e5" />
            <h3 className="modal-title">Create Assignment</h3>
          </div>
          <button className="btn-close-modal" onClick={onClose} disabled={isSubmitting}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="form-error-banner">{error}</div>}

            <div className="form-field">
              <label className="field-label">Assignment Title *</label>
              <input
                type="text"
                placeholder="e.g., Enterprise Vulnerability Assessment Report"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="input-clean"
              />
            </div>

            <div className="form-field">
              <label className="field-label">Instructions & Deliverable Requirements *</label>
              <textarea
                rows={4}
                placeholder="Detail the technical tasks, methodology, required file format, and grading rubric..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                className="textarea-clean"
              />
            </div>

            <div className="form-field">
              <label className="field-label">Submission Deadline (Optional)</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="input-clean"
              />
            </div>

            <div className="auto-announcement-hint">
              <Sparkles size={13} color="#f59e0b" />
              <span>
                Students will see an auto-announcement with a direct link to this assignment to submit
                work.
              </span>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Publishing...' : 'Publish Assignment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── 3b. EDIT ASSIGNMENT MODAL ────────────────────────────────
interface EditAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (assignmentId: string, data: any) => Promise<void>;
  assignment: Assignment | null;
}

export const EditAssignmentModal: React.FC<EditAssignmentModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  assignment,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (assignment) {
      setTitle(assignment.title || '');
      setDescription(assignment.description || '');
      if (assignment.dueDate) {
        const d = new Date(assignment.dueDate);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        setDueDate(`${yyyy}-${mm}-${dd}`);
      } else {
        setDueDate('');
      }
      setError('');
    }
  }, [assignment]);

  if (!isOpen || !assignment) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setError('Title and description are required.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await onSubmit(assignment.id, {
        title: title.trim(),
        description: description.trim(),
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update assignment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-dialog">
        <div className="modal-header">
          <div className="modal-title-group">
            <ClipboardCheck size={18} color="#4f46e5" />
            <h3 className="modal-title">Edit Assignment Details</h3>
          </div>
          <button className="btn-close-modal" onClick={onClose} disabled={isSubmitting}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="form-error-banner">{error}</div>}

            <div className="form-field">
              <label className="field-label">Assignment Title *</label>
              <input
                type="text"
                placeholder="e.g., Enterprise Vulnerability Assessment Report"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="input-clean"
              />
            </div>

            <div className="form-field">
              <label className="field-label">Instructions & Deliverable Requirements *</label>
              <textarea
                rows={4}
                placeholder="Detail the technical tasks, methodology, required file format, and grading rubric..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                className="textarea-clean"
              />
            </div>

            <div className="form-field">
              <label className="field-label">Submission Deadline (Optional)</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="input-clean"
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving Changes...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── 4. CREATE ANNOUNCEMENT MODAL ─────────────────────────────
interface CreateAnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  activeDept: DepartmentMemberContext;
  isAdmin: boolean;
}

export const CreateAnnouncementModal: React.FC<CreateAnnouncementModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  activeDept,
  isAdmin,
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<'NORMAL' | 'IMPORTANT' | 'URGENT'>('NORMAL');
  const [isPinned, setIsPinned] = useState(false);
  const [isGlobal, setIsGlobal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError('Title and content are required.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await onSubmit({
        title: title.trim(),
        content: content.trim(),
        priority,
        isPinned,
        isGlobal: isAdmin ? isGlobal : false,
      });
      onClose();
      setTitle('');
      setContent('');
      setPriority('NORMAL');
      setIsPinned(false);
      setIsGlobal(false);
    } catch (err: any) {
      setError(err.message || 'Failed to post announcement');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-dialog">
        <div className="modal-header">
          <div className="modal-title-group">
            <Megaphone size={18} color="#f59e0b" />
            <h3 className="modal-title">Broadcast Announcement</h3>
          </div>
          <button className="btn-close-modal" onClick={onClose} disabled={isSubmitting}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="form-error-banner">{error}</div>}

            <div className="form-field">
              <label className="field-label">Announcement Title *</label>
              <input
                type="text"
                placeholder="e.g., Mid-Cohort Hackathon Registration"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="input-clean"
              />
            </div>

            <div className="form-field">
              <label className="field-label">Announcement Content *</label>
              <textarea
                rows={4}
                placeholder="Write the full announcement broadcast message here..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
                className="textarea-clean"
              />
            </div>

            <div className="form-grid-2">
              <div className="form-field">
                <label className="field-label">Priority Level</label>
                <select
                  value={priority}
                  onChange={(e: any) => setPriority(e.target.value)}
                  className="input-clean"
                >
                  <option value="NORMAL">Normal</option>
                  <option value="IMPORTANT">Important</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>

              <div className="form-field-checkbox-col">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={isPinned}
                    onChange={(e) => setIsPinned(e.target.checked)}
                  />
                  <span>Pin to Top of Feed</span>
                </label>

                {isAdmin && (
                  <label className="checkbox-label mt-1">
                    <input
                      type="checkbox"
                      checked={isGlobal}
                      onChange={(e) => setIsGlobal(e.target.checked)}
                    />
                    <span>🌐 Broadcast to All Departments</span>
                  </label>
                )}
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Broadcasting...' : 'Broadcast Announcement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

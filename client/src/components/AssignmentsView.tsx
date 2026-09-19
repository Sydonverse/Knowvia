import React, { useState } from 'react';
import {
  ClipboardCheck,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  Upload,
  FileText,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Download,
  Trash2,
  User as UserIcon,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import {
  Assignment,
  DepartmentMemberContext,
  User,
  Submission,
  SubmissionVerdict,
} from '../types';
import { getFileUrl } from '../utils/file';

interface AssignmentsViewProps {
  assignments: Assignment[];
  activeDept: DepartmentMemberContext;
  currentUser: User | null;
  onOpenCreateModal: () => void;
  onSubmitAssignment: (assignmentId: string, formData: FormData) => Promise<void>;
  onReviewSubmission: (
    assignmentId: string,
    submissionId: string,
    data: { comment: string; verdict: SubmissionVerdict }
  ) => Promise<void>;
  onDeleteAssignment: (assignmentId: string) => void;
  selectedAssignmentId?: string | null;
}

export const AssignmentsView: React.FC<AssignmentsViewProps> = ({
  assignments,
  activeDept,
  currentUser,
  onOpenCreateModal,
  onSubmitAssignment,
  onReviewSubmission,
  onDeleteAssignment,
  selectedAssignmentId,
}) => {
  const isTutorOrAdmin = currentUser?.role === 'TUTOR' || currentUser?.role === 'ADMIN';

  // Expanded assignment accordion
  const [expandedId, setExpandedId] = useState<string | null>(
    selectedAssignmentId || (assignments[0]?.id ?? null)
  );

  // Student submission form state
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [submitNotes, setSubmitNotes] = useState('');
  const [submitFile, setSubmitFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Tutor review modal/form state
  const [reviewingSubmission, setReviewingSubmission] = useState<{
    assignmentId: string;
    submission: Submission;
  } | null>(null);
  const [reviewVerdict, setReviewVerdict] = useState<SubmissionVerdict>('APPROVED');
  const [reviewComment, setReviewComment] = useState('');
  const [isReviewing, setIsReviewing] = useState(false);

  // Handle student submit
  const handleSubmitWork = async (assignmentId: string) => {
    if (!submitFile && !submitNotes.trim()) {
      setSubmitError('Please provide a submission file or summary notes.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');

    try {
      const formData = new FormData();
      if (submitFile) {
        formData.append('file', submitFile);
      }
      formData.append('notes', submitNotes);

      await onSubmitAssignment(assignmentId, formData);
      setSubmittingId(null);
      setSubmitNotes('');
      setSubmitFile(null);
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to submit assignment');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle tutor review
  const handleSubmitReview = async () => {
    if (!reviewingSubmission) return;
    if (!reviewComment.trim()) {
      alert('Please provide feedback comments.');
      return;
    }

    setIsReviewing(true);
    try {
      await onReviewSubmission(reviewingSubmission.assignmentId, reviewingSubmission.submission.id, {
        verdict: reviewVerdict,
        comment: reviewComment,
      });
      setReviewingSubmission(null);
      setReviewComment('');
    } catch (err: any) {
      alert(err.message || 'Failed to submit review');
    } finally {
      setIsReviewing(false);
    }
  };

  const getVerdictTag = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <span className="status-tag status-approved">Approved</span>;
      case 'NEEDS_REVISION':
        return <span className="status-tag status-revision">Needs Revision</span>;
      case 'REJECTED':
        return <span className="status-tag status-rejected">Rejected</span>;
      case 'SUBMITTED':
        return <span className="status-tag status-submitted">Submitted</span>;
      default:
        return <span className="status-tag status-not-submitted">Not Submitted</span>;
    }
  };

  return (
    <div className="view-container">
      {/* Header */}
      <div className="view-header">
        <div>
          <div className="view-pretitle">ASSESSMENT WORKSPACE</div>
          <h1 className="view-title">{isTutorOrAdmin ? 'Assignment Management' : 'Assignments'}</h1>
          <p className="view-subtitle">
            {isTutorOrAdmin
              ? `Create assessments, monitor student submissions, and provide direct qualitative feedback for ${activeDept.name}.`
              : `Submit completed deliverables, review feedback from your tutors, and track your milestone achievements in ${activeDept.name}.`}
          </p>
        </div>

        {isTutorOrAdmin && (
          <button className="btn-primary" onClick={onOpenCreateModal}>
            <Plus size={16} />
            <span>Create New Assignment</span>
          </button>
        )}
      </div>

      {assignments.length === 0 ? (
        <div className="empty-state-card">
          <ClipboardCheck size={48} className="text-muted" />
          <h3>No assignments posted yet</h3>
          <p className="text-muted">
            {isTutorOrAdmin
              ? 'Click below to publish the first assignment for your interns.'
              : 'Your department tutors will assign tasks and project milestones here.'}
          </p>
          {isTutorOrAdmin && (
            <button className="btn-primary mt-4" onClick={onOpenCreateModal}>
              <Plus size={16} />
              <span>Create First Assignment</span>
            </button>
          )}
        </div>
      ) : (
        <div className="assignments-list-container">
          {assignments.map((assignment) => {
            const isExpanded = expandedId === assignment.id;
            const mySubmission = !isTutorOrAdmin
              ? assignment.submissions.find((s) => s.submittedById === currentUser?.id)
              : null;

            return (
              <div
                key={assignment.id}
                id={`assignment-${assignment.id}`}
                className={`assignment-card-item ${isExpanded ? 'assignment-card-expanded' : ''}`}
              >
                {/* Assignment Top Header */}
                <div
                  className="assignment-header-row"
                  onClick={() => setExpandedId(isExpanded ? null : assignment.id)}
                >
                  <div className="assignment-header-left">
                    <div className="assignment-icon-badge">
                      <ClipboardCheck size={18} color="#4f46e5" />
                    </div>
                    <div>
                      <div className="assignment-title-row">
                        <h3 className="assignment-item-title">{assignment.title}</h3>
                        {!isTutorOrAdmin && (
                          <div className="my-sub-tag">
                            {mySubmission ? getVerdictTag(mySubmission.status) : getVerdictTag('NOT_SUBMITTED')}
                          </div>
                        )}
                      </div>

                      <div className="assignment-meta-row">
                        {assignment.dueDate && (
                          <span className="assignment-due-meta">
                            <Clock size={13} />
                            <span>
                              Due: {new Date(assignment.dueDate).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </span>
                          </span>
                        )}

                        <span className="assignment-creator-meta">
                          Assigned by: {assignment.creator?.firstName} {assignment.creator?.lastName}
                        </span>

                        {isTutorOrAdmin && (
                          <span className="submissions-count-meta">
                            Submissions: <strong>{assignment.submissions.length}</strong>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="assignment-header-right">
                    <button className="btn-toggle-icon">
                      {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                  </div>
                </div>

                {/* Expanded Details Panel */}
                {isExpanded && (
                  <div className="assignment-expanded-body">
                    <div className="assignment-desc-box">
                      <div className="desc-label">Assignment Brief & Instructions</div>
                      <p className="assignment-desc-text">{assignment.description}</p>
                    </div>

                    {/* INTERN VIEW: SUBMISSION SECTION */}
                    {!isTutorOrAdmin && (
                      <div className="student-submission-section">
                        <h4 className="section-subtitle-sm">
                          <Upload size={16} />
                          <span>My Submission</span>
                        </h4>

                        {mySubmission ? (
                          <div className="my-submission-card">
                            <div className="sub-card-header">
                              <div>
                                <span className="sub-date">
                                  Submitted on {new Date(mySubmission.submittedAt).toLocaleDateString()}
                                </span>
                                <div className="mt-1">{getVerdictTag(mySubmission.status)}</div>
                              </div>

                              {mySubmission.fileUrl && (
                                <a
                                  href={getFileUrl(mySubmission.fileUrl)}
                                  download={mySubmission.fileName || 'submission.bin'}
                                  className="btn-download-pill"
                                >
                                  <Download size={14} />
                                  <span>Download Submitted File</span>
                                </a>
                              )}
                            </div>

                            {mySubmission.notes && (
                              <div className="sub-notes-box">
                                <strong>My Notes: </strong>
                                <span>{mySubmission.notes}</span>
                              </div>
                            )}

                            {/* Reviews & Feedback from Tutor */}
                            {mySubmission.reviews && mySubmission.reviews.length > 0 ? (
                              <div className="feedback-thread">
                                <div className="feedback-thread-title">Tutor Feedback:</div>
                                {mySubmission.reviews.map((rev) => (
                                  <div key={rev.id} className="feedback-item">
                                    <div className="feedback-header">
                                      <span>
                                        Reviewed by {rev.reviewer?.firstName} {rev.reviewer?.lastName}
                                      </span>
                                      <span>{getVerdictTag(rev.verdict)}</span>
                                    </div>
                                    <p className="feedback-comment">"{rev.comment}"</p>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="feedback-waiting">
                                <Clock size={14} />
                                <span>Your tutor has not reviewed this submission yet.</span>
                              </div>
                            )}

                            {/* Resubmit Option if Needs Revision */}
                            {mySubmission.status === 'NEEDS_REVISION' && (
                              <div className="resubmit-prompt">
                                <button
                                  className="btn-secondary btn-sm"
                                  onClick={() => setSubmittingId(assignment.id)}
                                >
                                  <RefreshCw size={14} />
                                  <span>Upload Revised Submission</span>
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="not-submitted-card">
                            <p>You have not submitted this assignment yet.</p>
                            <button
                              className="btn-primary btn-sm"
                              onClick={() => setSubmittingId(assignment.id)}
                            >
                              <Upload size={14} />
                              <span>Submit Your Work</span>
                            </button>
                          </div>
                        )}

                        {/* Submission Form Modal/Expand */}
                        {submittingId === assignment.id && (
                          <div className="submission-form-container">
                            <h4 className="form-heading">Submit Work for: {assignment.title}</h4>
                            <p className="form-subtext">
                              Upload any file format (code archive, document, PDF, etc.) up to 25MB limit.
                            </p>

                            {submitError && <div className="form-error-banner">{submitError}</div>}

                            <div className="form-field">
                              <label className="field-label">Deliverable File (25MB max)</label>
                              <input
                                type="file"
                                onChange={(e) => setSubmitFile(e.target.files?.[0] || null)}
                                className="file-input-clean"
                              />
                            </div>

                            <div className="form-field">
                              <label className="field-label">Submission Notes & Implementation Summary</label>
                              <textarea
                                rows={3}
                                placeholder="Explain your approach, testing steps, or specific notes for your tutor..."
                                value={submitNotes}
                                onChange={(e) => setSubmitNotes(e.target.value)}
                                className="textarea-clean"
                              />
                            </div>

                            <div className="form-actions-row">
                              <button
                                className="btn-secondary btn-sm"
                                onClick={() => {
                                  setSubmittingId(null);
                                  setSubmitError('');
                                }}
                                disabled={isSubmitting}
                              >
                                Cancel
                              </button>
                              <button
                                className="btn-primary btn-sm"
                                onClick={() => handleSubmitWork(assignment.id)}
                                disabled={isSubmitting}
                              >
                                {isSubmitting ? 'Uploading...' : 'Submit Deliverable'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* TUTOR / ADMIN VIEW: SUBMISSIONS REVIEW LIST */}
                    {isTutorOrAdmin && (
                      <div className="tutor-submissions-section">
                        <div className="section-header-flex">
                          <h4 className="section-subtitle-sm">
                            <UserIcon size={16} />
                            <span>Student Submissions ({assignment.submissions.length})</span>
                          </h4>
                          <button
                            className="btn-icon-danger"
                            onClick={() => onDeleteAssignment(assignment.id)}
                            title="Delete Assignment"
                          >
                            <Trash2 size={15} />
                            <span style={{ fontSize: '0.8rem', marginLeft: '4px' }}>Delete Assignment</span>
                          </button>
                        </div>

                        {assignment.submissions.length === 0 ? (
                          <div className="empty-sub-text">
                            No students have submitted deliverables for this assignment yet.
                          </div>
                        ) : (
                          <div className="submissions-table-wrapper">
                            <table className="submissions-table">
                              <thead>
                                <tr>
                                  <th>Student</th>
                                  <th>Date</th>
                                  <th>Status</th>
                                  <th>Deliverable</th>
                                  <th>Notes</th>
                                  <th>Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {assignment.submissions.map((sub) => (
                                  <tr key={sub.id}>
                                    <td>
                                      <strong>
                                        {sub.submitter?.firstName} {sub.submitter?.lastName}
                                      </strong>
                                      <div className="student-email-sub">{sub.submitter?.email}</div>
                                    </td>
                                    <td>{new Date(sub.submittedAt).toLocaleDateString()}</td>
                                    <td>{getVerdictTag(sub.status)}</td>
                                    <td>
                                      {sub.fileUrl ? (
                                        <a
                                          href={getFileUrl(sub.fileUrl)}
                                          download={sub.fileName || 'submission.bin'}
                                          className="btn-link-sm"
                                        >
                                          <Download size={13} />
                                          <span>{sub.fileName}</span>
                                        </a>
                                      ) : (
                                        <span className="text-muted">No file</span>
                                      )}
                                    </td>
                                    <td>
                                      <span className="notes-snippet" title={sub.notes}>
                                        {sub.notes ? `${sub.notes.slice(0, 40)}...` : '—'}
                                      </span>
                                    </td>
                                    <td>
                                      <button
                                        className="btn-secondary btn-xs"
                                        onClick={() =>
                                          setReviewingSubmission({
                                            assignmentId: assignment.id,
                                            submission: sub,
                                          })
                                        }
                                      >
                                        <MessageSquare size={13} />
                                        <span>Review</span>
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Tutor Submission Review Modal */}
      {reviewingSubmission && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3>
                Review Submission: {reviewingSubmission.submission.submitter?.firstName}{' '}
                {reviewingSubmission.submission.submitter?.lastName}
              </h3>
              <button
                className="btn-close-modal"
                onClick={() => setReviewingSubmission(null)}
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              {reviewingSubmission.submission.fileUrl && (
                <div className="review-file-preview">
                  <span>Deliverable File: </span>
                  <a
                    href={getFileUrl(reviewingSubmission.submission.fileUrl)}
                    download={reviewingSubmission.submission.fileName || 'file.bin'}
                    className="btn-primary btn-sm"
                  >
                    <Download size={14} />
                    <span>Download & Inspect Deliverable</span>
                  </a>
                </div>
              )}

              {reviewingSubmission.submission.notes && (
                <div className="review-student-notes">
                  <strong>Student Notes:</strong>
                  <p>{reviewingSubmission.submission.notes}</p>
                </div>
              )}

              <div className="form-field mt-4">
                <label className="field-label">Evaluation Verdict</label>
                <div className="verdict-select-row">
                  <label
                    className={`verdict-radio-card ${
                      reviewVerdict === 'APPROVED' ? 'selected-approved' : ''
                    }`}
                  >
                    <input
                      type="radio"
                      name="verdict"
                      value="APPROVED"
                      checked={reviewVerdict === 'APPROVED'}
                      onChange={() => setReviewVerdict('APPROVED')}
                    />
                    <span>✅ Approved</span>
                  </label>

                  <label
                    className={`verdict-radio-card ${
                      reviewVerdict === 'NEEDS_REVISION' ? 'selected-revision' : ''
                    }`}
                  >
                    <input
                      type="radio"
                      name="verdict"
                      value="NEEDS_REVISION"
                      checked={reviewVerdict === 'NEEDS_REVISION'}
                      onChange={() => setReviewVerdict('NEEDS_REVISION')}
                    />
                    <span>🔄 Needs Revision</span>
                  </label>

                  <label
                    className={`verdict-radio-card ${
                      reviewVerdict === 'REJECTED' ? 'selected-rejected' : ''
                    }`}
                  >
                    <input
                      type="radio"
                      name="verdict"
                      value="REJECTED"
                      checked={reviewVerdict === 'REJECTED'}
                      onChange={() => setReviewVerdict('REJECTED')}
                    />
                    <span>❌ Rejected</span>
                  </label>
                </div>
              </div>

              <div className="form-field mt-3">
                <label className="field-label">Feedback Comments for Student</label>
                <textarea
                  rows={4}
                  placeholder="Provide constructive feedback, notes on what was done well, or what requires revision..."
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  className="textarea-clean"
                />
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={() => setReviewingSubmission(null)}
                disabled={isReviewing}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleSubmitReview}
                disabled={isReviewing}
              >
                {isReviewing ? 'Saving Review...' : 'Submit Evaluation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

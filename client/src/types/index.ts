export type UserRole = 'ADMIN' | 'TUTOR' | 'INTERN';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  departments?: DepartmentMemberContext[];
  department?: DepartmentMemberContext;
}

export interface DepartmentMemberContext {
  id: string;
  name: string;
  slug: string;
  colorHex: string;
  icon: string;
  description?: string;
  memberRole: 'TUTOR' | 'INTERN' | 'ADMIN';
}

export interface Department {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  colorHex: string;
  isActive: boolean;
  _count?: {
    members: number;
    materials: number;
    assignments: number;
    announcements?: number;
    schedules?: number;
  };
}

export interface ClassSchedule {
  id: string;
  departmentId: string;
  scheduledById: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  location: string;
  meetingLink?: string | null;
  reminderSent?: boolean;
  createdAt: string;
  scheduler?: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
  };
}

export interface Material {
  id: string;
  departmentId: string;
  uploadedById: string;
  title: string;
  description: string;
  fileName: string;
  fileUrl: string;
  fileMimeType: string;
  fileSizeBytes: number;
  createdAt: string;
  uploader?: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
  };
}

export interface Announcement {
  id: string;
  departmentId?: string | null; // null for global announcements
  authorId: string;
  title: string;
  content: string;
  priority: 'NORMAL' | 'IMPORTANT' | 'URGENT';
  sourceType?: 'ASSIGNMENT' | 'CLASS_SCHEDULE' | 'MATERIAL' | null;
  sourceId?: string | null;
  isPinned: boolean;
  createdAt: string;
  author?: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
  };
  department?: {
    id: string;
    name: string;
    slug: string;
    colorHex: string;
  } | null;
}

export type AssignmentStatus = 'OPEN' | 'CLOSED' | 'GRADED';
export type SubmissionVerdict = 'APPROVED' | 'NEEDS_REVISION' | 'REJECTED';
export type SubmissionStatus = 'SUBMITTED' | 'IN_REVIEW' | 'APPROVED' | 'NEEDS_REVISION' | 'REJECTED';

export interface SubmissionReview {
  id: string;
  submissionId: string;
  reviewerId: string;
  comment: string;
  verdict: SubmissionVerdict;
  createdAt: string;
  reviewer?: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
  };
}

export interface Submission {
  id: string;
  assignmentId: string;
  submittedById: string;
  notes: string;
  fileUrl?: string | null;
  fileName?: string | null;
  fileSizeBytes?: number | null;
  status: SubmissionStatus;
  submittedAt: string;
  submitter?: {
    id: string;
    email?: string;
    firstName: string;
    lastName: string;
    role: string;
  };
  reviews: SubmissionReview[];
}

export interface Assignment {
  id: string;
  departmentId: string;
  createdById: string;
  title: string;
  description: string;
  status: AssignmentStatus;
  dueDate?: string | null;
  maxFileSize: number;
  createdAt: string;
  creator?: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
  };
  submissions: Submission[];
}

export interface AssignmentProgressStats {
  totalAssignments: number;
  submittedCount: number;
  approvedCount: number;
  needsRevisionCount: number;
  pendingReviewCount: number;
  completionPercentage: number;
  primaryAssignment?: {
    id: string;
    title: string;
    dueDate?: string | null;
    status: string;
  } | null;
  recentReviews: Array<{
    assignmentTitle: string;
    verdict: string;
    comment: string;
    date: string;
  }>;
}

export interface ChatMessage {
  id: string;
  departmentId: string;
  senderId: string;
  content: string;
  replyToId?: string | null;
  createdAt: string;
  sender: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
  };
  replyTo?: {
    id: string;
    content: string;
    sender: {
      id: string;
      firstName: string;
      lastName: string;
    };
  } | null;
}

export interface AppNotification {
  id: string;
  recipientId: string;
  departmentId?: string | null;
  type: string;
  title: string;
  body: string;
  actionUrl: string;
  isRead: boolean;
  createdAt: string;
  department?: {
    id: string;
    name: string;
    slug: string;
    colorHex: string;
  } | null;
}

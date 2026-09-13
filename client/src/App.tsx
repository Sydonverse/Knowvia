import React, { useState, useEffect, useCallback } from 'react';
import './styles/design-tokens.css';
import './styles/app.css';

import {
  User,
  DepartmentMemberContext,
  Department,
  Material,
  Announcement,
  ClassSchedule,
  Assignment,
  AssignmentProgressStats,
  ChatMessage,
  AppNotification,
  SubmissionVerdict,
} from './types';
import { api } from './services/api';
import { socketService } from './services/socket';

import { Navbar } from './components/Navbar';
import { Sidebar, ActiveTab } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { ScheduleView } from './components/ScheduleView';
import { MaterialsView } from './components/MaterialsView';
import { AssignmentsView } from './components/AssignmentsView';
import { AnnouncementsView } from './components/AnnouncementsView';
import { ChatView } from './components/ChatView';
import { NotificationDrawer } from './components/NotificationDrawer';
import { AuthView } from './components/AuthView';
import { OnboardingView } from './components/OnboardingView';
import { ResetPasswordView } from './components/ResetPasswordView';
import { AdminUsersView } from './components/AdminUsersView';

import {
  UploadMaterialModal,
  ScheduleClassModal,
  CreateAssignmentModal,
  CreateAnnouncementModal,
} from './components/Modals';

export const App: React.FC = () => {
  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // URL Path Routing State
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  // Department State
  const [availableDepartments, setAvailableDepartments] = useState<Department[]>([]);
  const [userDepartments, setUserDepartments] = useState<DepartmentMemberContext[]>([]);
  const [activeDept, setActiveDept] = useState<DepartmentMemberContext | null>(null);

  // Navigation & Deep-Link State
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);

  // Department Scoped Data
  const [materials, setMaterials] = useState<Material[]>([]);
  const [schedules, setSchedules] = useState<ClassSchedule[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [progressStats, setProgressStats] = useState<AssignmentProgressStats | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Notifications State
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifDrawer, setShowNotifDrawer] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);

  // Real-time typing
  const [typingUsers, setTypingUsers] = useState<{ userId: string; name: string }[]>([]);

  // Modals
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showCreateAssignmentModal, setShowCreateAssignmentModal] = useState(false);
  const [showCreateAnnouncementModal, setShowCreateAnnouncementModal] = useState(false);

  // PWA Install Prompt
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [canInstallPwa, setCanInstallPwa] = useState(false);

  // 1. Initial PWA & Service Worker Setup
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('Knowvia Service Worker registered:', reg.scope);
        })
        .catch((err) => {
          console.warn('Service Worker registration skipped:', err);
        });
    }

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstallPwa(true);
    });

    // Fetch initial list of all departments for registration
    api.departments
      .list()
      .then((res) => {
        if (res.departments) {
          setAvailableDepartments(res.departments);
        }
      })
      .catch((err) => console.warn('Failed to fetch departments list:', err));
  }, []);

  const handleInstallPwa = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setCanInstallPwa(false);
      setDeferredPrompt(null);
    }
  };

  // 2. Fetch User Profile on Mount
  const fetchCurrentUser = useCallback(async () => {
    setLoadingUser(true);
    try {
      const res = await api.auth.me();
      if (res.user) {
        setUser(res.user);
        const depts: DepartmentMemberContext[] = res.user.departments || [];
        setUserDepartments(depts);

        if (depts.length > 0) {
          // Restore saved department or default to first
          const savedSlug = localStorage.getItem('knowvia_active_dept_slug');
          const found = depts.find((d) => d.slug === savedSlug);
          setActiveDept(found || depts[0]);
        }
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
      api.removeToken();
    } finally {
      setLoadingUser(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  // 3. Connect Socket and Load Department Data
  const loadDepartmentData = useCallback(async (slug: string) => {
    try {
      const [matRes, schedRes, assignRes, annRes, msgRes] = await Promise.all([
        api.materials.list(slug).catch(() => ({ materials: [] })),
        api.schedules.list(slug).catch(() => ({ schedules: [] })),
        api.assignments.list(slug).catch(() => ({ assignments: [], progressStats: null })),
        api.announcements.list(slug).catch(() => ({ announcements: [] })),
        api.messages.list(slug).catch(() => ({ messages: [] })),
      ]);

      setMaterials(matRes.materials || []);
      setSchedules(schedRes.schedules || []);
      setAssignments(assignRes.assignments || []);
      setProgressStats(assignRes.progressStats || null);
      setAnnouncements(annRes.announcements || []);
      setMessages(msgRes.messages || []);
    } catch (err) {
      console.error('Error fetching department data:', err);
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.notifications.list();
      setNotifications(res.notifications || []);
      setUnreadCount(res.unreadCount || 0);
    } catch (err) {
      console.warn('Failed to fetch notifications:', err);
    }
  }, []);

  useEffect(() => {
    if (!user || !activeDept) return;

    loadDepartmentData(activeDept.slug);
    fetchNotifications();

    // Connect WebSocket
    const token =
      localStorage.getItem('knowvia_auth_token') || localStorage.getItem('nexus_auth_token');
    socketService.connect(token || '');

    // Socket Event Subscriptions with id-based deduplication
    const unsubMessage = socketService.onNewMessage((msg) => {
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
    });

    const unsubTyping = socketService.onUserTyping((data) => {
      if (data.departmentSlug === activeDept.slug && data.userId !== user.id) {
        setTypingUsers((prev) => {
          if (prev.some((u) => u.userId === data.userId)) return prev;
          return [...prev, { userId: data.userId, name: data.name }];
        });
      }
    });

    const unsubStopTyping = socketService.onUserStopTyping((data) => {
      setTypingUsers((prev) => prev.filter((u) => u.userId !== data.userId));
    });

    const unsubAnnNew = socketService.onNewAnnouncement((ann) => {
      setAnnouncements((prev) => (prev.some((a) => a.id === ann.id) ? prev : [ann, ...prev]));
      fetchNotifications();
    });

    const unsubAnnDel = socketService.onAnnouncementDeleted((data) => {
      setAnnouncements((prev) => prev.filter((a) => a.id !== data.id));
    });

    const unsubAnnClr = socketService.onAnnouncementCleared((data) => {
      if (data.departmentSlug === activeDept.slug) {
        setAnnouncements([]);
      }
    });

    const unsubSchedNew = socketService.onNewSchedule((sched) => {
      setSchedules((prev) => (prev.some((s) => s.id === sched.id) ? prev : [...prev, sched]));
      fetchNotifications();
    });

    const unsubSchedUpd = socketService.onScheduleUpdated((sched) => {
      setSchedules((prev) => prev.map((s) => (s.id === sched.id ? sched : s)));
    });

    const unsubSchedDel = socketService.onScheduleDeleted((data) => {
      setSchedules((prev) => prev.filter((s) => s.id !== data.id));
    });

    const unsubAssignNew = socketService.onNewAssignment((assign) => {
      setAssignments((prev) => (prev.some((a) => a.id === assign.id) ? prev : [assign, ...prev]));
      fetchNotifications();
    });

    const unsubAssignDel = socketService.onAssignmentDeleted((data) => {
      setAssignments((prev) => prev.filter((a) => a.id !== data.id));
    });

    const unsubMatNew = socketService.onNewMaterial((mat) => {
      setMaterials((prev) => (prev.some((m) => m.id === mat.id) ? prev : [mat, ...prev]));
      fetchNotifications();
    });

    const unsubMatDel = socketService.onMaterialDeleted((data) => {
      setMaterials((prev) => prev.filter((m) => m.id !== data.id));
    });

    const unsubNotifNew = socketService.onNewNotification((notif) => {
      setNotifications((prev) => (prev.some((n) => n.id === notif.id) ? prev : [notif, ...prev]));
      setUnreadCount((c) => c + 1);
    });

    return () => {
      unsubMessage();
      unsubTyping();
      unsubStopTyping();
      unsubAnnNew();
      unsubAnnDel();
      unsubAnnClr();
      unsubSchedNew();
      unsubSchedUpd();
      unsubSchedDel();
      unsubAssignNew();
      unsubAssignDel();
      unsubMatNew();
      unsubMatDel();
      unsubNotifNew();
    };
  }, [user, activeDept, loadDepartmentData, fetchNotifications]);

  // 4. Department Switch Handler (Admin only or profile refresh)
  const handleSelectDept = (dept: DepartmentMemberContext) => {
    setActiveDept(dept);
    localStorage.setItem('knowvia_active_dept_slug', dept.slug);
    loadDepartmentData(dept.slug);
  };

  // 5. Navigation & Deep-Linking
  const handleNavigate = (tab: ActiveTab, targetId?: string) => {
    setActiveTab(tab);
    if (targetId) {
      setSelectedAssignmentId(targetId);
    }
  };

  // 6. Action Handlers
  const handleSendMessage = async (content: string, replyToId?: string | null) => {
    if (!activeDept) return;
    try {
      socketService.sendMessage(activeDept.slug, content, replyToId);
    } catch {
      await api.messages.send(activeDept.slug, { content, replyToId });
    }
  };

  const handleUploadMaterial = async (formData: FormData) => {
    if (!activeDept) return;
    const res = await api.materials.upload(activeDept.slug, formData);
    if (res.material) {
      setMaterials((prev) =>
        prev.some((m) => m.id === res.material.id) ? prev : [res.material, ...prev]
      );
    }
    // Refresh announcements
    api.announcements.list(activeDept.slug).then((r) => setAnnouncements(r.announcements || []));
  };

  const handleDeleteMaterial = async (id: string) => {
    if (!activeDept || !confirm('Are you sure you want to delete this learning material?')) return;
    await api.materials.delete(activeDept.slug, id);
    setMaterials((prev) => prev.filter((m) => m.id !== id));
  };

  const handleScheduleClass = async (data: any) => {
    if (!activeDept) return;
    const res = await api.schedules.create(activeDept.slug, data);
    if (res.schedule) {
      setSchedules((prev) =>
        prev.some((s) => s.id === res.schedule.id) ? prev : [...prev, res.schedule]
      );
    }
    api.announcements.list(activeDept.slug).then((r) => setAnnouncements(r.announcements || []));
  };

  const handleDeleteSchedule = async (id: string) => {
    if (!activeDept || !confirm('Are you sure you want to cancel this scheduled class?')) return;
    await api.schedules.delete(activeDept.slug, id);
    setSchedules((prev) => prev.filter((s) => s.id !== id));
  };

  const handleCreateAssignment = async (data: any) => {
    if (!activeDept) return;
    const res = await api.assignments.create(activeDept.slug, data);
    if (res.assignment) {
      setAssignments((prev) =>
        prev.some((a) => a.id === res.assignment.id) ? prev : [res.assignment, ...prev]
      );
    }
    api.announcements.list(activeDept.slug).then((r) => setAnnouncements(r.announcements || []));
  };

  const handleSubmitAssignment = async (assignmentId: string, formData: FormData) => {
    if (!activeDept) return;
    await api.assignments.submit(activeDept.slug, assignmentId, formData);
    // Reload assignment list to update user's submission state and progress tracker
    loadDepartmentData(activeDept.slug);
  };

  const handleReviewSubmission = async (
    assignmentId: string,
    submissionId: string,
    data: { comment: string; verdict: SubmissionVerdict }
  ) => {
    if (!activeDept) return;
    await api.assignments.review(activeDept.slug, assignmentId, submissionId, data);
    loadDepartmentData(activeDept.slug);
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    if (!activeDept || !confirm('Are you sure you want to delete this assignment?')) return;
    await api.assignments.delete(activeDept.slug, assignmentId);
    setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
  };

  const handleCreateAnnouncement = async (data: any) => {
    if (!activeDept) return;
    const res = await api.announcements.create(activeDept.slug, data);
    if (res.announcement) {
      setAnnouncements((prev) =>
        prev.some((a) => a.id === res.announcement.id) ? prev : [res.announcement, ...prev]
      );
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!activeDept || !confirm('Are you sure you want to delete this announcement?')) return;
    await api.announcements.delete(activeDept.slug, id);
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
  };

  const handleClearAnnouncements = async () => {
    if (!activeDept || !confirm('Are you sure you want to clear all announcements from this tab?')) return;
    try {
      await api.announcements.clear(activeDept.slug);
      setAnnouncements([]);
    } catch (err: any) {
      alert(err.message || 'Failed to clear announcements');
    }
  };

  const handleMarkNotificationRead = async (id: string) => {
    await api.notifications.markRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const handleMarkAllNotificationsRead = async () => {
    await api.notifications.markAllRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  const handleEnablePush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      alert('Push notifications are not supported in this browser.');
      return;
    }

    try {
      const { publicKey } = await api.notifications.getVapidKey();
      const registration = await navigator.serviceWorker.ready;

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: publicKey,
      });

      const subData = JSON.parse(JSON.stringify(subscription));
      await api.notifications.subscribePush({
        endpoint: subData.endpoint,
        keys: subData.keys,
        userAgent: navigator.userAgent,
      });

      setPushEnabled(true);
      alert('✅ Push notifications enabled! You will receive instant class reminders and announcements.');
    } catch (err: any) {
      alert(err.message || 'Failed to enable push notifications');
    }
  };

  // Auth Handlers
  const handleLogin = async (email: string, password = 'password123') => {
    const res = await api.auth.login({ email, password });
    if (res.token) {
      api.setToken(res.token);
      setUser(res.user);
      const depts = res.user.departments || [];
      setUserDepartments(depts);
      if (depts.length > 0) {
        setActiveDept(depts[0]);
        localStorage.setItem('knowvia_active_dept_slug', depts[0].slug);
      }
    }
  };

  const handleRegister = async (data: any) => {
    const res = await api.auth.register(data);
    if (res.token) {
      api.setToken(res.token);
      setUser(res.user);
      if (res.user.department) {
        const deptCtx: DepartmentMemberContext = {
          ...res.user.department,
          memberRole: res.user.role,
        };
        setUserDepartments([deptCtx]);
        setActiveDept(deptCtx);
        localStorage.setItem('knowvia_active_dept_slug', deptCtx.slug);
      }
    }
  };

  const handleLogout = () => {
    api.removeToken();
    setUser(null);
    setUserDepartments([]);
    setActiveDept(null);
    socketService.disconnect();
  };

  // Public Onboarding Route
  if (currentPath.startsWith('/onboarding')) {
    return (
      <OnboardingView
        onNavigateToLogin={() => {
          window.history.pushState({}, '', '/');
          setCurrentPath('/');
        }}
      />
    );
  }

  // Public Reset Password Route
  if (currentPath.startsWith('/reset-password')) {
    return (
      <ResetPasswordView
        onNavigateToLogin={() => {
          window.history.pushState({}, '', '/');
          setCurrentPath('/');
        }}
      />
    );
  }

  // Loading Screen
  if (loadingUser) {
    return (
      <div className="loading-screen">
        <div className="spinner-clean"></div>
        <p className="loading-text">Loading Knowvia Platform...</p>
      </div>
    );
  }

  // Not Logged In -> Auth View
  if (!user) {
    return <AuthView onLogin={handleLogin} />;
  }

  const isTutorOrAdmin = user.role === 'TUTOR' || user.role === 'ADMIN';

  return (
    <div className="app-layout">
      {/* Top Navigation Bar */}
      <Navbar
        user={user}
        activeDept={activeDept}
        departments={userDepartments}
        onSelectDept={handleSelectDept}
        notifications={notifications}
        unreadCount={unreadCount}
        onOpenNotifications={() => setShowNotifDrawer(true)}
        onLogout={handleLogout}
        onQuickLogin={handleLogin}
        canInstallPwa={canInstallPwa}
        onInstallPwa={handleInstallPwa}
      />

      <div className="app-main-layout">
        {/* Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={(tab) => handleNavigate(tab)}
          activeDept={activeDept}
          currentUser={user}
          unreadCount={unreadCount}
        />

        {/* Main Workspace Body */}
        <main className="main-content-viewport">
          {activeTab === 'users' && user.role === 'ADMIN' ? (
            <AdminUsersView availableDepartments={availableDepartments} />
          ) : activeDept ? (
            <>
              {activeTab === 'dashboard' && (
                <DashboardView
                  user={user}
                  activeDept={activeDept}
                  materials={materials}
                  announcements={announcements}
                  schedules={schedules}
                  assignments={assignments}
                  progressStats={progressStats}
                  onNavigate={handleNavigate}
                  onOpenUpload={() => setShowUploadModal(true)}
                  onOpenSchedule={() => setShowScheduleModal(true)}
                  onOpenAssignmentModal={() => setShowCreateAssignmentModal(true)}
                />
              )}

              {activeTab === 'schedule' && (
                <ScheduleView
                  schedules={schedules}
                  activeDept={activeDept}
                  isTutorOrAdmin={isTutorOrAdmin}
                  onOpenScheduleModal={() => setShowScheduleModal(true)}
                  onDeleteSchedule={handleDeleteSchedule}
                />
              )}

              {activeTab === 'materials' && (
                <MaterialsView
                  materials={materials}
                  activeDept={activeDept}
                  isTutorOrAdmin={isTutorOrAdmin}
                  onOpenUploadModal={() => setShowUploadModal(true)}
                  onDeleteMaterial={handleDeleteMaterial}
                />
              )}

              {activeTab === 'assignments' && (
                <AssignmentsView
                  assignments={assignments}
                  activeDept={activeDept}
                  currentUser={user}
                  onOpenCreateModal={() => setShowCreateAssignmentModal(true)}
                  onSubmitAssignment={handleSubmitAssignment}
                  onReviewSubmission={handleReviewSubmission}
                  onDeleteAssignment={handleDeleteAssignment}
                  selectedAssignmentId={selectedAssignmentId}
                />
              )}

              {activeTab === 'announcements' && (
                <AnnouncementsView
                  announcements={announcements}
                  activeDept={activeDept}
                  isTutorOrAdmin={isTutorOrAdmin}
                  onOpenCreateModal={() => setShowCreateAnnouncementModal(true)}
                  onDeleteAnnouncement={handleDeleteAnnouncement}
                  onClearAnnouncements={handleClearAnnouncements}
                  onNavigate={handleNavigate}
                />
              )}

              {activeTab === 'chat' && (
                <ChatView
                  messages={messages}
                  activeDept={activeDept}
                  currentUser={user}
                  onSendMessage={handleSendMessage}
                  typingUsers={typingUsers}
                />
              )}
            </>
          ) : (
            <div className="empty-state-card mt-8">
              <h3>No Department Selected</h3>
              <p className="text-muted">Please select or join a department workspace to continue.</p>
            </div>
          )}
        </main>
      </div>

      {/* Notifications & Announcements Drawer (for Bell Icon, especially students) */}
      <NotificationDrawer
        isOpen={showNotifDrawer}
        onClose={() => setShowNotifDrawer(false)}
        notifications={notifications}
        unreadCount={unreadCount}
        onMarkRead={handleMarkNotificationRead}
        onMarkAllRead={handleMarkAllNotificationsRead}
        onEnablePush={handleEnablePush}
        pushEnabled={pushEnabled}
        onNavigate={handleNavigate}
      />

      {/* Modals for Tutors/Admin */}
      {activeDept && (
        <>
          <UploadMaterialModal
            isOpen={showUploadModal}
            onClose={() => setShowUploadModal(false)}
            onSubmit={handleUploadMaterial}
            activeDept={activeDept}
          />

          <ScheduleClassModal
            isOpen={showScheduleModal}
            onClose={() => setShowScheduleModal(false)}
            onSubmit={handleScheduleClass}
            activeDept={activeDept}
          />

          <CreateAssignmentModal
            isOpen={showCreateAssignmentModal}
            onClose={() => setShowCreateAssignmentModal(false)}
            onSubmit={handleCreateAssignment}
            activeDept={activeDept}
          />

          <CreateAnnouncementModal
            isOpen={showCreateAnnouncementModal}
            onClose={() => setShowCreateAnnouncementModal(false)}
            onSubmit={handleCreateAnnouncement}
            activeDept={activeDept}
            isAdmin={user.role === 'ADMIN'}
          />
        </>
      )}
    </div>
  );
};

export default App;

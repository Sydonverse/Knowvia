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
import { isPushSupported, subscribeUserToPush } from './utils/push.utils';

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
import { AdminOverviewView } from './components/AdminOverviewView';

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

  // Helper to map pathname to active tab
  const getTabFromPath = (path: string): ActiveTab => {
    if (path.startsWith('/announcements')) return 'announcements';
    if (path.startsWith('/schedule')) return 'schedule';
    if (path.startsWith('/assignments')) return 'assignments';
    if (path.startsWith('/materials')) return 'materials';
    if (path.startsWith('/chat')) return 'chat';
    return 'dashboard';
  };

  // URL Path Routing State
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const handleLocationChange = () => {
      const newPath = window.location.pathname;
      setCurrentPath(newPath);
      const matchedTab = getTabFromPath(newPath);
      if (newPath !== '/' && !newPath.startsWith('/onboarding') && !newPath.startsWith('/reset-password')) {
        setActiveTab(matchedTab);
      }
    };
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  // Department State
  const [availableDepartments, setAvailableDepartments] = useState<Department[]>([]);
  const [userDepartments, setUserDepartments] = useState<DepartmentMemberContext[]>([]);
  const [activeDept, setActiveDept] = useState<DepartmentMemberContext | null>(null);

  // Navigation & Deep-Link State
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => getTabFromPath(window.location.pathname));
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
  const [showPushPromptBanner, setShowPushPromptBanner] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return false;
    return Notification.permission === 'default';
  });

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

  // Push Subscription Synchronization (stable callback)
  const syncPushSubscription = useCallback(async () => {
    if (!isPushSupported()) return;
    try {
      const reg = await navigator.serviceWorker.ready;
      const perm = Notification.permission;

      // 1. Auto-subscribe if notification permission is already granted and user is authenticated
      if (perm === 'granted' && api.getToken()) {
        try {
          await subscribeUserToPush(reg, api);
          setPushEnabled(true);
          setShowPushPromptBanner(false);
          return;
        } catch (subErr) {
          console.warn('[WebPush] Auto-subscribe error:', subErr);
        }
      }

      // 2. Otherwise inspect existing subscription
      const existingSub = await reg.pushManager.getSubscription();
      if (existingSub) {
        setPushEnabled(true);
        setShowPushPromptBanner(false);
        if (api.getToken()) {
          const subData = JSON.parse(JSON.stringify(existingSub));
          await api.notifications
            .subscribePush({
              endpoint: subData.endpoint,
              keys: subData.keys,
              userAgent: navigator.userAgent,
            })
            .catch(() => {});
        }
      } else {
        setPushEnabled(false);
      }
    } catch (err) {
      console.warn('Error checking push subscription state:', err);
    }
  }, []);

  // 1. Initial PWA & Service Worker Setup (Runs strictly once on mount)
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('Knowvia Service Worker registered:', reg.scope);
          reg.update().catch(() => {});
          syncPushSubscription();
        })
        .catch((err) => {
          console.warn('Service Worker registration skipped:', err);
        });
    }

    const onBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstallPwa(true);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);

    // Fetch initial list of all departments for registration
    api.departments
      .list()
      .then((res) => {
        if (res.departments) {
          setAvailableDepartments(res.departments);
        }
      })
      .catch((err) => console.warn('Failed to fetch departments list:', err));

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
    };
  }, [syncPushSubscription]);

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
    const token = api.getToken();
    // Instant short-circuit: if no token exists, immediately show login screen without network delay
    if (!token) {
      setUser(null);
      setLoadingUser(false);
      return;
    }

    setLoadingUser(true);
    try {
      const res = await api.auth.me();
      if (res.user) {
        setUser(res.user);
        syncPushSubscription();
        const depts: DepartmentMemberContext[] = res.user.departments || [];
        setUserDepartments(depts);

        if (depts.length > 0) {
          if (res.user.role === 'ADMIN') {
            const savedSlug = localStorage.getItem('knowvia_active_dept_slug');
            if (savedSlug && savedSlug !== 'organization') {
              const found = depts.find((d) => d.slug === savedSlug);
              setActiveDept(found || null);
            } else {
              setActiveDept(null);
            }
          } else {
            // Restore saved department or default to first for tutors and interns
            const savedSlug = localStorage.getItem('knowvia_active_dept_slug');
            const found = depts.find((d) => d.slug === savedSlug);
            setActiveDept(found || depts[0]);
          }
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
  }, [syncPushSubscription]);

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
    if (!user) return;

    if (!activeDept) {
      // Connect WebSocket and load notifications for organization view
      const token =
        localStorage.getItem('knowvia_auth_token') || localStorage.getItem('nexus_auth_token');
      socketService.connect(token || '');
      fetchNotifications();
      return;
    }

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

    const unsubAnnUpd = socketService.onAnnouncementUpdated((ann) => {
      setAnnouncements((prev) => {
        const next = prev.map((a) => (a.id === ann.id ? ann : a));
        return next.sort((a, b) => {
          if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
      });
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

    const unsubAssignUpd = socketService.onAssignmentUpdated((assign) => {
      setAssignments((prev) => prev.map((a) => (a.id === assign.id ? { ...a, ...assign } : a)));
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
      unsubAnnUpd();
      unsubAnnDel();
      unsubAnnClr();
      unsubSchedNew();
      unsubSchedUpd();
      unsubSchedDel();
      unsubAssignNew();
      unsubAssignUpd();
      unsubAssignDel();
      unsubMatNew();
      unsubMatDel();
      unsubNotifNew();
    };
  }, [user, activeDept, loadDepartmentData, fetchNotifications]);

  // 4. Department Switch Handler (Admin only or profile refresh)
  const handleSelectDept = (dept: DepartmentMemberContext | null) => {
    if (dept) {
      setActiveDept(dept);
      localStorage.setItem('knowvia_active_dept_slug', dept.slug);
      loadDepartmentData(dept.slug);
    } else {
      setActiveDept(null);
      localStorage.setItem('knowvia_active_dept_slug', 'organization');
      setActiveTab('dashboard');
    }
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

  const handleUpdateAssignment = async (assignmentId: string, data: any) => {
    if (!activeDept) return;
    const res = await api.assignments.update(activeDept.slug, assignmentId, data);
    if (res.assignment) {
      setAssignments((prev) =>
        prev.map((a) => (a.id === res.assignment.id ? { ...a, ...res.assignment } : a))
      );
    }
  };

  const handleCreateAnnouncement = async (data: any) => {
    const slug = activeDept?.slug || userDepartments[0]?.slug || 'cybersecurity';
    const res = await api.announcements.create(slug, {
      ...data,
      isGlobal: user?.role === 'ADMIN' ? (data.isGlobal ?? true) : false,
    });
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

  const handleTogglePinAnnouncement = async (id: string) => {
    const deptSlug = activeDept?.slug || userDepartments[0]?.slug;
    if (!deptSlug) return;
    try {
      const res = await api.announcements.togglePin(deptSlug, id);
      if (res.announcement) {
        setAnnouncements((prev) => {
          const next = prev.map((a) => (a.id === id ? res.announcement : a));
          return next.sort((a, b) => {
            if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          });
        });
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update announcement pin status');
    }
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

  const handleDeleteNotification = async (id: string) => {
    const target = notifications.find((n) => n.id === id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    if (target && !target.isRead) {
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    try {
      await api.notifications.delete(id);
    } catch (err) {
      console.error('Failed to delete notification:', err);
      fetchNotifications();
    }
  };

  const handleClearAllNotifications = async () => {
    if (notifications.length === 0) return;
    if (!confirm('Are you sure you want to clear all announcements and alerts from this tray?')) return;
    setNotifications([]);
    setUnreadCount(0);
    try {
      await api.notifications.clearAll();
    } catch (err) {
      console.error('Failed to clear notifications:', err);
      fetchNotifications();
    }
  };

  const handleEnablePush = async () => {
    if (!isPushSupported()) {
      alert('Push notifications are not supported in this browser.');
      return;
    }

    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        setShowPushPromptBanner(false);
        alert('Notification permission was not granted. Please allow notifications in your browser settings.');
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      await subscribeUserToPush(registration, api);

      setPushEnabled(true);
      setShowPushPromptBanner(false);
      alert('✅ Push notifications enabled! You will receive instant class reminders and announcements.');
    } catch (err: any) {
      console.error('Push enable error:', err);
      alert(err.message || 'Failed to enable push notifications');
    }
  };

  const handleDisablePush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await api.notifications.unsubscribePush(subscription.endpoint).catch(() => {});
        await subscription.unsubscribe();
      }
      setPushEnabled(false);
      alert('Push notifications have been disabled on this device.');
    } catch (err: any) {
      console.error('Failed to disable push notifications:', err);
      alert(err.message || 'Failed to disable push notifications');
    }
  };

  const handleSendTestPush = async () => {
    try {
      const res = await api.notifications.sendTestPush();
      console.log('Test push dispatched:', res);
      alert('🔔 Test push notification dispatched! Check your device notification center.');
    } catch (err: any) {
      alert(err.message || 'Failed to dispatch test push notification');
    }
  };

  // Auth Handlers
  const handleLogin = async (email: string, password: string) => {
    const res = await api.auth.login({ email, password });
    if (res.token) {
      api.setToken(res.token);
      setUser(res.user);
      syncPushSubscription();
      const depts = res.user.departments || [];
      setUserDepartments(depts);
      if (res.user.role === 'ADMIN') {
        // Administrator starts at Organization Overview by default
        setActiveDept(null);
        localStorage.setItem('knowvia_active_dept_slug', 'organization');
        setActiveTab('dashboard');
      } else if (depts.length > 0) {
        // Tutors and interns remain department-scoped
        setActiveDept(depts[0]);
        localStorage.setItem('knowvia_active_dept_slug', depts[0].slug);
        setActiveTab('dashboard');
      }
    }
  };

  const handleRegister = async (data: any) => {
    const res = await api.auth.register(data);
    if (res.token) {
      api.setToken(res.token);
      setUser(res.user);
      syncPushSubscription();
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

  const handleLogout = async () => {
    // Safely dissociate this device before clearing session so User A's private notifications do not leak
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await api.notifications.dissociatePush(sub.endpoint).catch(() => {});
        }
      } catch (e) {
        console.warn('Could not dissociate device during logout:', e);
      }
    }

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
          onSelectDept={handleSelectDept}
        />

        {/* Main Workspace Body */}
        <main className="main-content-viewport">
          {/* Push Prompt Banner for users with unprompted notifications */}
          {user && showPushPromptBanner && !pushEnabled && isPushSupported() && (
            <div className="push-prompt-banner">
              <div className="push-prompt-banner-content">
                <span className="push-prompt-icon">🔔</span>
                <div>
                  <strong>Enable Mobile & Desktop Push Notifications</strong>
                  <p>Receive instant class reminders, announcements, and assignment updates even when Knowvia is closed.</p>
                </div>
              </div>
              <div className="push-prompt-actions">
                <button className="btn-primary btn-sm" onClick={handleEnablePush}>
                  Enable Alerts
                </button>
                <button
                  className="btn-icon btn-sm"
                  onClick={() => setShowPushPromptBanner(false)}
                  title="Dismiss"
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '14px', padding: '4px 8px' }}
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {activeTab === 'users' && user.role === 'ADMIN' ? (
            <AdminUsersView availableDepartments={availableDepartments} currentUserId={user.id} />
          ) : !activeDept && user.role === 'ADMIN' && activeTab === 'dashboard' ? (
            <AdminOverviewView
              user={user}
              departments={userDepartments}
              onSelectDept={handleSelectDept}
              onNavigate={handleNavigate}
              onOpenCreateUser={() => handleNavigate('users')}
              onOpenCreateAnnouncement={() => setShowCreateAnnouncementModal(true)}
            />
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
                  onUpdateAssignment={handleUpdateAssignment}
                  selectedAssignmentId={selectedAssignmentId}
                />
              )}

              {activeTab === 'announcements' && (
                <AnnouncementsView
                  announcements={announcements}
                  activeDept={activeDept}
                  isTutorOrAdmin={isTutorOrAdmin}
                  currentUserRole={user.role}
                  onOpenCreateModal={() => setShowCreateAnnouncementModal(true)}
                  onDeleteAnnouncement={handleDeleteAnnouncement}
                  onTogglePinAnnouncement={handleTogglePinAnnouncement}
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
          ) : !activeDept && user.role === 'ADMIN' && activeTab === 'announcements' && userDepartments.length > 0 ? (
            <AnnouncementsView
              announcements={announcements}
              activeDept={userDepartments[0]}
              isTutorOrAdmin={isTutorOrAdmin}
              currentUserRole={user.role}
              onOpenCreateModal={() => setShowCreateAnnouncementModal(true)}
              onDeleteAnnouncement={handleDeleteAnnouncement}
              onTogglePinAnnouncement={handleTogglePinAnnouncement}
              onClearAnnouncements={handleClearAnnouncements}
              onNavigate={handleNavigate}
            />
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
        onDeleteNotification={handleDeleteNotification}
        onClearAllNotifications={handleClearAllNotifications}
        onEnablePush={handleEnablePush}
        onDisablePush={handleDisablePush}
        onSendTestPush={handleSendTestPush}
        pushEnabled={pushEnabled}
        onNavigate={handleNavigate}
      />

      {/* Modals for Tutors/Admin */}
      {showCreateAnnouncementModal && (
        <CreateAnnouncementModal
          isOpen={showCreateAnnouncementModal}
          onClose={() => setShowCreateAnnouncementModal(false)}
          onSubmit={handleCreateAnnouncement}
          activeDept={activeDept || userDepartments[0]}
          isAdmin={user.role === 'ADMIN'}
        />
      )}

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
        </>
      )}
    </div>
  );
};

export default App;

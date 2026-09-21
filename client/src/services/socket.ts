import { io, Socket } from 'socket.io-client';
import {
  ChatMessage,
  AppNotification,
  Announcement,
  ClassSchedule,
  Assignment,
  Material,
} from '../types';

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4000');

class SocketService {
  private socket: Socket | null = null;
  private currentToken: string | null = null;
  private messageListeners: ((msg: ChatMessage) => void)[] = [];
  private notificationListeners: ((notif: AppNotification) => void)[] = [];
  private typingListeners: ((data: { userId: string; name: string; departmentSlug: string }) => void)[] = [];
  private stopTypingListeners: ((data: { userId: string; departmentSlug: string }) => void)[] = [];
  private announcementListeners: ((ann: Announcement) => void)[] = [];
  private announcementUpdatedListeners: ((ann: Announcement) => void)[] = [];
  private announcementDeletedListeners: ((data: { id: string }) => void)[] = [];
  private announcementClearedListeners: ((data: { departmentSlug: string }) => void)[] = [];
  private scheduleListeners: ((sched: ClassSchedule) => void)[] = [];
  private scheduleUpdatedListeners: ((sched: ClassSchedule) => void)[] = [];
  private scheduleDeletedListeners: ((data: { id: string }) => void)[] = [];
  private assignmentListeners: ((assign: Assignment) => void)[] = [];
  private assignmentDeletedListeners: ((data: { id: string }) => void)[] = [];
  private assignmentUpdatedListeners: ((assign: Assignment) => void)[] = [];
  private materialListeners: ((mat: Material) => void)[] = [];
  private materialDeletedListeners: ((data: { id: string }) => void)[] = [];

  public removeAllListeners() {
    this.messageListeners = [];
    this.notificationListeners = [];
    this.typingListeners = [];
    this.stopTypingListeners = [];
    this.announcementListeners = [];
    this.announcementUpdatedListeners = [];
    this.announcementDeletedListeners = [];
    this.announcementClearedListeners = [];
    this.scheduleListeners = [];
    this.scheduleUpdatedListeners = [];
    this.scheduleDeletedListeners = [];
    this.assignmentListeners = [];
    this.assignmentUpdatedListeners = [];
    this.assignmentDeletedListeners = [];
    this.materialListeners = [];
    this.materialDeletedListeners = [];
  }

  public connect(token: string) {
    if (this.socket?.connected && this.currentToken === token) {
      return this.socket;
    }

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.currentToken = token;
    this.removeAllListeners();

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('⚡ Connected to Knowvia real-time server');
    });

    this.socket.on('message:new', (message: ChatMessage) => {
      this.messageListeners.forEach((fn) => fn(message));
    });

    this.socket.on('notification:new', (notification: AppNotification) => {
      this.notificationListeners.forEach((fn) => fn(notification));
    });

    this.socket.on('user:typing', (data: { userId: string; name: string; departmentSlug: string }) => {
      this.typingListeners.forEach((fn) => fn(data));
    });

    this.socket.on('user:stop_typing', (data: { userId: string; departmentSlug: string }) => {
      this.stopTypingListeners.forEach((fn) => fn(data));
    });

    this.socket.on('announcement:new', (ann: Announcement) => {
      this.announcementListeners.forEach((fn) => fn(ann));
    });

    this.socket.on('announcement:updated', (ann: Announcement) => {
      this.announcementUpdatedListeners.forEach((fn) => fn(ann));
    });

    this.socket.on('announcement:deleted', (data: { id: string }) => {
      this.announcementDeletedListeners.forEach((fn) => fn(data));
    });

    this.socket.on('announcement:cleared', (data: { departmentSlug: string }) => {
      this.announcementClearedListeners.forEach((fn) => fn(data));
    });

    this.socket.on('schedule:new', (sched: ClassSchedule) => {
      this.scheduleListeners.forEach((fn) => fn(sched));
    });

    this.socket.on('schedule:updated', (sched: ClassSchedule) => {
      this.scheduleUpdatedListeners.forEach((fn) => fn(sched));
    });

    this.socket.on('schedule:deleted', (data: { id: string }) => {
      this.scheduleDeletedListeners.forEach((fn) => fn(data));
    });

    this.socket.on('assignment:new', (assign: Assignment) => {
      this.assignmentListeners.forEach((fn) => fn(assign));
    });

    this.socket.on('assignment:updated', (assign: Assignment) => {
      this.assignmentUpdatedListeners.forEach((fn) => fn(assign));
    });

    this.socket.on('assignment:deleted', (data: { id: string }) => {
      this.assignmentDeletedListeners.forEach((fn) => fn(data));
    });

    this.socket.on('material:new', (mat: Material) => {
      this.materialListeners.forEach((fn) => fn(mat));
    });

    this.socket.on('material:deleted', (data: { id: string }) => {
      this.materialDeletedListeners.forEach((fn) => fn(data));
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected from Knowvia server');
    });

    return this.socket;
  }

  public disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.currentToken = null;
    this.removeAllListeners();
  }

  public sendMessage(departmentSlug: string, content: string, replyToId?: string | null) {
    if (!this.socket) return;
    this.socket.emit('message:send', { departmentSlug, content, replyToId: replyToId || null });
  }

  public startTyping(departmentSlug: string) {
    if (!this.socket) return;
    this.socket.emit('typing:start', { departmentSlug });
  }

  public stopTyping(departmentSlug: string) {
    if (!this.socket) return;
    this.socket.emit('typing:stop', { departmentSlug });
  }

  public onNewMessage(callback: (msg: ChatMessage) => void) {
    this.messageListeners.push(callback);
    return () => {
      this.messageListeners = this.messageListeners.filter((fn) => fn !== callback);
    };
  }

  public onNewNotification(callback: (notif: AppNotification) => void) {
    this.notificationListeners.push(callback);
    return () => {
      this.notificationListeners = this.notificationListeners.filter((fn) => fn !== callback);
    };
  }

  public onUserTyping(callback: (data: { userId: string; name: string; departmentSlug: string }) => void) {
    this.typingListeners.push(callback);
    return () => {
      this.typingListeners = this.typingListeners.filter((fn) => fn !== callback);
    };
  }

  public onUserStopTyping(callback: (data: { userId: string; departmentSlug: string }) => void) {
    this.stopTypingListeners.push(callback);
    return () => {
      this.stopTypingListeners = this.stopTypingListeners.filter((fn) => fn !== callback);
    };
  }

  public onNewAnnouncement(callback: (ann: Announcement) => void) {
    this.announcementListeners.push(callback);
    return () => {
      this.announcementListeners = this.announcementListeners.filter((fn) => fn !== callback);
    };
  }

  public onAnnouncementUpdated(callback: (ann: Announcement) => void) {
    this.announcementUpdatedListeners.push(callback);
    return () => {
      this.announcementUpdatedListeners = this.announcementUpdatedListeners.filter((fn) => fn !== callback);
    };
  }

  public onAnnouncementDeleted(callback: (data: { id: string }) => void) {
    this.announcementDeletedListeners.push(callback);
    return () => {
      this.announcementDeletedListeners = this.announcementDeletedListeners.filter((fn) => fn !== callback);
    };
  }

  public onAnnouncementCleared(callback: (data: { departmentSlug: string }) => void) {
    this.announcementClearedListeners.push(callback);
    return () => {
      this.announcementClearedListeners = this.announcementClearedListeners.filter((fn) => fn !== callback);
    };
  }

  public onNewSchedule(callback: (sched: ClassSchedule) => void) {
    this.scheduleListeners.push(callback);
    return () => {
      this.scheduleListeners = this.scheduleListeners.filter((fn) => fn !== callback);
    };
  }

  public onScheduleUpdated(callback: (sched: ClassSchedule) => void) {
    this.scheduleUpdatedListeners.push(callback);
    return () => {
      this.scheduleUpdatedListeners = this.scheduleUpdatedListeners.filter((fn) => fn !== callback);
    };
  }

  public onScheduleDeleted(callback: (data: { id: string }) => void) {
    this.scheduleDeletedListeners.push(callback);
    return () => {
      this.scheduleDeletedListeners = this.scheduleDeletedListeners.filter((fn) => fn !== callback);
    };
  }

  public onNewAssignment(callback: (assign: Assignment) => void) {
    this.assignmentListeners.push(callback);
    return () => {
      this.assignmentListeners = this.assignmentListeners.filter((fn) => fn !== callback);
    };
  }

  public onAssignmentDeleted(callback: (data: { id: string }) => void) {
    this.assignmentDeletedListeners.push(callback);
    return () => {
      this.assignmentDeletedListeners = this.assignmentDeletedListeners.filter((fn) => fn !== callback);
    };
  }

  public onAssignmentUpdated(callback: (assign: Assignment) => void) {
    this.assignmentUpdatedListeners.push(callback);
    return () => {
      this.assignmentUpdatedListeners = this.assignmentUpdatedListeners.filter((fn) => fn !== callback);
    };
  }

  public onNewMaterial(callback: (mat: Material) => void) {
    this.materialListeners.push(callback);
    return () => {
      this.materialListeners = this.materialListeners.filter((fn) => fn !== callback);
    };
  }

  public onMaterialDeleted(callback: (data: { id: string }) => void) {
    this.materialDeletedListeners.push(callback);
    return () => {
      this.materialDeletedListeners = this.materialDeletedListeners.filter((fn) => fn !== callback);
    };
  }
}

export const socketService = new SocketService();

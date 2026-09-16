import { AdminOverviewData } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

class ApiClient {
  public getToken(): string | null {
    return localStorage.getItem('knowvia_auth_token') || localStorage.getItem('nexus_auth_token');
  }

  public setToken(token: string) {
    localStorage.setItem('knowvia_auth_token', token);
  }

  public removeToken() {
    localStorage.removeItem('knowvia_auth_token');
    localStorage.removeItem('nexus_auth_token');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status} ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch {
        // Fallback to HTTP status text
      }
      throw new Error(errorMessage);
    }

    return response.json();
  }

  // Auth
  public auth = {
    login: (body: any) => this.request<any>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
    register: (body: any) => this.request<any>('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
    me: () => this.request<any>('/auth/me'),
    verifyOnboarding: (token: string) =>
      this.request<{ valid: boolean; user: any }>('/auth/onboarding/verify', {
        method: 'POST',
        body: JSON.stringify({ token }),
      }),
    completeOnboarding: (token: string, password: string) =>
      this.request<{ message: string }>('/auth/onboarding/complete', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      }),
    forgotPassword: (email: string) =>
      this.request<{ message: string }>('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      }),
    resetPassword: (token: string, password: string) =>
      this.request<{ message: string }>('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      }),
  };

  // Admin Management
  public admin = {
    getOverview: (fresh?: boolean) =>
      this.request<AdminOverviewData>(`/admin/overview${fresh ? '?fresh=true' : ''}`),
    createUser: (data: {
      email: string;
      firstName: string;
      lastName: string;
      role: 'TUTOR' | 'INTERN';
      departmentSlug: string;
    }) => this.request<any>('/admin/users', { method: 'POST', body: JSON.stringify(data) }),
    listUsers: () => this.request<{ users: any[] }>('/admin/users'),
    resendInvitation: (userId: string) =>
      this.request<any>(`/admin/users/${userId}/resend-invitation`, { method: 'POST' }),
    deleteUser: (userId: string) =>
      this.request<{ message: string }>(`/admin/users/${userId}`, { method: 'DELETE' }),
  };

  // Departments
  public departments = {
    list: () => this.request<{ departments: any[] }>('/departments'),
    get: (slug: string) => this.request<any>(`/departments/${slug}`),
    join: (slug: string) => this.request<any>(`/departments/${slug}/join`, { method: 'POST' }),
  };

  // Learning Materials (File Sharing)
  public materials = {
    list: (slug: string) =>
      this.request<{ materials: any[] }>(`/departments/${slug}/materials`),
    upload: (slug: string, formData: FormData) =>
      this.request<any>(`/departments/${slug}/materials`, { method: 'POST', body: formData }),
    delete: (slug: string, id: string) =>
      this.request<any>(`/departments/${slug}/materials/${id}`, { method: 'DELETE' }),
  };

  // Announcements
  public announcements = {
    list: (slug: string) => this.request<{ announcements: any[] }>(`/departments/${slug}/announcements`),
    create: (slug: string, data: any) =>
      this.request<any>(`/departments/${slug}/announcements`, { method: 'POST', body: JSON.stringify(data) }),
    delete: (slug: string, id: string) =>
      this.request<any>(`/departments/${slug}/announcements/${id}`, { method: 'DELETE' }),
    clear: (slug: string) =>
      this.request<any>(`/departments/${slug}/announcements`, { method: 'DELETE' }),
  };

  // Class Schedules
  public schedules = {
    list: (slug: string) => this.request<{ schedules: any[] }>(`/departments/${slug}/schedules`),
    create: (slug: string, data: any) =>
      this.request<any>(`/departments/${slug}/schedules`, { method: 'POST', body: JSON.stringify(data) }),
    update: (slug: string, id: string, data: any) =>
      this.request<any>(`/departments/${slug}/schedules/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (slug: string, id: string) =>
      this.request<any>(`/departments/${slug}/schedules/${id}`, { method: 'DELETE' }),
  };

  // Assignments Management
  public assignments = {
    list: (slug: string) =>
      this.request<{ assignments: any[]; progressStats?: any }>(`/departments/${slug}/assignments`),
    create: (slug: string, data: any) =>
      this.request<any>(`/departments/${slug}/assignments`, { method: 'POST', body: JSON.stringify(data) }),
    submit: (slug: string, assignmentId: string, formData: FormData) =>
      this.request<any>(`/departments/${slug}/assignments/${assignmentId}/submit`, {
        method: 'POST',
        body: formData,
      }),
    review: (slug: string, assignmentId: string, submissionId: string, data: any) =>
      this.request<any>(
        `/departments/${slug}/assignments/${assignmentId}/submissions/${submissionId}/review`,
        { method: 'POST', body: JSON.stringify(data) }
      ),
    delete: (slug: string, assignmentId: string) =>
      this.request<any>(`/departments/${slug}/assignments/${assignmentId}`, { method: 'DELETE' }),
  };

  // Chat Messages
  public messages = {
    list: (slug: string) => this.request<{ messages: any[] }>(`/departments/${slug}/messages`),
    send: (slug: string, data: { content: string; replyToId?: string | null }) =>
      this.request<any>(`/departments/${slug}/messages`, { method: 'POST', body: JSON.stringify(data) }),
  };

  // In-App & Push Notifications
  public notifications = {
    list: () => this.request<{ notifications: any[]; unreadCount: number }>('/notifications'),
    markRead: (id: string) => this.request<any>(`/notifications/${id}/read`, { method: 'PATCH' }),
    markAllRead: () => this.request<any>('/notifications/read-all', { method: 'PATCH' }),
    getVapidKey: () => this.request<{ publicKey: string }>('/notifications/vapid-key'),
    subscribePush: (data: { endpoint: string; keys: { p256dh: string; auth: string }; userAgent?: string }) =>
      this.request<any>('/notifications/subscribe', { method: 'POST', body: JSON.stringify(data) }),
    unsubscribePush: (endpoint: string) =>
      this.request<any>('/notifications/unsubscribe', { method: 'POST', body: JSON.stringify({ endpoint }) }),
    dissociatePush: (endpoint: string) =>
      this.request<any>('/notifications/dissociate', { method: 'POST', body: JSON.stringify({ endpoint }) }),
    sendTestPush: () =>
      this.request<{ message: string }>('/notifications/test-push', { method: 'POST' }),
  };
}

export const api = new ApiClient();
